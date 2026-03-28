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
    if (!q || typeof q.id !== 'number' || typeof q.text !== 'string') return false;
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
        { displayNumber: 1, questionId: "001", id: Date.now() + 1, active: true, text: "Welcher Fluss wird traditionell als der längste der Welt bezeichnet? (Hinweis: Die Messung ist wissenschaftlich umstritten)", answers: [{ text: "Nil", correct: true }, { text: "Amazonas", correct: true }, { text: "Jangtse", correct: false }, { text: "Mississippi", correct: false }], media: null },
        { displayNumber: 2, questionId: "002", id: Date.now() + 2, active: true, text: "In welchem Jahr fiel die Berliner Mauer?", answers: [{ text: "1987", correct: false }, { text: "1989", correct: true }, { text: "1990", correct: false }, { text: "1991", correct: false }], media: null },
        { displayNumber: 3, questionId: "003", id: Date.now() + 3, active: true, text: "Wie viele Planeten hat unser Sonnensystem?", answers: [{ text: "7", correct: false }, { text: "8", correct: true }, { text: "9", correct: false }, { text: "10", correct: false }], media: null },
        { displayNumber: 4, questionId: "004", id: Date.now() + 4, active: true, text: "Welches ist das größte Land der Erde?", answers: [{ text: "Kanada", correct: false }, { text: "China", correct: false }, { text: "USA", correct: false }, { text: "Russland", correct: true }], media: null },
        { displayNumber: 5, questionId: "005", id: Date.now() + 5, active: true, text: "Wer malte die Mona Lisa?", answers: [{ text: "Michelangelo", correct: false }, { text: "Leonardo da Vinci", correct: true }, { text: "Raphael", correct: false }, { text: "Donatello", correct: false }], media: null },
        { displayNumber: 6, questionId: "006", id: Date.now() + 6, active: true, text: "Wie viele Herzen hat ein Oktopus?", answers: [{ text: "1", correct: false }, { text: "2", correct: false }, { text: "3", correct: true }, { text: "4", correct: false }], media: null },
        { displayNumber: 7, questionId: "007", id: Date.now() + 7, active: true, text: "Welche Sprache wird in Brasilien gesprochen?", answers: [{ text: "Spanisch", correct: false }, { text: "Portugiesisch", correct: true }, { text: "Französisch", correct: false }, { text: "Italienisch", correct: false }], media: null },
        { displayNumber: 8, questionId: "008", id: Date.now() + 8, active: true, text: "Was ist die Hauptstadt von Australien?", answers: [{ text: "Sydney", correct: false }, { text: "Melbourne", correct: false }, { text: "Canberra", correct: true }, { text: "Brisbane", correct: false }], media: null },
        { displayNumber: 9, questionId: "009", id: Date.now() + 9, active: true, text: "Wie viele Zähne hat ein erwachsener Mensch?", answers: [{ text: "28", correct: false }, { text: "30", correct: false }, { text: "32", correct: true }, { text: "34", correct: false }], media: null },
        { displayNumber: 10, questionId: "010", id: Date.now() + 10, active: true, text: "Welches ist das schnellste Landtier?", answers: [{ text: "Löwe", correct: false }, { text: "Gepard", correct: true }, { text: "Gazelle", correct: false }, { text: "Windhund", correct: false }], media: null }
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
}

