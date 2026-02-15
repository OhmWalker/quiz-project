// 03-eventbus.js
// EventBus publish/subscribe system
// ============================================================

// EVENT BUS — Publish/Subscribe für Plugin-Kommunikation


const EventBus = {
    // Event Catalog — Dokumentation aller Events im System
    EVENTS: {
        DATA_LOADED:          'data:loaded',           // { questions, users, source }
        USER_SELECTED:        'user:selected',         // { user }
        QUIZ_STARTED:         'quiz:started',          // { user, questionCount }
        QUIZ_QUESTION:        'quiz:questionDisplayed', // { index, question }
        QUIZ_ANSWER:          'quiz:answerSubmitted',  // { questionId, correct, xp }
        QUIZ_COMPLETED:       'quiz:completed',        // { user, correct, total, xp, pct }
        QUIZ_RESTARTED:       'quiz:restarted',        // {}
        QUIZ_ABANDONED:       'quiz:abandoned',        // { xp }
        ABILITY_USED:         'ability:used',          // { ability, user }
        PLUGINS_INITIALIZED:  'plugins:initialized',   // { count }
        PLUGIN_ENABLED:       'plugin:enabled',        // { name }
        PLUGIN_DISABLED:      'plugin:disabled',       // { name }
    },

    _listeners: {},
    
    
    on(event, callback, context) {
        if (!this._listeners[event]) this._listeners[event] = [];
        const entry = { fn: callback, ctx: context || 'anonymous' };
        this._listeners[event].push(entry);
        // Rückgabe: Unsubscribe-Funktion
        return () => {
            this._listeners[event] = this._listeners[event].filter(e => e !== entry);
        };
    },
    
    
    once(event, callback, context) {
        const wrapper = (...args) => {
            unsub();
            callback(...args);
        };
        wrapper._originalCallback = callback;
        const unsub = this.on(event, wrapper, context);
        return unsub;
    },
    
    
    emit(event, data) {
        const listeners = this._listeners[event];
        if (!listeners || listeners.length === 0) return;
        
        for (const entry of listeners) {
            try {
                entry.fn(data);
            } catch (err) {
                console.error(`[EventBus] Error in "${event}" handler (${entry.ctx}):`, err);
            }
        }
    },
    
    
    off(event, callback) {
        if (!callback) {
            delete this._listeners[event];
        } else if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(e =>
                e.fn !== callback && e.fn._originalCallback !== callback
            );
        }
    },
    
    
    debug() {
        console.group('[EventBus] Registered Events');
        for (const [event, listeners] of Object.entries(this._listeners)) {
            console.log(`  ${event}: ${listeners.length} listener(s) [${listeners.map(l => l.ctx).join(', ')}]`);
        }
        console.groupEnd();
    }
};
