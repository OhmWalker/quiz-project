// 30-globals.js
// Global variables, settings, bridges for backward compatibility
// ============================================================

// GLOBALE VARIABLEN — Abwärtskompatibilität via AppState-Bridge

// Diese Variablen bleiben als globale let/const bestehen, damit
// alle existierenden Funktionen (~267) weiter funktionieren.
// AppState.data/session verweisen auf die gleichen Objekte.
// Neue Plugins nutzen QuizCore/AppState statt direkter Globals.


// Data Storage
let questions = [];  // ALL questions in the system (never overwrite!)
let currentQuizQuestions = [];  // Only questions for current quiz session
let users = [];
let currentUser = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let answerInputCount = CONFIG.QUIZ.DEFAULT_ANSWER_COUNT;

// Admin State (consolidated global state) — bridged to AppState.admin
const adminState = AppState.admin;

// quizSettings wird aus SETTINGS_DEFAULTS initialisiert (siehe unten)
let quizSettings;
let isAdminAuthenticated = false;
let dataLoaded = false;
let encryptionKey = CONFIG.FILE.ENCRYPTION_KEY;

// Zentrale Default-Werte (EINZIGE Quelle der Wahrheit!)
// Alle Import/Load/Create-Funktionen nutzen ensureSettingsDefaults()

const SETTINGS_DEFAULTS = {
    questionsPerQuiz: CONFIG.QUIZ.DEFAULT_QUESTIONS_PER_QUIZ,
    podiumPlaces: 3,
    adminPassword: 'admin',
    superAdminPassword: 'super',
    avatarPreset: 1,
    spacedRepetition: {
        randomness: 30,         // 0-100: 0=pure SR, 100=komplett zufällig
        streakCooldown: 48,     // Stunden Sperre nach N korrekt in Folge
        streakThreshold: 2,     // Anzahl korrekt in Folge für Sperre
        freshQuota: 50,         // % neue/seltene Fragen pro Quiz (0=deaktiviert)
        freshThreshold: 1,      // max. asked-Zahl für "selten gestellt"
        maxCoreFirst: 7,        // max. Core-Fragen im 1. Quiz des Tages
        maxCoreSubsequent: 3    // max. Core-Fragen in Folge-Quizzen
    },
    timer: {
        secondsPerQuestion: 3,
        penalty: 5,
        xpMultiplier: 1.5,
        autoAdvanceSec: 5,
        dynamicTimer: true,
        speedBonus: true,
        ghostRace: true,
        goldPct: 25, goldXP: 50,
        silverPct: 50, silverXP: 25,
        bronzePct: 75, bronzeXP: 10
    },
    xpSystem: {
        baseXP: 50,
        exponent: 1.3,
        firstDailyBonus: 200,
        subsequentBonus: 100,
        correctAnswerXP: 10,
        wrongAnswerXP: -2
    },
    leaderboard: {
        qualityWeight: 50,
        engagementWeight: 50,
        decayRate: 0.99,
        maxAgeDays: 90,
        engagementBoost: 5,
        engagementDecay: 0.95,
        minQuizzes: 0
    },
    mediaDisplay: {
        quizImageWidth: 80      // Prozent der Container-Breite (30-100)
    },
    miniGames: {
        spinner: { enabled: true, minCorrect: 10, quizCount: 2, maxXP: 50 },
bossFight: { enabled: true, threshold: 10, hp: 100, lives: 3, winXP: 100 },
        xpPerCorrect: 5
    },
    avatars: {
        level1:  { icon: '🎯', image: null, image2: null },
        level5:  { icon: '🌱', image: null, image2: null },
        level15: { icon: '⚡', image: null, image2: null },
        level30: { icon: '🌟', image: null, image2: null },
        level45: { icon: '🔥', image: null, image2: null },
        level60: { icon: '⭐', image: null, image2: null },
        level75: { icon: '💎', image: null, image2: null },
        level90: { icon: '👑', image: null, image2: null }
    }
};

// quizSettings aus Defaults ableiten (Single Source of Truth)
quizSettings = ensureSettingsDefaults({});


function ensureSettingsDefaults(settings) {
    for (const [key, defaultVal] of Object.entries(SETTINGS_DEFAULTS)) {
        if (typeof defaultVal === 'object' && defaultVal !== null) {
            if (!settings[key]) {
                // Ganzes Sub-Objekt fehlt → Deep-Copy einsetzen
                settings[key] = JSON.parse(JSON.stringify(defaultVal));
            } else {
                // Sub-Objekt existiert → fehlende Keys auffüllen
                for (const [subKey, subVal] of Object.entries(defaultVal)) {
                    if (settings[key][subKey] === undefined) {
                        settings[key][subKey] = typeof subVal === 'object' && subVal !== null
                            ? JSON.parse(JSON.stringify(subVal))
                            : subVal;
                    }
                }
            }
        } else {
            if (settings[key] === undefined) {
                settings[key] = defaultVal;
            }
        }
    }
    return settings;
}

// Multi-Datei-System Variablen
let multiPlayerMode = false;
let loadedFolderName = '';
let loadedPlayerFiles = [];
let loadedQuestionFiles = [];

