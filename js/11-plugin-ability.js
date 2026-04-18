// 11-plugin-ability.js
// AbilityPlugin - player abilities
// ============================================================

const AbilityPlugin = {
    name: 'AbilityPlugin',
    DEFS: {
        fiftyFifty:   { icon:'🎯', name:'50/50', desc:'Entfernt 2 falsche Antworten (Burst: 2 Quizze/h)', earnPer:1, earnStat:'_fifty50Sessions', passive:false },
        skip:         { icon:'⏭️', name:'Überspringen', desc:'Frage überspringen ohne Strafe', earnPer:10, earnStat:'totalQuizzes', passive:false },
        hint:         { icon:'💡', name:'Hinweis', desc:'Zeigt den Hinweistext an', earnPer:15, earnStat:'totalAnswers', passive:false },
        doubleXP:     { icon:'✨', name:'Doppel-XP', desc:'Doppelte XP für richtige Antwort', earnPer:1, earnStat:'perfectQuizzes', passive:false },
        shield:       { icon:'🛡️', name:'Schild', desc:'Schützt vor XP-Verlust bei falscher Antwort', earnPer:7, earnStat:'currentStreak', passive:true },
        secondChance: { icon:'🔄', name:'2. Chance', desc:'Bei falscher Antwort erneut versuchen', earnPer:3, earnStat:'currentStreak', passive:true },
        swap:         { icon:'🎲', name:'Tausch', desc:'Aktuelle Frage durch eine andere ersetzen', earnPer:4, earnStat:'activeDays3', passive:false },
        teamBonus:    { icon:'👥', name:'Team', desc:'3× XP für dich und einen Mitspieler', earnPer:3, earnStat:'_phoneJokerUsed', passive:false },
        phoneJoker:   { icon:'📞', name:'Telefon', desc:'Sende Frage an anderen Spieler (5× XP bei richtig)', earnPer:5, earnStat:'highAverageQuizzes', passive:false }
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
        }, 'AbilityPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_QUESTION, () => {
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
        const hist = (user.history || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
        // Burst-Sessions: 2+ Quizze innerhalb 1h ab Beginn des ersten Quiz der Gruppe
        let burstSessions = 0, i = 0;
        while (i < hist.length) {
            const sessionStart = new Date(hist[i].date).getTime();
            let j = i + 1;
            while (j < hist.length && new Date(hist[j].date).getTime() - sessionStart < 3600000) j++;
            burstSessions += Math.floor((j - i) / 2);
            i = (j > i + 1) ? j : i + 1;
        }
        // activeDays3: Tage mit 3+ Quizzen
        const dayCounts = {};
        hist.forEach(h => { const d = new Date(h.date).toDateString(); dayCounts[d] = (dayCounts[d] || 0) + 1; });
        const activeDays3 = Object.values(dayCounts).filter(c => c >= 3).length;
        return {
            _fifty50Sessions: burstSessions,
            activeDays3: activeDays3,
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
        Object.entries(this.DEFS).forEach(([key, def]) => {
            const ab = currentUser.abilities[key];
            if (!ab || !ab.unlocked) return;
            const charges = ab.charges || 0;
            if (charges <= 0) return;
            hasAny = true;
            const used = abilityUsedThisQuestion[key];
            const passive = def.passive ? ' (passiv)' : '';
            html += `<button class="ability-btn ${used ? 'used' : 'available'}" onclick="useAbility('${key}')" title="${def.desc}${passive}">
                <span class="ability-icon">${def.icon}</span>
                <span class="ability-name">${def.name}</span>
                <span class="ability-charges">${charges}×</span>
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
        ab.charges--;
        abilityUsedThisQuestion[key] = true;
        AppState.abilities.usedThisQuestion[key] = true;
        this._applyEffect(key);
        this.renderAbilityBar();
        EventBus.emit('ability:used', { ability: key, user: currentUser.name });
        // Update badge stats
        if (currentUser.badgeStats) {
            if (!currentUser.badgeStats.abilitiesUsed) currentUser.badgeStats.abilitiesUsed = {};
            currentUser.badgeStats.abilitiesUsed[key] = (currentUser.badgeStats.abilitiesUsed[key] || 0) + 1;
        }
    },

    _applyEffect(key) {
        const q = currentQuizQuestions[currentQuestionIndex];
        if (!q) return;
        switch (key) {
            case 'fiftyFifty': {
                if (q.type !== QUESTION_TYPES.MULTIPLE_CHOICE) { Toast.show('50/50 nur bei MC-Fragen!', 'warning'); return; }
                const answers = q.answers || [];
                const wrongIndices = answers.map((a, i) => (typeof a === 'object' && !a.correct) ? i : -1).filter(i => i >= 0);
                shuffleArray(wrongIndices);
                const toHide = wrongIndices.slice(0, 2);
                toHide.forEach(idx => {
                    const opt = document.querySelector(`.answer-checkbox[value="${idx}"]`);
                    if (opt) { opt.closest('.answer-checkbox-container').style.opacity = '0.3'; opt.closest('.answer-checkbox-container').style.pointerEvents = 'none'; opt.checked = false; }
                });
                Toast.show('🎯 50/50: 2 falsche Antworten entfernt!', 'info');
                break;
            }
            case 'skip':
                userAnswers.push({ questionId: q.questionId, correct: false, xp: 0, skipped: true });
                ClassicQuizPlugin.nextQuestion();
                Toast.show('⏭️ Frage übersprungen!', 'info');
                break;
            case 'hint': {
                const hintText = q.hint || 'Kein Hinweis verfügbar.';
                let hintHTML = `<div id="hintContainer" style="margin-top:15px;padding:15px;background:rgba(241,196,15,0.15);border:2px solid #f1c40f;border-radius:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:1.2rem;">💡</span><strong style="color:#f1c40f;">Hinweis</strong></div>
                    <div style="line-height:1.5;">${sanitizeHTML(hintText)}</div>`;
                if (q.hintMedia) {
                    const src = getMediaSource(q.hintMedia);
                    if (src && q.hintMedia.type === 'image') hintHTML += `<img src="${src}" style="max-width:100%;border-radius:8px;margin-top:10px;" onerror="this.style.display='none'">`;
                }
                hintHTML += `<button class="btn btn-small btn-secondary" onclick="dismissHint()" style="margin-top:10px;">Schließen</button></div>`;
                const container = document.getElementById('answersContainer');
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
                break;
            case 'secondChance':
                secondChanceArmed = true;
                AppState.abilities.secondChanceArmed = true;
                Toast.show('🔄 2. Chance aktiviert! Bei falscher Antwort nochmal versuchen.', 'info');
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
        const available = questions.filter(q => q.active !== false && !usedIds.has(q.questionId));
        if (available.length === 0) {
            Toast.show('Keine anderen Fragen verfügbar!', 'warning');
            // Refund
            const ab = currentUser.abilities.swap;
            if (ab) { ab.charges++; }
            abilityUsedThisQuestion.swap = false;
            this.renderAbilityBar();
            return;
        }
        shuffleArray(available);
        currentQuizQuestions[currentQuestionIndex] = available[0];
        Toast.show('🎲 Frage getauscht!', 'info');
        ClassicQuizPlugin.showQuestion();
    },

    _useTeamBonus() {
        const others = users.filter(u => u.name !== currentUser.name);
        if (others.length === 0) {
            Toast.show('Keine anderen Spieler vorhanden.', 'warning');
            const ab = currentUser.abilities.teamBonus;
            if (ab) { ab.charges++; }
            abilityUsedThisQuestion.teamBonus = false;
            this.renderAbilityBar();
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
            const ab = currentUser.abilities.teamBonus;
            if (ab) { ab.charges++; }
            abilityUsedThisQuestion.teamBonus = false;
            self.renderAbilityBar();
        };
        document.querySelectorAll('#teamBonusPlayerList button').forEach(btn => {
            btn.onclick = function() {
                const targetName = this.dataset.player;
                const target = users.find(u => u.name === targetName);
                if (!target) return;
                GameDialog._close();
                // 3× XP für aktuellen Spieler aktivieren
                currentUser.teamBonusActive = true;
                // Bonus für Mitspieler vormerken (wird beim nächsten Laden angewendet)
                target.pendingTeamBonus = (target.pendingTeamBonus || 0) + 50;
                Toast.show(`👥 Team-Bonus aktiviert!\n3× XP für dich, +50 Bonus-XP für ${target.name}!`, 'success');
                self.renderAbilityBar();
            };
        });
    },

    _usePhoneJoker(question) {
        const others = users.filter(u => u.name !== currentUser.name);
        if (others.length === 0) {
            Toast.show('Keine anderen Spieler vorhanden.', 'warning');
            // Refund: charges were already decremented in useAbility
            const ab = currentUser.abilities.phoneJoker;
            if (ab) { ab.charges++; }
            abilityUsedThisQuestion.phoneJoker = false;
            this.renderAbilityBar();
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
            // Refund
            const ab = currentUser.abilities.phoneJoker;
            if (ab) { ab.charges++; }
            abilityUsedThisQuestion.phoneJoker = false;
            self.renderAbilityBar();
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
        if (!user || !user.pendingTeamBonus) return;
        const bonus = user.pendingTeamBonus;
        if (bonus > 0) {
            Toast.show(`🤝 Team-Bonus: +${bonus} XP von deinem Team!`, 'info');
            user.totalXP = (user.totalXP || 0) + bonus;
            user.pendingTeamBonus = 0;
            const lvl = calculateLevel(user.totalXP);
            user.level = lvl.level;
        }
    }
};

// ── WHEEL PLUGIN (Glücksrad) ────────────────────────────────