function showAdminSection(section) {
    document.getElementById('adminSettings').style.display = 'none';
    document.getElementById('adminBadges').style.display = 'none';
    document.getElementById('adminBackup').style.display = 'none';
    document.getElementById('adminUsers').style.display = 'none';
    document.getElementById('adminUserDetail').style.display = 'none';
    const pluginsEl = document.getElementById('adminPlugins');
    if (pluginsEl) pluginsEl.style.display = 'none';
    const fragen2El = document.getElementById('adminFragen2');
    if (fragen2El) fragen2El.style.display = 'none';
    
    // Reset super admin auth when leaving user sections entirely
    if (section !== 'userDetail' && section !== 'users') {
        adminState.superAdminAuthenticated = false;
        adminState.viewingUserId = null;
    }
    
    if (section === 'settings') {
        document.getElementById('adminSettings').style.display = 'block';
        document.getElementById('quizNameInput').value = quizSettings.quizName || 'XY Quiz';
        document.getElementById('questionsPerQuizInput').value = quizSettings.questionsPerQuiz;
        document.getElementById('podiumPlacesInput').value = quizSettings.podiumPlaces || 3;
        const coreEl = document.getElementById('corePercentInput');
        if (coreEl) { coreEl.value = quizSettings.corePercent || 70; document.getElementById('corePercentValue').textContent = coreEl.value + '%'; }
        
        // Populate Timer settings
        const ts = quizSettings.timer || {};

        
        // Populate XP settings
        document.getElementById('baseXPInput').value = quizSettings.xpSystem.baseXP;
        document.getElementById('xpExponentInput').value = quizSettings.xpSystem.exponent;
        document.getElementById('firstDailyBonusInput').value = quizSettings.xpSystem.firstDailyBonus;
        document.getElementById('subsequentBonusInput').value = quizSettings.xpSystem.subsequentBonus;
        document.getElementById('correctAnswerXPInput').value = quizSettings.xpSystem.correctAnswerXP || CONFIG.XP.CORRECT_ANSWER;
        document.getElementById('wrongAnswerXPInput').value = quizSettings.xpSystem.wrongAnswerXP || CONFIG.XP.WRONG_ANSWER;
        
        // Populate Spaced Repetition settings
        const sr = quizSettings.spacedRepetition || {};
        const srRandEl = document.getElementById('srRandomnessInput');
        if (srRandEl) { srRandEl.value = sr.randomness !== undefined ? sr.randomness : 40; document.getElementById('srRandomnessValue').textContent = srRandEl.value + '%'; }
        const srCoolEl = document.getElementById('srCooldownInput');
        if (srCoolEl) srCoolEl.value = sr.streakCooldown !== undefined ? sr.streakCooldown : 48;
        const srStreakEl = document.getElementById('srStreakInput');
        if (srStreakEl) srStreakEl.value = sr.streakThreshold !== undefined ? sr.streakThreshold : 3;
        const mcfEl = document.getElementById('maxCoreFirstInput');
        if (mcfEl) mcfEl.value = sr.maxCoreFirst !== undefined && sr.maxCoreFirst < 999 ? sr.maxCoreFirst : 0;
        const mcsEl = document.getElementById('maxCoreSubsequentInput');
        if (mcsEl) mcsEl.value = sr.maxCoreSubsequent !== undefined && sr.maxCoreSubsequent < 999 ? sr.maxCoreSubsequent : 0;
        const fqEl = document.getElementById('freshQuotaInput');
        if (fqEl) fqEl.value = sr.freshQuota !== undefined ? sr.freshQuota : 0;
        const ftEl = document.getElementById('freshThresholdInput');
        if (ftEl) ftEl.value = sr.freshThreshold !== undefined ? sr.freshThreshold : 1;
        
        // Populate Leaderboard settings (via Plugin)
        LeaderboardPlugin.populateSettings();
        
        // Set avatar preset radio button
        const currentPreset = quizSettings.avatarPreset || 1;
        document.querySelectorAll('input[name="avatarPreset"]').forEach(radio => {
            radio.checked = (parseInt(radio.value) === currentPreset);
        });
        
        // Initialize avatar circles with current images
        updateAllAvatarCircles();
        
        // Populate Mini-Games settings
        populateMiniGameSettings();
        
        // Populate media display settings
        var md = quizSettings.mediaDisplay || { quizImageWidth: 80 };
        var imgSlider = document.getElementById('quizImageWidthSlider');
        if (imgSlider) { imgSlider.value = md.quizImageWidth || 80; document.getElementById('quizImageWidthVal').textContent = (md.quizImageWidth || 80) + '%'; }
        
    } else if (section === 'badges') {
        document.getElementById('adminBadges').style.display = 'block';
        renderBadgeAdmin();
    } else if (section === 'backup') {
        document.getElementById('adminBackup').style.display = 'block';
        document.getElementById('backupFolderName').textContent = loadedFolderName || '-';
        refreshPlayerFiles();
        refreshRestoreList();
    } else if (section === 'users') {
        // Prüfe ob Super-Admin authentifiziert ist
        if (!adminState.superAdminAuthenticated) {
            showSuperAdminLogin('users');
            return;
        }
        document.getElementById('adminUsers').style.display = 'block';
        updateUsersList();
    } else if (section === 'userDetail') {
        // Keine erneute Prüfung nötig - User kommt nur hierher wenn bereits authentifiziert
        document.getElementById('adminUserDetail').style.display = 'block';
        // Content wird durch showUserDetail() generiert
    } else if (section === 'plugins') {
        const pluginsEl = document.getElementById('adminPlugins');
        if (pluginsEl) {
            pluginsEl.style.display = 'block';
            renderPluginManager();
        }
    } else if (section === 'fragen2') {
        const f2El = document.getElementById('adminFragen2');
        if (f2El) {
            f2El.style.display = 'block';
            Fragen2Plugin.render();
        }
    }
}


function showSuperAdminLogin(targetSection) {
    adminState.superAdminTargetSection = targetSection;
    document.getElementById('superAdminModal').classList.add('active');
    document.getElementById('superAdminInput').focus();
    document.getElementById('superAdminError').classList.remove('active');
}

function closeSuperAdminModal() {
    document.getElementById('superAdminModal').classList.remove('active');
    document.getElementById('superAdminInput').value = '';
    document.getElementById('superAdminError').classList.remove('active');
}

function checkSuperAdminPassword(event) {
    event.preventDefault();
    const password = document.getElementById('superAdminInput').value;
    
    // Leeres Passwort erlauben wenn superAdminPassword leer ist
    if (password === quizSettings.superAdminPassword || (quizSettings.superAdminPassword === '' && password === '')) {
        adminState.superAdminAuthenticated = true;
        closeSuperAdminModal();
        showAdminSection(adminState.superAdminTargetSection || 'users');
    } else {
        document.getElementById('superAdminError').classList.add('active');
        document.getElementById('superAdminInput').value = '';
        document.getElementById('superAdminInput').focus();
    }
}

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

