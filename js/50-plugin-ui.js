// 50-plugin-ui.js
// Plugin visibility, mini-game XP, final init — Lean-kritisch
// Admin-UI (renderPluginManager, togglePlugin) → 51-plugin-ui-admin.js
// ============================================================

const PLUGIN_BUTTON_MAP = {};

function applyPluginVisibility() {
    Object.entries(PLUGIN_BUTTON_MAP).forEach(([pluginName, buttonIds]) => {
        const isEnabled = PluginRegistry.isEnabled(pluginName);
        buttonIds.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.display = isEnabled ? '' : 'none';
            }
        });
    });

    // Badge-Sidebars: Wenn BadgePlugin deaktiviert → Sidebars ausblenden
    if (!PluginRegistry.isEnabled('BadgePlugin')) {
        const sideL = document.getElementById('badgeSidebarLeft');
        const sideR = document.getElementById('badgeSidebarRight');
        if (sideL) sideL.style.display = 'none';
        if (sideR) sideR.style.display = 'none';
    }

    // Leaderboard: Wenn deaktiviert → Leaderboard-Bereich ausblenden
    const lbEl = document.getElementById('leaderboard');
    if (lbEl) {
        lbEl.style.display = PluginRegistry.isEnabled('LeaderboardPlugin') ? '' : 'none';
    }
}

function applyMiniGameXP(xpAmount) {
    if (!currentUser || !xpAmount || xpAmount <= 0) return;
    if (window._mgTestMode) return; // Admin-Test: keine XP
    currentUser.totalXP = (currentUser.totalXP || 0) + xpAmount;
    const lvl = calculateLevel(currentUser.totalXP);
    currentUser.level = lvl.level;
    renderLeaderboard();
    renderUserSelect();
    if (PluginRegistry.isEnabled('BadgePlugin')) BadgePlugin.checkBadges(currentUser);
}

// Initialize on load
init();
