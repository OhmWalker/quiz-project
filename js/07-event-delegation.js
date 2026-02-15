// 07-event-delegation.js
// Event delegation system - replaces inline onclick/onchange handlers
// ============================================================

// EVENT DELEGATION — Ersetzt inline onclick/onchange durch data-Attribute
//
// Nutzung in HTML:
//   <button data-action="startQuiz" data-plugin="ClassicQuizPlugin">Start</button>
//   <button data-action="showAdminSection" data-args='["settings"]'>Settings</button>
//   <input data-change="handleSlider" data-args='["volume"]'>
//
// data-action:  Methodenname (click)
// data-change:  Methodenname (change/input)
// data-plugin:  Optional — Plugin-Name (via PluginRegistry)
// data-args:    Optional — JSON-Array mit Argumenten

const EventDelegation = {

    init() {
        // Click-Events
        document.body.addEventListener('click', (e) => {
            // data-trigger: Klick auf anderes Element weiterleiten (z.B. File-Inputs)
            const trigger = e.target.closest('[data-trigger]');
            if (trigger) {
                const target = document.getElementById(trigger.dataset.trigger);
                if (target) target.click();
                return;
            }
            // data-toggle-overlay: Overlay ein-/ausblenden
            const toggle = e.target.closest('[data-toggle-overlay]');
            if (toggle) {
                const overlay = document.getElementById(toggle.dataset.toggleOverlay);
                if (!overlay) return;
                const show = toggle.dataset.overlayShow !== 'false';
                if (show) {
                    overlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                } else {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
                return;
            }
            // data-action: Standard-Handler
            const target = e.target.closest('[data-action]');
            if (!target) return;
            e.preventDefault();
            this._dispatch(target.dataset.action, target.dataset.plugin, target.dataset.args, e, target);
        });

        // Change-Events (select, checkbox, file inputs)
        document.body.addEventListener('change', (e) => {
            const target = e.target.closest('[data-change]');
            if (!target) return;
            this._dispatch(target.dataset.change, target.dataset.plugin, target.dataset.args, e, target);
        });

        // Input-Events (range sliders, text inputs)
        document.body.addEventListener('input', (e) => {
            const target = e.target.closest('[data-input]');
            if (!target) return;
            this._dispatch(target.dataset.input, target.dataset.plugin, target.dataset.args, e, target);
        });

        // Submit-Events (forms)
        document.body.addEventListener('submit', (e) => {
            const target = e.target.closest('[data-submit]');
            if (!target) return;
            e.preventDefault();
            this._dispatch(target.dataset.submit, target.dataset.plugin, target.dataset.args, e, target);
        });
    },

    _dispatch(action, pluginName, argsJson, event, element) {
        const args = argsJson ? JSON.parse(argsJson) : [];

        // Plugin-Methode aufrufen
        if (pluginName) {
            const plugin = PluginRegistry.get(pluginName);
            if (!plugin) {
                console.warn('[EventDelegation] Plugin not found:', pluginName);
                return;
            }
            if (!PluginRegistry.isEnabled(pluginName)) return;
            if (typeof plugin[action] === 'function') {
                return plugin[action](...args, event, element);
            }
            console.warn('[EventDelegation] Method not found:', pluginName + '.' + action);
            return;
        }

        // Globale Funktion aufrufen
        if (typeof window[action] === 'function') {
            return window[action](...args, event, element);
        }

        console.warn('[EventDelegation] Handler not found:', action);
    }
};