// Mini-Game im Test-Modus starten (Admin-Panel)
function testMiniGame(plugin, method, ...args) {
    window._mgTestMode = true;
    call(plugin, method, ...args);
}

function saveCorePercent() {
    quizSettings.corePercent = parseInt(document.getElementById('corePercentInput').value) || 70;
    Toast.show('CORE: ' + quizSettings.corePercent + '%', 'info');
}

function updateRangeDisplay(targetId, suffix, event, element) {
    document.getElementById(targetId).textContent = element.value + (suffix || '');
}

function updateQuizImageWidth(event, element) {
    document.getElementById('quizImageWidthVal').textContent = element.value + '%';
    quizSettings.mediaDisplay = quizSettings.mediaDisplay || {};
    quizSettings.mediaDisplay.quizImageWidth = parseInt(element.value);
    applyQuizImageWidth();
}

function toggleEncryptPlayerData() {
    var el = document.getElementById('encryptToggle');
    quizSettings.encryptPlayerData = el.checked;
    document.getElementById('encryptHint').textContent = el.checked ? 'Base64' : 'Klartext';
}

function renderLeaderboard() { if (!PluginRegistry.isEnabled('LeaderboardPlugin')) return; LeaderboardPlugin.render(); }

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

// Geometrie + Statistik (delegiert an Fragen2Plugin)
function checkImagemapHit(clickX, clickY, targets) { return Fragen2Plugin.checkImagemapHit(clickX, clickY, targets); }
function pointInPolygon(x, y, poly) { return Fragen2Plugin.pointInPolygon(x, y, poly); }
function distToPolygon(x, y, poly) { return Fragen2Plugin.distToPolygon(x, y, poly); }
function distToSegment(px, py, x1, y1, x2, y2) { return Fragen2Plugin.distToSegment(px, py, x1, y1, x2, y2); }
function calculateQuestionStats(questionId) { return Fragen2Plugin.calculateQuestionStats(questionId); }


function updateQuestionsList() { if (typeof Fragen2Plugin !== 'undefined') Fragen2Plugin.render(); }


function addUser(event) { UserManagementPlugin.addUser(event); }

function updateUsersList() { UserManagementPlugin.updateUsersList(); }

function deleteUser(userId) { UserManagementPlugin.deleteUser(userId); }

function showUserDetail(userId) { UserManagementPlugin.showUserDetail(userId); }

function renderUserDetailContent(user) { UserManagementPlugin.renderUserDetailContent(user); }

function renderSuperAdminEditForm(user) { return UserManagementPlugin.renderSuperAdminEditForm(user); }

function getQuestionStatsArray(user) { return UserManagementPlugin.getQuestionStatsArray(user); }

function authenticateSuperAdmin(userId) { UserManagementPlugin.authenticateSuperAdmin(userId); }

function saveUserEdits(userId) { UserManagementPlugin.saveUserEdits(userId); }

function exportUserData(userId) { UserManagementPlugin.exportUserData(userId); }

function importUserData(event, userId) { UserManagementPlugin.importUserData(event, userId); }

function confirmResetUserStats(userId) { UserManagementPlugin.confirmResetUserStats(userId); }

// Admin authentication
function showAdminLogin() {
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('passwordInput').focus();
    document.getElementById('passwordError').classList.remove('active');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').classList.remove('active');
}

