// === Admin Shell — Login (nach Datei-Load), Tab-System ===

const AdminShell = (() => {
    const _panels = [];

    // ── Login ─────────────────────────────────────────────────────────────────

    // Wird von 20-admin-datei.js nach erfolgreichem Laden aufgerufen
    // Zeigt immer das Passwort-Modal — leeres Passwort = Enter reicht
    function unlock() {
        _showPasswordModal();
    }

    function _showPasswordModal() {
        const modal = document.getElementById('forgePasswordModal');
        if (!modal) return;
        modal.style.display = 'flex';
        const input = document.getElementById('forgePasswordInput');
        if (input) { input.value = ''; input.focus(); }
        const err = document.getElementById('forgePasswordError');
        if (err) err.classList.remove('active');
    }

    function _hidePasswordModal() {
        const modal = document.getElementById('forgePasswordModal');
        if (modal) modal.style.display = 'none';
    }

    function checkPassword(event) {
        event.preventDefault();
        const input   = document.getElementById('forgePasswordInput');
        const error   = document.getElementById('forgePasswordError');
        const entered = input ? input.value : '';
        const pw      = (typeof quizSettings !== 'undefined') ? (quizSettings.adminPassword || '') : '';

        if (entered === pw) {
            _hidePasswordModal();
            _buildNav();
        } else {
            error && error.classList.add('active');
            if (input) { input.value = ''; input.focus(); }
        }
    }

    // ── Tab-System ────────────────────────────────────────────────────────────

    function registerPanel(id, label, icon, renderFn) {
        _panels.push({ id, label, icon, renderFn });
    }

    function registerSeparator() {
        _panels.push({ type: 'separator' });
    }

    function _renderPanel(id) {
        const p     = _panels.find(p => p.id === id);
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
        const panel  = document.getElementById('adminPanel_' + id);
        const navBtn = document.getElementById('adminNav_' + id);
        if (panel)  panel.classList.add('active');
        if (navBtn) navBtn.classList.add('active');
        _renderPanel(id);
    }

    function _buildNav() {
        const nav     = document.getElementById('adminNav');
        const content = document.getElementById('adminContent');
        if (!nav || !content) return;

        if (_panels.length === 0) {
            content.innerHTML = `
                <div class="admin-empty">
                    <div class="admin-empty-icon">🔧</div>
                    <div>Keine Module geladen</div>
                </div>`;
            return;
        }

        nav.innerHTML     = '';
        content.innerHTML = '';

        _panels.forEach(p => {
            if (p.type === 'separator') {
                const sep = document.createElement('div');
                sep.style.cssText = 'height:20px;flex-shrink:0';
                nav.appendChild(sep);
                return;
            }

            const btn = document.createElement('button');
            btn.className = 'admin-nav-item';
            btn.id        = 'adminNav_' + p.id;
            btn.innerHTML = `<span>${p.icon}</span><span>${p.label}</span>`;
            btn.onclick   = () => showPanel(p.id);
            nav.appendChild(btn);

            const panel   = document.createElement('div');
            panel.className = 'admin-panel';
            panel.id        = 'adminPanel_' + p.id;
            content.appendChild(panel);
        });

        if (_panels[0]) showPanel(_panels[0].id);
    }

    document.addEventListener('DOMContentLoaded', _buildNav);

    return { registerPanel, registerSeparator, showPanel, unlock, checkPassword };
})();

function forgeCheckPassword(event) { AdminShell.checkPassword(event); }
