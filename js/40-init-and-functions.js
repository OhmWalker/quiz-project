// 40-init-and-functions.js
// init(), all global utility functions, legacy bridges, export/import, cleanup
// ============================================================

function init() {
    // Event-Delegation initialisieren (ersetzt inline onclick/onchange)
    EventDelegation.init();

    // Sync globale Variablen → AppState
    syncToAppState();

    // Quiz-Bildgröße CSS-Variable setzen
    applyQuizImageWidth();

    // Plugins initialisieren (wenn welche registriert sind)
    PluginRegistry.initAll();
    
    // Plugin-Sichtbarkeit auf Startscreen anwenden
    applyPluginVisibility();
    
    // Nach jedem Daten-Import: Plugin-Sichtbarkeit + Bildgröße aktualisieren
    EventBus.on('data:loaded', () => {
        setTimeout(() => applyPluginVisibility(), 100);
        applyQuizImageWidth();
    });
    
    // Don't auto-load from localStorage anymore
    // User must import data file at startup
    if (!dataLoaded) {
        showScreen('importScreen');
    } else {
        showScreen('startScreen');
        renderUserSelect();
        updateQuestionsList();
        updateUsersList();
        EventBus.emit('data:loaded', { questions: questions.length, users: users.length });
    }
}

// No-op: Daten werden nur via Export gespeichert
function saveData() { return; }

// Simple encryption using Base64 encoding

function encryptData(data) {
    const jsonStr = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(jsonStr + encryptionKey)));
}


function decryptData(encryptedData) {
    try {
        const decoded = decodeURIComponent(escape(atob(encryptedData)));
        // Remove encryption key from end
        const jsonStr = decoded.substring(0, decoded.length - encryptionKey.length);
        return JSON.parse(jsonStr);
    } catch (error) {
        throw new Error('Ungültige oder beschädigte Datendatei');
    }
}

// Utility Functions


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function getMediaSource(media) {
    if (!media) return null;
    
    // Priority 1: Local file path (most efficient)
    if (media.path) return media.path;
    
    // Priority 2: Base64 data (legacy/fallback)
    if (media.data) return media.data;
    
    // Priority 3: External URL (rare)
    if (media.url) return media.url;
    
    return null;
}


function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


function validateQuestion(q) {
    if (!q || typeof q.text !== 'string') return false;
    if (q.type === QUESTION_TYPES.IMAGEMAP) return q.targets && q.targets.length > 0;
    if (q.type === QUESTION_TYPES.TEXT) return true;
    return Array.isArray(q.answers) &&
           q.answers.length > 0;
}


function validateUser(u) {
    if (!u || typeof u.id !== 'number' || typeof u.name !== 'string') return false;
    // Migration: alte totalScore → totalXP
    if (u.totalScore !== undefined && u.totalXP === undefined) {
        u.totalXP = u.totalScore;
        delete u.totalScore;
    }
    if (typeof u.totalXP !== 'number') u.totalXP = 0;
    return true;
}


function getNextAvailableQuestionId() {
    const existingIds = new Set(questions.map(q => q.questionId));
    for (let i = 1; i <= LIMITS.MAX_QUESTION_ID; i++) {
        const id = String(i).padStart(3, '0');
        if (!existingIds.has(id)) {
            return id;
        }
    }
    // Fallback if all IDs are taken
    return String(questions.length + 1).padStart(3, '0');
}






// Initialize sample data