function checkPassword(event) {
    event.preventDefault();
    const password = document.getElementById('passwordInput').value;
    
    // Leeres Passwort erlauben wenn adminPassword leer ist
    if (password === quizSettings.adminPassword || (quizSettings.adminPassword === '' && password === '')) {
        isAdminAuthenticated = true;
        closePasswordModal();
        hideBadgeSidebars(); // Badges im Admin ausblenden
        showScreen('adminScreen');
        showAdminSection('settings');
        window.scrollTo(0, 0); // Scroll nach oben
    } else {
        document.getElementById('passwordError').classList.add('active');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

function logoutAdmin() {
    isAdminAuthenticated = false;
    showScreen('startScreen');
}


function updateQuizName() {
    const name = document.getElementById('quizNameInput').value.trim() || 'XY Quiz';
    quizSettings.quizName = name;
    document.getElementById('quizTitle').textContent = name;
}

// Settings management

function updateSpacedRepetitionSettings() {
    const randomness = parseInt(document.getElementById('srRandomnessInput').value) || 40;
    const cooldown = parseInt(document.getElementById('srCooldownInput').value) || 48;
    const streak = parseInt(document.getElementById('srStreakInput').value) || 3;
    const maxCoreFirst = parseInt(document.getElementById('maxCoreFirstInput').value) || 0;
    const maxCoreSubsequent = parseInt(document.getElementById('maxCoreSubsequentInput').value) || 0;
    const freshQuota = parseInt(document.getElementById('freshQuotaInput').value) || 0;
    const freshThreshold = parseInt(document.getElementById('freshThresholdInput').value) || 1;

    ensureSettingsDefaults(quizSettings);
    quizSettings.spacedRepetition.randomness = Math.max(0, Math.min(100, randomness));
    quizSettings.spacedRepetition.streakCooldown = Math.max(1, Math.min(720, cooldown));
    quizSettings.spacedRepetition.streakThreshold = Math.max(2, Math.min(10, streak));
    quizSettings.spacedRepetition.maxCoreFirst = maxCoreFirst > 0 ? maxCoreFirst : 999;
    quizSettings.spacedRepetition.maxCoreSubsequent = maxCoreSubsequent > 0 ? maxCoreSubsequent : 999;
    quizSettings.spacedRepetition.freshQuota = Math.max(0, Math.min(100, freshQuota));
    quizSettings.spacedRepetition.freshThreshold = Math.max(1, Math.min(10, freshThreshold));

    Toast.show('🔀 Spaced Repetition gespeichert', 'success');
}

function updateQuizSettings() {
    const numQuestions = parseInt(document.getElementById('questionsPerQuizInput').value);
    const podiumPlaces = parseInt(document.getElementById('podiumPlacesInput').value);
    
    if (numQuestions > 0) {
        quizSettings.questionsPerQuiz = numQuestions;
    }
    
    if (podiumPlaces > 0 && podiumPlaces <= 20) {
        quizSettings.podiumPlaces = podiumPlaces;
    }
    
    renderLeaderboard(); // Bestenliste aktualisieren
    Toast.show('Einstellungen gespeichert!', 'success');
}

function updateXPSettings() {
    const numQuestions = parseInt(document.getElementById('questionsPerQuizInput').value);
    const baseXP = parseInt(document.getElementById('baseXPInput').value);
    const exponent = parseFloat(document.getElementById('xpExponentInput').value);
    const firstBonus = parseInt(document.getElementById('firstDailyBonusInput').value);
    const subBonus = parseInt(document.getElementById('subsequentBonusInput').value);
    const correctXP = parseInt(document.getElementById('correctAnswerXPInput').value);
    const wrongXP = parseInt(document.getElementById('wrongAnswerXPInput').value);
    
    // Validate inputs
    if (isNaN(numQuestions) || numQuestions < 1) {
        Toast.show(MESSAGES.ERROR_INVALID_NUMBER, 'warning');
        return;
    }
    
    if (isNaN(baseXP) || baseXP < 0) {
        Toast.show(MESSAGES.ERROR_INVALID_XP, 'warning');
        return;
    }
    
    if (isNaN(exponent) || exponent < 0.1 || exponent > 3.0) {
        Toast.show(MESSAGES.ERROR_INVALID_EXPONENT, 'warning');
        return;
    }
    
    if (isNaN(firstBonus) || firstBonus < 100 || firstBonus > 500) {
        Toast.show(MESSAGES.ERROR_INVALID_BONUS, 'warning');
        return;
    }
    
    if (isNaN(subBonus) || subBonus < 100 || subBonus > 500) {
        Toast.show(MESSAGES.ERROR_INVALID_BONUS, 'warning');
        return;
    }
    
    if (isNaN(correctXP) || correctXP < 1) {
        Toast.show('XP pro richtige Antwort muss mindestens 1 sein.', 'warning');
        return;
    }
    
    // All valid - update settings
    quizSettings.questionsPerQuiz = numQuestions;
    quizSettings.xpSystem = {
        baseXP: baseXP,
        exponent: exponent,
        firstDailyBonus: firstBonus,
        subsequentBonus: subBonus,
        correctAnswerXP: correctXP,
        wrongAnswerXP: wrongXP
    };
    
    renderUserSelect(); // Update display
    Toast.show('Einstellungen gespeichert!', 'success');
}

function updateLeaderboardSettings() { LeaderboardPlugin.updateSettings(); }
function updateLeaderboardPreview() { LeaderboardPlugin.updatePreview(); }

// LeaderboardPlugin.calculateScore() direkt verwenden

function uploadAvatar(levelKey, event, preset) { UserManagementPlugin.uploadAvatar(levelKey, event, preset); }

function removeAvatar(levelKey, preset) { UserManagementPlugin.removeAvatar(levelKey, preset); }

function switchAvatarPreset(preset) { UserManagementPlugin.switchAvatarPreset(preset); }

function selectAvatarCircle(levelKey, preset) { UserManagementPlugin.selectAvatarCircle(levelKey, preset); }

function uploadSelectedAvatar(levelKey, event) { UserManagementPlugin.uploadSelectedAvatar(levelKey, event); }

function removeSelectedAvatar(levelKey) { UserManagementPlugin.removeSelectedAvatar(levelKey); }

function updateAvatarCircles(levelKey) { UserManagementPlugin.updateAvatarCircles(levelKey); }

function updateAllAvatarCircles() { UserManagementPlugin.updateAllAvatarCircles(); }

function changePassword() {
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    
    if (newPassword !== confirmPassword) {
        Toast.show('Die Passwörter stimmen nicht überein!', 'warning');
        return;
    }
    
    quizSettings.adminPassword = newPassword;
    saveData();
    
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';
    
    Toast.show('Admin-Passwort erfolgreich geändert!', 'success');
}

function changeSuperAdminPassword() {
    const newPassword = document.getElementById('newSuperAdminPasswordInput').value;
    const confirmPassword = document.getElementById('confirmSuperAdminPasswordInput').value;
    
    if (newPassword !== confirmPassword) {
        Toast.show('Die Passwörter stimmen nicht überein!', 'warning');
        return;
    }
    
    quizSettings.superAdminPassword = newPassword;
    saveData();
    
    document.getElementById('newSuperAdminPasswordInput').value = '';
    document.getElementById('confirmSuperAdminPasswordInput').value = '';
    
    Toast.show('Super-Admin Passwort erfolgreich geändert!', 'success');
}

// DATA CLEANUP FUNCTIONS


// Current cleanup settings
let cleanupSettings = {
    strategy: 'conservative',
    daysOld: 730,
    removeInactive: true,
    limitHistory: true,
    historyLimit: 100,
    selectedUsers: []
};

function updateCleanupStrategy(strategy) {
    cleanupSettings.strategy = strategy;
    
    const customSettings = document.getElementById('customCleanupSettings');
    
    if (strategy === 'custom') {
        customSettings.style.display = 'block';
        cleanupSettings.daysOld = parseInt(document.getElementById('cleanupDaysOld').value) || 730;
        cleanupSettings.historyLimit = parseInt(document.getElementById('cleanupHistoryLimit').value) || 100;
        cleanupSettings.removeInactive = document.getElementById('cleanupRemoveInactive').checked;
    } else {
        customSettings.style.display = 'none';
        
        // Preset strategies
        switch(strategy) {
            case 'conservative':
                cleanupSettings.daysOld = 730; // 2 years
                cleanupSettings.removeInactive = false;
                cleanupSettings.limitHistory = false;
                break;
            case 'moderate':
                cleanupSettings.daysOld = 365; // 1 year
                cleanupSettings.removeInactive = true;
                cleanupSettings.limitHistory = true;
                cleanupSettings.historyLimit = 100;
                break;
            case 'aggressive':
                cleanupSettings.daysOld = 180; // 6 months
                cleanupSettings.removeInactive = true;
                cleanupSettings.limitHistory = true;
                cleanupSettings.historyLimit = 50;
                break;
        }
    }
    
    // Hide preview when strategy changes
    hideCleanupPreview();
}


function calculateCleanupPreview() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupSettings.daysOld);
    
    const activeQuestionIds = new Set(
        questions.filter(q => q.active !== false).map(q => q.questionId)
    );
    
    const preview = {
        users: [],
        totalStatsDeleted: 0,
        totalHistoryDeleted: 0,
        totalBytesSaved: 0
    };
    
    // Determine which users to process
    const usersToCleanup = cleanupSettings.selectedUsers.length > 0 
        ? users.filter(u => cleanupSettings.selectedUsers.includes(u.id))
        : users;
    
    usersToCleanup.forEach(user => {
        let statsToDelete = 0;
        let historyToDelete = 0;
        let bytesSaved = 0;
        const deletedQuestions = [];
        
        // Check questionStats
        if (user.questionStats) {
            for (const qId in user.questionStats) {
                const stat = user.questionStats[qId];
                let shouldDelete = false;
                let reason = '';
                
                // Check age
                if (stat.lastAsked) {
                    const lastAsked = new Date(stat.lastAsked);
                    if (lastAsked < cutoffDate) {
                        shouldDelete = true;
                        reason = `älter als ${Math.floor((new Date() - lastAsked) / (1000 * 60 * 60 * 24))} Tage`;
                    }
                }
                
                // Check if question is inactive
                if (cleanupSettings.removeInactive && !activeQuestionIds.has(qId)) {
                    shouldDelete = true;
                    reason = 'inaktive Frage';
                }
                
                if (shouldDelete) {
                    statsToDelete++;
                    bytesSaved += 90; // ~90 bytes per stat
                    deletedQuestions.push({ qId, reason });
                }
            }
        }
        
        // Check history
        if (cleanupSettings.limitHistory && user.history && user.history.length > cleanupSettings.historyLimit) {
            historyToDelete = user.history.length - cleanupSettings.historyLimit;
            bytesSaved += historyToDelete * 100; // ~100 bytes per entry
        }
        
        preview.users.push({
            name: user.name,
            id: user.id,
            statsToDelete,
            historyToDelete,
            bytesSaved,
            deletedQuestions: deletedQuestions.slice(0, 3) // Show first 3
        });
        
        preview.totalStatsDeleted += statsToDelete;
        preview.totalHistoryDeleted += historyToDelete;
        preview.totalBytesSaved += bytesSaved;
    });
    
    return preview;
}


