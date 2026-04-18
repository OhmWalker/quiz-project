// 17b-plugin-leaderboard-admin.js
// LeaderboardPlugin — Admin-Methoden (Settings-UI)
// Wird nach 17-plugin-leaderboard.js geladen und erweitert LeaderboardPlugin
// ============================================================

Object.assign(LeaderboardPlugin, {

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
    }

});