function initializeSampleQuestions() {
    questions = [
        { questionId: "001", id: Date.now() + 1, active: true, text: "Welcher Fluss wird traditionell als der längste der Welt bezeichnet? (Hinweis: Die Messung ist wissenschaftlich umstritten)", answers: [{ text: "Nil", correct: true }, { text: "Amazonas", correct: true }, { text: "Jangtse", correct: false }, { text: "Mississippi", correct: false }], media: null },
        { questionId: "002", id: Date.now() + 2, active: true, text: "In welchem Jahr fiel die Berliner Mauer?", answers: [{ text: "1987", correct: false }, { text: "1989", correct: true }, { text: "1990", correct: false }, { text: "1991", correct: false }], media: null },
        { questionId: "003", id: Date.now() + 3, active: true, text: "Wie viele Planeten hat unser Sonnensystem?", answers: [{ text: "7", correct: false }, { text: "8", correct: true }, { text: "9", correct: false }, { text: "10", correct: false }], media: null },
        { questionId: "004", id: Date.now() + 4, active: true, text: "Welches ist das größte Land der Erde?", answers: [{ text: "Kanada", correct: false }, { text: "China", correct: false }, { text: "USA", correct: false }, { text: "Russland", correct: true }], media: null },
        { questionId: "005", id: Date.now() + 5, active: true, text: "Wer malte die Mona Lisa?", answers: [{ text: "Michelangelo", correct: false }, { text: "Leonardo da Vinci", correct: true }, { text: "Raphael", correct: false }, { text: "Donatello", correct: false }], media: null },
        { questionId: "006", id: Date.now() + 6, active: true, text: "Wie viele Herzen hat ein Oktopus?", answers: [{ text: "1", correct: false }, { text: "2", correct: false }, { text: "3", correct: true }, { text: "4", correct: false }], media: null },
        { questionId: "007", id: Date.now() + 7, active: true, text: "Welche Sprache wird in Brasilien gesprochen?", answers: [{ text: "Spanisch", correct: false }, { text: "Portugiesisch", correct: true }, { text: "Französisch", correct: false }, { text: "Italienisch", correct: false }], media: null },
        { questionId: "008", id: Date.now() + 8, active: true, text: "Was ist die Hauptstadt von Australien?", answers: [{ text: "Sydney", correct: false }, { text: "Melbourne", correct: false }, { text: "Canberra", correct: true }, { text: "Brisbane", correct: false }], media: null },
        { questionId: "009", id: Date.now() + 9, active: true, text: "Wie viele Zähne hat ein erwachsener Mensch?", answers: [{ text: "28", correct: false }, { text: "30", correct: false }, { text: "32", correct: true }, { text: "34", correct: false }], media: null },
        { questionId: "010", id: Date.now() + 10, active: true, text: "Welches ist das schnellste Landtier?", answers: [{ text: "Löwe", correct: false }, { text: "Gepard", correct: true }, { text: "Gazelle", correct: false }, { text: "Windhund", correct: false }], media: null }
    ];
}

function initializeSampleUsers() {
    users = [
        { id: 1701234567001, name: "CB", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567002, name: "DL", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567003, name: "GA", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567004, name: "HD", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567005, name: "HL", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567006, name: "HR", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567007, name: "JR", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567008, name: "KC", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567009, name: "KD", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567010, name: "KG", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567011, name: "KR", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567012, name: "KY", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567013, name: "MK", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567014, name: "MR", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567015, name: "MT", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567016, name: "MZ", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567017, name: "OB", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567018, name: "PL", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567019, name: "SJ", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567020, name: "SR", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567021, name: "TS", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} },
        { id: 1701234567022, name: "UH", quizzesTaken: 0, totalXP: 0, history: [], lastQuizDate: null, dailyQuizCount: 0, questionStats: {} }
    ];
    saveData();
}

// Screen navigation

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
}

// showAdminSection, showSuperAdminLogin, closeSuperAdminModal, checkSuperAdminPassword
// → 41-admin-functions.js

// XP System Functions

function calculateXPForLevel(level) {
    // Exponential XP requirement: baseXP * (level ^ exponent)
    const settings = quizSettings.xpSystem;
    return Math.floor(settings.baseXP * Math.pow(level, settings.exponent));
}


function calculateLevel(totalXP) {
    let level = 1;
    let xpNeeded = 0;
    
    while (level < 100) {
        xpNeeded += calculateXPForLevel(level);
        if (totalXP < xpNeeded) break;
        level++;
    }
    
    return {
        level: Math.min(level, 100),
        currentLevelXP: level === 1 ? totalXP : totalXP - (xpNeeded - calculateXPForLevel(level)),
        xpForNextLevel: level < 100 ? calculateXPForLevel(level) : 0
    };
}


