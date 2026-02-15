// 10-plugin-classic-quiz.js
// ClassicQuizPlugin - main quiz logic
// ============================================================

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
        updateGameModeButtons();
        EventBus.emit(EventBus.EVENTS.USER_SELECTED, { user: currentUser });
    },

    selectQuestionsForUser(user, count) {
        const active = questions.filter(q => q.active !== false);
        if (active.length === 0) return [];
        const sr = quizSettings.spacedRepetition || {};
        const randomness = (sr.randomness !== undefined ? sr.randomness : 40) / 100;
        const cooldownHours = sr.streakCooldown || 48;
        const streakThreshold = sr.streakThreshold || 3;
        const stats = user.questionStats || {};
        const now = Date.now();
        const cooldownMs = cooldownHours * 3600000;
        const scored = active.map(q => {
            const qid = q.questionId;
            const s = stats[qid];
            let priority = 50;
            if (s) {
                const correct = s.correct || 0;
                const asked = s.asked || 0;
                const ratio = asked > 0 ? correct / asked : 0;
                priority = Math.max(5, 100 - ratio * 80);
                if (s.consecutiveCorrect >= streakThreshold && s.lastAsked) {
                    const elapsed = now - new Date(s.lastAsked).getTime();
                    if (elapsed < cooldownMs) priority = 2;
                }
                if (asked === 0) priority = 90;
            } else {
                priority = 95;
            }
            // Core-Fragen bevorzugen
            const corePercent = quizSettings.corePercent || 70;
            if (q.isCore) priority *= (1 + corePercent / 200);
            const rnd = Math.random() * 100 * randomness;
            return { q, score: priority + rnd };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, Math.min(count, scored.length)).map(s => s.q);
    },

    startQuiz() {
        if (!currentUser) { Toast.show('Bitte wähle einen Benutzer aus.', 'warning'); return; }
        const active = questions.filter(q => q.active !== false);
        if (active.length === 0) { Toast.show('Keine aktiven Fragen vorhanden!', 'warning'); return; }
        const count = Math.min(quizSettings.questionsPerQuiz || CONFIG.QUIZ.DEFAULT_QUESTIONS_PER_QUIZ, active.length);
        currentQuizQuestions = this.selectQuestionsForUser(currentUser, count);
        shuffleArray(currentQuizQuestions);
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
        if (qidInfo) qidInfo.textContent = `#${q.displayNumber || '?'} · ${q.questionId || ''}`;
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
            // Multiple choice with checkboxes
            const answers = q.answers || [];
            const correctCount = answers.filter(a => typeof a === 'object' && a.correct).length;
            const multipleCorrect = correctCount > 1;
            const instruction = multipleCorrect
                ? '<div style="text-align: center; margin-bottom: 20px; color: var(--accent); font-weight: 700;">⚠️ Mehrfachauswahl möglich! ⚠️</div>'
                : '';
            // Shuffle answers while keeping original indices
            const shuffled = answers.map((a, i) => ({ answer: a, originalIndex: i }));
            shuffleArray(shuffled);
            let html = instruction;
            shuffled.forEach(({ answer, originalIndex }, displayIndex) => {
                const text = typeof answer === 'string' ? answer : (answer.text || '');
                html += '<div class="answer-checkbox-container">' +
                    '<label class="answer-checkbox-label">' +
                    '<input type="checkbox" class="answer-checkbox" value="' + originalIndex + '" data-index="' + originalIndex + '">' +
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
                            if (timerModeActive && !multipleCorrect) {
                                setTimeout(function(){ submitAnswer(); }, 150);
                            }
                            return;
                        }
                        const checkbox = this.querySelector('.answer-checkbox');
                        if (checkbox && !checkbox.disabled) {
                            checkbox.checked = !checkbox.checked;
                            if (timerModeActive && !multipleCorrect) {
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
            isCorrect = correctIndices.length === selectedIndices.length && correctIndices.every(ci => selectedIndices.includes(ci));
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
                if (!isCorrect) {
                    const correct = getCorrectTextAnswers(q);
                    const hint = document.createElement('div');
                    hint.style.cssText = 'margin-top:10px;color:var(--correct);font-weight:700;';
                    hint.textContent = 'Richtige Antwort: ' + correct.join(' / ');
                    input.parentNode.appendChild(hint);
                }
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
                currentUser.questionStats[qid] = { asked: 0, correct: 0, consecutiveCorrect: 0, lastAsked: null };
            }
            const qs = currentUser.questionStats[qid];
            qs.asked++;
            qs.lastAsked = new Date().toISOString();
            if (isCorrect) { qs.correct++; qs.consecutiveCorrect = (qs.consecutiveCorrect || 0) + 1; }
            else { qs.consecutiveCorrect = 0; }
        }
        // Show buttons
        document.getElementById('nextBtn').style.display = '';
        if (q.explanation) document.getElementById('explainBtn').style.display = '';
        EventBus.emit(EventBus.EVENTS.QUIZ_ANSWER, { questionId: q.questionId, correct: isCorrect, xp: xpGain });
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
        currentQuestionIndex++;
        if (currentQuestionIndex >= currentQuizQuestions.length) {
            this.showResults();
        } else {
            this.displayQuestion();
        }
    },

    showResults() {
        const total = userAnswers.length;
        const correct = userAnswers.filter(a => a.correct).length;
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
            currentUser.score = currentUser.totalAnswers > 0 ? Math.round((currentUser.correctAnswers / currentUser.totalAnswers) * 100) : 0;
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
            const hour = new Date().getHours();
            if (hour < 8) bs.earlyQuizzes = (bs.earlyQuizzes || 0) + 1;
            if (hour >= 22) bs.lateQuizzes = (bs.lateQuizzes || 0) + 1;
            if (new Date().getDay() === 0 || new Date().getDay() === 6) bs.weekendQuizzes = (bs.weekendQuizzes || 0) + 1;
            if (new Date().getDay() === 1) bs.mondayQuizzes = (bs.mondayQuizzes || 0) + 1;
            // History
            if (!currentUser.history) currentUser.history = [];
            currentUser.history.push({ date: new Date().toISOString(), correct, total, xp: finalXP, pct });
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
        document.getElementById('totalQuestions').textContent = total;
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
        EventBus.emit(EventBus.EVENTS.QUIZ_COMPLETED, { user: currentUser?.name, correct, total, xp: finalXP, pct });
        // Mini-game cascade
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
                return;
            }
        }
        this._checkSpeedTapTrigger();
    },

    _checkSpeedTapTrigger() {
        if (!currentUser) return;
        const mg = getMG();
        if (PluginRegistry.isEnabled('SpeedTapPlugin') && mg.speedTap && mg.speedTap.enabled !== false) {
            const quizCount = currentUser.quizzesTaken || 0;
            if (quizCount > 0 && quizCount % (mg.speedTap.quizCount || 5) === 0) {
                SpeedTapPlugin.open();
                return;
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
                BossFightPlugin.start();
                return;
            }
        }
    },

    restartQuiz() {
        currentQuestionIndex = 0;
        userAnswers = [];
        syncToAppState();
        renderUserSelect();
        showScreen('startScreen');
        EventBus.emit(EventBus.EVENTS.QUIZ_RESTARTED, {});
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
