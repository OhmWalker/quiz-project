// 51-plugin-ui-admin.js
// Plugin-Manager UI — Admin-only (An/Aus-Schalter für Plugins)
// ============================================================

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

const PLUGIN_SETTINGS_MAP = {
    'WheelPlugin': 'spinner',
    'SpeedTapPlugin': 'speedTap',
    'BossFightPlugin': 'bossFight'
};

function renderPluginManager() {
    const container = document.getElementById('pluginManagerContent');
    if (!container) return;

    const allPlugins = PluginRegistry.getAll();

    const groups = {};
    allPlugins.forEach(p => {
        const cat = p.category || 'feature';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(p);
    });

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

    const card = document.getElementById('pluginCard_' + name);
    if (card) {
        if (enabled) {
            card.classList.remove('plugin-disabled');
        } else {
            card.classList.add('plugin-disabled');
        }
    }

    applyPluginVisibility();
    renderPluginManager();
}