function showCleanupPreview() {
    const preview = calculateCleanupPreview();
    const previewArea = document.getElementById('cleanupPreviewArea');
    const previewContent = document.getElementById('cleanupPreviewContent');
    
    let output = '';
    
    // Strategy info
    const strategyNames = {
        'conservative': '🟢 Konservativ (>2 Jahre)',
        'moderate': '🟡 Moderat (>1 Jahr + inaktiv)',
        'aggressive': '🔴 Aggressiv (>6 Monate)',
        'custom': '⚙️ Benutzerdefiniert'
    };
    
    output += `Strategie: ${strategyNames[cleanupSettings.strategy]}\n`;
    output += `Stats älter als: ${cleanupSettings.daysOld} Tage\n`;
    output += `Inaktive Fragen entfernen: ${cleanupSettings.removeInactive ? 'Ja' : 'Nein'}\n`;
    output += `History limitieren: ${cleanupSettings.limitHistory ? `Ja (${cleanupSettings.historyLimit} Einträge)` : 'Nein'}\n`;
    output += `\n${'═'.repeat(60)}\n\n`;
    
    // Per-user breakdown
    if (preview.users.length > 0) {
        preview.users.forEach(userPreview => {
            if (userPreview.statsToDelete > 0 || userPreview.historyToDelete > 0) {
                output += `👤 ${userPreview.name}:\n`;
                
                if (userPreview.statsToDelete > 0) {
                    output += `   • ${userPreview.statsToDelete} Question-Stats\n`;
                    if (userPreview.deletedQuestions.length > 0) {
                        userPreview.deletedQuestions.forEach(dq => {
                            output += `     - ${dq.qId}: ${dq.reason}\n`;
                        });
                        if (userPreview.statsToDelete > 3) {
                            output += `     ... und ${userPreview.statsToDelete - 3} weitere\n`;
                        }
                    }
                }
                
                if (userPreview.historyToDelete > 0) {
                    output += `   • ${userPreview.historyToDelete} alte History-Einträge\n`;
                }
                
                output += `   → Einsparung: ${(userPreview.bytesSaved / 1024).toFixed(2)} KB\n\n`;
            }
        });
    } else {
        output += 'Keine Daten zum Löschen gefunden.\n\n';
    }
    
    // Summary
    output += `${'═'.repeat(60)}\n`;
    output += `GESAMT:\n`;
    output += `  • ${preview.totalStatsDeleted} Question-Stats werden gelöscht\n`;
    output += `  • ${preview.totalHistoryDeleted} History-Einträge werden gelöscht\n`;
    output += `  → Gesamteinsparung: ${(preview.totalBytesSaved / 1024 / 1024).toFixed(2)} MB\n`;
    
    previewContent.textContent = output;
    previewArea.style.display = 'block';
    
    // Scroll to preview
    setTimeout(() => {
        previewArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}


function hideCleanupPreview() {
    document.getElementById('cleanupPreviewArea').style.display = 'none';
}


function createCleanupBackup() {
    const backupData = {
        version: CONFIG.FILE.VERSION + '-cleanup-backup',
        backupDate: new Date().toISOString(),
        reason: 'Before data cleanup operation',
        users: JSON.parse(JSON.stringify(users)), // Deep copy
        settings: quizSettings
    };
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `BACKUP_cleanup_${timestamp}.json`;
    
    downloadEncryptedJSON(backupData, filename);
    
    return filename;
}


function performCleanupWithBackup() {
    // Verify super admin
    if (!adminState.superAdminAuthenticated) {
        Toast.show('⚠️ Bereinigung erfordert Super-Admin Rechte!\n\nBitte melden Sie sich als Super-Admin an.', 'warning');
        return;
    }
    
    // Show preview first if not shown
    const previewArea = document.getElementById('cleanupPreviewArea');
    if (previewArea.style.display === 'none') {
        showCleanupPreview();
        return;
    }
    
    // Preview already shown, execute
    executeCleanup();
}


function executeCleanup() {
    if (!confirm('🧹 DATENBEREINIGUNG STARTEN?\n\nDies wird:\n• Alte Statistiken unwiderruflich löschen\n• Ein Backup automatisch erstellen\n\nFortfahren?')) {
        return;
    }
    
    // Create backup first
    const backupFilename = createCleanupBackup();
    
    // Wait a moment for download to start
    setTimeout(() => {
        performActualCleanup();
        
        hideCleanupPreview();
        
        Toast.show(`✅ Bereinigung abgeschlossen!\n\nBackup erstellt: ${backupFilename}\n\nBitte überprüfen Sie die Benutzer-Listen.`, 'success');
        
        // Refresh user list
        updateUsersList();
    }, 500);
}


function performActualCleanup() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupSettings.daysOld);
    
    const activeQuestionIds = new Set(
        questions.filter(q => q.active !== false).map(q => q.questionId)
    );
    
    let totalStatsDeleted = 0;
    let totalHistoryDeleted = 0;
    
    // Determine which users to process
    const usersToCleanup = cleanupSettings.selectedUsers.length > 0 
        ? users.filter(u => cleanupSettings.selectedUsers.includes(u.id))
        : users;
    
    usersToCleanup.forEach(user => {
        // Clean questionStats
        if (user.questionStats) {
            const newStats = {};
            
            for (const qId in user.questionStats) {
                const stat = user.questionStats[qId];
                let keep = true;
                
                // Check age
                if (stat.lastAsked) {
                    const lastAsked = new Date(stat.lastAsked);
                    if (lastAsked < cutoffDate) {
                        keep = false;
                    }
                }
                
                // Check if question is inactive
                if (cleanupSettings.removeInactive && !activeQuestionIds.has(qId)) {
                    keep = false;
                }
                
                if (keep) {
                    newStats[qId] = stat;
                } else {
                    totalStatsDeleted++;
                }
            }
            
            user.questionStats = newStats;
        }
        
        // Clean history
        if (cleanupSettings.limitHistory && user.history && user.history.length > cleanupSettings.historyLimit) {
            const removed = user.history.length - cleanupSettings.historyLimit;
            user.history = user.history.slice(-cleanupSettings.historyLimit);
            totalHistoryDeleted += removed;
        }
    });
    
    console.log(`[Cleanup] Completed: ${totalStatsDeleted} stats deleted, ${totalHistoryDeleted} history entries removed`);
    
    return {
        statsDeleted: totalStatsDeleted,
        historyDeleted: totalHistoryDeleted
    };
}


