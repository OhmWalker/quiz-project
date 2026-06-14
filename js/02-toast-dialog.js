// 02-toast-dialog.js
// Toast notification system and GameDialog
// ============================================================

// TOAST — Einheitliches Benachrichtigungs-System


const Toast = {
    _container: null,
    
    _ensureContainer() {
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = 'toastContainer';
            this._container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:100000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
            document.body.appendChild(this._container);
        }
        return this._container;
    },
    
    
    show(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION_MS) {
        const container = this._ensureContainer();
        const toast = document.createElement('div');
        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
        const colors = { 
            info: 'rgba(52,152,219,0.95)', 
            success: 'rgba(46,204,113,0.95)', 
            warning: 'rgba(241,196,15,0.95)', 
            error: 'rgba(231,76,60,0.95)' 
        };
        toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;pointer-events:auto;cursor:pointer;opacity:0;transform:translateX(100%);transition:all ${CONFIG.UI.TOAST_FADE_MS}ms ease;max-width:350px;box-shadow:0 4px 15px rgba(0,0,0,0.3);`;
        toast.textContent = `${icons[type] || ''} ${message}`;
        toast.onclick = () => this._remove(toast);
        container.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        
        if (duration > 0) {
            setTimeout(() => this._remove(toast), duration);
        }
        return toast;
    },
    
    _remove(toast) {
        if (toast._removing) return;
        toast._removing = true;
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), CONFIG.UI.TOAST_FADE_MS);
    }
};

// GAME DIALOG — Modale Dialoge (ersetzt confirm() + kopierbare Fehler)


const GameDialog = {
    _overlay: null,
    
    _ensureOverlay() {
        if (!this._overlay) {
            this._overlay = document.createElement('div');
            this._overlay.id = 'gameDialogOverlay';
            this._overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200000;display:none;align-items:center;justify-content:center;';
            document.body.appendChild(this._overlay);
        }
        return this._overlay;
    },
    
    
    showConfirm(icon, title, message, onAccept, onDecline) {
        const overlay = this._ensureOverlay();
        overlay.innerHTML = `
            <div style="background:var(--glass-bg,rgba(30,30,50,0.95));border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:30px;max-width:400px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:3rem;margin-bottom:10px;">${icon}</div>
                <h3 style="color:#f1c40f;margin:0 0 10px;">${title}</h3>
                <p style="color:#ddd;margin:0 0 20px;line-height:1.5;">${message}</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="gdBtnNo" class="btn btn-secondary" style="min-width:80px;">Nein</button>
                    <button id="gdBtnYes" class="btn" style="min-width:80px;background:linear-gradient(135deg,var(--accent),#e67e22);">Ja!</button>
                </div>
            </div>`;
        overlay.style.display = 'flex';
        const self = this;
        document.getElementById('gdBtnYes').onclick = function() { self._close(); if (onAccept) onAccept(); };
        document.getElementById('gdBtnNo').onclick = function() { self._close(); if (onDecline) onDecline(); };
    },
    
    
    showError(title, errorText) {
        const overlay = this._ensureOverlay();
        overlay.innerHTML = `
            <div style="background:var(--glass-bg,rgba(30,30,50,0.95));border:1px solid rgba(231,76,60,0.5);border-radius:16px;padding:30px;max-width:500px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:2.5rem;margin-bottom:10px;">❌</div>
                <h3 style="color:#e74c3c;margin:0 0 15px;">${title}</h3>
                <textarea readonly style="width:100%;min-height:80px;background:rgba(0,0,0,0.3);color:#ff6b6b;border:1px solid rgba(231,76,60,0.3);border-radius:8px;padding:10px;font-family:monospace;font-size:12px;resize:vertical;margin-bottom:15px;">${errorText}</textarea>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="gdBtnCopy" class="btn btn-secondary" style="min-width:100px;">📋 Kopieren</button>
                    <button id="gdBtnOk" class="btn" style="min-width:80px;">OK</button>
                </div>
            </div>`;
        overlay.style.display = 'flex';
        const self = this;
        document.getElementById('gdBtnCopy').onclick = function() {
            const ta = overlay.querySelector('textarea');
            ta.select();
            try { navigator.clipboard.writeText(ta.value); Toast.show('Fehlertext kopiert!', 'info'); }
            catch(e) { document.execCommand('copy'); Toast.show('Fehlertext kopiert!', 'info'); }
        };
        document.getElementById('gdBtnOk').onclick = function() { self._close(); };
    },
    
    
    showInfo(icon, title, message) {
        const overlay = this._ensureOverlay();
        overlay.innerHTML = `
            <div style="background:var(--glass-bg,rgba(30,30,50,0.95));border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:30px;max-width:450px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:2.5rem;margin-bottom:10px;">${icon}</div>
                <h3 style="color:var(--accent);margin:0 0 10px;">${title}</h3>
                <div style="color:#ddd;margin:0 0 20px;line-height:1.5;text-align:left;">${message}</div>
                <button id="gdBtnOk" class="btn" style="min-width:100px;">OK</button>
            </div>`;
        overlay.style.display = 'flex';
        const self = this;
        document.getElementById('gdBtnOk').onclick = function() { self._close(); };
    },
    
    // Text-Eingabe-Dialog. onSubmit(value) erhält den getrimmten Wert.
    // Gibt onSubmit explizit `false` zurück, bleibt der Dialog offen (z.B. bei Validierungsfehler).
    showPrompt(icon, title, label, onSubmit, opts) {
        opts = opts || {};
        const overlay = this._ensureOverlay();
        const safeVal = String(opts.value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        overlay.innerHTML = `
            <div style="background:var(--glass-bg,rgba(30,30,50,0.95));border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:30px;max-width:420px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:3rem;margin-bottom:10px;">${icon}</div>
                <h3 style="color:var(--accent);margin:0 0 10px;">${title}</h3>
                ${label ? `<p style="color:#ddd;margin:0 0 14px;line-height:1.5;">${label}</p>` : ''}
                <input id="gdPromptInput" type="text" value="${safeVal}" placeholder="${opts.placeholder || ''}"
                    style="width:100%;box-sizing:border-box;margin:0 0 20px;padding:12px 14px;font-size:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;">
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="gdPromptCancel" class="btn btn-secondary" style="min-width:90px;">Abbrechen</button>
                    <button id="gdPromptOk" class="btn" style="min-width:90px;background:linear-gradient(135deg,var(--accent),#e67e22);">${opts.okLabel || 'OK'}</button>
                </div>
            </div>`;
        overlay.style.display = 'flex';
        const self = this;
        const input = document.getElementById('gdPromptInput');
        const submit = function() {
            const val = (input.value || '').trim();
            const keepOpen = onSubmit && onSubmit(val) === false;
            if (keepOpen) { input.focus(); input.select(); }
            else self._close();
        };
        document.getElementById('gdPromptOk').onclick = submit;
        document.getElementById('gdPromptCancel').onclick = function() { self._close(); };
        input.onkeydown = function(e) {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            else if (e.key === 'Escape') { self._close(); }
        };
        setTimeout(() => input.focus(), 50);
    },

    _close() {
        if (this._overlay) this._overlay.style.display = 'none';
    }
};