function getDailyXPMultiplier(user) {
    const today = new Date().toDateString();
    
    // Initialize fields if they don't exist (for old users)
    if (!user.lastQuizDate) user.lastQuizDate = null;
    if (user.dailyQuizCount === undefined) user.dailyQuizCount = 0;
    
    // Check if it's a new day - but DON'T modify user here
    const isNewDay = user.lastQuizDate !== today;
    const currentDailyCount = isNewDay ? 0 : user.dailyQuizCount;
    
    // First quiz of the day gets bonus
    const multiplier = currentDailyCount === 0 
        ? quizSettings.xpSystem.firstDailyBonus 
        : quizSettings.xpSystem.subsequentBonus;
    
    return multiplier / 100; // Convert percentage to multiplier
}


function incrementDailyQuizCount(user) {
    const today = new Date().toDateString();
    
    // Initialize fields if they don't exist
    if (!user.lastQuizDate) user.lastQuizDate = null;
    if (user.dailyQuizCount === undefined) user.dailyQuizCount = 0;
    
    // Check if it's a new day
    if (user.lastQuizDate !== today) {
        user.lastQuizDate = today;
        user.dailyQuizCount = 1;
    } else {
        user.dailyQuizCount++;
    }
}

// Get avatar icon and color based on level

function getAvatarForLevel(level) {
    const avatars = quizSettings.avatars;
    const preset = quizSettings.avatarPreset || 1;
    let avatar;
    
    if (level >= 90) avatar = avatars.level90;
    else if (level >= 75) avatar = avatars.level75;
    else if (level >= 60) avatar = avatars.level60;
    else if (level >= 45) avatar = avatars.level45;
    else if (level >= 30) avatar = avatars.level30;
    else if (level >= 15) avatar = avatars.level15;
    else if (level >= 5) avatar = avatars.level5;
    else avatar = avatars.level1;
    
    // Use custom image based on active preset, otherwise use emoji
    // Sanitize icon output to prevent XSS
    let display;
    const activeImage = preset === 1 ? avatar.image : avatar.image2;
    
    if (activeImage) {
        // Für Bilder: src-Attribut muss validiert werden
        const safeSrc = activeImage.replace(/[<>"']/g, '');
        display = `<img src="${safeSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'">`;
    } else {
        // Für Emojis: Nur erlaubte Unicode-Zeichen
        display = sanitizeHTML(avatar.icon);
    }
    
    // Get gradient color based on level
    let gradient;
    if (level >= 90) gradient = 'linear-gradient(135deg, #FFD700, #FFA500)';
    else if (level >= 75) gradient = 'linear-gradient(135deg, #00CED1, #1E90FF)';
    else if (level >= 60) gradient = 'linear-gradient(135deg, #FF1493, #FF69B4)';
    else if (level >= 45) gradient = 'linear-gradient(135deg, #FF4500, #FF6347)';
    else if (level >= 30) gradient = 'linear-gradient(135deg, #9370DB, #BA55D3)';
    else if (level >= 15) gradient = 'linear-gradient(135deg, #FFD700, #FFFF00)';
    else if (level >= 5) gradient = 'linear-gradient(135deg, #32CD32, #00FA9A)';
    else gradient = 'linear-gradient(135deg, #808080, #A9A9A9)';
    
    return { icon: display, gradient };
}

// User selection

function renderUserSelect() {
    const userSelect = document.getElementById('userSelect');
    // Sort users alphabetically by name
    const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));
    userSelect.innerHTML = sortedUsers.map(user => {
        // Initialize fields if they don't exist (for old users)
        if (!user.lastQuizDate) user.lastQuizDate = null;
        if (!user.dailyQuizCount) user.dailyQuizCount = 0;
        
        // Calculate level and XP using exponential system
        // Das Feld heißt "totalXP".
        // Der Name ist historisch bedingt und wurde beibehalten.
        const xpData = calculateLevel(user.totalXP);
        const level = xpData.level;
        const currentLevelXP = xpData.currentLevelXP;
        const xpForNextLevel = xpData.xpForNextLevel;
        const xpPercentage = xpForNextLevel > 0 ? (currentLevelXP / xpForNextLevel) * 100 : 100;
        
        // Level-Fortschritt für Rahmen (Level 1-100 = 0-100%)
        const maxLevel = CONFIG.XP.MAX_LEVEL;
        const levelProgress = Math.min(100, (level / maxLevel) * 100);
        
        // Get avatar based on level
        const avatar = getAvatarForLevel(level);
        
        return `
        <div class="user-card" data-userid="${user.id}" onclick="selectUser(${user.id}, event)" style="--xp-progress: ${levelProgress}%">
            <div class="user-card-header">
                <div class="user-avatar" style="background: ${avatar.gradient};">
                    ${avatar.icon}
                </div>
                <div class="user-info">
                    <div class="user-name">
                        ${user.name}
                        <span class="user-level">Lvl ${level}</span>
                    </div>
                    <div class="user-xp-container">
                        <div class="user-xp-bar">
                            <div class="user-xp-fill" style="width: ${xpPercentage}%"></div>
                        </div>
                        <div class="user-xp-text">${currentLevelXP} / ${xpForNextLevel} XP</div>
                    </div>
                </div>
            </div>
            <div class="user-stats">
                ${user.quizzesTaken} Quiz${user.quizzesTaken !== 1 ? 'ze' : ''} absolviert
            </div>
        </div>
        `;
    }).join('');
    
    // Letzte Zeile zentrieren: Spacer-Divs einfügen
    // Ermittle aktuelle Spaltenanzahl basierend auf Viewport
    const vw = window.innerWidth;
    const cols = vw <= 600 ? 2 : vw <= 900 ? 3 : vw <= 1200 ? 4 : 5;
    const remainder = sortedUsers.length % cols;
    if (remainder > 0) {
        const spacers = Math.floor((cols - remainder) / 2);
        let spacerHTML = '';
        for (let s = 0; s < spacers; s++) {
            spacerHTML += '<div style="visibility:hidden;"></div>';
        }
        // Spacer VOR den letzten remainder Karten einfügen
        const cards = userSelect.querySelectorAll('.user-card');
        if (cards.length > 0 && spacers > 0) {
            const firstOfLastRow = cards[cards.length - remainder];
            for (let s = 0; s < spacers; s++) {
                const spacerEl = document.createElement('div');
                spacerEl.style.visibility = 'hidden';
                userSelect.insertBefore(spacerEl, firstOfLastRow);
            }
        }
    }
    
    renderLeaderboard();
}

