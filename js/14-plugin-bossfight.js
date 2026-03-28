// 14-plugin-bossfight.js
// BossFightPlugin - boss fight mini-game
// ============================================================

const BossFightPlugin = {
    name: 'BossFightPlugin',
    BOSS_TYPES: [
        { id: 'dragon', name: 'Drache des Wissens', sprite: '🐉', color: '#e74c3c',
          abilities: [
            { id: 'firebreath', name: '🔥 Feuerhauch',       desc: '30% Chance: ein Fehler kostet 2 Leben!' },
            { id: 'scales',     name: '🐉 Drachenschuppen',  desc: 'Der Drache heilt sich wenn er schwach ist!' }
          ]
        },
        { id: 'sphinx', name: 'Sphinx der Rätsel', sprite: '🦁', color: '#9b59b6',
          abilities: [
            { id: 'confusion', name: '🌀 Verwirrung',   desc: 'Die Antworten tanzen – klick wenn du kannst!' },
            { id: 'riddle',    name: '👁️ Sphinxrätsel', desc: 'Eine Antwort versteckt sich... aber ist noch klickbar!' }
          ]
        },
        { id: 'golem', name: 'Golem der Logik', sprite: '🗿', color: '#3498db',
          abilities: [
            { id: 'stonewall', name: '🛡️ Steinwall',       desc: 'Über 50% HP absorbiert der Golem halben Schaden!' },
            { id: 'chain',     name: '⚡ Kettenreaktion',   desc: '3 Treffer in Folge – der nächste Schlag ist doppelt!' }
          ]
        },
        { id: 'phoenix', name: 'Phönix der Flammen', sprite: '🔥', color: '#e67e22',
          abilities: [
            { id: 'rebirth',    name: '♻️ Wiedergeburt', desc: 'Der Phönix erhebt sich aus der Asche mit 25% HP!' },
            { id: 'firestorm',  name: '🌪️ Feuersturm',   desc: 'Die nächste falsche Antwort verbrennt doppelt!' }
          ]
        },
        { id: 'kraken', name: 'Krake des Abgrunds', sprite: '🐙', color: '#1abc9c',
          abilities: [
            { id: 'inkcloud',  name: '🌊 Tintenwolke',    desc: 'Alles verschwimmt – vertrau deinem Instinkt!' },
            { id: 'tentacle',  name: '🐙 Tentakelgriff',  desc: 'Ein Tentakel greift nach deinem Leben!' }
          ]
        }
    ],
    ATTACK_ICONS: ['⚔️','💥','🔥','⚡','💀','☄️','🌪️','🗡️'],
    _state: {
        active: false, hp: 100, maxHP: 100, lives: 3, maxLives: 3,
        questionIndex: 0, questions: [], boss: null, xpEarned: 0,
        // ability state
        consecutiveCorrect: 0,
        doubleHit: false,
        phoenixRevived: false,
        scalesUsed: false,
        tentacleUsed: false,
        feuersturmActive: false,
        // intervals
        _colorInterval: null,
        _shuffleInterval: null,
    },

    init() {},
    enable() {},
    disable() {},

    getBossQuestions() {
        const active = questions.filter(q => q.active !== false && q.type === QUESTION_TYPES.MULTIPLE_CHOICE);
        if (active.length < 5) return questions.filter(q => q.active !== false).slice(0, 10);
        const shuffled = [...active];
        shuffleArray(shuffled);
        return shuffled.slice(0, Math.min(15, shuffled.length));
    },

    start() {
        const mg = getMG();
        const s = this._state;
        s.active = true;
        s.maxHP = mg.bossFight.hp || CONFIG.MINI_GAMES.BOSS_DEFAULT_HP;
        s.hp = s.maxHP;
        s.maxLives = mg.bossFight.lives || 3;
        s.lives = s.maxLives;
        s.questionIndex = 0;
        s.xpEarned = 0;
        s.questions = this.getBossQuestions();
        // reset ability state
        s.consecutiveCorrect = 0;
        s.doubleHit = false;
        s.phoenixRevived = false;
        s.scalesUsed = false;
        s.tentacleUsed = false;
        s.feuersturmActive = false;
        s._colorInterval = null;
        s._shuffleInterval = null;
        if (s.questions.length === 0) { Toast.show('Keine Fragen für Boss-Fight verfügbar!', 'warning'); return; }
        s.boss = this.BOSS_TYPES[Math.floor(Math.random() * this.BOSS_TYPES.length)];
        document.getElementById('bossTitle').textContent = '⚔️ BOSS-FIGHT';
        document.getElementById('bossSprite').textContent = s.boss.sprite;
        document.getElementById('bossSprite').style.fontSize = '5rem';
        document.getElementById('bossName').textContent = s.boss.name;
        document.getElementById('bossHpFill').style.width = '100%';
        document.getElementById('bossHpFill').style.background = `linear-gradient(90deg, ${s.boss.color}, ${s.boss.color}88)`;
        document.getElementById('bossHpText').textContent = `${s.hp} / ${s.maxHP}`;
        document.getElementById('bossCloseBtn').style.display = 'none';
        document.getElementById('bossEffectText').textContent = '';
        document.getElementById('bossAbilities').innerHTML = '';
        this._renderHearts();
        document.getElementById('bossOverlay').classList.add('active');
        this.nextQuestion();
    },

    _renderHearts() {
        const s = this._state;
        let html = '';
        for (let i = 0; i < s.maxLives; i++) html += i < s.lives ? '❤️' : '🖤';
        document.getElementById('bossPlayerHearts').innerHTML = html;
    },

    _showAbilityNotification(ability) {
        const s = this._state;
        const el = document.getElementById('bossAbilities');
        el.innerHTML = `<div style="background:rgba(0,0,0,0.45);border:2px solid ${s.boss.color};border-radius:8px;padding:8px 12px;margin-top:8px;text-align:center;animation:fadeIn .3s;">
            <div style="font-weight:700;color:${s.boss.color};">${ability.name}</div>
            <div style="font-size:0.83em;color:#ddd;margin-top:3px;">${ability.desc}</div>
        </div>`;
        setTimeout(() => { if (el) el.innerHTML = ''; }, 3000);
    },

    _clearIntervals() {
        const s = this._state;
        if (s._colorInterval)   { clearInterval(s._colorInterval);   s._colorInterval = null; }
        if (s._shuffleInterval) { clearInterval(s._shuffleInterval); s._shuffleInterval = null; }
    },

    _resetColors() {
        document.querySelectorAll('.boss-answer-btn').forEach(b => b.style.color = '');
        const qt = document.getElementById('bossQuestionText');
        if (qt) qt.style.color = '';
    },

    _shuffleButtons() {
        const area = document.getElementById('bossAnswerArea');
        const buttons = Array.from(area.children);
        shuffleArray(buttons);
        buttons.forEach(b => area.appendChild(b));
    },

    _applyBossAbilitiesOnQuestion() {
        const s = this._state;
        const boss = s.boss;
        if (!boss) return;
        const qNum = s.questionIndex; // 0-based, current question index

        // ── Sphinx ──────────────────────────────────────────────────
        if (boss.id === 'sphinx') {
            // Verwirrung: every question — shuffle buttons every 2s
            s._shuffleInterval = setInterval(() => this._shuffleButtons(), 2000);
            if (qNum === 0) this._showAbilityNotification(boss.abilities[0]);

            // Sphinxrätsel: every 5 questions — hide one random button (visibility:hidden)
            if (qNum > 0 && qNum % 5 === 0) {
                setTimeout(() => {
                    const btns = document.querySelectorAll('.boss-answer-btn');
                    if (btns.length > 0) {
                        btns[Math.floor(Math.random() * btns.length)].style.visibility = 'hidden';
                        this._showAbilityNotification(boss.abilities[1]);
                    }
                }, 150);
            }
        }

        // ── Phönix ──────────────────────────────────────────────────
        if (boss.id === 'phoenix') {
            // Feuersturm: every 4 questions — arm trap for next wrong answer
            if (qNum > 0 && qNum % 4 === 0) {
                s.feuersturmActive = true;
                this._showAbilityNotification(boss.abilities[1]);
            }
        }

        // ── Krake ───────────────────────────────────────────────────
        if (boss.id === 'kraken') {
            // Tintenwolke: every 4 questions — color-cycle buttons + question text
            if (qNum > 0 && qNum % 4 === 0) {
                const rndColor = () => `hsl(${Math.random() * 360},100%,65%)`;
                s._colorInterval = setInterval(() => {
                    document.querySelectorAll('.boss-answer-btn').forEach(b => b.style.color = rndColor());
                    const qt = document.getElementById('bossQuestionText');
                    if (qt) qt.style.color = rndColor();
                }, 300);
                this._showAbilityNotification(boss.abilities[0]);
            }
        }

        // ── Golem ───────────────────────────────────────────────────
        if (boss.id === 'golem') {
            // Steinwall: inform player at fight start
            if (qNum === 0) this._showAbilityNotification(boss.abilities[0]);
            // Kettenreaktion: inform player when double-hit is ready
            if (s.doubleHit) this._showAbilityNotification(boss.abilities[1]);
        }
    },

    nextQuestion() {
        const s = this._state;
        if (!s.active) return;
        this._clearIntervals();
        this._resetColors();
        if (s.hp <= 0) { this._victory(); return; }
        if (s.lives <= 0) { this._defeat(); return; }
        if (s.questionIndex >= s.questions.length) {
            shuffleArray(s.questions);
            s.questionIndex = 0;
        }
        const q = s.questions[s.questionIndex];
        document.getElementById('bossQuestionText').innerHTML = sanitizeHTML(q.text);
        const answers = q.answers || [];
        const indices = answers.map((_, i) => i);
        shuffleArray(indices);
        let html = '';
        indices.forEach(i => {
            const ans = answers[i];
            const text = typeof ans === 'string' ? ans : (ans.text || '');
            html += `<button class="boss-answer-btn" onclick="BossFightPlugin.submitAnswer(${i})">${sanitizeHTML(text)}</button>`;
        });
        document.getElementById('bossAnswerArea').innerHTML = html;
        document.getElementById('bossQuestionCard').style.display = '';
        this._applyBossAbilitiesOnQuestion();
    },

    submitAnswer(idx) {
        const s = this._state;
        const q = s.questions[s.questionIndex];
        if (!q) return;

        // Stop all visual effects immediately on click
        this._clearIntervals();
        this._resetColors();
        document.querySelectorAll('.boss-answer-btn').forEach(b => {
            b.disabled = true;
            b.style.visibility = 'visible'; // restore hidden riddle button
        });

        const answers = q.answers || [];
        const ans = answers[idx];
        const isCorrect = typeof ans === 'object' && ans.correct;

        if (isCorrect) {
            let dmg = Math.round(s.maxHP * (0.15 + Math.random() * 0.1));

            // 🗿 Golem — Steinwall: halve damage while HP > 50%
            if (s.boss.id === 'golem' && s.hp > s.maxHP * 0.5) {
                dmg = Math.round(dmg / 2);
                const effect = document.getElementById('bossEffectText');
                effect.textContent = '🛡️ Steinwall! Schaden halbiert.';
                effect.style.color = '#3498db';
            }

            // 🗿 Golem — Kettenreaktion
            if (s.boss.id === 'golem') {
                if (s.doubleHit) {
                    dmg *= 2;
                    s.doubleHit = false;
                    s.consecutiveCorrect = 0;
                } else {
                    s.consecutiveCorrect++;
                    if (s.consecutiveCorrect >= 3) {
                        s.doubleHit = true;
                        s.consecutiveCorrect = 0;
                    }
                }
            }

            s.hp = Math.max(0, s.hp - dmg);
            s.xpEarned += getMG().xpPerCorrect || 5;
            document.getElementById('bossHpFill').style.width = ((s.hp / s.maxHP) * 100) + '%';
            document.getElementById('bossHpText').textContent = `${s.hp} / ${s.maxHP}`;

            // 🐉 Dragon — Drachenschuppen: heal 15% once when HP < 30%
            if (s.boss.id === 'dragon' && s.hp < s.maxHP * 0.3 && !s.scalesUsed) {
                s.scalesUsed = true;
                const heal = Math.round(s.maxHP * 0.15);
                s.hp = Math.min(s.maxHP, s.hp + heal);
                document.getElementById('bossHpFill').style.width = ((s.hp / s.maxHP) * 100) + '%';
                document.getElementById('bossHpText').textContent = `${s.hp} / ${s.maxHP}`;
                this._showAbilityNotification(s.boss.abilities[1]);
            }

            // 🔥 Phoenix — Wiedergeburt: revive once at 25% HP
            if (s.boss.id === 'phoenix' && s.hp <= 0 && !s.phoenixRevived) {
                s.phoenixRevived = true;
                s.hp = Math.round(s.maxHP * 0.25);
                document.getElementById('bossHpFill').style.width = ((s.hp / s.maxHP) * 100) + '%';
                document.getElementById('bossHpText').textContent = `${s.hp} / ${s.maxHP}`;
                this._showAbilityNotification(s.boss.abilities[0]);
            }

            // 🐙 Kraken — Tentakelgriff: steal 1 life once when HP < 40%
            if (s.boss.id === 'kraken' && s.hp < s.maxHP * 0.4 && !s.tentacleUsed && s.lives > 1) {
                s.tentacleUsed = true;
                s.lives = Math.max(1, s.lives - 1);
                this._renderHearts();
                this._showAbilityNotification(s.boss.abilities[1]);
            }

            this._animateHit(dmg);
        } else {
            // Wrong answer
            let livesLost = 1;

            // 🐉 Dragon — Feuerhauch: 30% chance to lose 2 lives
            if (s.boss.id === 'dragon' && Math.random() < 0.3) {
                livesLost = 2;
                this._showAbilityNotification(s.boss.abilities[0]);
            }

            // 🔥 Phoenix — Feuersturm: next wrong answer costs 2 lives
            if (s.boss.id === 'phoenix' && s.feuersturmActive) {
                livesLost = 2;
                s.feuersturmActive = false;
                this._showAbilityNotification(s.boss.abilities[1]);
            }

            // 🗿 Golem — reset streak on wrong answer
            if (s.boss.id === 'golem') {
                s.consecutiveCorrect = 0;
                s.doubleHit = false;
            }

            s.lives = Math.max(0, s.lives - livesLost);
            this._renderHearts();
            this._animateAttack(livesLost);
        }

        s.questionIndex++;
        setTimeout(() => this.nextQuestion(), 1200);
    },

    _animateHit(dmg) {
        const sprite = document.getElementById('bossSprite');
        const effect = document.getElementById('bossEffectText');
        sprite.style.transform = 'scale(0.8) rotate(-10deg)';
        effect.textContent = `⚔️ -${dmg} HP!`;
        effect.style.color = '#2ecc71';
        setTimeout(() => { sprite.style.transform = ''; }, 400);
    },

    _animateAttack(livesLost = 1) {
        const effect = document.getElementById('bossEffectText');
        const icon = this.ATTACK_ICONS[Math.floor(Math.random() * this.ATTACK_ICONS.length)];
        const hearts = livesLost > 1 ? `-${livesLost} ❤️❤️` : '-1 ❤️';
        effect.textContent = `${icon} Boss greift an! ${hearts}`;
        effect.style.color = '#e74c3c';
        document.getElementById('bossSprite').style.transform = 'scale(1.3)';
        setTimeout(() => { document.getElementById('bossSprite').style.transform = ''; }, 400);
    },

    _victory() {
        const s = this._state;
        this._clearIntervals();
        this._resetColors();
        const winXP = getMG().bossFight.winXP || 100;
        s.xpEarned += winXP;
        document.getElementById('bossQuestionCard').innerHTML = `<div style="text-align:center;padding:30px;"><div style="font-size:3rem;">🏆</div><h3 style="color:#2ecc71;">Boss besiegt!</h3><p>+${s.xpEarned} XP verdient!</p></div>`;
        document.getElementById('bossCloseBtn').style.display = '';
        const abortBtn = document.getElementById('bossAbortBtn');
        if (abortBtn) abortBtn.style.display = 'none';
        document.getElementById('bossEffectText').textContent = '💀 K.O.!';
        applyMiniGameXP(s.xpEarned);
        if (currentUser && currentUser.badgeStats) {
            currentUser.badgeStats.bossKills = (currentUser.badgeStats.bossKills || 0) + 1;
        }
        s.active = false;
    },

    _defeat() {
        const s = this._state;
        this._clearIntervals();
        this._resetColors();
        document.getElementById('bossQuestionCard').innerHTML = `<div style="text-align:center;padding:30px;"><div style="font-size:3rem;">💔</div><h3 style="color:#e74c3c;">Niederlage!</h3><p>+${s.xpEarned} XP trotzdem verdient.</p></div>`;
        document.getElementById('bossCloseBtn').style.display = '';
        const abortBtn = document.getElementById('bossAbortBtn');
        if (abortBtn) abortBtn.style.display = 'none';
        document.getElementById('bossEffectText').textContent = '';
        applyMiniGameXP(s.xpEarned);
        if (currentUser && currentUser.badgeStats) {
            currentUser.badgeStats.bossAttempts = (currentUser.badgeStats.bossAttempts || 0) + 1;
        }
        s.active = false;
    },

    abort() {
        if (!this._state.active) return;
        GameDialog.showConfirm(
            '⚔️',
            'Boss-Fight abbrechen?',
            'Du verlässt den Kampf. Keine XP werden vergeben.',
            () => { BossFightPlugin.close(); }
        );
    },

    close() {
        this._clearIntervals();
        this._resetColors();
        this._state.active = false;
        const abortBtn = document.getElementById('bossAbortBtn');
        if (abortBtn) abortBtn.style.display = '';
        document.getElementById('bossOverlay').classList.remove('active');
        window._mgTestMode = false;
    }
};
