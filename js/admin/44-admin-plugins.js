// === Admin: Plugin-Verwaltung ===

AdminShell.registerPanel('plugins', 'Plugins', '🔌', container => {
    _adminPluginsRender(container);
});

function _adminPluginsRender(container) {
    const pluginList = (typeof PluginRegistry !== 'undefined' && typeof PluginRegistry.list === 'function')
        ? PluginRegistry.list()
        : [];

    if (!pluginList.length) {
        container.innerHTML = `
            <div class="card">
                <h2 class="section-title" style="margin-top:0">Plugin-Verwaltung</h2>
                <p class="text-muted" style="padding:20px 0">
                    Keine Plugins registriert. Im Forge-Build laufen Plugins nicht als Instanzen —
                    dieser Tab ist für zukünftige Konfigurationen vorbereitet.
                </p>
            </div>`;
        return;
    }

    const catLabels = {
        quiz: '🎮 Quiz-Plugins',
        feature: '⚡ Feature-Plugins',
        minigame: '🕹️ Mini-Games',
        admin: '🔧 Admin-Plugins',
    };

    const byCategory = {};
    pluginList.forEach(p => {
        const cat = p.category || 'feature';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(p);
    });

    const rows = Object.entries(byCategory).map(([cat, plugins]) => {
        const catLabel = catLabels[cat] || cat;
        const pluginRows = plugins.map(p => `
            <tr>
                <td class="td-bold">${_esc(p.name)}</td>
                <td><span style="font-size:0.8rem;opacity:0.6;background:var(--overlay-10);padding:2px 8px;border-radius:20px">${p.category || '—'}</span></td>
                <td>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                        <input type="checkbox" ${p.enabled ? 'checked' : ''}
                            onchange="_adminPluginToggle('${_esc(p.name)}', this.checked)">
                        ${p.enabled ? '<span style="color:var(--correct)">Aktiv</span>' : '<span style="opacity:0.5">Inaktiv</span>'}
                    </label>
                </td>
                ${p.required ? '<td><span style="font-size:0.75rem;opacity:0.5">Pflicht-Plugin</span></td>' : '<td></td>'}
            </tr>`).join('');

        return `
            <tr><td colspan="4" style="padding-top:18px;padding-bottom:4px;font-weight:600;opacity:0.7;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px">${catLabel}</td></tr>
            ${pluginRows}`;
    }).join('');

    container.innerHTML = `
        <div class="card">
            <h2 class="section-title" style="margin-top:0">Plugin-Verwaltung (${pluginList.length})</h2>
            <p class="text-muted mb-20" style="font-size:0.85rem">
                Plugin-Status wird in der Master-Datei gespeichert.
                Pflicht-Plugins können nicht deaktiviert werden.
            </p>
            <table class="info-table" style="font-size:0.9rem">
                <thead><tr style="opacity:0.5;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px">
                    <td>Name</td><td>Kategorie</td><td>Status</td><td></td>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="margin-top:20px">
                <button class="btn btn-small" onclick="saveMasterBackup()">💾 Plugin-Konfiguration speichern</button>
            </div>
        </div>`;
}

function _adminPluginToggle(name, enabled) {
    if (typeof PluginRegistry === 'undefined') return;
    try {
        if (enabled) PluginRegistry.enable(name);
        else         PluginRegistry.disable(name);
    } catch(e) {
        Toast.show(`Plugin "${name}": ${e.message}`, 'warning');
    }
}