// Generischer Plugin-Dispatcher
// Ersetzt individuelle Wrapper-Funktionen für onclick-Aufrufe
// Nutzung: call('PluginName','methode', arg1, arg2, ...)
// Guard: Prüft automatisch ob Plugin aktiviert ist

function call(plugin, method, ...args) {
    const p = PluginRegistry.get(plugin);
    if (!p) { console.warn('[call] Plugin not found:', plugin); return; }
    if (!PluginRegistry.isEnabled(plugin)) return;
    if (typeof p[method] !== 'function') {
        console.warn('[call] Method not found:', plugin + '.' + method);
        return;
    }
    return p[method](...args);
}

// testMiniGame, updateRangeDisplay, updateQuizImageWidth, toggleEncryptPlayerData
// → 41-admin-functions.js

function renderLeaderboard() { if (!PluginRegistry.isEnabled('LeaderboardPlugin')) return; LeaderboardPlugin.render(); }

function renderNextGoals(user) {
    const container = document.getElementById('nextGoalsContainer');
    if (!container) return;
    if (!user) { container.innerHTML = ''; return; }

    const goals = [];

    // Level-Up
    const lvl = calculateLevel(user.totalXP || 0);
    if (lvl.xpForNextLevel > 0) {
        const pct = Math.min(99, Math.round(lvl.currentLevelXP / lvl.xpForNextLevel * 100));
        const remaining = lvl.xpForNextLevel - lvl.currentLevelXP;
        goals.push({ icon: '⬆️', label: `Level ${lvl.level + 1}`, detail: `Noch ${remaining} XP`, pct });
    }

    // Nächste Fähigkeits-Ladung (beste Näherung)
    if (typeof AbilityPlugin !== 'undefined' && PluginRegistry.isEnabled('AbilityPlugin')) {
        const statVals = AbilityPlugin.getStatValues(user);
        const statLabels = { totalQuizzes: 'Quiz', uniqueQuestions: 'neue Fragen', perfectQuizzes: 'Perfekt-Quiz', currentStreak: 'Streak-Tage' };
        const SHOWABLE = ['skip', 'hint', 'doubleXP', 'shield', 'secondChance'];
        let best = null, bestPct = -1;
        SHOWABLE.forEach(key => {
            const def = AbilityPlugin.DEFS[key];
            if (!def) return;
            const statVal = statVals[def.earnStat] || 0;
            const totalEarned = Math.floor(statVal / def.earnPer);
            const nextAt = (totalEarned + 1) * def.earnPer;
            const remaining = nextAt - statVal;
            const pct = Math.round((statVal % def.earnPer) / def.earnPer * 100);
            if (pct > bestPct) {
                bestPct = pct;
                best = { icon: def.icon, label: def.name, detail: `Noch ${remaining} ${statLabels[def.earnStat] || ''}`, pct };
            }
        });
        if (best) goals.push(best);
    }

    if (goals.length === 0) { container.innerHTML = ''; return; }

    let html = '<div class="next-goals-section"><div class="next-goals-title">🎯 Nächste Ziele</div>';
    goals.forEach(g => {
        html += `<div class="next-goal-item"><div class="next-goal-header"><span>${g.icon} ${g.label}</span><span class="next-goal-detail">${g.detail}</span></div>`;
        if (g.pct !== null) html += `<div class="next-goal-bar"><div class="next-goal-fill" style="width:${g.pct}%"></div></div>`;
        html += '</div>';
    });

    // XP-Nachbarbalken
    if (users && users.length >= 2) {
        const ranked = [...users].sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
        const myIdx  = ranked.findIndex(u => u.id === user.id);
        if (myIdx !== -1) {
            const above = myIdx > 0 ? ranked[myIdx - 1] : null;
            const below = myIdx < ranked.length - 1 ? ranked[myIdx + 1] : null;
            const myXP  = user.totalXP || 0;

            if (above || below) {
                const belowXP   = below ? (below.totalXP || 0) : myXP;
                const aboveXP   = above ? (above.totalXP || 0) : myXP;
                const range     = Math.max(1, aboveXP - belowXP);
                const pos       = above && below
                    ? Math.min(97, Math.max(3, Math.round((myXP - belowXP) / range * 100)))
                    : above ? 3 : 97;
                const gapBelow  = below ? myXP - belowXP : null;
                const gapAbove  = above ? aboveXP - myXP : null;

                const leftBlock = below ? `
                    <div class="xp-nb-side xp-nb-left">
                        <div class="xp-nb-name">${sanitizeHTML(below.name)}</div>
                        <div class="xp-nb-xp">${belowXP} XP</div>
                    </div>` : `<div class="xp-nb-side xp-nb-left"></div>`;

                const rightBlock = above ? `
                    <div class="xp-nb-side xp-nb-right">
                        <div class="xp-nb-name">${sanitizeHTML(above.name)}</div>
                        <div class="xp-nb-xp">${aboveXP} XP</div>
                    </div>` : `<div class="xp-nb-side xp-nb-right xp-nb-first">1. Platz 🥇</div>`;

                const gapBelowLabel = gapBelow !== null
                    ? `<span class="xp-nb-gap xp-nb-gap-left">+${gapBelow}</span>` : '';
                const gapAboveLabel = gapAbove !== null
                    ? `<span class="xp-nb-gap xp-nb-gap-right">-${gapAbove}</span>` : '';

                html += `<div class="next-goal-item">
                    <div class="next-goal-header"><span>📊 Rangliste #${myIdx + 1}</span><span class="next-goal-detail">${myXP} XP</span></div>
                    <div class="xp-nb-row">
                        ${leftBlock}
                        <div class="xp-nb-track-wrap">
                            <div class="xp-nb-track">
                                <div class="xp-nb-fill" style="width:${pos}%"></div>
                                <div class="xp-nb-dot" style="left:${pos}%"></div>
                                ${gapBelowLabel}
                                ${gapAboveLabel}
                            </div>
                        </div>
                        ${rightBlock}
                    </div>
                </div>`;
            }
        }
    }

    html += '</div>';
    container.innerHTML = html;
}