function initializeCleanupUI() {
    // Update user count
    document.getElementById('cleanupUserCount').textContent = users.length;
    
    // Setup user selection toggle
    const userRadios = document.querySelectorAll('input[name="cleanupUsers"]');
    const userSelection = document.getElementById('cleanupUserSelection');
    
    userRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'selected') {
                userSelection.style.display = 'block';
                renderCleanupUserSelection();
            } else {
                userSelection.style.display = 'none';
                cleanupSettings.selectedUsers = [];
            }
        });
    });
}


function renderCleanupUserSelection() {
    const container = document.getElementById('cleanupUserSelection');
    
    container.innerHTML = users.map(user => `
        <label style="display: flex; align-items: center; gap: 8px; padding: 5px; cursor: pointer;">
            <input type="checkbox" value="${user.id}" onchange="toggleCleanupUser(${user.id}, this.checked)">
            <span>${user.name}</span>
        </label>
    `).join('');
}


function toggleCleanupUser(userId, checked) {
    if (checked) {
        if (!cleanupSettings.selectedUsers.includes(userId)) {
            cleanupSettings.selectedUsers.push(userId);
        }
    } else {
        cleanupSettings.selectedUsers = cleanupSettings.selectedUsers.filter(id => id !== userId);
    }
}

// MIGRATION UI FUNCTIONS



