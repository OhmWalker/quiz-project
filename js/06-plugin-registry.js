// 06-plugin-registry.js
// PluginRegistry plugin management
// ============================================================

// PLUGIN REGISTRY — Plugin-Verwaltung


const PluginRegistry = {
    _plugins: {},
    _initOrder: [],
    
    
    register(name, plugin, options = {}) {
        if (this._plugins[name]) {
            console.warn(`[PluginRegistry] Plugin "${name}" ist bereits registriert.`);
            return;
        }
        
        this._plugins[name] = {
            instance: plugin,
            name,
            enabled: true,
            initialized: false,
            category: options.category || 'feature',
            description: options.description || '',
            dependencies: options.dependencies || [],
            required: options.required || false
        };
        
        this._initOrder.push(name);
        console.log(`[PluginRegistry] Plugin "${name}" registriert (${options.category || 'feature'})`);
    },
    
    
    initAll() {
        console.group('[PluginRegistry] Initialisiere Plugins...');
        for (const name of this._initOrder) {
            this._initPlugin(name);
        }
        console.groupEnd();
        EventBus.emit('plugins:initialized', { count: this._initOrder.length });
    },
    
    _initStack: new Set(),

    _initPlugin(name) {
        const entry = this._plugins[name];
        if (!entry || entry.initialized) return;

        // Zirkuläre Abhängigkeit erkennen
        if (this._initStack.has(name)) {
            const chain = [...this._initStack, name].join(' → ');
            console.error(`[PluginRegistry] Zirkuläre Abhängigkeit erkannt: ${chain}`);
            return;
        }
        this._initStack.add(name);

        // Abhängigkeiten zuerst
        for (const dep of entry.dependencies) {
            if (!this._plugins[dep]) {
                console.error(`[PluginRegistry] Plugin "${name}" benötigt "${dep}", aber es ist nicht registriert!`);
                this._initStack.delete(name);
                return;
            }
            this._initPlugin(dep);
        }
        
        try {
            if (typeof entry.instance.init === 'function') {
                entry.instance.init();
            }
            entry.initialized = true;
            console.log(`  ✅ ${name}`);
        } catch (err) {
            console.error(`  ❌ ${name}:`, err);
        }
        this._initStack.delete(name);
    },
    
    
    get(name) {
        const entry = this._plugins[name];
        return entry ? entry.instance : null;
    },
    
    
    isEnabled(name) {
        const entry = this._plugins[name];
        return entry ? entry.enabled : false;
    },
    
    
    enable(name) {
        const entry = this._plugins[name];
        if (!entry) return false;
        
        entry.enabled = true;
        if (typeof entry.instance.enable === 'function') {
            entry.instance.enable();
        }

        if (typeof PLUGIN_SETTINGS_MAP !== 'undefined') {
            const settingsKey = PLUGIN_SETTINGS_MAP[name];
            if (settingsKey && typeof getMG === 'function') {
                const mg = getMG();
                if (mg[settingsKey]) mg[settingsKey].enabled = true;
            }
        }
        
        EventBus.emit('plugin:enabled', { name });
        console.log(`[PluginRegistry] Plugin "${name}" aktiviert`);
        return true;
    },
    
    
    disable(name) {
        const entry = this._plugins[name];
        if (!entry || entry.required) return false;
        
        entry.enabled = false;
        if (typeof entry.instance.disable === 'function') {
            entry.instance.disable();
        }

        if (typeof PLUGIN_SETTINGS_MAP !== 'undefined') {
            const settingsKey = PLUGIN_SETTINGS_MAP[name];
            if (settingsKey && typeof getMG === 'function') {
                const mg = getMG();
                if (mg[settingsKey]) mg[settingsKey].enabled = false;
            }
        }

        for (const [depName, depEntry] of Object.entries(this._plugins)) {
            if (depEntry.enabled && depEntry.dependencies && depEntry.dependencies.includes(name)) {
                console.warn(`[PluginRegistry] Warnung: "${depName}" hängt von "${name}" ab und ist noch aktiv.`);
            }
        }
        
        EventBus.emit('plugin:disabled', { name });
        console.log(`[PluginRegistry] Plugin "${name}" deaktiviert`);
        return true;
    },
    
    
    getAll() {
        return Object.values(this._plugins).map(p => ({
            name: p.name,
            enabled: p.enabled,
            initialized: p.initialized,
            category: p.category,
            description: p.description,
            required: p.required
        }));
    },
    
    
    getConfig() {
        const config = {};
        for (const [name, entry] of Object.entries(this._plugins)) {
            config[name] = { enabled: entry.enabled };
            if (typeof entry.instance.getConfig === 'function') {
                config[name].settings = entry.instance.getConfig();
            }
        }
        return config;
    },
    
    
    loadConfig(config) {
        if (!config) return;
        for (const [name, cfg] of Object.entries(config)) {
            const entry = this._plugins[name];
            if (!entry) continue;
            
            // Enable/Disable über die offiziellen Methoden,
            // damit Plugin-eigene enable()/disable()-Hooks feuern
            if (cfg.enabled === false && !entry.required) {
                this.disable(name);
            } else if (cfg.enabled === true && !entry.enabled) {
                this.enable(name);
            }
            
            if (cfg.settings && typeof entry.instance.loadConfig === 'function') {
                entry.instance.loadConfig(cfg.settings);
            }
        }
    }
};

// ══════════════════════════════════════════════════════════════
// SESSION 2: QUIZ ENGINE + MINI-GAMES (Full Implementations)
// ══════════════════════════════════════════════════════════════

// ── CLASSIC QUIZ PLUGIN ──────────────────────────────────────