// FÄHIGKEITEN-SYSTEM (Abilities)

// ABILITY_DEFS ist eine Referenz auf AbilityPlugin.DEFS (NICHT doppelt pflegen!)
const ABILITY_DEFS = AbilityPlugin.DEFS;

// Ability State
let abilityUsedThisQuestion = {};
let doubleXPActive = false;
let shieldActive = false;
let secondChanceArmed = false;

let autoAdvanceTimeout = null;

function clearAutoAdvance() {
    if (autoAdvanceTimeout) { clearTimeout(autoAdvanceTimeout); autoAdvanceTimeout = null; }
}

function useAbility(key) { if (!PluginRegistry.isEnabled('AbilityPlugin')) return; AbilityPlugin.useAbility(key); }

function updateHeaderUserNames() {
    const leftEl = document.getElementById('headerUserLeft');
    const rightEl = document.getElementById('headerUserRight');
    if (leftEl && rightEl) {
        if (currentUser) {
            leftEl.textContent = '👤 ' + currentUser.name;
            rightEl.textContent = currentUser.name + ' 👤';
        } else {
            leftEl.textContent = '';
            rightEl.textContent = '';
        }
    }
}

function selectUser(userId, event) { ClassicQuizPlugin.selectUser(userId, event); }
function startQuiz() { ClassicQuizPlugin.startQuiz(); }
function submitAnswer() { ClassicQuizPlugin.submitAnswer(); }
function showExplanation() { ClassicQuizPlugin.showExplanation(); }
function nextQuestion() { ClassicQuizPlugin.nextQuestion(); }
function dismissHint() { if (!PluginRegistry.isEnabled('AbilityPlugin')) return; AbilityPlugin.dismissHint(); }
function restartQuiz() { ClassicQuizPlugin.restartQuiz(); }
function abandonQuiz() { ClassicQuizPlugin.abandonQuiz(); }

