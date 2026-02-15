// 15-plugin-wissensturm.js
// WissensturmPlugin - tower game
// ============================================================

const WissensturmPlugin = {
    name: 'WissensturmPlugin',
    _state: { active: false, height: 0, xp: 0, record: 0, blocks: [], questions: [], questionIndex: 0, pendingBlock: false, animFrame: null },

    init() {},
    enable() {},
    disable() {},

    start() {
        if (!currentUser) { Toast.show('Bitte erst einen Benutzer wählen!', 'warning'); return; }
        const s = this._state;
        s.active = true;
        s.height = 0;
        s.xp = 0;
        s.blocks = [];
        s.pendingBlock = false;
        s.record = currentUser.towerRecord || 0;
        // Questions
        const active = questions.filter(q => q.active !== false);
        s.questions = [...active];
        shuffleArray(s.questions);
        s.questionIndex = 0;
        // UI
        document.getElementById('towerHeight').textContent = '0';
        document.getElementById('towerXP').textContent = '0';
        document.getElementById('towerRecord').textContent = s.record;
        document.getElementById('towerPlaceBtn').style.display = 'none';
        document.getElementById('towerQuestionCard').style.display = 'none';
        this.drawTower();
        showScreen('towerGameScreen');
        this._nextQuestion();
    },

    _nextQuestion() {
        const s = this._state;
        if (!s.active) return;
        if (s.questionIndex >= s.questions.length) {
            shuffleArray(s.questions);
            s.questionIndex = 0;
        }
        const q = s.questions[s.questionIndex];
        document.getElementById('towerQuestionText').innerHTML = sanitizeHTML(q.text);
        const container = document.getElementById('towerAnswerArea');
        if (q.type === QUESTION_TYPES.TEXT) {
            container.innerHTML = `<div style="display:flex;gap:8px;"><input type="text" id="towerTextInput" class="text-answer-input" placeholder="Antwort..." style="flex:1;"><button class="btn btn-small" onclick="WissensturmPlugin._submitAnswer()">OK</button></div>`;
            setTimeout(() => { const inp = document.getElementById('towerTextInput'); if (inp) inp.focus(); }, 100);
        } else if (q.type === QUESTION_TYPES.MULTIPLE_CHOICE || (!q.type && q.answers)) {
            const answers = q.answers || [];
            const indices = answers.map((_, i) => i);
            shuffleArray(indices);
            let html = '';
            indices.forEach(i => {
                const ans = answers[i];
                const text = typeof ans === 'string' ? ans : (ans.text || '');
                html += `<button class="boss-answer-btn" onclick="WissensturmPlugin._submitAnswer(${i})" style="margin:4px 0;">${sanitizeHTML(text)}</button>`;
            });
            container.innerHTML = html;
        } else {
            // Imagemap or unknown: skip
            s.questionIndex++;
            this._nextQuestion();
            return;
        }
        document.getElementById('towerQuestionCard').style.display = '';
    },

    _submitAnswer(idx) {
        const s = this._state;
        const q = s.questions[s.questionIndex];
        if (!q) return;
        let isCorrect = false;
        if (q.type === QUESTION_TYPES.TEXT) {
            const input = document.getElementById('towerTextInput');
            if (!input) return;
            const userAnswer = input.value.trim();
            if (!userAnswer) return;
            const correctAnswers = getCorrectTextAnswers(q);
            isCorrect = correctAnswers.some(ca => ca.toLowerCase().trim() === userAnswer.toLowerCase().trim());
        } else {
            const answers = q.answers || [];
            const ans = answers[idx];
            isCorrect = typeof ans === 'object' && ans.correct;
        }
        // Disable buttons
        document.querySelectorAll('#towerAnswerArea .boss-answer-btn').forEach(b => b.disabled = true);
        s.questionIndex++;
        if (isCorrect) {
            const xp = getMG().xpPerCorrect || 5;
            s.xp += xp;
            s.pendingBlock = true;
            document.getElementById('towerXP').textContent = s.xp;
            document.getElementById('towerPlaceBtn').style.display = '';
            document.getElementById('towerQuestionCard').style.display = 'none';
            Toast.show('✅ Richtig! Platziere deinen Block!', 'info');
        } else {
            this._endGame();
        }
    },

    placeBlock() {
        const s = this._state;
        if (!s.pendingBlock || !s.active) return;
        s.pendingBlock = false;
        s.height++;
        // Block with slight random offset for visual variation
        const offset = (Math.random() - 0.5) * 20;
        s.blocks.push({ y: s.height, offset });
        document.getElementById('towerHeight').textContent = s.height;
        document.getElementById('towerPlaceBtn').style.display = 'none';
        // Update record
        if (s.height > s.record) {
            s.record = s.height;
            if (currentUser) currentUser.towerRecord = s.record;
            document.getElementById('towerRecord').textContent = s.record;
        }
        this.drawTower();
        // Next question
        setTimeout(() => this._nextQuestion(), 500);
    },

    drawTower() {
        const canvas = document.getElementById('towerCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        // Ground
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, h - 20, w, 20);
        // Blocks
        const blockH = 25;
        const blockW = 80;
        const baseX = w / 2;
        const s = this._state;
        s.blocks.forEach((block, i) => {
            const x = baseX - blockW / 2 + block.offset;
            const y = h - 20 - (i + 1) * blockH;
            // Color gradient by height
            const hue = (i * 25) % 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
            ctx.fillRect(x, y, blockW, blockH - 2);
            ctx.strokeStyle = `hsl(${hue}, 70%, 35%)`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, blockW, blockH - 2);
            // Level number
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(i + 1, baseX + block.offset, y + blockH / 2 + 3);
        });
        // Height indicator
        if (s.blocks.length > 0) {
            const topY = h - 20 - s.blocks.length * blockH - 15;
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 16px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`🏗️ ${s.blocks.length}`, baseX, Math.max(20, topY));
        }
    },

    _endGame() {
        const s = this._state;
        s.active = false;
        document.getElementById('towerPlaceBtn').style.display = 'none';
        document.getElementById('towerQuestionCard').innerHTML = `<div style="text-align:center;padding:20px;"><div style="font-size:2.5rem;">🏗️</div><h3>Turm eingestürzt!</h3><p>Höhe: ${s.height} · +${s.xp} XP</p></div>`;
        document.getElementById('towerQuestionCard').style.display = '';
        applyMiniGameXP(s.xp);
        if (currentUser && currentUser.badgeStats) {
            currentUser.badgeStats.towerPlays = (currentUser.badgeStats.towerPlays || 0) + 1;
            currentUser.badgeStats.maxTowerHeight = Math.max(currentUser.badgeStats.maxTowerHeight || 0, s.height);
        }
    },

    end() {
        const s = this._state;
        if (s.active && s.xp > 0) {
            applyMiniGameXP(s.xp);
        }
        s.active = false;
        showScreen('startScreen');
        renderUserSelect();
        renderLeaderboard();
    }
};

// ── SESSION 4-5 PLUGIN STUBS ────────────────────────────────

// ── BADGE PLUGIN ────────────────────────────────────────────
