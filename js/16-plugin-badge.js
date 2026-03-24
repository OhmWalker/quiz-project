// 16-plugin-badge.js
// BadgePlugin - achievement badges
// ============================================================

const BadgePlugin = {
    name:'BadgePlugin',
    _selectedBadgeCircle:null,
    _sidebarState:{left:{collapsed:false,top:null},right:{collapsed:false,top:null}},
    DEFAULT_BADGES:{
        // Leistungs-Badges (20)
        earlybird:{id:'earlybird',name:'Frühaufsteher',emoji:'🌅',cat:'leistung',desc:'Quiz vor 8 Uhr',stat:'earlyQuizzes',thresholds:[3,10,30,100,365]},
        nightowl:{id:'nightowl',name:'Nachteule',emoji:'🦉',cat:'leistung',desc:'Quiz nach 22 Uhr',stat:'lateQuizzes',thresholds:[3,10,30,100,365]},
        perfectionist:{id:'perfectionist',name:'Perfektionist',emoji:'💯',cat:'leistung',desc:'100% richtig',stat:'perfectQuizzes',thresholds:[1,5,20,50,200]},
        endurance:{id:'endurance',name:'Ausdauer',emoji:'🏃',cat:'leistung',desc:'Quiz gespielt',stat:'totalQuizzes',thresholds:[5,25,100,500,2000]},
        dailyhero:{id:'dailyhero',name:'Täglicher Held',emoji:'📅',cat:'leistung',desc:'Tage mit Quiz',stat:'uniqueDays',thresholds:[3,14,60,180,365]},
        streak:{id:'streak',name:'Streak',emoji:'🔥',cat:'leistung',desc:'Tage in Folge',stat:'maxStreak',thresholds:[3,7,14,30,100]},
        wissensmeister:{id:'wissensmeister',name:'Wissensmeister',emoji:'🧠',cat:'leistung',desc:'Richtige Antworten',stat:'totalCorrect',thresholds:[50,200,500,2000,7300]},
        fleissig:{id:'fleissig',name:'Fleißig',emoji:'📚',cat:'leistung',desc:'Antworten gesamt',stat:'totalAnswered',thresholds:[100,500,1500,5000,15000]},
        aufsteiger:{id:'aufsteiger',name:'Aufsteiger',emoji:'📈',cat:'leistung',desc:'Level erreicht',stat:'level',thresholds:[5,15,30,60,90]},
        xpsammler:{id:'xpsammler',name:'XP-Sammler',emoji:'⭐',cat:'leistung',desc:'XP gesammelt',stat:'totalXP',thresholds:[500,2000,10000,50000,200000]},
        schnellstarter:{id:'schnellstarter',name:'Schnellstarter',emoji:'🚀',cat:'leistung',desc:'Quiz am 1. Tag',stat:'firstDayQuizzes',thresholds:[1,3,5,8,12]},
        wochenendler:{id:'wochenendler',name:'Wochenendler',emoji:'🎉',cat:'leistung',desc:'Wochenend-Quiz',stat:'weekendQuizzes',thresholds:[3,10,30,100,365]},
        montagsmotivation:{id:'montagsmotivation',name:'Montagsmotivation',emoji:'💪',cat:'leistung',desc:'Montags-Quiz',stat:'mondayQuizzes',thresholds:[3,10,30,100,365]},
        verbesserer:{id:'verbesserer',name:'Verbesserer',emoji:'📊',cat:'leistung',desc:'Verbesserungen',stat:'improvements',thresholds:[5,15,50,150,500]},
        comeback:{id:'comeback',name:'Comeback',emoji:'🔄',cat:'leistung',desc:'Comebacks nach Pause',stat:'comebacks',thresholds:[1,3,10,25,50]},
        marathon:{id:'marathon',name:'Marathon',emoji:'🏅',cat:'leistung',desc:'10+ Quiz/Tag',stat:'marathonDays',thresholds:[1,5,15,50,150]},
        entdecker:{id:'entdecker',name:'Entdecker',emoji:'🗺️',cat:'leistung',desc:'Versch. Fragen beantw.',stat:'uniqueQuestions',thresholds:[20,50,150,400,1000]},
        meister:{id:'meister',name:'Meister',emoji:'🎓',cat:'leistung',desc:'Fragen gemeistert (3x richtig)',stat:'masteredQuestions',thresholds:[5,20,50,150,400]},
        veteran:{id:'veteran',name:'Veteran',emoji:'🏛️',cat:'leistung',desc:'Wochen aktiv',stat:'activeWeeks',thresholds:[2,8,26,52,104]},
        vielspieler:{id:'vielspieler',name:'Vielspieler',emoji:'🎮',cat:'leistung',desc:'Versch. Gruppen gespielt',stat:'groupsPlayed',thresholds:[2,4,6,8,10]},
        // Fähigkeiten-Badges (10)
        jokermeister:{id:'jokermeister',name:'Joker-Meister',emoji:'🃏',cat:'faehigkeit',desc:'50:50 genutzt',stat:'ab_fiftyFifty',thresholds:[3,10,30,100,300]},
        telefonmeister:{id:'telefonmeister',name:'Telefonmeister',emoji:'📞',cat:'faehigkeit',desc:'Telefon-Joker genutzt',stat:'ab_phoneJoker',thresholds:[3,10,30,100,300]},
        springer:{id:'springer',name:'Springer',emoji:'⏭️',cat:'faehigkeit',desc:'Skip genutzt',stat:'ab_skip',thresholds:[3,10,30,100,300]},
        comebackkid:{id:'comebackkid',name:'Comeback-Kid',emoji:'💖',cat:'faehigkeit',desc:'2. Chance genutzt',stat:'ab_secondChance',thresholds:[3,10,30,100,300]},
        xpbooster:{id:'xpbooster',name:'XP-Booster',emoji:'💰',cat:'faehigkeit',desc:'Doppel-XP genutzt',stat:'ab_doubleXP',thresholds:[3,10,30,100,300]},
        verteidiger:{id:'verteidiger',name:'Verteidiger',emoji:'🛡️',cat:'faehigkeit',desc:'Schild genutzt',stat:'ab_shield',thresholds:[3,10,30,100,300]},
        alleskoenner:{id:'alleskoenner',name:'Alleskönner',emoji:'🌈',cat:'faehigkeit',desc:'Versch. Fähigk. genutzt',stat:'uniqueAbilities',thresholds:[2,4,6,8,10]},
        // Mini-Game-Badges (10)
        glueckspilz:{id:'glueckspilz',name:'Glückspilz',emoji:'🍀',cat:'minigame',desc:'Spinner gespielt',stat:'spinnerPlays',thresholds:[3,10,30,100,300]},
        jackpot:{id:'jackpot',name:'Jackpot',emoji:'💎',cat:'minigame',desc:'Jackpot gewonnen',stat:'jackpots',thresholds:[1,5,15,50,150]},
        drachentoeter:{id:'drachentoeter',name:'Drachentöter',emoji:'🐉',cat:'minigame',desc:'Bosse besiegt',stat:'bossKills',thresholds:[1,5,15,50,150]},
        ueberlebender:{id:'ueberlebender',name:'Überlebender',emoji:'❤️',cat:'minigame',desc:'Boss-Kämpfe',stat:'bossAttempts',thresholds:[3,10,30,100,300]},
        spieler:{id:'spieler',name:'Spieler',emoji:'🎲',cat:'minigame',desc:'Mini-Games gesamt',stat:'totalMiniGames',thresholds:[10,30,100,300,1000]},
        feuertaufe:{id:'feuertaufe',name:'Feuertaufe',emoji:'🔥',cat:'minigame',desc:'Erstes Mini-Game',stat:'totalMiniGames',thresholds:[1,1,1,1,1]}
    },
    TIER_COLORS:['gray','green','blue','purple','gold'],
    TIER_ICONS:['⚪','🟢','🔵','🟣','🥇'],

    init() {
        this._initSidebarDrag();
        EventBus.on(EventBus.EVENTS.USER_SELECTED, (data) => {
            this.renderSidebars(data.user);
        }, 'BadgePlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_STARTED, () => {
            this.hideSidebars();
        }, 'BadgePlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_COMPLETED, () => {
            if (currentUser) this.checkBadges(currentUser);
        }, 'BadgePlugin');
    },

    checkBadges(user) {
        if (!user || !PluginRegistry.isEnabled('BadgePlugin')) return;
        const defs = this.getBadgeDefinitions();
        const stats = this.calculateBadgeStats(user);
        if (!user._badgeTiers) user._badgeTiers = {};
        Object.values(defs).forEach(b => {
            if (b.active === false) return;
            const val = stats[b.stat] || 0;
            const tier = this.getBadgeTier(val, b.thresholds, b.inverted);
            const prev = user._badgeTiers[b.id] || 0;
            if (tier > prev) {
                user._badgeTiers[b.id] = tier;
                Toast.show(`${b.customIcon || b.emoji} ${b.name} ${this.TIER_ICONS[tier-1]} erreicht!`, 'success');
            }
        });
        this.renderSidebars(user);
    },

    getBadgeDefinitions() {
        const defs = JSON.parse(JSON.stringify(this.DEFAULT_BADGES));
        const overrides = quizSettings.badges || {};
        Object.keys(overrides).forEach(id => {
            if (defs[id]) Object.assign(defs[id], overrides[id]);
        });
        return defs;
    },

    calculateBadgeStats(user) {
        if (!user) return {};
        const bs = user.badgeStats || {};
        const qs = user.questionStats || {};
        const hist = user.history || [];
        const stats = { ...bs };
        stats.totalXP = user.totalXP || 0;
        stats.level = user.level || 1;
        // Unique days
        const days = new Set(hist.map(h => new Date(h.date).toDateString()));
        stats.uniqueDays = days.size;
        // First day quizzes
        if (hist.length > 0) {
            const firstDay = new Date(hist[0].date).toDateString();
            stats.firstDayQuizzes = hist.filter(h => new Date(h.date).toDateString() === firstDay).length;
        }
        // Unique questions
        stats.uniqueQuestions = Object.keys(qs).length;
        // Mastered questions (3+ correct)
        stats.masteredQuestions = Object.values(qs).filter(s => (s.correct || 0) >= 3).length;
        // Active weeks
        const weeks = new Set(hist.map(h => {
            const d = new Date(h.date);
            const yr = d.getFullYear();
            const wk = Math.ceil(((d - new Date(yr, 0, 1)) / 86400000 + new Date(yr, 0, 1).getDay() + 1) / 7);
            return `${yr}-W${wk}`;
        }));
        stats.activeWeeks = weeks.size;
        // Improvements (better than last quiz)
        let improvements = 0;
        for (let i = 1; i < hist.length; i++) {
            if ((hist[i].score || 0) > (hist[i-1].score || 0)) improvements++;
        }
        stats.improvements = improvements;
        // Comebacks (quiz after 7+ day gap)
        let comebacks = 0;
        for (let i = 1; i < hist.length; i++) {
            const gap = (new Date(hist[i].date) - new Date(hist[i-1].date)) / 86400000;
            if (gap >= 7) comebacks++;
        }
        stats.comebacks = comebacks;
        // Marathon days (10+ quizzes in a day)
        const dayCounts = {};
        hist.forEach(h => {
            const d = new Date(h.date).toDateString();
            dayCounts[d] = (dayCounts[d] || 0) + 1;
        });
        stats.marathonDays = Object.values(dayCounts).filter(c => c >= 10).length;
        // Groups played
        const groups = new Set();
        (questions || []).forEach(q => {
            const qid = q.questionId || q.id;
            if (qs[qid] && (qs[qid].asked || 0) > 0) groups.add(q.group || q._fileGroup || 'Standard');
        });
        stats.groupsPlayed = groups.size;
        // Ability stats
        const au = bs.abilitiesUsed || {};
        stats.ab_fiftyFifty = au.fiftyFifty || 0;
        stats.ab_hint = au.hint || 0;
        stats.ab_skip = au.skip || 0;
        stats.ab_secondChance = au.secondChance || 0;
        stats.ab_doubleXP = au.doubleXP || 0;
        stats.ab_shield = au.shield || 0;
        stats.ab_phoneJoker = au.phoneJoker || 0;
        stats.uniqueAbilities = Object.values(au).filter(v => v > 0).length;
        // Total mini-games
        stats.totalMiniGames = (stats.spinnerPlays || 0) + (stats.bossAttempts || 0);
        return stats;
    },

    getBadgeTier(value, thresholds, inverted) {
        if (!thresholds || !Array.isArray(thresholds)) return 0;
        let tier = 0;
        for (let i = 0; i < thresholds.length; i++) {
            if (inverted ? value <= thresholds[i] : value >= thresholds[i]) tier = i + 1;
            else break;
        }
        return Math.min(tier, 5);
    },

    getBadgeProgress(value, thresholds) {
        if (!thresholds || thresholds.length === 0) return 100;
        for (let i = 0; i < thresholds.length; i++) {
            if (value < thresholds[i]) {
                const prev = i > 0 ? thresholds[i - 1] : 0;
                return Math.min(100, Math.round(((value - prev) / (thresholds[i] - prev)) * 100));
            }
        }
        return 100;
    },

    updateSidebarTopVar() {
        const header = document.querySelector('header');
        if (header) {
            document.documentElement.style.setProperty('--sidebar-top', header.offsetHeight + 'px');
        }
    },

    renderSidebars(user) {
        if (!user || !PluginRegistry.isEnabled('BadgePlugin')) return;
        this.updateSidebarTopVar();
        const defs = this.getBadgeDefinitions();
        const stats = this.calculateBadgeStats(user);
        // Left sidebar: Quiz + Mini-Game badges
        const leftBadges = Object.values(defs).filter(b => b.cat === 'leistung' || b.cat === 'minigame');
        const rightBadges = Object.values(defs).filter(b => b.cat === 'faehigkeit');
        document.getElementById('badgeSidebarTitleLeft').textContent = user.name;
        document.getElementById('badgeSidebarTitleRight').textContent = user.name;
        document.getElementById('badgeListLeft').innerHTML =
            '<div class="badge-sidebar-section"><div class="badge-sidebar-title">🏆 Leistung</div>' +
            this.renderBadgeItems(Object.values(defs).filter(b => b.cat === 'leistung'), stats) +
            '</div><div class="badge-sidebar-section"><div class="badge-sidebar-title">🎮 Mini-Games</div>' +
            this.renderBadgeItems(Object.values(defs).filter(b => b.cat === 'minigame'), stats) + '</div>';
        document.getElementById('badgeListRight').innerHTML =
            '<div class="badge-sidebar-section"><div class="badge-sidebar-title">⚡ Fähigkeiten</div>' +
            this.renderBadgeItems(rightBadges, stats) +
            '</div>' + this.renderAbilitySidebar(user);
        // Show sidebars (explicit 'flex' to override CSS media queries)
        const sl = document.getElementById('badgeSidebarLeft');
        const sr = document.getElementById('badgeSidebarRight');
        if (sl) sl.style.display = 'flex';
        if (sr) sr.style.display = 'flex';
        // Restore collapsed state
        if (this._sidebarState.left.collapsed) {
            if (sl) sl.style.display = 'none';
            document.getElementById('sidebarToggleLeft').style.display = 'block';
        }
        if (this._sidebarState.right.collapsed) {
            if (sr) sr.style.display = 'none';
            document.getElementById('sidebarToggleRight').style.display = 'block';
        }
        this.restoreSidebarPositions();
    },

    renderBadgeItems(badges, stats) {
        if (!badges || badges.length === 0) return '';
        return '<div class="badge-icon-grid">' +
            badges.filter(b => b.active !== false).map(b => {
            const val = stats[b.stat] || 0;
            const tier = this.getBadgeTier(val, b.thresholds, b.inverted);
            const progress = this.getBadgeProgress(val, b.thresholds);
            const color = this.TIER_COLORS[tier > 0 ? tier - 1 : 0];
            const locked = tier === 0;
            const icon = b.customIcon || b.emoji;
            const progressPill = progress < 100 ? `<div class="badge-progress">${progress}%</div>` : '';
            return `<div class="badge-item ${locked ? 'locked' : ''} badge-${color}"
                onmouseenter="BadgePlugin.showBadgeTooltip(event,'${b.id}')"
                onmouseleave="BadgePlugin.hideBadgeTooltip()"
                data-badge-id="${b.id}" data-tier="${tier}" data-value="${val}">${icon}${progressPill}</div>`;
        }).join('') + '</div>';
    },

    _abilityStatLabels: {
        _fifty50Sessions: 'Burst-Sessions (2+ Quizze/h)',
        totalQuizzes: 'Quizze gespielt',
        uniqueQuestions: 'Verschiedene Fragen',
        perfectQuizzes: 'Perfekte Quizze (100%)',
        currentStreak: 'Tage Streak',
        activeDays3: 'Tage mit 3+ Quizzen',
        _phoneJokerUsed: 'Telefon-Joker genutzt',
        highAverageQuizzes: 'Quizze mit ≥80%'
    },

    renderAbilitySidebar(user) {
        if (!user || !PluginRegistry.isEnabled('AbilityPlugin')) return '';
        const defs = AbilityPlugin.DEFS;
        if (!defs) return '';
        const statValues = AbilityPlugin.getStatValues ? AbilityPlugin.getStatValues(user) : {};
        let html = '<div class="badge-sidebar-section"><div class="badge-sidebar-title">🎯 Fähigkeiten</div>';
        Object.keys(defs).forEach(key => {
            const def = defs[key];
            const charges = AbilityPlugin.getCharges ? AbilityPlugin.getCharges(key) : 0;
            const earnPer = def.earnPer || 5;
            const statVal = statValues[def.earnStat] || 0;
            const totalEarned = Math.floor(statVal / earnPer);
            const unlocked = totalEarned > 0 || charges > 0;
            const progressToNext = statVal % earnPer;
            const progressPct = Math.round((progressToNext / earnPer) * 100);
            const statLabel = this._abilityStatLabels[def.earnStat] || def.earnStat;
            const tooltip = `${def.name}: ${def.desc}\nFortschritt: ${progressToNext}/${earnPer} ${statLabel}\nGesamt: ${statVal} ${statLabel} → ${totalEarned} Ladungen`;
            html += `<div class="ability-sidebar-item ${unlocked ? 'unlocked' : ''}" title="${tooltip}">
                <div class="ab-progress" style="width:${progressPct}%"></div>
                <span class="ab-icon">${def.icon}</span>
                <span class="ab-name">${def.name}</span>
                <span class="ab-charges ${charges === 0 ? 'empty' : ''}">${charges}×</span>
            </div>`;
        });
        html += '<div style="font-size:0.55rem;opacity:0.4;text-align:center;margin-top:4px;">Stats schalten Ladungen frei</div>';
        return html + '</div>';
    },

    showBadgeTooltip(event, badgeId) {
        const defs = this.getBadgeDefinitions();
        const b = defs[badgeId];
        if (!b) return;
        const user = currentUser;
        const stats = user ? this.calculateBadgeStats(user) : {};
        const val = stats[b.stat] || 0;
        const tier = this.getBadgeTier(val, b.thresholds, b.inverted);
        const progress = this.getBadgeProgress(val, b.thresholds);
        const nextThreshold = b.thresholds.find(t => val < t);
        const tt = document.getElementById('globalBadgeTooltip');
        if (!tt) return;
        let tierHtml = b.thresholds.map((t, i) => {
            const achieved = val >= t;
            return `<span style="color:${achieved ? ['#888','#2ecc71','#3498db','#9b59b6','#f1c40f'][i] : '#555'}">${this.TIER_ICONS[i]} ${t}</span>`;
        }).join(' → ');
        tt.innerHTML = `<div style="font-size:1.5rem;margin-bottom:4px;">${b.customIcon || b.emoji} ${b.name}</div>
            <div style="opacity:0.8;margin-bottom:6px;">${b.desc}</div>
            <div style="margin-bottom:4px;">Stufe: ${tier > 0 ? this.TIER_ICONS[tier-1] : '⚪'} (${val}${nextThreshold ? ' / ' + nextThreshold : ''})</div>
            <div class="badge-progress"><div class="badge-progress-fill" style="width:${progress}%"></div></div>
            <div style="font-size:0.75rem;margin-top:4px;">${tierHtml}</div>`;
        tt.classList.add('visible');
        const rect = event.target.closest('.badge-item')?.getBoundingClientRect();
        if (rect) {
            tt.style.left = Math.min(rect.left, window.innerWidth - 280) + 'px';
            tt.style.top = (rect.bottom + 8) + 'px';
        }
    },

    hideBadgeTooltip() {
        const tt = document.getElementById('globalBadgeTooltip');
        if (tt) tt.classList.remove('visible');
    },

    hideSidebars() {
        ['badgeSidebarLeft','badgeSidebarRight','sidebarToggleLeft','sidebarToggleRight'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    },

    showUserBadges(userId) {
        const user = users.find(u => u.id == userId);
        if (user) this.renderSidebars(user);
    },

    toggleSidebarCollapse(side) {
        const state = this._sidebarState[side];
        state.collapsed = !state.collapsed;
        const sidebarId = side === 'left' ? 'badgeSidebarLeft' : 'badgeSidebarRight';
        const toggleId = side === 'left' ? 'sidebarToggleLeft' : 'sidebarToggleRight';
        const sidebar = document.getElementById(sidebarId);
        const toggle = document.getElementById(toggleId);
        if (state.collapsed) {
            if (sidebar) sidebar.style.display = 'none';
            if (toggle) toggle.style.display = 'block';
        } else {
            if (sidebar) sidebar.style.display = 'flex';
            if (toggle) toggle.style.display = 'none';
        }
    },

    saveSidebarPosition(side) {
        if (!currentUser) return;
        const sidebarId = side === 'left' ? 'badgeSidebarLeft' : 'badgeSidebarRight';
        const sidebar = document.getElementById(sidebarId);
        if (!sidebar) return;
        if (!currentUser.sidebarPositions) currentUser.sidebarPositions = {};
        currentUser.sidebarPositions[side] = { top: sidebar.style.top || null };
        const resetBtn = document.getElementById(side === 'left' ? 'sidebarResetLeft' : 'sidebarResetRight');
        if (resetBtn) resetBtn.style.display = '';
        Toast.show('Position gespeichert', 'success');
    },

    resetSidebarPosition(side) {
        const sidebarId = side === 'left' ? 'badgeSidebarLeft' : 'badgeSidebarRight';
        const sidebar = document.getElementById(sidebarId);
        if (sidebar) {
            sidebar.style.top = '';
            sidebar.classList.remove('user-positioned');
        }
        if (currentUser && currentUser.sidebarPositions) {
            delete currentUser.sidebarPositions[side];
        }
        const resetBtn = document.getElementById(side === 'left' ? 'sidebarResetLeft' : 'sidebarResetRight');
        if (resetBtn) resetBtn.style.display = 'none';
        Toast.show('Standardposition', 'info');
    },

    restoreSidebarPositions() {
        if (!currentUser || !currentUser.sidebarPositions) return;
        ['left','right'].forEach(side => {
            const pos = currentUser.sidebarPositions[side];
            if (!pos) return;
            const sidebarId = side === 'left' ? 'badgeSidebarLeft' : 'badgeSidebarRight';
            const sidebar = document.getElementById(sidebarId);
            if (sidebar && pos.top) {
                sidebar.style.top = pos.top;
                sidebar.classList.add('user-positioned');
            }
            const resetBtn = document.getElementById(side === 'left' ? 'sidebarResetLeft' : 'sidebarResetRight');
            if (resetBtn && pos.top) resetBtn.style.display = '';
            const saveBtn = document.getElementById(side === 'left' ? 'sidebarSaveLeft' : 'sidebarSaveRight');
            if (saveBtn) saveBtn.style.display = '';
        });
    },

    _initSidebarDrag() {
        document.querySelectorAll('.sidebar-drag-handle-inline').forEach(handle => {
            handle.addEventListener('mousedown', e => {
                const sidebar = handle.closest('.badge-sidebar');
                if (!sidebar) return;
                e.preventDefault();
                sidebar.classList.add('dragging');
                const startY = e.clientY;
                const startTop = sidebar.offsetTop;
                const side = sidebar.classList.contains('badge-sidebar-left') ? 'left' : 'right';
                const onMove = ev => {
                    const newTop = Math.max(0, startTop + (ev.clientY - startY));
                    sidebar.style.top = newTop + 'px';
                    sidebar.classList.add('user-positioned');
                };
                const onUp = () => {
                    sidebar.classList.remove('dragging');
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    const saveBtn = document.getElementById(side === 'left' ? 'sidebarSaveLeft' : 'sidebarSaveRight');
                    if (saveBtn) saveBtn.style.display = '';
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    },

    // Admin Badge Management
    renderBadgeAdmin() {
        const container = document.getElementById('adminBadges');
        if (!container) return;
        const defs = this.getBadgeDefinitions();
        const cats = {leistung:'🏆 Leistungs-Badges',faehigkeit:'⚡ Fähigkeiten-Badges',minigame:'🎮 Mini-Game-Badges'};
        let html = '<h3>🏆 Badge-Verwaltung</h3><div style="margin-bottom:12px;">';
        html += '<button class="btn-save" onclick="BadgePlugin.switchBadgePreset(\'default\')" style="margin-right:8px;">Standard-Emojis</button>';
        html += '<button class="btn-save" onclick="BadgePlugin.saveBadgeSettings()">💾 Badge-Settings speichern</button></div>';
        Object.entries(cats).forEach(([cat, title]) => {
            const catBadges = Object.values(defs).filter(b => b.cat === cat);
            html += `<h4 style="margin:16px 0 8px;">${title}</h4><div class="badge-admin-grid">`;
            catBadges.forEach(b => {
                const active = b.active !== false;
                html += `<div class="badge-admin-card ${active ? '' : 'badge-inactive'}">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="font-size:1.5rem;">${b.customIcon || b.emoji}</span>
                        <strong>${b.name}</strong>
                        <label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:0.8rem;">
                            <input type="checkbox" ${active ? 'checked' : ''} onchange="BadgePlugin.toggleBadgeActive('${b.id}',this.checked)">
                            Aktiv
                        </label>
                    </div>
                    <div style="font-size:0.8rem;opacity:0.7;margin-bottom:8px;">${b.desc} (${b.stat})</div>
                    <div class="badge-tier-row">
                        ${b.thresholds.map((t, i) => `<div class="badge-tier-cell">
                            <span class="tier-dot" style="color:${['#888','#2ecc71','#3498db','#9b59b6','#f1c40f'][i]}">${this.TIER_ICONS[i]}</span>
                            <input type="number" value="${t}" min="1"
                                onchange="BadgePlugin._updateThreshold('${b.id}',${i},this.value)"
                                style="width:60px;text-align:center;">
                        </div>`).join('')}
                    </div>
                    <div class="badge-icon-circles" style="margin-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:0.75rem;opacity:0.6;">Icon:</span>
                        ${b.customIcon && b.customIcon.includes('<img') ? `
                            <span style="font-size:1.2rem;">${b.customIcon}</span>
                            <button class="btn-save" style="font-size:0.7rem;padding:2px 6px;" onclick="BadgePlugin.removeBadgeIcon('${b.id}')">✕ Bild entfernen</button>
                        ` : `
                            <input type="text" value="${b.customIcon || b.emoji}" maxlength="4"
                                onchange="BadgePlugin.setBadgeEmoji('${b.id}',this.value)"
                                style="width:50px;text-align:center;padding:2px 4px;">
                        `}
                        <input type="file" id="badgeUpload_${b.id}" accept="image/*" style="display:none"
                            onchange="BadgePlugin.uploadBadgeIcon('${b.id}',event)">
                        <button class="btn-save" style="font-size:0.7rem;padding:2px 6px;"
                            onclick="document.getElementById('badgeUpload_${b.id}').click()">🖼️ Bild</button>
                    </div>
                </div>`;
            });
            html += '</div>';
        });
        container.innerHTML = html;
    },

    _updateThreshold(badgeId, tierIndex, value) {
        if (!quizSettings.badges) quizSettings.badges = {};
        if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
        const defs = this.getBadgeDefinitions();
        const b = defs[badgeId];
        if (!b) return;
        const th = [...b.thresholds];
        th[tierIndex] = parseInt(value) || 1;
        quizSettings.badges[badgeId].thresholds = th;
    },

    toggleBadgeActive(badgeId, active) {
        if (!quizSettings.badges) quizSettings.badges = {};
        if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
        quizSettings.badges[badgeId].active = active;
        this.renderBadgeAdmin();
    },

    setBadgeEmoji(badgeId, emoji) {
        if (!quizSettings.badges) quizSettings.badges = {};
        if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
        quizSettings.badges[badgeId].customIcon = emoji;
    },

    switchBadgePreset(preset) {
        if (preset === 'default') {
            Object.keys(this.DEFAULT_BADGES).forEach(id => {
                if (quizSettings.badges && quizSettings.badges[id]) {
                    delete quizSettings.badges[id].customIcon;
                }
            });
            this.renderBadgeAdmin();
            Toast.show('Standard-Emojis wiederhergestellt', 'info');
        }
    },

    saveBadgeSettings() {
        Toast.show('Badge-Settings gespeichert', 'success');
    },

    selectBadgeIconCircle(badgeId, preset) { this._selectedBadgeCircle = { badgeId, preset }; },
    uploadBadgeIcon(badgeId, event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            if (!quizSettings.badges) quizSettings.badges = {};
            if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
            quizSettings.badges[badgeId].customIcon = `<img src="${e.target.result}" style="width:24px;height:24px;">`;
            this.renderBadgeAdmin();
        };
        reader.readAsDataURL(file);
    },
    removeBadgeIcon(badgeId) {
        if (quizSettings.badges && quizSettings.badges[badgeId]) {
            delete quizSettings.badges[badgeId].customIcon;
        }
        this.renderBadgeAdmin();
    },

    enable() {
        if (currentUser) this.renderSidebars(currentUser);
    },
    disable() {
        this.hideSidebars();
    }
};
// ── LEADERBOARD PLUGIN ───────────────────────────────────────