function hideBadgeSidebars() { BadgePlugin.hideSidebars(); }
function renderBadgeAdmin() { if (!PluginRegistry.isEnabled('BadgePlugin')) return; BadgePlugin.renderBadgeAdmin(); }

function backToStart() {
    currentUser = null;
    const startBtn = document.getElementById('startQuizBtn');
    if (startBtn) { startBtn.style.opacity = '0.5'; startBtn.style.pointerEvents = 'none'; }
    document.querySelectorAll('.user-card').forEach(card => card.classList.remove('selected'));
    hideBadgeSidebars();
    renderUserSelect();
    showScreen('startScreen');
}

// checkImagemapHit, pointInPolygon, distToPolygon, distToSegment, calculateQuestionStats
// → direkt in 15-imagemap-geometry.js als globale Funktionen definiert


function updateQuestionsList() { if (typeof Fragen2Plugin !== 'undefined') Fragen2Plugin.render(); }


// addUser, updateUsersList, deleteUser, showUserDetail, renderUserDetailContent,
// renderSuperAdminEditForm, getQuestionStatsArray, authenticateSuperAdmin, saveUserEdits,
// exportUserData, importUserData, confirmResetUserStats,
// showAdminLogin, closePasswordModal, checkPassword, logoutAdmin,
// updateQuizName, updateSpacedRepetitionSettings, updateQuizSettings, updateXPSettings,
// updateLeaderboardSettings, updateLeaderboardPreview,
// uploadAvatar, removeAvatar, switchAvatarPreset, selectAvatarCircle,
// uploadSelectedAvatar, removeSelectedAvatar, updateAvatarCircles, updateAllAvatarCircles,
// changePassword, changeSuperAdminPassword,
// cleanupSettings + Cleanup-Funktionen
// → 41-admin-functions.js

