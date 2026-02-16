// 14-plugin-bossfight.js
// BossFightPlugin - boss fight mini-game
// ============================================================

const BossFightPlugin = {
    name: 'BossFightPlugin',
    BOSS_TYPES: [
        { name: 'Drache des Wissens', sprite: '🐉', color: '#e74c3c' },
        { name: 'Sphinx der Rätsel', sprite: '🦁', color: '#9b59b6' },
        { name: 'Golem der Logik', sprite: '🗿', color: '#3498db' },
        { name: 'Phönix der Flammen', sprite: '🔥', color: '#e67e22' },
        { name: 'Krake des Abgrunds', sprite: '🐙', color: '#1abc9c' }
    ],
    ATTACK_ICONS: ['⚔️','💥','🔥','⚡','💀','☄️','🌪️','🗡️'],
    _state: { active: false, hp: 100, maxHP: 100, lives: 3, maxLives: 3, questionIndex: 0, questions: [], boss: null, xpEarned: 0 },

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
        if (s.questions.length === 0) { Toast.show('Keine Fragen für Boss-Fight verfügbar!', 'warning'); return; }
        // Random boss
        s.boss = this.BOSS_TYPES[Math.floor(Math.random() * this.BOSS_TYPES.length)];
        // UI
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
        // Hearts
        this._renderHearts();
        document.getElementById('bossOverlay').classList.add('active');
        this.nextQuestion();
    },

    _renderHearts() {
        const s = this._state;
        let html = '';
        for (let i = 0; i < s.maxLives; i++) {
            html += i < s.lives ? '❤️' : '🖤';
        }
        document.getElementById('bossPlayerHearts').innerHTML = html;
    },

    nextQuestion() {
        const s = this._state;
        if (s.hp <= 0) { this._victory(); return; }
        if (s.lives <= 0) { this._defeat(); return; }
        if (s.questionIndex >= s.questions.length) {
            // Recycle questions
            shuffleArray(s.questions);
            s.questionIndex = 0;
        }
        const q = s.questions[s.questionIndex];
        document.getElementById('bossQuestionText').innerHTML = sanitizeHTML(q.text);
        // Answers
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
    },

    submitAnswer(idx) {
        const s = this._state;
        const q = s.questions[s.questionIndex];
        if (!q) return;
        const answers = q.answers || [];
        const ans = answers[idx];
        const isCorrect = typeof ans === 'object' && ans.correct;
        // Disable buttons
        document.querySelectorAll('.boss-answer-btn').forEach(b => b.disabled = true);
        // Highlight
        document.querySelectorAll('.boss-answer-btn').forEach((btn, bi) => {
            // Find actual index from button order
            const isThisCorrect = typeof answers[bi] === 'object' && answers[bi].correct;
        });
        if (isCorrect) {
            const dmg = Math.round(s.maxHP * (0.15 + Math.random() * 0.1));
            s.hp = Math.max(0, s.hp - dmg);
            const xp = getMG().xpPerCorrect || 5;
            s.xpEarned += xp;
            document.getElementById('bossHpFill').style.width = ((s.hp / s.maxHP) * 100) + '%';
            document.getElementById('bossHpText').textContent = `${s.hp} / ${s.maxHP}`;
            this._animateHit(dmg);
        } else {
            s.lives--;
            this._renderHearts();
            this._animateAttack();
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

    _animateAttack() {
        const effect = document.getElementById('bossEffectText');
        const icon = this.ATTACK_ICONS[Math.floor(Math.random() * this.ATTACK_ICONS.length)];
        effect.textContent = `${icon} Boss greift an! -1 ❤️`;
        effect.style.color = '#e74c3c';
        document.getElementById('bossSprite').style.transform = 'scale(1.3)';
        setTimeout(() => { document.getElementById('bossSprite').style.transform = ''; }, 400);
    },

    _victory() {
        const s = this._state;
        const winXP = getMG().bossFight.winXP || 100;
        s.xpEarned += winXP;
        document.getElementById('bossQuestionCard').innerHTML = `<div style="text-align:center;padding:30px;"><div style="font-size:3rem;">🏆</div><h3 style="color:#2ecc71;">Boss besiegt!</h3><p>+${s.xpEarned} XP verdient!</p></div>`;
        document.getElementById('bossCloseBtn').style.display = '';
        document.getElementById('bossEffectText').textContent = '💀 K.O.!';
        applyMiniGameXP(s.xpEarned);
        if (currentUser && currentUser.badgeStats) {
            currentUser.badgeStats.bossKills = (currentUser.badgeStats.bossKills || 0) + 1;
        }
        s.active = false;
    },

    _defeat() {
        const s = this._state;
        document.getElementById('bossQuestionCard').innerHTML = `<div style="text-align:center;padding:30px;"><div style="font-size:3rem;">💔</div><h3 style="color:#e74c3c;">Niederlage!</h3><p>+${s.xpEarned} XP trotzdem verdient.</p></div>`;
        document.getElementById('bossCloseBtn').style.display = '';
        document.getElementById('bossEffectText').textContent = '';
        applyMiniGameXP(s.xpEarned);
        if (currentUser && currentUser.badgeStats) {
            currentUser.badgeStats.bossAttempts = (currentUser.badgeStats.bossAttempts || 0) + 1;
        }
        s.active = false;
    },

    close() {
        this._state.active = false;
        document.getElementById('bossOverlay').classList.remove('active');
        window._mgTestMode = false;
    }
};