function showMigrationStatus() {
    const statusDiv = document.getElementById('migrationStatus');
    const statusText = document.getElementById('migrationStatusText');
    
    let report = '📊 MIGRATION STATUS REPORT\n';
    report += '═══════════════════════════════════════════════════\n\n';
    
    // Fragen analysieren
    let hashIdCount = 0;
    let oldIdCount = 0;
    let migrationMapSize = Object.keys(questionIdMigrationMap).length;
    
    questions.forEach(q => {
        if (q.questionId && q.questionId.startsWith('Q_')) {
            hashIdCount++;
        } else {
            oldIdCount++;
        }
    });
    
    report += `📋 FRAGEN:\n`;
    report += `  • Gesamt: ${questions.length}\n`;
    report += `  • Mit Hash-ID (Q_XXXXXXXX): ${hashIdCount}\n`;
    report += `  • Mit alter ID (001, 002...): ${oldIdCount}\n\n`;
    
    report += `🗺️ MIGRATION MAP:\n`;
    report += `  • Mappings: ${migrationMapSize}\n`;
    if (migrationMapSize > 0) {
        report += `  • Beispiele:\n`;
        let count = 0;
        for (const [oldId, newId] of Object.entries(questionIdMigrationMap)) {
            if (count < 5) {
                report += `    ${oldId} → ${newId}\n`;
                count++;
            }
        }
        if (migrationMapSize > 5) {
            report += `    ... und ${migrationMapSize - 5} weitere\n`;
        }
    }
    report += '\n';
    
    // Benutzer analysieren
    report += `👥 BENUTZER STATISTIKEN:\n`;
    users.forEach(user => {
        const stats = user.questionStats || {};
        const totalQuestions = Object.keys(stats).length;
        let hashStats = 0;
        let oldStats = 0;
        
        for (const qId in stats) {
            if (qId.startsWith('Q_')) {
                hashStats++;
            } else {
                oldStats++;
            }
        }
        
        report += `  • ${user.name}:\n`;
        report += `    Statistiken für ${totalQuestions} Fragen\n`;
        report += `    Hash-IDs: ${hashStats}, Alte IDs: ${oldStats}\n`;
    });
    
    statusText.textContent = report;
    statusDiv.style.display = 'block';
}


