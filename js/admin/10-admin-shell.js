// === Admin Shell — Tab-System & IO-Warnung ===

const AdminShell = (() => {
    const _panels = [];

    // Öffentliche API: Panel registrieren
    // renderFn(container) wird bei JEDEM Tab-Wechsel neu aufgerufen
    function registerPanel(id, label, icon, renderFn) {
        _panels.push({ id, label, icon, renderFn });
    }

    function _renderPanel(id) {
        const p = _panels.find(p => p.id === id);
        const panel = document.getElementById('adminPanel_' + id);
        if (!p || !panel) return;
        panel.innerHTML = '';
        try { p.renderFn(panel); }
        catch (e) {
            panel.innerHTML = `<div class="card" style="color:var(--incorrect)">Fehler beim Laden: ${e.message}</div>`;
        }
    }

    function showPanel(id) {
        document.querySelectorAll('.admin-panel').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));

        const panel = document.getElementById('adminPanel_' + id);
        const navBtn = document.getElementById('adminNav_' + id);
        if (panel) panel.classList.add('active');
        if (navBtn) navBtn.classList.add('active');

        _renderPanel(id);
    }

    function _buildNav() {
        const nav = document.getElementById('adminNav');
        const content = document.getElementById('adminContent');
        if (!nav || !content) return;

        if (_panels.length === 0) {
            content.innerHTML = `
                <div class="admin-empty">
                    <div class="admin-empty-icon">🔧</div>
                    <div>Keine Admin-Module geladen</div>
                </div>`;
            return;
        }

        nav.innerHTML = '';
        content.innerHTML = '';

        _panels.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'admin-nav-item';
            btn.id = 'adminNav_' + p.id;
            btn.innerHTML = `<span>${p.icon}</span><span>${p.label}</span>`;
            btn.onclick = () => showPanel(p.id);
            nav.appendChild(btn);

            const panel = document.createElement('div');
            panel.className = 'admin-panel';
            panel.id = 'adminPanel_' + p.id;
            content.appendChild(panel);
        });

        // Ersten Tab aktivieren
        if (_panels[0]) showPanel(_panels[0].id);
    }

    function _showIoWarning() {
        const bar = document.getElementById('adminIoWarning');
        if (!bar) return;
        bar.innerHTML = `
            <div class="io-warning">
                <span class="io-warning-icon">⚠</span>
                <span class="io-warning-text">
                    Quiz evtl. gleichzeitig geöffnet — lade Daten erst, wenn das Quiz gerade nicht speichert.
                    Änderungen hier können Daten im Quiz überschreiben.
                </span>
                <button class="io-warning-close" onclick="this.closest('.io-warning').remove()" title="Schließen">✕</button>
            </div>`;
    }

    function init() {
        _showIoWarning();
        _buildNav();
    }

    document.addEventListener('DOMContentLoaded', init);

    return { registerPanel, showPanel };
})();