// AppState-Bridge: Synchronisiert globale Vars ↔ AppState
// Wird nach jedem Import und vor/nach Quiz aufgerufen


function syncToAppState() {
    AppState.data.questions = questions;
    AppState.data.users = users;
    AppState.session.currentUser = currentUser;
    AppState.session.currentQuizQuestions = currentQuizQuestions;
    AppState.session.currentQuestionIndex = currentQuestionIndex;
    AppState.session.userAnswers = userAnswers;
    AppState.session.answerInputCount = answerInputCount;
    AppState.session.isAdminAuthenticated = isAdminAuthenticated;
    AppState.session.dataLoaded = dataLoaded;
    AppState.session.encryptionKey = encryptionKey;
    AppState.session.multiPlayerMode = multiPlayerMode;
    AppState.session.loadedFolderName = loadedFolderName;
    AppState.session.loadedPlayerFiles = loadedPlayerFiles;
    AppState.session.loadedQuestionFiles = loadedQuestionFiles;
    AppState.settings = quizSettings;
}

function syncFromAppState() {
    questions = AppState.data.questions;
    users = AppState.data.users;
    currentUser = AppState.session.currentUser;
    currentQuizQuestions = AppState.session.currentQuizQuestions;
    currentQuestionIndex = AppState.session.currentQuestionIndex;
    userAnswers = AppState.session.userAnswers;
    answerInputCount = AppState.session.answerInputCount;
    isAdminAuthenticated = AppState.session.isAdminAuthenticated;
    dataLoaded = AppState.session.dataLoaded;
    encryptionKey = AppState.session.encryptionKey;
    multiPlayerMode = AppState.session.multiPlayerMode;
    loadedFolderName = AppState.session.loadedFolderName;
    loadedPlayerFiles = AppState.session.loadedPlayerFiles;
    loadedQuestionFiles = AppState.session.loadedQuestionFiles;
    quizSettings = AppState.settings || quizSettings;
    // Fähigkeiten-Overrides aus gespeicherten Settings anwenden
    if (quizSettings.abilityOverrides && typeof ABILITY_DEFS !== 'undefined') {
        Object.keys(quizSettings.abilityOverrides).forEach(function(key) {
            var ov = quizSettings.abilityOverrides[key];
            if (ov && ov.earnPer && ABILITY_DEFS[key]) {
                ABILITY_DEFS[key].earnPer = ov.earnPer;
            }
        });
    }
}

// Initial sync
syncToAppState();


function hasStableId(id) {
    return id && !id.startsWith('Q_') && !/^\d+$/.test(String(id));
}

function normalizeQuestion(q) {
    const text = q.text || '';

    const oldQuestionId = q.questionId;
    function resolveId() {
        if (hasStableId(oldQuestionId)) return oldQuestionId;
        return assignStableId(q._fileGroup || 'Manuell', questions);
    }

    const fileGroup = q._fileGroup || null;

    if (q.type === QUESTION_TYPES.IMAGEMAP) {
        return {
            questionId: resolveId(),
            _fileGroup: fileGroup,
            text: text,
            type: QUESTION_TYPES.IMAGEMAP,
            targets: q.targets || (q.target ? [q.target] : []),
            active: q.active !== false,
            media: q.media || null,
            explanation: q.explanation || null,
            explanationMedia: q.explanationMedia || null,
            hint: q.hint || null,
            hintMedia: q.hintMedia || null
        };
    }

    // Freitext-Frage?
    if (q.type === QUESTION_TYPES.TEXT || (q.correctAnswer && !q.answers)) {
        const textAnswers = getCorrectTextAnswers(q);
        return {
            questionId: resolveId(),
            _fileGroup: fileGroup,
            text: text,
            type: QUESTION_TYPES.TEXT,
            answers: [{ type: QUESTION_TYPES.TEXT, correctAnswers: textAnswers }],
            correctAnswer: textAnswers,
            active: q.active !== false,
            media: q.media || null,
            explanation: q.explanation || null,
            explanationMedia: q.explanationMedia || null,
            hint: q.hint || null,
            hintMedia: q.hintMedia || null
        };
    }

    // Multiple-Choice
    let rawAnswers = q.answers || [];
    const correctIndex = q.correct !== undefined ? q.correct : 0;

    const answers = rawAnswers.map((ans, idx) => {
        if (typeof ans === 'string') {
            return { text: ans, correct: idx === correctIndex };
        } else if (typeof ans === 'object' && ans !== null) {
            return { text: ans.text || ans, correct: ans.correct === true };
        }
        return { text: String(ans), correct: false };
    });

    return {
        questionId: resolveId(),
        _fileGroup: fileGroup,
        text: text,
        type: QUESTION_TYPES.MULTIPLE_CHOICE,
        answers: answers,
        active: q.active !== false,
        media: q.media || null,
        explanation: q.explanation || null,
        explanationMedia: q.explanationMedia || null,
        hint: q.hint || null,
        hintMedia: q.hintMedia || null
    };
}
