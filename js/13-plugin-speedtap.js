// 13-plugin-speedtap.js
// SpeedTapPlugin - reaction test mini-game
// ============================================================

const SpeedTapPlugin = {
    name: 'SpeedTapPlugin',
    _state: { round: 0, maxRounds: 5, times: [], targetVisible: false, startTime: 0, timeout: null },

    init() {},
    enable() {},
    disable() {},

    open() {
        const mg = getMG();
        const st = mg.speedTap || {};
        const s = this._state;
        s.round = 0;
        s.maxRounds = st.rounds || CONFIG.MINI_GAMES.SPEED_TAP_DEFAULT_ROUNDS;
        s.times = [];
        s.targetVisible = false;
        document.getElementById('speedtapRound').textContent = '1';
        document.getElementById('speedtapMaxRounds').textContent = s.maxRounds;
        document.getElementById('speedtapTimeDisplay').textContent = '—';
        document.getElementById('speedtapResultsGrid').innerHTML = '';
        document.getElementById('speedtapCloseBtn').style.display = 'none';
        document.getElementById('speedtapWaitMsg').style.display = '';
        const target = document.getElementById('speedtapTarget');
        target.style.display = 'none';
        document.getElementById('speedtapOverlay').classList.add('active');
        this._startRound();
    },

    _startRound() {
        const s = this._state;
        s.round++;
        if (s.round > s.maxRounds) { this._showResults(); return; }
        document.getElementById('speedtapRound').textContent = s.round;
        document.getElementById('speedtapWaitMsg').style.display = '';
        const target = document.getElementById('speedtapTarget');
        target.style.display = 'none';
        s.targetVisible = false;
        const delay = 1000 + Math.random() * 2500;
        s.timeout = setTimeout(() => this._showTarget(), delay);
    },

    _showTarget() {
        const s = this._state;
        const arena = document.getElementById('speedtapArena');
        const target = document.getElementById('speedtapTarget');
        const aw = arena.offsetWidth - 60;
        const ah = arena.offsetHeight - 60;
        const x = 20 + Math.random() * aw;
        const y = 20 + Math.random() * ah;
        target.style.left = x + 'px';
        target.style.top = y + 'px';
        target.style.display = '';
        document.getElementById('speedtapWaitMsg').style.display = 'none';
        s.targetVisible = true;
        s.startTime = performance.now();
        target.onclick = () => this._handleHit();
    },

    _handleHit() {
        const s = this._state;
        if (!s.targetVisible) return;
        const elapsed = performance.now() - s.startTime;
        const ms = Math.round(elapsed);
        s.times.push(ms);
        s.targetVisible = false;
        document.getElementById('speedtapTarget').style.display = 'none';
        document.getElementById('speedtapTimeDisplay').textContent = ms + ' ms';
        // Color-code
        const mg = getMG().speedTap || {};
        const ms1 = mg.ms1 || 300, ms2 = mg.ms2 || 400, ms3 = mg.ms3 || 500;
        let color = '#e74c3c';
        if (ms <= ms1) color = '#2ecc71';
        else if (ms <= ms2) color = '#f39c12';
        else if (ms <= ms3) color = '#e67e22';
        const grid = document.getElementById('speedtapResultsGrid');
        grid.innerHTML += `<div style="padding:4px 8px;border-radius:6px;background:${color};color:#fff;font-weight:700;font-size:0.85rem;text-align:center;">${ms}ms</div>`;
        setTimeout(() => this._startRound(), 800);
    },

    _showResults() {
        const s = this._state;
        const avg = s.times.length > 0 ? Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length) : 0;
        const best = s.times.length > 0 ? Math.min(...s.times) : 0;
        const mg = getMG().speedTap || {};
        const bonusXP = mg.bonusXP || 30;
        // XP: better time = more XP
        const xpRatio = Math.max(0, 1 - (avg - 200) / 600);
        const xp = Math.round(bonusXP * Math.max(0.2, xpRatio));
        document.getElementById('speedtapTimeDisplay').innerHTML = `<div style="font-size:1.2rem;">Ø ${avg} ms</div><div style="font-size:0.85rem;opacity:0.7;">Bester: ${best} ms</div><div style="font-size:1rem;color:var(--accent);margin-top:5px;">+${xp} XP</div>`;
        document.getElementById('speedtapCloseBtn').style.display = '';
        applyMiniGameXP(xp);
        if (currentUser && currentUser.badgeStats) {
            currentUser.badgeStats.speedtapPlays = (currentUser.badgeStats.speedtapPlays || 0) + 1;
            if (avg <= (mg.ms1 || 300)) currentUser.badgeStats.speedtapFast = (currentUser.badgeStats.speedtapFast || 0) + 1;
        }
    },

    close() {
        const s = this._state;
        if (s.timeout) { clearTimeout(s.timeout); s.timeout = null; }
        document.getElementById('speedtapOverlay').classList.remove('active');
        window._mgTestMode = false;
        if (ClassicQuizPlugin._checkBossTrigger) ClassicQuizPlugin._checkBossTrigger();
    }
};

// ── BOSS FIGHT PLUGIN ───────────────────────────────────────
