// 17-plugin-leaderboard.js
// LeaderboardPlugin - leaderboard/ranking
// ============================================================

const LeaderboardPlugin = {
    name:'LeaderboardPlugin',

    init() {
        EventBus.on(EventBus.EVENTS.QUIZ_COMPLETED, () => {
            this.render();
        }, 'LeaderboardPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_RESTARTED, () => {
            this.render();
        }, 'LeaderboardPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_ABANDONED, () => {
            this.render();
        }, 'LeaderboardPlugin');
    },

    render() {
        const container = document.getElementById('leaderboard');
        if (!container || !PluginRegistry.isEnabled('LeaderboardPlugin')) return;
        if (!users || users.length === 0) { container.innerHTML = ''; return; }
        const lb = quizSettings.leaderboard || {};
        const minQuizzes = lb.minQuizzes || 0;
        const configuredMax = quizSettings.podiumPlaces || 3;
        // Score all users
        const allScored = users.filter(u => (u.quizzesTaken || 0) >= minQuizzes)
            .map(u => { const s = this.calculateScore(u); return { user: u, score: s.total, quality: s.quality, engagement: s.engagement }; })
            .sort((a, b) => b.score - a.score || (b.user.totalXP || 0) - (a.user.totalXP || 0));
        if (allScored.length === 0) { container.innerHTML = ''; return; }
        // Max 50% of total users visible (don't demotivate bottom half)
        const maxFiftyPercent = Math.max(1, Math.floor(users.length / 2));
        const maxPlaces = Math.min(configuredMax, allScored.length, maxFiftyPercent);
        const scored = allScored.slice(0, maxPlaces);
        const podiumCount = Math.min(3, scored.length);
        const podiumUsers = scored.slice(0, podiumCount);
        const runnersUp = scored.slice(podiumCount);
        // Render podium
        let html = '<div class="podium">';
        // Top 3 get podium layout (2nd, 1st, 3rd order), rest get styled cards
        const top3Count = Math.min(podiumUsers.length, 3);
        const order = top3Count >= 3 ? [1, 0, 2] : top3Count === 2 ? [1, 0] : [0];
        const medals = ['🥇', '🥈', '🥉'];
        order.forEach(idx => {
            if (idx >= podiumUsers.length) return;
            const { user: u, score, quality, engagement } = podiumUsers[idx];
            const rank = idx + 1;
            const cls = rank === 1 ? 'first' : rank === 2 ? 'second' : 'third';
            const avatar = getAvatarForLevel(u.level || 1);
            const lvl = calculateLevel(u.totalXP || 0);
            const xpPct = lvl.xpForNextLevel > 0 ? Math.round((lvl.currentLevelXP / lvl.xpForNextLevel) * 100) : 100;
            html += `<div class="podium-place ${cls}" onclick="selectUser(${u.id})" style="cursor:pointer;" title="Qualität: Ø richtige Antworten (gewichtet nach Aktualität)&#10;Engagement: Jedes Quiz zählt, neuere mehr als ältere">
                <div class="podium-rank">${medals[rank-1] || rank}</div>
                <div class="podium-avatar" style="background:${avatar.gradient}">${avatar.icon}</div>
                <div class="podium-base" style="--xp-progress:${xpPct}%">
                    <div class="podium-position">${rank === 1 ? 'GOLD' : rank === 2 ? 'SILBER' : 'BRONZE'}</div>
                    <div class="podium-user-name">${sanitizeHTML(u.name)}</div>
                    <div class="podium-score">Score: ${score.toFixed(1)}</div>
                    <div class="podium-stats">
                        <div class="podium-stat-item"><span class="podium-stat-label">Level</span><span class="podium-stat-value">${u.level || 1}</span></div>
                        <div class="podium-stat-item"><span class="podium-stat-label">XP</span><span class="podium-stat-value">${u.totalXP || 0}</span></div>
                        <div class="podium-stat-item"><span class="podium-stat-label">Qualität</span><span class="podium-stat-value">${quality.toFixed(1)}</span></div>
                        <div class="podium-stat-item"><span class="podium-stat-label">Engagement</span><span class="podium-stat-value">${engagement.toFixed(1)}</span></div>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
        // Runners-up
        if (runnersUp.length > 0) {
            html += '<div class="runners-up">';
            runnersUp.forEach(({ user: u, score, quality, engagement }, i) => {
                const rank = podiumCount + i + 1;
                const avatar = getAvatarForLevel(u.level || 1);
                const lvl = calculateLevel(u.totalXP || 0);
                const xpPct = lvl.xpForNextLevel > 0 ? Math.round((lvl.currentLevelXP / lvl.xpForNextLevel) * 100) : 100;
                html += `<div class="runner-up-item" onclick="selectUser(${u.id})" style="cursor:pointer;--xp-progress:${xpPct}%" title="Qualität: Ø richtige Antworten (gewichtet nach Aktualität)&#10;Engagement: Jedes Quiz zählt, neuere mehr als ältere">
                    <div class="runner-up-rank">#${rank}</div>
                    <div class="runner-up-avatar" style="background:${avatar.gradient}">${avatar.icon}</div>
                    <div class="runner-up-center">
                        <div class="runner-up-name">${sanitizeHTML(u.name)}</div>
                        <div class="runner-up-details">
                            <span>Lv.${u.level || 1}</span>
                            <span class="runner-up-score">Score: ${score.toFixed(1)}</span>
                        </div>
                        <div class="runner-up-details">
                            <span>Qual: ${quality.toFixed(0)}</span>
                            <span>Eng: ${engagement.toFixed(0)}</span>
                        </div>
                    </div>
                </div>`;
            });
            html += '</div>';
        }
        container.innerHTML = html;
    },

    calculateScore(user) {
        if (!user) return { total: 0, quality: 0, engagement: 0 };
        const lb = quizSettings.leaderboard || {};
        const qW = (lb.qualityWeight || 50) / 100;
        const eW = (lb.engagementWeight || 50) / 100;
        const decay = lb.decayRate || 0.99;
        const maxAge = lb.maxAgeDays || 90;
        const engTarget = lb.engagementTarget || 60;
        const hist = user.history || [];
        const now = Date.now();
        // Quality: weighted average of recent quiz scores with time decay
        let qualitySum = 0, qualityWeight = 0;
        hist.forEach(h => {
            const ageDays = (now - new Date(h.date).getTime()) / 86400000;
            if (ageDays > maxAge) return;
            const w = Math.pow(decay, ageDays);
            qualitySum += (h.score || 0) * w;
            qualityWeight += w;
        });
        const quality = qualityWeight > 0 ? qualitySum / qualityWeight : 0;
        // Engagement: Zählung × linearer Aktualitäts-Zerfall
        // countScore: Quiz in maxAge Tagen vs. Ziel (z.B. 60/90 Tage)
        // recency:    linear 1 → 0 über maxAge Tage seit letztem Quiz
        let recentCount = 0;
        let daysSinceLast = maxAge;
        hist.forEach(h => {
            const ageDays = (now - new Date(h.date).getTime()) / 86400000;
            if (ageDays > maxAge) return;
            recentCount++;
            if (ageDays < daysSinceLast) daysSinceLast = ageDays;
        });
        const countScore = Math.min(1, recentCount / engTarget);
        const recency = Math.max(0, 1 - daysSinceLast / maxAge);
        const engagement = countScore * recency * 100;
        const total = quality * qW + engagement * eW;
        return { total, quality, engagement };
    },

    populateSettings() {
        const lb = quizSettings.leaderboard || {};
        const fields = {
            leaderboardQualityWeight: lb.qualityWeight || 50,
            leaderboardEngagementWeight: lb.engagementWeight || 50,
            leaderboardDecayRate: lb.decayRate || 0.99,
            leaderboardMaxAgeDays: lb.maxAgeDays || 90,
            leaderboardEngagementTarget: lb.engagementTarget || 60,
            leaderboardMinQuizzes: lb.minQuizzes || 0
        };
        Object.entries(fields).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });
        this.updatePreview();
    },

    updateSettings() {
        if (!quizSettings.leaderboard) quizSettings.leaderboard = {};
        const lb = quizSettings.leaderboard;
        lb.qualityWeight = parseInt(document.getElementById('leaderboardQualityWeight').value) || 50;
        lb.engagementWeight = parseInt(document.getElementById('leaderboardEngagementWeight').value) || 50;
        lb.decayRate = parseFloat(document.getElementById('leaderboardDecayRate').value) || 0.99;
        lb.maxAgeDays = parseInt(document.getElementById('leaderboardMaxAgeDays').value) || 90;
        lb.engagementTarget = parseInt(document.getElementById('leaderboardEngagementTarget').value) || 60;
        lb.minQuizzes = parseInt(document.getElementById('leaderboardMinQuizzes').value) || 0;
        this.updatePreview();
        this.render();
        Toast.show('Bestenliste aktualisiert', 'success');
    },

    updatePreview() {
        const preview = document.getElementById('leaderboardPreview');
        if (!preview) return;
        const lb = quizSettings.leaderboard || {};
        const qW = (lb.qualityWeight || 50);
        const eW = (lb.engagementWeight || 50);
        const target = lb.engagementTarget || 60;
        const maxAge = lb.maxAgeDays || 90;
        const perDay = (100 / maxAge).toFixed(1);
        const eng8d  = Math.round(Math.max(0, 1 - 8  / maxAge) * 100);
        const eng30d = Math.round(Math.max(0, 1 - 30 / maxAge) * 100);
        preview.innerHTML = `<strong style="color:var(--secondary);">📊 Engagement-Formel:</strong>
            <div style="margin-top:5px;">
            <code>min(Quiz/${target}, 1) × max(0, 1 − Tage/${maxAge}) × 100</code><br><br>
            <strong>${target} Quiz, heute gespielt:</strong> 100<br>
            <strong>${target} Quiz, 8 Tage nicht gespielt:</strong> ${eng8d}<br>
            <strong>${target} Quiz, 30 Tage nicht gespielt:</strong> ${eng30d}<br>
            <strong>${Math.round(target/2)} Quiz, heute gespielt:</strong> 50<br>
            <strong>Verfall:</strong> −${perDay} Punkte/Tag (linear)<br><br>
            <strong>Qualität 80%, Engagement 100%:</strong> ${((80 * qW + 100 * eW) / 100).toFixed(1)} Score
            </div>`;
    },

    enable() { this.render(); },
    disable() {
        const el = document.getElementById('leaderboard');
        if (el) el.innerHTML = '';
    }
};