function forceMigration() {
    if (!confirm('Migration jetzt ausführen?\n\nDies wird:\n• Alle Fragen auf Hash-IDs umstellen\n• Die Migration-Map aufbauen\n• Alle Benutzer-Statistiken migrieren\n\nFortfahren?')) {
        return;
    }
    
    // Normalize all questions (generates hashes)
    questions = questions.map(q => normalizeQuestion(q));
    
    // Build migration map
    buildMigrationMap();
    
    // Migrate all users
    let migratedUsers = 0;
    users.forEach(user => {
        const before = JSON.stringify(user.questionStats);
        migrateUserQuestionStats(user);
        const after = JSON.stringify(user.questionStats);
        if (before !== after) migratedUsers++;
    });
    
    // Update UI
    updateQuestionsList();
    
    Toast.show(`✅ Migration abgeschlossen!\n\n• ${questions.length} Fragen verarbeitet\n• ${Object.keys(questionIdMigrationMap).length} Mappings erstellt\n• ${migratedUsers} Benutzer migriert\n\nZeigen Sie den Status an für Details.`, 'success');
    
    console.log('[Migration] Abgeschlossen', {
        questions: questions.length,
        mappings: Object.keys(questionIdMigrationMap).length,
        users: migratedUsers
    });
}

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
            
            // Build migration map and migrate user stats
            buildMigrationMap();
            users.forEach(user => migrateUserQuestionStats(user));
            
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

            // Assign display numbers
            assignDisplayNumbers();
    
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

function importQuestionSet(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Beide Formate akzeptieren: 'fragen' (deutsch) und 'questions' (Export-Format)
            const fragenArray = importData.fragen || importData.questions;
            if (!fragenArray || !Array.isArray(fragenArray)) {
                Toast.show('Ungültiges Format! Die JSON-Datei muss ein "fragen" oder "questions" Array enthalten.', 'warning');
                return;
            }
            
            // Add questions
            let addedCount = 0;
            fragenArray.forEach(q => {
                const newQuestion = {
                    ...q,
                    id: Date.now() + Math.random() // Ensure unique ID
                };
                questions.push(newQuestion);
                addedCount++;
            });
            
            updateQuestionsList();
            
            Toast.show(`${addedCount} Fragen wurden importiert!`, 'info');
        } catch (error) {
            GameDialog.showError('Import-Fehler', error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}




// Keyboard controls for quiz

document.addEventListener('keydown', function(e) {
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

function updateMiniGameSettings() {
    let mg = getMG();
    mg.spinner.enabled = document.getElementById('mgSpinnerEnabled').checked;
    mg.spinner.minCorrect = parseInt(document.getElementById('mgSpinnerMinCorrect').value) || 10;
    mg.spinner.quizCount = parseInt(document.getElementById('mgSpinnerQuizCount').value) || 2;
    mg.spinner.maxXP = parseInt(document.getElementById('mgSpinnerMaxXP').value) || 50;
    mg.bossFight.enabled = document.getElementById('mgBossEnabled').checked;
    mg.bossFight.threshold = parseInt(document.getElementById('mgBossThreshold').value) || 10;
    mg.bossFight.hp = parseInt(document.getElementById('mgBossHP').value) || 100;
    mg.bossFight.lives = parseInt(document.getElementById('mgBossLives').value) || 3;
    mg.bossFight.winXP = parseInt(document.getElementById('mgBossWinXP').value) || 100;
    mg.xpPerCorrect = parseInt(document.getElementById('mgGameXPPerCorrect').value) || 5;

    // Wenn der User im Settings-Dialog eine Checkbox ändert,
    // wird der Plugin-Status in der Registry aktualisiert
    Object.entries(PLUGIN_SETTINGS_MAP).forEach(([pluginName, settingsKey]) => {
        if (mg[settingsKey]) {
            const shouldBeEnabled = mg[settingsKey].enabled !== false;
            const isCurrentlyEnabled = PluginRegistry.isEnabled(pluginName);
            if (shouldBeEnabled && !isCurrentlyEnabled) {
                PluginRegistry.enable(pluginName);
            } else if (!shouldBeEnabled && isCurrentlyEnabled) {
                PluginRegistry.disable(pluginName);
            }
        }
    });
    
    // UI aktualisieren (Plugin-Manager + Startscreen-Buttons)
    applyPluginVisibility();
    renderPluginManager();
    
    Toast.show('Mini-Games Einstellungen gespeichert!', 'success');
}

function populateMiniGameSettings() {
    const mg = getMG();
    let el;
    el = document.getElementById('mgSpinnerEnabled'); if (el) el.checked = mg.spinner.enabled !== false;
    el = document.getElementById('mgSpinnerMinCorrect'); if (el) el.value = mg.spinner.minCorrect || 10;
    el = document.getElementById('mgSpinnerQuizCount'); if (el) el.value = mg.spinner.quizCount || 2;
    el = document.getElementById('mgSpinnerMaxXP'); if (el) el.value = mg.spinner.maxXP || 50;
    el = document.getElementById('mgBossEnabled'); if (el) el.checked = mg.bossFight.enabled !== false;
    el = document.getElementById('mgBossThreshold'); if (el) el.value = mg.bossFight.threshold || 10;
    el = document.getElementById('mgBossHP'); if (el) el.value = mg.bossFight.hp || CONFIG.MINI_GAMES.BOSS_DEFAULT_HP;
    el = document.getElementById('mgBossLives'); if (el) el.value = mg.bossFight.lives || 3;
    el = document.getElementById('mgBossWinXP'); if (el) el.value = mg.bossFight.winXP || 100;
    el = document.getElementById('mgGameXPPerCorrect'); if (el) el.value = mg.xpPerCorrect || 5;
}