function updateUsersList() {} // no-op; 41-admin-functions.js überschreibt mit echter Implementierung

// updateCleanupStrategy … toggleCleanupUser → 41-admin-functions.js

// Statistics
// Export/Import Functions

function _downloadBlob(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadJSON(data, filename) {
    _downloadBlob(JSON.stringify(data, null, 2), filename);
}

function downloadEncryptedJSON(data, filename) {
    _downloadBlob(encryptData(data), filename);
}


function exportAllData() {
    // Im Multiplayer-Modus: Master-Backup + Spieler-Datei
    if (multiPlayerMode) {
        saveMasterBackup();
        return;
    }
    
    // Legacy-Export für Einzelspieler
    const allData = {
        version: CONFIG.FILE.VERSION,
        exportDate: new Date().toISOString(),
        questions: questions,
        users: users,
        settings: quizSettings,
        pluginConfig: PluginRegistry.getConfig()
    };
    
    // Add timestamp to filename to prevent automatic overwriting
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0,5).replace(/:/g, ''); // HHMM
    const filename = `Quiz-Daten_${dateStr}_${timeStr}.json`;
    
    downloadEncryptedJSON(allData, filename);
    GameDialog.showInfo('💾', 'Daten exportiert!', 'Dateiname: <strong>' + filename + '</strong><br><br>Speichern Sie die Datei an einem sicheren Ort.');
}

function exportAllDataAndContinue() {
    // Im Multiplayer-Modus: Spieler-Datei speichern
    if (multiPlayerMode && currentUser) {
        saveCurrentPlayer();
        setTimeout(() => {
            restartQuiz();
        }, TIMING.EXPORT_CONTINUE_DELAY_MS);
        return;
    }
    
    exportAllData();
    // Give user a moment to save before continuing
    setTimeout(() => {
        restartQuiz();
    }, TIMING.EXPORT_CONTINUE_DELAY_MS);
}


