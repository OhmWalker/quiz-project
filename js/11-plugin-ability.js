// 11-plugin-ability.js
// AbilityPlugin - player abilities
// ============================================================

const AbilityPlugin = {
    name: 'AbilityPlugin',
    // perQuestion: wirkt nur auf die AKTUELLE Frage → nach der Antwort gesperrt
    //              und beim Frageswechsel zurückgesetzt.
    // passive:     wird aktiviert und bleibt scharf, bis der Fall eintritt —
    //              also ggf. über mehrere Fragen bis zum Quizende.
    // scope:       Klartext für Mouse-over und Aktivierungs-Hinweis.
    DEFS: {
        fiftyFifty:   { icon:'🎯', name:'50/50', desc:'Entfernt 2 falsche Antworten (Burst: 2 Quizze/h)', earnPer:1, earnStat:'_fifty50Sessions', passive:false, perQuestion:true,
                        scope:'Gilt nur für diese Frage.' },
        skip:         { icon:'⏭️', name:'Überspringen', desc:'Frage überspringen ohne Strafe', earnPer:10, earnStat:'totalQuizzes', passive:false, perQuestion:true,
                        scope:'Gilt nur für diese Frage. Die Frage kommt später wieder.' },
        hint:         { icon:'💡', name:'Hinweis', desc:'Zeigt den Hinweistext an', earnPer:15, earnStat:'totalAnswers', passive:false, perQuestion:true,
                        scope:'Gilt nur für diese Frage.' },
        doubleXP:     { icon:'✨', name:'Doppel-XP', desc:'Doppelte XP für richtige Antwort', earnPer:1, earnStat:'perfectQuizzes', passive:false, perQuestion:true,
                        scope:'Gilt nur für diese Frage — bei falscher Antwort verfällt die Ladung.' },
        shield:       { icon:'🛡️', name:'Schild', desc:'Schützt einmal vor XP-Verlust bei einer falschen Antwort', earnPer:7, earnStat:'currentStreak', passive:true,
                        scope:'Bleibt aktiv, bis du eine Frage falsch beantwortest — auch über mehrere Fragen, bis zum Quizende.' },
        secondChance: { icon:'🔄', name:'2. Chance', desc:'Erlaubt einmal einen zweiten Versuch', earnPer:3, earnStat:'currentStreak', passive:true,
                        scope:'Bleibt aktiv, bis du eine Frage falsch beantwortest — auch über mehrere Fragen, bis zum Quizende.' },
        swap:         { icon:'🎲', name:'Tausch', desc:'Aktuelle Frage durch eine andere ersetzen', earnPer:4, earnStat:'activeDays3', passive:false, perQuestion:true,
                        scope:'Gilt nur für diese Frage.' },
        teamBonus:    { icon:'👥', name:'Team', desc:'3× XP für dich und einen Mitspieler', earnPer:3, earnStat:'_phoneJokerUsed', passive:false,
                        scope:'Gilt für den Rest dieses Quiz. Der Mitspieler bekommt 3× XP in seinem nächsten Quiz.' },
        phoneJoker:   { icon:'📞', name:'Telefon', desc:'Sende Frage an anderen Spieler (5× XP bei richtig)', earnPer:5, earnStat:'highAverageQuizzes', passive:false, perQuestion:true,
                        scope:'Gilt nur für diese Frage — sie wird übersprungen.' }
    },

    init() {
        EventBus.on(EventBus.EVENTS.USER_SELECTED, (data) => {
            this.initAbilities(data.user);
            this.checkAbilityUnlocks(data.user);
            this.checkPendingJokers(data.user);
            this.checkPendingTeamBonus(data.user);
        }, 'AbilityPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_COMPLETED, () => {
            if (currentUser) this.checkAbilityUnlocks(currentUser);
            this._reportUnusedProtection();
        }, 'AbilityPlugin');
        // Vorgemerkter Team-Bonus wird beim Quizstart eingelöst
        EventBus.on(EventBus.EVENTS.QUIZ_STARTED, () => {
            this._redeemPendingTeamBonus();
        }, 'AbilityPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_QUESTION, () => {
            this.renderAbilityBar();
        }, 'AbilityPlugin');
        // Nach der Antwort neu zeichnen, damit Frage-Fähigkeiten ausgegraut sind
        EventBus.on(EventBus.EVENTS.QUIZ_ANSWER, () => {
            this.renderAbilityBar();
        }, 'AbilityPlugin');
    },
    enable() {},
    disable() {},

    getCharges(key) {
        if (!currentUser || !currentUser.abilities || !currentUser.abilities[key]) return 0;
        return currentUser.abilities[key].charges || 0;
    },

    initAbilities(user) {
        if (!user) return;
        if (!user.abilities) user.abilities = {};
        if (!user.badgeStats) user.badgeStats = {};
        if (!user.badgeStats.abilitiesUsed) user.badgeStats.abilitiesUsed = {};
        Object.keys(this.DEFS).forEach(key => {
            if (user.abilities[key] === undefined) user.abilities[key] = { charges: 0, unlocked: false };
        });
    },

    getStatValues(user) {
        const bs = user.badgeStats || {};
        // Burst-Sessions (2+ Quizze in 1 h) und Tage mit 3+ Quizzen — aus der
        // History inkl. Archiv, sonst fiele der Wert nach dem Aufräumen unter den
        // chargesEarned-Wasserstand und es gäbe lange keine neuen Ladungen.
        const hs = computeHistoryStats(user.history, user.historyArchive);
        return {
            _fifty50Sessions: hs.burstSessions,
            activeDays3: hs.activeDays3,
            _phoneJokerUsed: (bs.abilitiesUsed && bs.abilitiesUsed.phoneJoker) || 0,
            highAverageQuizzes: bs.highAverageQuizzes || 0,
            totalQuizzes: bs.totalQuizzes || 0,
            currentStreak: bs.currentStreak || 0,
            uniqueQuestions: bs.uniqueQuestions || Object.keys(user.questionStats || {}).length,
            totalAnswers: user.totalAnswers || 0,
            perfectQuizzes: bs.perfectQuizzes || 0,
            marathonDays: bs.marathonDays || 0
        };
    },

    checkAbilityUnlocks(user) {
        if (!user) return;
        this.initAbilities(user);
        if (!user.chargesEarned) user.chargesEarned = {};
        const ab = user.abilities;
        const statValues = this.getStatValues(user);

        Object.entries(this.DEFS).forEach(([key, def]) => {
            if (!ab[key]) ab[key] = { charges: 0, unlocked: false };
            const statVal = statValues[def.earnStat] || 0;
            const totalEarned = Math.floor(statVal / (def.earnPer || 5));
            const previouslyEarned = user.chargesEarned[key] || 0;
            const newCharges = totalEarned - previouslyEarned;

            if (newCharges > 0) {
                ab[key].charges = (ab[key].charges || 0) + newCharges;
                user.chargesEarned[key] = totalEarned;
                Toast.show(`${def.icon} ${def.name}: +${newCharges} Ladung${newCharges > 1 ? 'en' : ''} verdient!`, 'success');
            }

            ab[key].unlocked = totalEarned > 0 || ab[key].unlocked || (ab[key].charges || 0) > 0;
        });
    },

    renderAbilityBar() {
        const bar = document.getElementById('abilityBar');
        if (!bar || !currentUser || !currentUser.abilities) { if (bar) bar.style.display = 'none'; return; }
        let html = '';
        let hasAny = false;
        const answered = typeof ClassicQuizPlugin !== 'undefined' && ClassicQuizPlugin._answered;
        Object.entries(this.DEFS).forEach(([key, def]) => {
            const ab = currentUser.abilities[key];
            if (!ab || !ab.unlocked) return;
            const charges = ab.charges || 0;
            if (charges <= 0) return;
            hasAny = true;
            // Nach der Antwort sind Frage-Fähigkeiten wirkungslos → ausgrauen
            const used = abilityUsedThisQuestion[key] || (def.perQuestion && answered);
            // Mouse-over erklärt auch die Reichweite (nur diese Frage vs. ganzes Quiz)
            const tip = sanitizeHTML(`${def.desc}\n${def.scope || ''}`.trim());
            html += `<button class="ability-btn ${used ? 'used' : 'available'}" onclick="useAbility('${key}')" title="${tip}">
                <span class="ability-icon">${def.icon}</span>
                <span class="ability-name">${def.name}</span>
                <span class="ability-charge">${charges}</span>
            </button>`;
        });
        if (hasAny) {
            bar.innerHTML = html;
            bar.style.display = '';
        } else {
            bar.style.display = 'none';
        }
    },

    useAbility(key) {
        if (!currentUser || !currentUser.abilities) return;
        const ab = currentUser.abilities[key];
        if (!ab || ab.charges <= 0 || abilityUsedThisQuestion[key]) return;
        const def = this.DEFS[key];
        if (!def) return;
        // Wirkt nur auf die aktuelle Frage? Dann nach der Antwort nicht mehr
        // zulassen — sonst wird eine Ladung ohne Wirkung verbraucht bzw. eine
        // bereits gewertete Frage nachträglich verändert.
        if (def.perQuestion && typeof ClassicQuizPlugin !== 'undefined' && ClassicQuizPlugin._answered) {
            Toast.show(`${def.icon} ${def.name}: Die Frage ist schon beantwortet.`, 'warning');
            return;
        }
        ab.charges--;
        abilityUsedThisQuestion[key] = true;
        AppState.abilities.usedThisQuestion[key] = true;
        // Badge-Zähler VOR dem Effekt — _refund() nimmt ihn sonst nicht
        // symmetrisch zurück (z.B. beim Abbrechen des Telefon-Dialogs).
        if (!currentUser.badgeStats) currentUser.badgeStats = {};
        if (!currentUser.badgeStats.abilitiesUsed) currentUser.badgeStats.abilitiesUsed = {};
        currentUser.badgeStats.abilitiesUsed[key] = (currentUser.badgeStats.abilitiesUsed[key] || 0) + 1;
        this._applyEffect(key);
        this.renderAbilityBar();
        EventBus.emit('ability:used', { ability: key, user: currentUser.name });
    },

    // Am Quizende melden, wenn ein aktivierter Schutz nie gebraucht wurde.
    // Keine Rückerstattung — aber der Spieler soll wissen, wo die Ladung blieb.
    _reportUnusedProtection() {
        if (typeof shieldActive !== 'undefined' && shieldActive) {
            Toast.show('🛡️ Schild wurde nicht gebraucht — du hattest keine falsche Antwort. Die Ladung ist aufgebraucht.', 'info');
        }
        if (typeof secondChanceArmed !== 'undefined' && secondChanceArmed) {
            Toast.show('🔄 2. Chance wurde nicht gebraucht — du hattest keine falsche Antwort. Die Ladung ist aufgebraucht.', 'info');
        }
    },

    // Mitspieler-Anteil des Team-Bonus: 3× XP für dessen nächstes Quiz.
    // Wird beim Quizstart eingelöst, damit er nicht beim bloßen Auswählen
    // des Spielers verfällt.
    _redeemPendingTeamBonus() {
        if (!currentUser) return;
        const pending = currentUser.pendingTeamBonusQuiz || 0;
        if (pending <= 0) return;
        currentUser.teamBonusActive = true;
        currentUser.pendingTeamBonusQuiz = pending - 1;
        if (currentUser.pendingTeamBonusQuiz <= 0) delete currentUser.pendingTeamBonusQuiz;
        Toast.show('👥 Team-Bonus eingelöst: 3× XP für dieses Quiz!', 'success');
    },

    // Zusatz-Hinweis zur Reichweite, verschwindet nach 4 Sekunden von selbst.
    // Für Schild/2. Chance wichtig: sie gelten NICHT nur für die aktuelle Frage.
    SCOPE_HINT_MS: 4000,
    _showScopeHint(key) {
        const def = this.DEFS[key];
        if (!def || !def.scope) return;
        Toast.show(`${def.icon} ${def.scope}`, 'info', this.SCOPE_HINT_MS);
    },

    // Ladung zurückgeben, wenn der Effekt nicht angewendet werden konnte
    // oder der Spieler abbricht. Nimmt auch den Badge-Zähler zurück.
    _refund(key) {
        if (!currentUser || !currentUser.abilities) return;
        const ab = currentUser.abilities[key];
        if (ab) ab.charges = (ab.charges || 0) + 1;
        abilityUsedThisQuestion[key] = false;
        if (AppState.abilities && AppState.abilities.usedThisQuestion) {
            AppState.abilities.usedThisQuestion[key] = false;
        }
        const used = currentUser.badgeStats && currentUser.badgeStats.abilitiesUsed;
        if (used && used[key] > 0) used[key]--;
        this.renderAbilityBar();
    },

    _applyEffect(key) {
        const q = currentQuizQuestions[currentQuestionIndex];
        if (!q) return;
        switch (key) {
            case 'fiftyFifty': {
                if (q.type !== QUESTION_TYPES.MULTIPLE_CHOICE) {
                    Toast.show('🎯 50/50 wirkt nur bei Multiple-Choice-Fragen — Ladung zurückerstattet.', 'warning');
                    this._refund('fiftyFifty');
                    return;
                }
                const answers = q.answers || [];
                const wrongIndices = answers.map((a, i) => (typeof a === 'object' && !a.correct) ? i : -1).filter(i => i >= 0);
                if (wrongIndices.length === 0) {
                    Toast.show('🎯 Hier gibt es keine falsche Antwort zum Entfernen — Ladung zurückerstattet.', 'warning');
                    this._refund('fiftyFifty');
                    return;
                }
                shuffleArray(wrongIndices);
                const toHide = wrongIndices.slice(0, 2);
                let hidden = 0;
                toHide.forEach(idx => {
                    const opt = document.querySelector(`.answer-checkbox[value="${idx}"]`);
                    if (opt) {
                        opt.closest('.answer-checkbox-container').style.opacity = '0.3';
                        opt.closest('.answer-checkbox-container').style.pointerEvents = 'none';
                        opt.checked = false;
                        hidden++;
                    }
                });
                if (hidden === 0) {
                    Toast.show('🎯 Antworten konnten nicht ausgeblendet werden — Ladung zurückerstattet.', 'warning');
                    this._refund('fiftyFifty');
                    return;
                }
                Toast.show(`🎯 50/50: ${hidden} falsche Antwort${hidden > 1 ? 'en' : ''} entfernt!`, 'info');
                break;
            }
            case 'skip':
                userAnswers.push({ questionId: q.questionId, correct: false, xp: 0, skipped: true });
                ClassicQuizPlugin.nextQuestion();
                Toast.show('⏭️ Frage übersprungen!', 'info');
                break;
            case 'hint': {
                const hintText = (q.hint || '').trim();
                if (!hintText && !q.hintMedia) {
                    Toast.show('💡 Für diese Frage ist kein Hinweis hinterlegt — Ladung zurückerstattet.', 'warning');
                    this._refund('hint');
                    return;
                }
                const container = document.getElementById('answersContainer');
                if (!container) {
                    Toast.show('💡 Hinweis konnte nicht angezeigt werden — Ladung zurückerstattet.', 'warning');
                    this._refund('hint');
                    return;
                }
                this.dismissHint();   // nie zwei Hinweis-Kästen gleichzeitig
                let hintHTML = `<div id="hintContainer" style="margin-top:15px;padding:15px;background:rgba(241,196,15,0.15);border:2px solid #f1c40f;border-radius:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:1.2rem;">💡</span><strong style="color:#f1c40f;">Hinweis</strong></div>`;
                if (hintText) hintHTML += `<div style="line-height:1.5;">${sanitizeHTML(hintText)}</div>`;
                if (q.hintMedia) {
                    const src = getMediaSource(q.hintMedia);
                    if (src && q.hintMedia.type === 'image') hintHTML += `<img src="${sanitizeHTML(src)}" style="max-width:100%;border-radius:8px;margin-top:10px;" onerror="this.style.display='none'">`;
                }
                hintHTML += `<button class="btn btn-small btn-secondary" onclick="dismissHint()" style="margin-top:10px;">Schließen</button></div>`;
                container.insertAdjacentHTML('afterend', hintHTML);
                break;
            }
            case 'doubleXP':
                doubleXPActive = true;
                AppState.abilities.doubleXPActive = true;
                Toast.show('✨ Doppel-XP aktiviert für diese Frage!', 'info');
                break;
            case 'shield':
                shieldActive = true;
                AppState.abilities.shieldActive = true;
                Toast.show('🛡️ Schild aktiviert! Kein XP-Verlust bei falscher Antwort.', 'info');
                this._showScopeHint('shield');
                break;
            case 'secondChance':
                secondChanceArmed = true;
                AppState.abilities.secondChanceArmed = true;
                Toast.show('🔄 2. Chance aktiviert! Bei falscher Antwort nochmal versuchen.', 'info');
                this._showScopeHint('secondChance');
                break;
            case 'swap':
                this._useSwap();
                return;
            case 'teamBonus':
                this._useTeamBonus();
                return;
            case 'phoneJoker':
                this._usePhoneJoker(q);
                return;
        }
    },

    _useSwap() {
        // Finde eine andere aktive Frage die noch nicht im Quiz vorkommt
        const usedIds = new Set(currentQuizQuestions.map(q => q.questionId));
        // Im Fokus-Quiz nur innerhalb der Fokus-Gruppe tauschen
        const cur = currentQuizQuestions[currentQuestionIndex];
        const focusGroup = focusQuizActive && cur ? cur._fileGroup : null;
        const available = questions.filter(q => q.active !== false && !usedIds.has(q.questionId) &&
            (!focusGroup || (q._fileGroup === focusGroup && !q.isCore)));
        if (available.length === 0) {
            Toast.show('🎲 Keine andere Frage verfügbar — Ladung zurückerstattet.', 'warning');
            this._refund('swap');
            return;
        }
        shuffleArray(available);
        currentQuizQuestions[currentQuestionIndex] = available[0];
        Toast.show('🎲 Frage getauscht!', 'info');
        ClassicQuizPlugin.displayQuestion();
    },

    _useTeamBonus() {
        const others = users.filter(u => u.name !== currentUser.name);
        if (others.length === 0) {
            Toast.show('👥 Keine anderen Spieler vorhanden — Ladung zurückerstattet.', 'warning');
            this._refund('teamBonus');
            return;
        }
        // Spieler-Auswahl Dialog
        const overlay = GameDialog._ensureOverlay();
        const playerBtns = others.map(u =>
            `<button class="btn" style="width:100%;margin-bottom:8px;padding:12px;" data-player="${sanitizeHTML(u.name)}">${sanitizeHTML(u.name)}</button>`
        ).join('');
        overlay.innerHTML = `
            <div style="background:var(--glass-bg,rgba(30,30,50,0.95));border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:30px;max-width:400px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:3rem;margin-bottom:10px;">👥</div>
                <h3 style="color:#f1c40f;margin:0 0 10px;">Team-Bonus</h3>
                <p style="color:#ddd;margin:0 0 20px;line-height:1.5;">3× XP für dich und einen Mitspieler!<br><small>Wähle deinen Teampartner:</small></p>
                <div id="teamBonusPlayerList">${playerBtns}</div>
                <button id="teamBonusCancel" class="btn btn-secondary" style="margin-top:8px;min-width:100px;">Abbrechen</button>
            </div>`;
        overlay.style.display = 'flex';
        const self = this;
        document.getElementById('teamBonusCancel').onclick = function() {
            GameDialog._close();
            self._refund('teamBonus');
        };
        document.querySelectorAll('#teamBonusPlayerList button').forEach(btn => {
            btn.onclick = function() {
                const targetName = this.dataset.player;
                const target = users.find(u => u.name === targetName);
                if (!target) return;
                GameDialog._close();
                // 3× XP für aktuellen Spieler — Rest dieses Quiz
                currentUser.teamBonusActive = true;
                // Mitspieler bekommt 3× XP in seinem nächsten Quiz
                target.pendingTeamBonusQuiz = (target.pendingTeamBonusQuiz || 0) + 1;
                Toast.show(`👥 Team-Bonus aktiviert!\n3× XP für dich, 3× XP für ${target.name} im nächsten Quiz!`, 'success');
                self._showScopeHint('teamBonus');
                self.renderAbilityBar();
            };
        });
    },

    _usePhoneJoker(question) {
        const others = users.filter(u => u.name !== currentUser.name);
        if (others.length === 0) {
            Toast.show('📞 Keine anderen Spieler vorhanden — Ladung zurückerstattet.', 'warning');
            this._refund('phoneJoker');
            return;
        }
        // Player selection dialog via GameDialog overlay
        const overlay = GameDialog._ensureOverlay();
        const playerBtns = others.map(u =>
            `<button class="btn" style="padding:10px 8px;font-size:0.9rem;" data-player="${sanitizeHTML(u.name)}">${sanitizeHTML(u.name)}</button>`
        ).join('');
        overlay.innerHTML = `
            <div style="background:var(--glass-bg,rgba(30,30,50,0.95));border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:30px;max-width:440px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:3rem;margin-bottom:10px;">📞</div>
                <h3 style="color:#f1c40f;margin:0 0 10px;">Telefon-Joker</h3>
                <p style="color:#ddd;margin:0 0 20px;line-height:1.5;">Wen möchtest du um Hilfe bitten?<br><small>Der Spieler bekommt die Frage beim nächsten Quiz. Bei richtig: 5× XP für euch beide!</small></p>
                <div id="phoneJokerPlayerList" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:300px;overflow-y:auto;padding-right:4px;">${playerBtns}</div>
                <button id="phoneJokerCancel" class="btn btn-secondary" style="margin-top:12px;min-width:100px;">Abbrechen</button>
            </div>`;
        overlay.style.display = 'flex';
        const self = this;
        // Cancel button
        document.getElementById('phoneJokerCancel').onclick = function() {
            GameDialog._close();
            self._refund('phoneJoker');
        };
        // Player buttons
        document.querySelectorAll('#phoneJokerPlayerList button').forEach(btn => {
            btn.onclick = function() {
                const targetName = this.dataset.player;
                const target = users.find(u => u.name === targetName);
                if (!target) return;
                GameDialog._close();
                // Save to sender
                if (!currentUser.sentPhoneJokers) currentUser.sentPhoneJokers = [];
                currentUser.sentPhoneJokers.push({
                    from: currentUser.name, targetName: target.name,
                    questionId: question.questionId, questionText: question.text,
                    date: new Date().toISOString(), resolved: false
                });
                // Save to target
                if (!target.pendingPhoneJoker) target.pendingPhoneJoker = [];
                target.pendingPhoneJoker.push({
                    from: currentUser.name, questionId: question.questionId,
                    questionText: question.text, date: new Date().toISOString()
                });
                Toast.show(`📞 ${target.name} bekommt die Frage beim nächsten Quiz!\nBei richtig: 5× XP Bonus für euch beide!`, 'success');
                // Skip question
                userAnswers.push({ questionId: question.questionId, correct: false, xp: 0, skipped: true, phoneJokerTo: target.name });
                ClassicQuizPlugin.nextQuestion();
            };
        });
    },

    dismissHint() {
        const h = document.getElementById('hintContainer');
        if (h) h.remove();
    },

    checkPendingJokers(user) {
        if (!user) return;
        // Apply pending joker bonus (set by cross-reference on import)
        if (user.pendingJokerBonus && user.pendingJokerBonus > 0) {
            const bonus = user.pendingJokerBonus;
            Toast.show(`📞 Telefon-Joker Bonus: +${bonus} XP!`, 'success');
            user.totalXP = (user.totalXP || 0) + bonus;
            user.pendingJokerBonus = 0;
            const lvl = calculateLevel(user.totalXP);
            user.level = lvl.level;
        }
        // Show pending (unresolved) joker notifications
        if (!user.pendingPhoneJoker || user.pendingPhoneJoker.length === 0) return;
        user.pendingPhoneJoker.filter(j => !j.resolved).forEach(j => {
            Toast.show(`📞 Telefon-Joker von ${j.from}:\n"${j.questionText}"`, 'info');
        });
    },

    checkPendingTeamBonus(user) {
        if (!user) return;
        // Altbestand: früher wurde dem Mitspieler ein pauschaler XP-Betrag
        // vorgemerkt. Wird weiter ausgezahlt, aber nicht mehr neu geschrieben.
        const bonus = Number(user.pendingTeamBonus) || 0;
        if (bonus > 0) {
            Toast.show(`🤝 Team-Bonus: +${bonus} XP von deinem Team!`, 'info');
            user.totalXP = (user.totalXP || 0) + bonus;
            const lvl = calculateLevel(user.totalXP);
            user.level = lvl.level;
        }
        if ('pendingTeamBonus' in user) delete user.pendingTeamBonus;
        // Neu: 3× XP für das nächste Quiz — Einlösung erst beim Quizstart
        const quizzes = user.pendingTeamBonusQuiz || 0;
        if (quizzes > 0) {
            Toast.show(`👥 Dein Team hat dir 3× XP geschenkt — gültig für ${quizzes === 1 ? 'dein nächstes Quiz' : `deine nächsten ${quizzes} Quizze`}!`, 'success');
        }
    }
};

// ── WHEEL PLUGIN (Glücksrad) ────────────────────────────────
