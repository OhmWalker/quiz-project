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
            .map(u => ({ user: u, score: this.calculateScore(u) }))
            .sort((a, b) => b.score - a.score);
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
            const { user: u, score } = podiumUsers[idx];
            const rank = idx + 1;
            const cls = rank === 1 ? 'first' : rank === 2 ? 'second' : 'third';
            const avatar = getAvatarForLevel(u.level || 1);
            const lvl = calculateLevel(u.totalXP || 0);
            const xpPct = lvl.xpForNextLevel > 0 ? Math.round((lvl.currentLevelXP / lvl.xpForNextLevel) * 100) : 100;
            const quizzesMonth = this.getQuizzesThisMonth(u);
            html += `<div class="podium-place ${cls}" onclick="selectUser(${u.id})" style="cursor:pointer;">
                <div class="podium-rank">${medals[rank-1] || rank}</div>
                <div class="podium-avatar" style="background:${avatar.gradient}">${avatar.icon}</div>
                <div class="podium-base" style="--xp-progress:${xpPct}%">
                    <div class="podium-position">${rank === 1 ? 'GOLD' : rank === 2 ? 'SILBER' : 'BRONZE'}</div>
                    <div class="podium-user-name">${sanitizeHTML(u.name)}</div>
                    <div class="podium-score">⭐ ${Math.round(score)} Punkte</div>
                    <div class="podium-stats">
                        <div class="podium-stat-item"><span class="podium-stat-label">Level</span><span class="podium-stat-value">${u.level || 1}</span></div>
                        <div class="podium-stat-item"><span class="podium-stat-label">XP</span><span class="podium-stat-value">${u.totalXP || 0}</span></div>
                        <div class="podium-stat-item"><span class="podium-stat-label">Quiz/Monat</span><span class="podium-stat-value">${quizzesMonth}</span></div>
                        <div class="podium-stat-item"><span class="podium-stat-label">Quote</span><span class="podium-stat-value">${u.score || 0}%</span></div>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
        // Runners-up
        if (runnersUp.length > 0) {
            html += '<div class="runners-up">';
            runnersUp.forEach(({ user: u, score }, i) => {
                const rank = podiumCount + i + 1;
                const avatar = getAvatarForLevel(u.level || 1);
                const lvl = calculateLevel(u.totalXP || 0);
                const xpPct = lvl.xpForNextLevel > 0 ? Math.round((lvl.currentLevelXP / lvl.xpForNextLevel) * 100) : 100;
                html += `<div class="runner-up-item" onclick="selectUser(${u.id})" style="cursor:pointer;--xp-progress:${xpPct}%">
                    <div class="runner-up-rank">#${rank}</div>
                    <div class="runner-up-avatar" style="background:${avatar.gradient}">${avatar.icon}</div>
                    <div class="runner-up-center">
                        <div class="runner-up-name">${sanitizeHTML(u.name)}</div>
                        <div class="runner-up-details">
                            <span>Lv.${u.level || 1}</span>
                            <span>${u.score || 0}%</span>
                        </div>
                    </div>
                    <div class="runner-up-score">⭐ ${Math.round(score)}</div>
                </div>`;
            });
            html += '</div>';
        }
        container.innerHTML = html;
    },

    calculateScore(user) {
        if (!user) return 0;
        const lb = quizSettings.leaderboard || {};
        const qW = (lb.qualityWeight || 40) / 100;
        const nW = (lb.quantityWeight || 30) / 100;
        const aW = (lb.activityWeight || 30) / 100;
        const decay = lb.decayRate || 0.99;
        const maxAge = lb.maxAgeDays || 90;
        const target = lb.targetQuizzes || 15;
        const inactPenalty = lb.inactivityPenalty || 2;
        const maxInactDays = lb.maxInactiveDays || 50;
        // Quality: weighted average of recent quiz scores with time decay
        const hist = user.history || [];
        const now = Date.now();
        let qualitySum = 0, qualityWeight = 0;
        hist.forEach(h => {
            const ageDays = (now - new Date(h.date).getTime()) / 86400000;
            if (ageDays > maxAge) return;
            const w = Math.pow(decay, ageDays);
            qualitySum += (h.pct || 0) * w;
            qualityWeight += w;
        });
        const quality = qualityWeight > 0 ? qualitySum / qualityWeight : 0;
        // Quantity: quizzes this month / target
        const thisMonth = this.getQuizzesThisMonth(user);
        const quantity = Math.min(100, (thisMonth / target) * 100);
        // Activity: based on recency
        let activity = 100;
        if (hist.length > 0) {
            const lastQuiz = new Date(hist[hist.length - 1].date);
            const daysSince = (now - lastQuiz.getTime()) / 86400000;
            activity = Math.max(0, 100 - Math.min(daysSince, maxInactDays) * inactPenalty);
        } else {
            activity = 0;
        }
        return quality * qW + quantity * nW + activity * aW;
    },

    getQuizzesThisMonth(user) {
        if (!user || !user.history) return 0;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return user.history.filter(h => new Date(h.date) >= monthStart).length;
    },

    populateSettings() {
        const lb = quizSettings.leaderboard || {};
        const fields = {
            leaderboardQualityWeight: lb.qualityWeight || 40,
            leaderboardQuantityWeight: lb.quantityWeight || 30,
            leaderboardActivityWeight: lb.activityWeight || 30,
            leaderboardDecayRate: lb.decayRate || 0.99,
            leaderboardMaxAgeDays: lb.maxAgeDays || 90,
            leaderboardTargetQuizzes: lb.targetQuizzes || 15,
            leaderboardMinQuizzes: lb.minQuizzes || 0,
            leaderboardInactivityPenalty: lb.inactivityPenalty || 2,
            leaderboardMaxInactiveDays: lb.maxInactiveDays || 50
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
        lb.qualityWeight = parseInt(document.getElementById('leaderboardQualityWeight').value) || 40;
        lb.quantityWeight = parseInt(document.getElementById('leaderboardQuantityWeight').value) || 30;
        lb.activityWeight = parseInt(document.getElementById('leaderboardActivityWeight').value) || 30;
        lb.decayRate = parseFloat(document.getElementById('leaderboardDecayRate').value) || 0.99;
        lb.maxAgeDays = parseInt(document.getElementById('leaderboardMaxAgeDays').value) || 90;
        lb.targetQuizzes = parseInt(document.getElementById('leaderboardTargetQuizzes').value) || 15;
        lb.minQuizzes = parseInt(document.getElementById('leaderboardMinQuizzes').value) || 0;
        lb.inactivityPenalty = parseInt(document.getElementById('leaderboardInactivityPenalty').value) || 2;
        lb.maxInactiveDays = parseInt(document.getElementById('leaderboardMaxInactiveDays').value) || 50;
        this.updatePreview();
        this.render();
        Toast.show('Bestenliste aktualisiert', 'success');
    },

    updatePreview() {
        const preview = document.getElementById('leaderboardPreview');
        if (!preview) return;
        const lb = quizSettings.leaderboard || {};
        const qW = (lb.qualityWeight || 40);
        const nW = (lb.quantityWeight || 30);
        const aW = (lb.activityWeight || 30);
        preview.innerHTML = `<strong style="color:var(--secondary);">📊 Beispielrechnung:</strong>
            <div style="margin-top:5px;">
            Spieler mit 80% Quote, ${lb.targetQuizzes || 15}/${lb.targetQuizzes || 15} Quiz/Monat, heute aktiv:<br>
            <strong>Qualität:</strong> 80 × ${qW}% = ${(80 * qW / 100).toFixed(1)}<br>
            <strong>Quantität:</strong> 100 × ${nW}% = ${(100 * nW / 100).toFixed(1)}<br>
            <strong>Aktivität:</strong> 100 × ${aW}% = ${(100 * aW / 100).toFixed(1)}<br>
            <strong>Gesamt: ${((80 * qW + 100 * nW + 100 * aW) / 100).toFixed(1)} Punkte</strong>
            </div>`;
    },

    enable() { this.render(); },
    disable() {
        const el = document.getElementById('leaderboard');
        if (el) el.innerHTML = '';
    }
};