function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onerror = function() {
        Toast.show(MESSAGES.ERROR_FILE_READ, 'warning');
    };
    
    reader.onload = function(e) {
        try {
            const fileContent = e.target.result;
            const allData = decryptData(fileContent);
            
            // Validate data structure
            if (!allData.questions || !allData.users || !allData.settings) {
                throw new Error('Ungültiges Dateiformat');
            }
            
            // Validate and filter questions
            const validQuestions = (allData.questions || []).filter(validateQuestion);
            
            // Validate and filter users
            const validUsers = (allData.users || []).filter(validateUser);
            
            // Load validated data
            questions = validQuestions;
            users = validUsers;
            quizSettings = allData.settings || quizSettings;
            ensureSettingsDefaults(quizSettings);
            if (quizSettings.abilityOverrides) {
                Object.keys(quizSettings.abilityOverrides).forEach(function(key) {
                    var ov = quizSettings.abilityOverrides[key];
                    if (ov && ov.earnPer && ABILITY_DEFS[key]) {
                        ABILITY_DEFS[key].earnPer = ov.earnPer;
                    }
                });
            }
            
            // Ensure all users have the new XP/level tracking fields
            users.forEach(user => {
                if (!user.lastQuizDate) user.lastQuizDate = null;
                if (!user.dailyQuizCount) user.dailyQuizCount = 0;
                if (!user.history) user.history = [];
                // questionStats für intelligente Fragen-Auswahl
                if (!user.questionStats) user.questionStats = {};
            });
            
            // Migrate old avatar format to new format with image2
            if (quizSettings.avatars) {
                Object.keys(quizSettings.avatars).forEach(key => {
                    if (quizSettings.avatars[key].image2 === undefined) {
                        quizSettings.avatars[key].image2 = null;
                    }
                });
            }
            
            // Ensure all questions have questionId and active fields (for old files)
            questions.forEach((q, index) => {
                if (!q.questionId) {
                    q.questionId = String(index + 1).padStart(3, '0');
                }
                if (q.active === undefined) {
                    q.active = true;
                }
            });
            
            dataLoaded = true;
            syncToAppState();
            
            // Plugin-Konfiguration laden (abwärtskompatibel: alte Dateien ohne pluginConfig)
            if (allData.pluginConfig) {
                PluginRegistry.loadConfig(allData.pluginConfig);
            }
            
            EventBus.emit('data:loaded', { questions: questions.length, users: users.length, source: 'import' });
            
            // Quiz-Name setzen
            document.getElementById('quizTitle').textContent = quizSettings.quizName || 'XY Quiz';
            
            // Initialize UI
            renderUserSelect();
            updateQuestionsList();
            updateUsersList();
            
            showScreen('startScreen');
            // Kein Popup mehr - direkt zum Startbildschirm
            
        } catch (error) {
            GameDialog.showError('Fehler beim Laden', error.message);
            console.error(error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}


function createNewDataFile() {
    // Bestätigungs-Dialog und Export-Hinweis nicht nötig
    
    // Initialize with sample data
    initializeSampleQuestions();
    initializeSampleUsers();
    
    // Ensure all users have the new fields
    users.forEach(user => {
        if (!user.lastQuizDate) user.lastQuizDate = null;
        if (!user.dailyQuizCount) user.dailyQuizCount = 0;
        // questionStats für intelligente Fragen-Auswahl
        if (!user.questionStats) user.questionStats = {};
    });

    ensureSettingsDefaults(quizSettings);
    
    dataLoaded = true;
    syncToAppState();
    EventBus.emit('data:loaded', { questions: questions.length, users: users.length, source: 'legacy' });
    
    // Quiz-Name setzen
    document.getElementById('quizTitle').textContent = quizSettings.quizName || 'XY Quiz';
    
    renderUserSelect();
    updateQuestionsList();
    updateUsersList();
    
    showScreen('startScreen');
}


// Keyboard controls for quiz

document.addEventListener('keydown', function(e) {
    // Start Screen: Enter startet Quiz wenn Nutzer ausgewählt
    const startScreen = document.getElementById('startScreen');
    if (startScreen && startScreen.classList.contains('active')) {
        if (e.key === 'Enter' && currentUser) {
            e.preventDefault();
            startQuiz();
            return;
        }
    }
    // Quiz Screen Keyboard Handler
    const quizScreen = document.getElementById('quizScreen');
    if (quizScreen && quizScreen.classList.contains('active')) {
        if (e.key === 'Escape') {
            e.preventDefault();
            abandonQuiz();
            return;
        }
        const nextBtn = document.getElementById('nextBtn');
        const isNextVisible = nextBtn && nextBtn.style.display !== 'none';
        const isTextInput = document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text';
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isNextVisible) nextQuestion();
            else submitAnswer();
            return;
        }
        if (!isTextInput && !isNextVisible) {
            const checkboxes = document.querySelectorAll('.answer-checkbox');
            if (checkboxes.length === 0) return;
            if (e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (index < checkboxes.length && !checkboxes[index].disabled) {
                    checkboxes[index].checked = !checkboxes[index].checked;
                    e.preventDefault();
                }
            }
        }
        return;
    }
});

const sidebarState = BadgePlugin._sidebarState;
function toggleSidebarCollapse(side) { BadgePlugin.toggleSidebarCollapse(side); }
function resetSidebarPosition(side) { BadgePlugin.resetSidebarPosition(side); }
function saveSidebarPosition(side) { BadgePlugin.saveSidebarPosition(side); }
function restoreSidebarPositions() { BadgePlugin.restoreSidebarPositions(); }
// initSidebarDrag already called in BadgePlugin init

// MINI-GAMES SYSTEM

function getMG() {
    ensureSettingsDefaults(quizSettings);
    return quizSettings.miniGames;
}

// updateMiniGameSettings, populateMiniGameSettings → 41-admin-functions.js