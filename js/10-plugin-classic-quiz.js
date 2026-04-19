// 10-plugin-classic-quiz.js
// ClassicQuizPlugin - main quiz logic
// ============================================================

function _statInCooldown(s, cooldownMs, streakThreshold) {
    if (!s || (s.consecutiveCorrect || 0) < streakThreshold || !s.lastAsked) return false;
    return (Date.now() - new Date(s.lastAsked).getTime()) < cooldownMs;
}

const ClassicQuizPlugin = {
    name: 'ClassicQuizPlugin',
    _quizXP: 0,
    _answered: false,
    _secondChanceUsed: false,

    init() {},

    selectUser(userId, event) {
        if (event) event.stopPropagation();
        const user = users.find(u => u.id === userId);
        if (!user) return;
        currentUser = user;
        syncToAppState();
        document.querySelectorAll('.user-card').forEach(c => c.classList.remove('selected'));
        const card = document.querySelector(`.user-card[data-userid="${userId}"]`);
        if (card) card.classList.add('selected');
        const btn = document.getElementById('startQuizBtn');
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        updateHeaderUserNames();
        EventBus.emit(EventBus.EVENTS.USER_SELECTED, { user: currentUser });
    },

    selectQuestionsForUser(user, count) {
        const active = questions.filter(q => q.active !== false);
        if (active.length === 0) return [];
        const sr = quizSettings.spacedRepetition || {};
        const randomness = (sr.randomness !== undefined ? sr.randomness : 30) / 100;
        const cooldownHours = sr.streakCooldown || 48;
        const streakThreshold = sr.streakThreshold || 2;
        const freshQuota = (sr.freshQuota !== undefined ? sr.freshQuota : 0) / 100;
        const freshThreshold = sr.freshThreshold !== undefined ? sr.freshThreshold : 1;
        const stats = user.questionStats || {};
        const cooldownMs = cooldownHours * 3600000;
        const today = new Date().toDateString();
        const alreadyPlayedToday = user.lastQuizDate === today && (user.dailyQuizCount || 0) > 0;
        const maxCore = alreadyPlayedToday
            ? (sr.maxCoreSubsequent !== undefined ? sr.maxCoreSubsequent : count)
            : (sr.maxCoreFirst !== undefined ? sr.maxCoreFirst : count);

        const isInCooldown = q => _statInCooldown(stats[q.questionId], cooldownMs, streakThreshold);

        const scoreQuestion = q => {
            const s = stats[q.questionId];
            let priority = 50;
            if (s) {
                const asked = s.asked || 0;
                let ratio = asked > 0 ? (s.correct || 0) / asked : 0;
                if ((s.consecutiveCorrect || 0) >= 1)
                    ratio = Math.min(1.0, ratio + (s.consecutiveCorrect || 0) * 0.2);
                priority = Math.max(5, 100 - ratio * 80);
                if (asked === 0) priority = 90;
            } else {
                priority = 95;
            }
            return priority + Math.random() * 100 * randomness;
        };

        const pickTop = (pool, n) => pool
            .map(q => ({ q, score: scoreQuestion(q) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, n).map(s => s.q);

        // Core-Deckel: max N Core-Fragen pro Quiz
        const coreQ    = active.filter(q => q.isCore);
        const nonCoreQ = active.filter(q => !q.isCore);

        // Non-Core einmalig vorscoren — gleiche Scores für Auswahl und Fill (SR-Bug 5)
        const nonCoreScoredAll = nonCoreQ
            .map(q => ({ q, score: scoreQuestion(q) }))
            .sort((a, b) => b.score - a.score);
        const pickNC = (predicate, n) =>
            nonCoreScoredAll.filter(s => predicate(s.q)).slice(0, n).map(s => s.q);

        // Cooldown hart ausschließen — Fallback auf Cooldown-Pool wenn nötig
        let cooldownFallbackCount = 0;
        const pickWithCooldownFallback = (pool, n) => {
            const available = pool.filter(q => !isInCooldown(q));
            if (available.length >= n) return pickTop(available, n);
            const picked = pickTop(available, available.length);
            const stillNeeded = n - picked.length;
            const cooldownPool = pool.filter(q => isInCooldown(q));
            const fallback = pickTop(cooldownPool, stillNeeded);
            cooldownFallbackCount += fallback.length;
            return [...picked, ...fallback];
        };

        const corePicked   = pickWithCooldownFallback(coreQ, Math.min(maxCore, count));
        const nonCoreSlots = count - corePicked.length;

        // Fresh-Quota für Non-Core (ab 2. Quiz des Tages)
        let nonCorePicked;
        if (freshQuota > 0 && alreadyPlayedToday && nonCoreSlots > 0) {
            const isFresh = q => { const s = stats[q.questionId]; return !s || (s.asked || 0) <= freshThreshold; };
            const freshCount = nonCoreScoredAll.filter(s => isFresh(s.q)).length;
            const freshMin   = Math.min(Math.floor(nonCoreSlots * freshQuota), freshCount);
            const oldPicked  = pickNC(q => !isFresh(q) && !isInCooldown(q), nonCoreSlots - freshMin);
            const freshCount2 = nonCoreSlots - oldPicked.length;
            nonCorePicked = [...pickNC(q => isFresh(q) && !isInCooldown(q), freshCount2), ...oldPicked];
            // Fallback wenn immer noch zu wenig
            const stillNeeded = nonCoreSlots - nonCorePicked.length;
            if (stillNeeded > 0) {
                const cdFallback = pickNC(q => isInCooldown(q), stillNeeded);
                cooldownFallbackCount += cdFallback.length;
                nonCorePicked = [...nonCorePicked, ...cdFallback];
            }
        } else {
            const available = pickNC(q => !isInCooldown(q), nonCoreSlots);
            if (available.length >= nonCoreSlots) {
                nonCorePicked = available;
            } else {
                const cdFallback = pickNC(q => isInCooldown(q), nonCoreSlots - available.length);
                cooldownFallbackCount += cdFallback.length;
                nonCorePicked = [...available, ...cdFallback];
            }
        }

        if (cooldownFallbackCount > 0)
            setTimeout(() => Toast.show(
                `⚠ Pool zu klein: ${cooldownFallbackCount} Frage(n) aus dem 48h-Ruhemodus geholt.\nMehr aktive Fragen hinzufügen empfohlen.`,
                'warning'
            ), 500);

        // Kategorie-Cap: max N Non-Core-Fragen pro _fileGroup
        const maxPerGroup = sr.maxPerGroup !== undefined ? sr.maxPerGroup : 3;
        if (maxPerGroup > 0) {
            const groupCounts = {};
            const capped = [];
            const overflowIds = new Set();
            for (const q of nonCorePicked) {
                const g = q._fileGroup || '__none__';
                groupCounts[g] = (groupCounts[g] || 0) + 1;
                if (groupCounts[g] <= maxPerGroup) capped.push(q);
                else overflowIds.add(q.questionId);
            }
            const missing = nonCorePicked.length - capped.length;
            if (missing > 0) {
                const usedIds = new Set(capped.map(q => q.questionId));
                const fill = pickNC(q =>
                    !usedIds.has(q.questionId) &&
                    !overflowIds.has(q.questionId) &&
                    !isInCooldown(q) &&
                    (groupCounts[q._fileGroup || '__none__'] || 0) < maxPerGroup,
                    missing
                );
                nonCorePicked = [...capped, ...fill];
            } else {
                nonCorePicked = capped;
            }
        }

        return shuffleArray([...corePicked, ...nonCorePicked]);
    },

    startQuiz() {
        if (!currentUser) { Toast.show('Bitte wähle einen Benutzer aus.', 'warning'); return; }
        const active = questions.filter(q => q.active !== false);
        if (active.length === 0) { Toast.show('Keine aktiven Fragen vorhanden!', 'warning'); return; }
        const count = Math.min(quizSettings.questionsPerQuiz || CONFIG.QUIZ.DEFAULT_QUESTIONS_PER_QUIZ, active.length);
        currentQuizQuestions = this.selectQuestionsForUser(currentUser, count);
        shuffleArray(currentQuizQuestions);
        this._insertPendingPhoneJokers();
        currentQuestionIndex = 0;
        userAnswers = [];
        this._quizXP = 0;
        this._answered = false;
        this._secondChanceUsed = false;
        AppState.abilities.usedThisQuestion = {};
        AppState.abilities.doubleXPActive = false;
        AppState.abilities.shieldActive = false;
        AppState.abilities.secondChanceArmed = false;
        abilityUsedThisQuestion = {};
        doubleXPActive = false;
        shieldActive = false;
        secondChanceArmed = false;
        syncToAppState();
        EventBus.emit(EventBus.EVENTS.QUIZ_STARTED, { user: currentUser.name, questionCount: currentQuizQuestions.length });
        showScreen('quizScreen');
        this.displayQuestion();
    },

    displayQuestion() {
        this._answered = false;
        this._secondChanceUsed = false;
        clearAutoAdvance();
        AppState.abilities.usedThisQuestion = {};
        abilityUsedThisQuestion = {};
        const q = currentQuizQuestions[currentQuestionIndex];
        if (!q) { this.showResults(); return; }
        const total = currentQuizQuestions.length;
        const idx = currentQuestionIndex + 1;
        const pct = (idx / total) * 100;
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('questionNumber').textContent = `Frage ${idx} / ${total}`;
        document.getElementById('quizXPCounter').textContent = `+${this._quizXP} XP`;
        document.getElementById('currentUserName').textContent = currentUser ? currentUser.name : '';
        // Question ID info
        const qidInfo = document.getElementById('quizQuestionIdInfo');
        if (qidInfo) qidInfo.textContent = `[${q._fileGroup || 'Manuell'}] ${q.questionId || ''}`;
        // Media
        const mediaEl = document.getElementById('questionMedia');
        const mediaSrc = getMediaSource(q.media);
        if (mediaSrc && q.media && q.media.type === 'image') {
            mediaEl.innerHTML = `<img src="${mediaSrc}" class="question-image" alt="Frage-Bild" onerror="this.style.display='none'" ${q.type === QUESTION_TYPES.IMAGEMAP ? `onclick="ClassicQuizPlugin.handleImagemapClick(event)"` : ''}>`;
            mediaEl.style.display = '';
        } else if (mediaSrc && q.media && q.media.type === 'video') {
            mediaEl.innerHTML = `<video controls class="question-image"><source src="${mediaSrc}" type="video/mp4"></video>`;
            mediaEl.style.display = '';
        } else if (mediaSrc && q.media && q.media.type === 'audio') {
            mediaEl.innerHTML = `<audio controls style="width:100%;margin:10px 0;"><source src="${mediaSrc}" type="audio/mpeg"></audio>`;
            mediaEl.style.display = '';
        } else {
            mediaEl.innerHTML = '';
            mediaEl.style.display = 'none';
        }
        // Question text
        document.getElementById('questionText').innerHTML = sanitizeHTML(q.text);
        // Answers
        const container = document.getElementById('answersContainer');
        const submitCont = document.getElementById('submitBtnContainer');
        if (q.type === QUESTION_TYPES.IMAGEMAP) {
            container.innerHTML = '<p style="opacity:0.7;text-align:center;">Klicke auf die richtige Stelle im Bild oben.</p>';
            submitCont.innerHTML = '';
        } else if (q.type === QUESTION_TYPES.TEXT) {
            container.innerHTML = `<div class="text-answer-container"><input type="text" id="textAnswerInput" class="text-answer-input" placeholder="Antwort eingeben..." autocomplete="off"></div>`;
            submitCont.innerHTML = `<button class="btn" onclick="submitAnswer()" id="submitBtn" style="width:100%;margin-top:15px;">Antwort prüfen</button>`;
            setTimeout(() => { const inp = document.getElementById('textAnswerInput'); if (inp) inp.focus(); }, 100);
        } else {
            // Multiple choice
            const answers = q.answers || [];
            const correctCount = answers.filter(a => typeof a === 'object' && a.correct).length;
            const isAnyMode = q.correctMode === 'any';
            const multipleCorrect = !isAnyMode && correctCount > 1;
            const instruction = isAnyMode
                ? '<div style="text-align:center;margin-bottom:20px;color:var(--accent);font-weight:700">☝ Eine richtige Antwort reicht</div>'
                : multipleCorrect
                    ? '<div style="text-align:center;margin-bottom:20px;color:var(--accent);font-weight:700">⚠️ Mehrfachauswahl möglich! ⚠️</div>'
                    : '';
            // Shuffle answers while keeping original indices
            const shuffled = answers.map((a, i) => ({ answer: a, originalIndex: i }));
            shuffleArray(shuffled);
            let html = instruction;
            shuffled.forEach(({ answer, originalIndex }, displayIndex) => {
                const text = typeof answer === 'string' ? answer : (answer.text || '');
                const inputType = isAnyMode ? 'radio' : 'checkbox';
                const nameAttr  = isAnyMode ? ' name="answer-radio"' : '';
                html += '<div class="answer-checkbox-container">' +
                    '<label class="answer-checkbox-label">' +
                    '<input type="' + inputType + '" class="answer-checkbox"' + nameAttr + ' value="' + originalIndex + '" data-index="' + originalIndex + '">' +
                    '<span class="answer-checkbox-custom">' + (displayIndex + 1) + '</span>' +
                    '<span class="answer-text">' + sanitizeHTML(text) + '</span>' +
                    '</label></div>';
            });
            container.innerHTML = html;
            submitCont.innerHTML = `<button class="btn" onclick="submitAnswer()" id="submitBtn" style="width:100%;margin-top:15px;">Antwort prüfen <span style="opacity: 0.7; font-size: 0.85em;">(Enter ↵)</span></button>`;
            // Setup click handlers on containers for better UX
            setTimeout(() => {
                document.querySelectorAll('.answer-checkbox-container').forEach(cont => {
                    cont.addEventListener('click', function(e) {
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
                            if (timerModeActive && (isAnyMode || !multipleCorrect)) {
                                setTimeout(function(){ submitAnswer(); }, 150);
                            }
                            return;
                        }
                        const input = this.querySelector('.answer-checkbox');
                        if (input && !input.disabled) {
                            if (isAnyMode) {
                                input.checked = true;
                            } else {
                                input.checked = !input.checked;
                            }
                            if (timerModeActive && (isAnyMode || !multipleCorrect)) {
                                setTimeout(function(){ submitAnswer(); }, 150);
                            }
                        }
                    });
                });
            }, 0);
        }
        // Hide next/explain buttons
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('explainBtn').style.display = 'none';
        document.getElementById('explanationContainer').style.display = 'none';
        EventBus.emit(EventBus.EVENTS.QUIZ_QUESTION, { index: currentQuestionIndex, question: q });
    },

    handleImagemapClick(event) {
        if (this._answered) return;
        const img = event.target;
        const rect = img.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        window.imagemapPlayerClick = { x, y };
        this.evaluateImagemapAnswer(x, y);
    },

    evaluateImagemapAnswer(x, y) {
        const q = currentQuizQuestions[currentQuestionIndex];
        if (!q || !q.targets) return;
        const hit = checkImagemapHit(x, y, q.targets);
        const fakeEvent = { isImagemap: true, correct: hit, clickX: x, clickY: y };
        this._processAnswer(hit, fakeEvent);
    },

    submitAnswer() {
        if (this._answered && !this._secondChanceUsed) return;
        const q = currentQuizQuestions[currentQuestionIndex];
        if (!q) return;
        if (q.type === QUESTION_TYPES.IMAGEMAP) return; // handled by click
        let isCorrect = false;
        let selectedIndices = [];
        if (q.type === QUESTION_TYPES.TEXT) {
            const input = document.getElementById('textAnswerInput');
            if (!input) return;
            const userAnswer = input.value.trim();
            if (!userAnswer) { Toast.show('Bitte eine Antwort eingeben.', 'warning'); return; }
            const correctAnswers = getCorrectTextAnswers(q);
            isCorrect = correctAnswers.some(ca => ca.toLowerCase().trim() === userAnswer.toLowerCase().trim());
        } else {
            const checkboxes = document.querySelectorAll('.answer-checkbox:checked');
            if (checkboxes.length === 0) { Toast.show('Bitte wähle mindestens eine Antwort.', 'warning'); return; }
            selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));
            const answers = q.answers || [];
            const correctIndices = answers.map((a, i) => (typeof a === 'object' && a.correct) ? i : -1).filter(i => i >= 0);
            isCorrect = q.correctMode === 'any'
                ? selectedIndices.some(si => correctIndices.includes(si))
                : correctIndices.length === selectedIndices.length && correctIndices.every(ci => selectedIndices.includes(ci));
        }
        this._processAnswer(isCorrect, { selectedIndices });
    },

    _processAnswer(isCorrect, details) {
        // Second chance handling
        if (!isCorrect && secondChanceArmed && !this._secondChanceUsed) {
            this._secondChanceUsed = true;
            secondChanceArmed = false;
            AppState.abilities.secondChanceArmed = false;
            Toast.show('🔄 2. Chance! Versuche es nochmal!', 'info');
            // Re-enable inputs
            document.querySelectorAll('.answer-checkbox').forEach(cb => cb.disabled = false);
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.disabled = false;
            return;
        }
        this._answered = true;
        const q = currentQuizQuestions[currentQuestionIndex];
        // Disable inputs
        document.querySelectorAll('.answer-checkbox').forEach(cb => cb.disabled = true);
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.style.display = 'none';
        // Visual feedback
        if (q.type !== QUESTION_TYPES.IMAGEMAP && q.type !== QUESTION_TYPES.TEXT) {
            const answers = q.answers || [];
            document.querySelectorAll('.answer-checkbox-container').forEach(opt => {
                const cb = opt.querySelector('.answer-checkbox');
                const idx = parseInt(cb.value);
                const ans = answers[idx];
                const isAnswerCorrect = typeof ans === 'object' && ans.correct;
                if (isAnswerCorrect) {
                    opt.classList.add('correct');
                } else if (cb.checked && !isAnswerCorrect) {
                    opt.classList.add('incorrect');
                }
            });
        }
        if (q.type === QUESTION_TYPES.TEXT) {
            const input = document.getElementById('textAnswerInput');
            if (input) {
                input.disabled = true;
                input.classList.add(isCorrect ? 'correct' : 'incorrect');
                const correct = getCorrectTextAnswers(q);
                const hint = document.createElement('div');
                hint.style.cssText = 'margin-top:10px;font-weight:700;color:' + (isCorrect ? 'var(--correct)' : 'var(--incorrect)');
                hint.textContent = (isCorrect ? '✓ ' : '✗ Richtig wäre: ') + correct.join(' / ');
                input.parentNode.appendChild(hint);
            }
        }
        // XP calculation
        const xpSettings = quizSettings.xpSystem || {};
        const baseCorrectXP = xpSettings.correctAnswerXP || CONFIG.XP.CORRECT_ANSWER;
        const baseWrongXP = xpSettings.wrongAnswerXP || CONFIG.XP.WRONG_ANSWER;
        let xpGain = 0;
        if (isCorrect) {
            xpGain = baseCorrectXP;
            // Phone-Joker question: 5× XP
            if (q._isPhoneJoker) xpGain *= 5;
            // Team-Bonus active: 3× XP
            if (currentUser && currentUser.teamBonusActive) xpGain *= 3;
            // Double XP ability
            if (doubleXPActive) { xpGain *= 2; doubleXPActive = false; AppState.abilities.doubleXPActive = false; }
        } else {
            if (shieldActive) { xpGain = 0; shieldActive = false; AppState.abilities.shieldActive = false; }
            else xpGain = baseWrongXP;
        }
        this._quizXP += xpGain;
        document.getElementById('quizXPCounter').textContent = `+${this._quizXP} XP`;
        // Record answer
        userAnswers.push({ questionId: q.questionId, correct: isCorrect, xp: xpGain });
        // Update user question stats
        if (currentUser) {
            if (!currentUser.questionStats) currentUser.questionStats = {};
            const qid = q.questionId;
            if (!currentUser.questionStats[qid]) {
                currentUser.questionStats[qid] = { asked: 0, correct: 0, consecutiveCorrect: 0, lastAsked: null,
                    _q: (q.text || '').replace(/<[^>]*>/g, '').slice(0, 60) };
            }
            const qs = currentUser.questionStats[qid];
            const prevLastAsked = qs.lastAsked; // VOR Überschreibung merken für Cooldown-Check
            qs.asked++;
            qs.lastAsked = new Date().toISOString();
            if (isCorrect) {
                qs.correct++;
                // Cooldown abgelaufen? → consecutiveCorrect zurücksetzen bevor increment
                // verhindert Endlosschleife: Cooldown → 1x richtig → sofort wieder Cooldown
                const sr = quizSettings.spacedRepetition || {};
                const cooldownMs = (sr.streakCooldown || 48) * 3600000;
                const streakThreshold = sr.streakThreshold || 2;
                const prevConsec = qs.consecutiveCorrect || 0;
                if (prevConsec >= streakThreshold && prevLastAsked &&
                    !_statInCooldown({ consecutiveCorrect: prevConsec, lastAsked: prevLastAsked }, cooldownMs, streakThreshold))
                    qs.consecutiveCorrect = 0;
                qs.consecutiveCorrect = (qs.consecutiveCorrect || 0) + 1;
            } else { qs.consecutiveCorrect = 0; }
        }
        // Resolve phone joker
        this._resolvePhoneJoker(q, isCorrect);
        // Show buttons
        document.getElementById('nextBtn').style.display = '';
        if (q.explanation) document.getElementById('explainBtn').style.display = '';
        EventBus.emit(EventBus.EVENTS.QUIZ_ANSWER, { questionId: q.questionId, correct: isCorrect, xp: xpGain });
    },

    _resolvePhoneJoker(question, wasCorrect) {
        if (!question._isPhoneJoker) return;
        const now = new Date().toISOString();
        // Mark as resolved on currentUser's pendingPhoneJoker (stays as receipt)
        if (currentUser.pendingPhoneJoker) {
            currentUser.pendingPhoneJoker.forEach(j => {
                if (j.from === question._jokerFrom && j.questionId === question.questionId && !j.resolved) {
                    j.resolved = true;
                    j.correct = wasCorrect;
                    j.resolvedDate = now;
                }
            });
        }
        if (wasCorrect) {
            // XP-Bonus dem Absender gutschreiben
            const xpSettings  = quizSettings.xpSystem || {};
            const baseCorrectXP = xpSettings.correctAnswerXP || CONFIG.XP.CORRECT_ANSWER;
            const bonus = baseCorrectXP * 5;
            const sender = users.find(u => u.name === question._jokerFrom);
            if (sender) {
                sender.pendingJokerBonus = (sender.pendingJokerBonus || 0) + bonus;
                // sentPhoneJokers-Eintrag als erledigt markieren
                if (sender.sentPhoneJokers) {
                    sender.sentPhoneJokers.forEach(j => {
                        if (j.targetName === currentUser.name && j.questionId === question.questionId && !j.resolved) {
                            j.resolved = true;
                            j.correct  = true;
                            j.resolvedDate = now;
                        }
                    });
                }
            }
            Toast.show(`📞 ${question._jokerFrom} bekommt beim nächsten Quiz-Start ${bonus} XP Bonus!`, 'success', 4000);
        }
    },

    showExplanation() {
        const q = currentQuizQuestions[currentQuestionIndex];
        if (!q) return;
        const container = document.getElementById('explanationContainer');
        const textEl = document.getElementById('explanationText');
        let html = sanitizeHTML(q.explanation || '');
        if (q.explanationMedia) {
            const src = getMediaSource(q.explanationMedia);
            if (src) {
                if (q.explanationMedia.type === 'image') html += `<br><img src="${src}" style="max-width:100%;border-radius:10px;margin-top:10px;" onerror="this.style.display='none'">`;
                else if (q.explanationMedia.type === 'audio') html += `<br><audio controls style="width:100%;margin-top:10px;"><source src="${src}" type="audio/mpeg"></audio>`;
            }
        }
        textEl.innerHTML = html;
        container.style.display = '';
        document.getElementById('explainBtn').style.display = 'none';
    },

    nextQuestion() {
        clearAutoAdvance();
        const hintEl = document.getElementById('hintContainer');
        if (hintEl) hintEl.remove();
        currentQuestionIndex++;
        if (currentQuestionIndex >= currentQuizQuestions.length) {
            this.showResults();
        } else {
            this.displayQuestion();
        }
    },

    showResults() {
        const skipped   = userAnswers.filter(a => a.skipped).length;
        const answered  = userAnswers.filter(a => !a.skipped);
        const total     = answered.length;
        const correct   = answered.filter(a => a.correct).length;
        const incorrect = total - correct;
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        // Apply daily XP multiplier
        const multiplier = getDailyXPMultiplier(currentUser);
        const finalXP = Math.round(this._quizXP * multiplier);
        // Update user stats
        if (currentUser) {
            currentUser.totalXP = (currentUser.totalXP || 0) + finalXP;
            currentUser.correctAnswers = (currentUser.correctAnswers || 0) + correct;
            currentUser.totalAnswers = (currentUser.totalAnswers || 0) + total;
            currentUser.quizzesTaken = (currentUser.quizzesTaken || 0) + 1;
            const lvl = calculateLevel(currentUser.totalXP);
            currentUser.level = lvl.level;
            incrementDailyQuizCount(currentUser);
            // Badge stats
            if (!currentUser.badgeStats) currentUser.badgeStats = {};
            const bs = currentUser.badgeStats;
            bs.totalQuizzes = (bs.totalQuizzes || 0) + 1;
            bs.totalCorrect = (bs.totalCorrect || 0) + correct;
            bs.totalAnswered = (bs.totalAnswered || 0) + total;
            bs.totalXP = currentUser.totalXP;
            bs.level = currentUser.level;
            if (pct === 100) bs.perfectQuizzes = (bs.perfectQuizzes || 0) + 1;
            if (pct >= 80) bs.highAverageQuizzes = (bs.highAverageQuizzes || 0) + 1;
            const hour = new Date().getHours();
            if (hour < 8) bs.earlyQuizzes = (bs.earlyQuizzes || 0) + 1;
            if (hour >= 22) bs.lateQuizzes = (bs.lateQuizzes || 0) + 1;
            if (new Date().getDay() === 0 || new Date().getDay() === 6) bs.weekendQuizzes = (bs.weekendQuizzes || 0) + 1;
            if (new Date().getDay() === 1) bs.mondayQuizzes = (bs.mondayQuizzes || 0) + 1;
            // History
            if (!currentUser.history) currentUser.history = [];
            currentUser.history.push({ date: new Date().toISOString(), correct, total, xp: finalXP, score: pct, skipped: skipped || undefined });
            // Streak
            const today = new Date().toDateString();
            if (!currentUser._lastStreakDate || currentUser._lastStreakDate !== today) {
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                if (currentUser._lastStreakDate === yesterday) {
                    currentUser.streak = (currentUser.streak || 0) + 1;
                } else if (currentUser._lastStreakDate !== today) {
                    currentUser.streak = 1;
                }
                currentUser._lastStreakDate = today;
            }
            bs.currentStreak = currentUser.streak || 0;
            bs.maxStreak = Math.max(bs.maxStreak || 0, bs.currentStreak);
        }
        syncToAppState();
        // UI
        document.getElementById('finalScore').textContent = `${pct}%`;
        document.getElementById('correctCount').textContent = correct;
        document.getElementById('incorrectCount').textContent = incorrect;
        document.getElementById('totalQuestions').textContent = total + skipped;
        const skippedStat = document.getElementById('skippedStat');
        if (skippedStat) skippedStat.style.display = skipped > 0 ? '' : 'none';
        const skippedEl = document.getElementById('skippedCount');
        if (skippedEl) skippedEl.textContent = skipped;
        const msg = document.getElementById('resultsMessage');
        if (pct === 100) msg.textContent = '🏆 Perfekt! Alle Fragen richtig!';
        else if (pct >= 80) msg.textContent = '🌟 Ausgezeichnet!';
        else if (pct >= 60) msg.textContent = '👍 Gut gemacht!';
        else if (pct >= 40) msg.textContent = '📚 Weiter üben!';
        else msg.textContent = '💪 Nicht aufgeben!';
        // XP info
        const xpInfo = multiplier > 1 ? ` (${Math.round(multiplier*100)}% Bonus!)` : '';
        msg.textContent += ` +${finalXP} XP${xpInfo}`;
        renderUserSelect();
        showScreen('resultsScreen');
        renderNextGoals(currentUser);
        EventBus.emit(EventBus.EVENTS.QUIZ_COMPLETED, { user: currentUser?.name, correct, total, xp: finalXP, pct });
        // Mini-game cascade — Autofokus erst nach Abschluss aller Mini-Games
        setTimeout(() => this._checkMiniGameTriggers(), 1500);
    },

    _checkMiniGameTriggers() {
        if (window._mgTestMode) return;
        if (!currentUser) return;
        const mg = getMG();
        // Spinner trigger
        if (PluginRegistry.isEnabled('WheelPlugin') && mg.spinner.enabled !== false) {
            const correctTotal = currentUser.correctAnswers || 0;
            const quizCount = currentUser.quizzesTaken || 0;
            if (correctTotal >= (mg.spinner.minCorrect || 10) && quizCount % (mg.spinner.quizCount || 2) === 0) {
                WheelPlugin.open('🎰 Glücksrad!', 'Du hast dir eine Drehung verdient!');
                return; // Boss-Check folgt nach Rad-Schließen via WheelPlugin.close()
            }
        }
        this._checkBossTrigger();
    },

    _checkBossTrigger() {
        if (!currentUser) return;
        const mg = getMG();
        if (PluginRegistry.isEnabled('BossFightPlugin') && mg.bossFight.enabled !== false) {
            const quizCount = currentUser.quizzesTaken || 0;
            if (quizCount > 0 && quizCount % (mg.bossFight.threshold || 10) === 0) {
                const boss = BossFightPlugin.BOSS_TYPES[Math.floor(Math.random() * BossFightPlugin.BOSS_TYPES.length)];
                const winXP = mg.bossFight.winXP || 100;
                GameDialog.showConfirm(
                    boss.sprite,
                    'Boss-Fight verfügbar!',
                    `<strong>${boss.name}</strong> fordert dich heraus!<br><br>Jetzt kämpfen?<br><small style="color:var(--accent-warning,#f39c12);">⚠️ Bei Ablehnung entgehen dir bis zu ${winXP} XP!</small>`,
                    () => BossFightPlugin.start(),
                    null
                );
                return;
            }
        }
        // Kein Mini-Game mehr — Export-Button fokussieren
        setTimeout(() => document.getElementById('exportContinueBtn')?.focus(), 100);
    },

    restartQuiz() {
        if (currentUser && typeof saveCurrentPlayer === 'function') saveCurrentPlayer();
        currentQuestionIndex = 0;
        userAnswers = [];
        syncToAppState();
        renderUserSelect();
        showScreen('startScreen');
        EventBus.emit(EventBus.EVENTS.QUIZ_RESTARTED, {});
    },

    _insertPendingPhoneJokers() {
        if (!currentUser || !currentUser.pendingPhoneJoker || currentUser.pendingPhoneJoker.length === 0) return;
        // Cleanup: remove expired jokers (older than 90 days) or inactive questions
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        currentUser.pendingPhoneJoker = currentUser.pendingPhoneJoker.filter(j => {
            if (j.date && new Date(j.date).getTime() < ninetyDaysAgo) return false;
            return questions.some(qq => qq.questionId === j.questionId && qq.active !== false);
        });
        // Build joker questions (only unresolved)
        const jokerQuestions = [];
        currentUser.pendingPhoneJoker.filter(j => !j.resolved).forEach(joker => {
            const q = questions.find(qq => qq.questionId === joker.questionId);
            if (q) {
                const jq = JSON.parse(JSON.stringify(q));
                jq._isPhoneJoker = true;
                jq._jokerFrom = joker.from;
                jq._jokerDate = joker.date;
                jokerQuestions.push(jq);
            }
        });
        if (jokerQuestions.length > 0) {
            // Insert at beginning so they come first
            currentQuizQuestions = jokerQuestions.concat(currentQuizQuestions);
            Toast.show(`📞 ${jokerQuestions.length} Telefon-Joker-Frage${jokerQuestions.length > 1 ? 'n' : ''} eingefügt!`, 'info', 4000);
        }
    },

    abandonQuiz() {
        if (!this._answered && currentQuestionIndex === 0 && userAnswers.length === 0) {
            showScreen('startScreen');
            renderUserSelect();
            return;
        }
        GameDialog.showConfirm('Quiz abbrechen?', 'Du erhältst 50% der bisherigen XP.', () => {
            const halfXP = Math.round(this._quizXP * 0.5);
            if (currentUser && halfXP > 0) {
                const multiplier = getDailyXPMultiplier(currentUser);
                const finalXP = Math.round(halfXP * multiplier);
                currentUser.totalXP = (currentUser.totalXP || 0) + finalXP;
                const lvl = calculateLevel(currentUser.totalXP);
                currentUser.level = lvl.level;
                Toast.show(`Quiz abgebrochen. +${finalXP} XP (50%)`, 'info');
            }
            syncToAppState();
            renderUserSelect();
            showScreen('startScreen');
            EventBus.emit(EventBus.EVENTS.QUIZ_ABANDONED, { xp: Math.round(this._quizXP * 0.5) });
        });
    }
};

// ── ABILITY PLUGIN ───────────────────────────────────────────
