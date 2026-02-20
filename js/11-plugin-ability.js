// 11-plugin-ability.js
// AbilityPlugin - player abilities
// ============================================================

const AbilityPlugin = {
    name: 'AbilityPlugin',
    DEFS: {
        fiftyFifty: { icon:'🎯', name:'50/50', desc:'Entfernt 2 falsche Antworten', earnPer:3, passive:false },
        skip:       { icon:'⏭️', name:'Überspringen', desc:'Frage überspringen ohne Strafe', earnPer:5, passive:false },
        hint:       { icon:'💡', name:'Hinweis', desc:'Zeigt den Hinweistext an', earnPer:4, passive:false },
        doubleXP:   { icon:'✨', name:'Doppel-XP', desc:'Doppelte XP für richtige Antwort', earnPer:6, passive:false },
        shield:     { icon:'🛡️', name:'Schild', desc:'Schützt vor XP-Verlust bei falscher Antwort', earnPer:7, passive:true },
        secondChance:{ icon:'🔄', name:'2. Chance', desc:'Bei falscher Antwort erneut versuchen', earnPer:8, passive:true },
        phoneJoker: { icon:'📞', name:'Telefon', desc:'Sende Frage an anderen Spieler (5× XP bei richtig)', earnPer:5, passive:false }
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

    checkAbilityUnlocks(user) {
        if (!user) return;
        this.initAbilities(user);
        const totalCorrect = user.correctAnswers || 0;
        Object.entries(this.DEFS).forEach(([key, def]) => {
            const needed = def.earnPer || 5;
            const newCharges = Math.floor(totalCorrect / needed);
            const used = user.abilities[key].used || 0;
            user.abilities[key].charges = Math.max(0, newCharges - used);
            user.abilities[key].unlocked = newCharges > 0;
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
            const disabled = used || charges <= 0 ? 'disabled' : '';
            const passive = def.passive ? ' (passiv)' : '';
            html += `<button class="ability-btn ${disabled ? 'ability-used' : ''}" onclick="useAbility('${key}')" ${disabled} title="${def.desc}${passive}">
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
        ab.used = (ab.used || 0) + 1;
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
            case 'phoneJoker':
                this._usePhoneJoker(q);
                return;
        }
    },

    _usePhoneJoker(question) {
        const others = users.filter(u => u.name !== currentUser.name);
        if (others.length === 0) {
            Toast.show('Keine anderen Spieler vorhanden.', 'warning');
            // Refund: charges were already decremented in useAbility
            const ab = currentUser.abilities.phoneJoker;
            if (ab) { ab.charges++; ab.used = Math.max(0, (ab.used || 0) - 1); }
            abilityUsedThisQuestion.phoneJoker = false;
            this.renderAbilityBar();
            return;
        }
        // Player selection dialog via GameDialog overlay
        const overlay = GameDialog._ensureOverlay();
        const playerBtns = others.map(u =>
            `<button class="btn" style="width:100%;margin-bottom:8px;padding:12px;" data-player="${sanitizeHTML(u.name)}">${sanitizeHTML(u.name)}</button>`
        ).join('');
        overlay.innerHTML = `
            <div style="background:var(--glass-bg,rgba(30,30,50,0.95));border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:30px;max-width:400px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:3rem;margin-bottom:10px;">📞</div>
                <h3 style="color:#f1c40f;margin:0 0 10px;">Telefon-Joker</h3>
                <p style="color:#ddd;margin:0 0 20px;line-height:1.5;">Wen möchtest du um Hilfe bitten?<br><small>Der Spieler bekommt die Frage beim nächsten Quiz. Bei richtig: 5× XP für euch beide!</small></p>
                <div id="phoneJokerPlayerList">${playerBtns}</div>
                <button id="phoneJokerCancel" class="btn btn-secondary" style="margin-top:8px;min-width:100px;">Abbrechen</button>
            </div>`;
        overlay.style.display = 'flex';
        const self = this;
        // Cancel button
        document.getElementById('phoneJokerCancel').onclick = function() {
            GameDialog._close();
            // Refund
            const ab = currentUser.abilities.phoneJoker;
            if (ab) { ab.charges++; ab.used = Math.max(0, (ab.used || 0) - 1); }
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
                Toast.show(`📞 ${target.name} bekommt die Frage beim nächsten Quiz!\nBei richtig: 5× XP Bonus für euch beide!`, 'success', 5000);
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
            Toast.show(`📞 Telefon-Joker Bonus: +${bonus} XP!`, 'success', 5000);
            user.totalXP = (user.totalXP || 0) + bonus;
            user.pendingJokerBonus = 0;
            const lvl = calculateLevel(user.totalXP);
            user.level = lvl.level;
        }
        // Show pending (unresolved) joker notifications
        if (!user.pendingPhoneJoker || user.pendingPhoneJoker.length === 0) return;
        user.pendingPhoneJoker.filter(j => !j.resolved).forEach(j => {
            Toast.show(`📞 Telefon-Joker von ${j.from}:\n"${j.questionText}"`, 'info', 8000);
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
