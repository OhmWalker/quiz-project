// 50-plugin-ui.js
// Plugin management UI, mini-game XP, state bridges, timer stubs, final init
// ============================================================

// PLUGIN-VERWALTUNG UI — Admin-Tab für Plugin An/Aus


const PLUGIN_DISPLAY_NAMES = {
    'ClassicQuizPlugin': { icon: '📝', label: 'Classic Quiz' },
    'AbilityPlugin': { icon: '⚡', label: 'Fähigkeiten' },
    'WheelPlugin': { icon: '🎰', label: 'Glücksrad' },
    'BossFightPlugin': { icon: '⚔️', label: 'Boss-Fight' },
    'BadgePlugin': { icon: '🏆', label: 'Badge-System' },
    'LeaderboardPlugin': { icon: '📊', label: 'Bestenliste' },
    'Fragen2Plugin': { icon: '📝', label: 'Fragen-Manager' },
    'UserManagementPlugin': { icon: '👥', label: 'Benutzer-Verwaltung' }
};

const PLUGIN_CATEGORY_LABELS = {
    'quiz': { label: '🎮 Quiz-Modi', order: 1 },
    'feature': { label: '⚡ Features', order: 2 },
    'minigame': { label: '🕹️ Mini-Games', order: 3 },
    'admin': { label: '🔧 Administration', order: 4 }
};

// Mapping: Plugin-Name → Startscreen-Button-IDs die ausgeblendet werden
// Mapping: Plugin-Name → quizSettings.miniGames Sub-Key
// Wird von togglePlugin() genutzt, um quizSettings automatisch zu synchronisieren
const PLUGIN_SETTINGS_MAP = {
    'WheelPlugin': 'spinner',
    'SpeedTapPlugin': 'speedTap',
    'BossFightPlugin': 'bossFight'
};

const PLUGIN_BUTTON_MAP = {};

function renderPluginManager() {
    const container = document.getElementById('pluginManagerContent');
    if (!container) return;
    
    const allPlugins = PluginRegistry.getAll();
    
    // Gruppieren nach Kategorie
    const groups = {};
    allPlugins.forEach(p => {
        const cat = p.category || 'feature';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(p);
    });
    
    // Sortiere Kategorien
    const sortedCats = Object.keys(groups).sort((a, b) => {
        return (PLUGIN_CATEGORY_LABELS[a]?.order || 99) - (PLUGIN_CATEGORY_LABELS[b]?.order || 99);
    });
    
    let html = '';
    sortedCats.forEach(cat => {
        const catInfo = PLUGIN_CATEGORY_LABELS[cat] || { label: cat };
        html += '<div class="plugin-category-section">';
        html += '<div class="plugin-category-title">' + catInfo.label + '</div>';
        html += '<div class="plugin-grid">';
        
        groups[cat].forEach(p => {
            const display = PLUGIN_DISPLAY_NAMES[p.name] || { icon: '🔌', label: p.name };
            const catClass = 'plugin-cat-' + cat;
            const disabledClass = p.enabled ? '' : ' plugin-disabled';
            const requiredClass = p.required ? ' plugin-required' : '';
            
            html += '<div class="plugin-card' + disabledClass + requiredClass + '" id="pluginCard_' + p.name + '">';
            html += '<div class="plugin-card-header">';
            html += '<div>';
            html += '<div class="plugin-card-name">' + display.icon + ' ' + display.label + '</div>';
            html += '<span class="plugin-card-category ' + catClass + '">' + cat + '</span>';
            html += '</div>';
            
            if (p.required) {
                html += '<span style="font-size:0.75rem;color:var(--secondary);font-weight:600;">PFLICHT</span>';
            } else {
                const checked = p.enabled ? ' checked' : '';
                html += '<label class="toggle-switch" style="flex-shrink:0;">';
                html += '<input type="checkbox"' + checked + ' onchange="togglePlugin(\'' + p.name + '\', this.checked)">';
                html += '<span class="toggle-slider"></span>';
                html += '</label>';
            }
            
            html += '</div>';
            if (p.description) {
                html += '<div class="plugin-card-desc">' + p.description + '</div>';
            }
            if (p.required) {
                html += '<div class="plugin-card-required">🔒 Kann nicht deaktiviert werden</div>';
            }
            html += '</div>';
        });
        
        html += '</div></div>';
    });
    
    // Zusammenfassung
    const activeCount = allPlugins.filter(p => p.enabled).length;
    html += '<div style="margin-top:25px;padding:15px;background:rgba(255,255,255,0.04);border-radius:10px;text-align:center;opacity:0.8;font-size:0.9rem;">';
    html += '🔌 ' + activeCount + ' von ' + allPlugins.length + ' Plugins aktiv';
    html += '</div>';
    
    container.innerHTML = html;
}

function togglePlugin(name, enabled) {
    if (enabled) {
        PluginRegistry.enable(name);
    } else {
        PluginRegistry.disable(name);
    }
    
    // Plugin-Karte visuell aktualisieren
    const card = document.getElementById('pluginCard_' + name);
    if (card) {
        if (enabled) {
            card.classList.remove('plugin-disabled');
        } else {
            card.classList.add('plugin-disabled');
        }
    }
    
    // Startscreen-Buttons aktualisieren
    applyPluginVisibility();
    
    // Plugin-Manager Zusammenfassung aktualisieren
    renderPluginManager();
}


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
    // Level neu berechnen
    const lvl = calculateLevel(currentUser.totalXP);
    currentUser.level = lvl.level;
    // UI aktualisieren
    renderLeaderboard();
    renderUserSelect();
    if (PluginRegistry.isEnabled('BadgePlugin')) BadgePlugin.checkBadges(currentUser);
}

// Initialize on load
init();
