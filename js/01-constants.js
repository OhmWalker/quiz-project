// 01-constants.js
// Constants, Config, QUESTION_TYPES, LIMITS, TIMING, MESSAGES, CONFIG
// ============================================================

// Constants
const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple-choice',
    TEXT: 'text',
    IMAGEMAP: 'imagemap'
};


function getCorrectTextAnswers(q) {
    // 1. Kanonisches Format (nach normalizeQuestion)
    if (q.answers && q.answers[0] && Array.isArray(q.answers[0].correctAnswers)) {
        return q.answers[0].correctAnswers;
    }
    // 2. correctAnswer als Array
    const ca = q.correctAnswer || q.antwort;
    if (Array.isArray(ca)) return ca;
    // 3. correctAnswer als String (NICHT splitten — Komma kann Teil der Antwort sein)
    if (typeof ca === 'string' && ca.trim()) return [ca.trim()];
    return [];
}

const LIMITS = {
    MAX_ANSWERS: 5,
    MIN_PASSWORD_LENGTH: 4,
    MAX_QUESTION_ID: 999
};

const TIMING = {
    SCROLL_DELAY_MS: 100,
    EXPORT_CONTINUE_DELAY_MS: 1000
};

const MESSAGES = {
    CONFIRM_DELETE_QUESTION: 'Möchten Sie diese Frage wirklich löschen?',
    CONFIRM_DELETE_USER: 'Möchten Sie diesen Benutzer wirklich löschen?',
    ERROR_NO_ANSWER: 'Bitte wählen Sie mindestens eine Antwort aus.',
    ERROR_NO_TEXT_INPUT: 'Bitte geben Sie eine Antwort ein.',
    ERROR_MAX_ANSWERS: 'Maximal 5 Antworten möglich',
    ERROR_NO_CORRECT_ANSWER: 'Mindestens eine Antwort muss als richtig markiert werden.',
    ERROR_INVALID_NUMBER: 'Bitte gültige Anzahl eingeben (mindestens 1)',
    ERROR_INVALID_XP: 'Bitte gültigen XP-Wert eingeben (mindestens 0)',
    ERROR_INVALID_EXPONENT: 'Bitte gültigen Exponent eingeben (0.1 - 3.0)',
    ERROR_INVALID_BONUS: 'Bitte gültigen Bonus-Wert eingeben (100 - 500)',
    ERROR_PASSWORD_TOO_SHORT: 'Passwort muss mindestens 4 Zeichen lang sein.',
    ERROR_NO_USER: 'Kein Benutzer ausgewählt',
    ERROR_NO_ACTIVE_QUESTIONS: 'Keine aktiven Fragen verfügbar! Bitte aktivieren Sie Fragen im Admin-Bereich.',
    ERROR_FILE_READ: 'Fehler beim Lesen der Datei!'
};

// CONFIG — Zentrale Konstanten (ersetzt Magic Numbers)


const CONFIG = {
    // Timer
    TIMER: {
        GHOST_CLEANUP_MONTHS: 3,       // Ghost-Daten nach X Monaten löschen
        MIN_DYNAMIC_SEC: 5,            // Minimum dynamischer Timer (Sekunden)
        MAX_DYNAMIC_SEC: 60,           // Maximum dynamischer Timer (Sekunden)
        DEFAULT_SEC: 30,               // Standard-Timer (Sekunden)
        COUNTDOWN_INTERVAL_MS: 100,    // Timer-Update-Intervall (ms)
        WARNING_PCT: 0.3,              // < 30% verbleibend → gelbe Warnung
        CRITICAL_PCT: 0.15,            // < 15% verbleibend → rote Warnung
    },
    // XP & Level
    XP: {
        MAX_LEVEL: 100,
        CORRECT_ANSWER: 10,
        WRONG_ANSWER: -2,
    },
    // Quiz
    QUIZ: {
        DEFAULT_QUESTIONS_PER_QUIZ: 10, // Standard-Fragenanzahl
        DEFAULT_ANSWER_COUNT: 4,
        MIN_QUESTIONS_FOR_QUIZ: 1,
        SHUFFLE_ANSWERS: true
    },
    // Mini-Games
    MINI_GAMES: {
        SPINNER_SEGMENTS: 8,
        SPEED_TAP_DEFAULT_ROUNDS: 5,
        BOSS_DEFAULT_HP: 100
    },
    // UI
    UI: {
        TOAST_DURATION_MS: 3000,
        TOAST_FADE_MS: 300,
        SCROLL_DELAY_MS: 100,
        ANIMATION_DURATION_MS: 300
    },
    // Abilities
    ABILITIES: {
        MAX_PER_QUESTION: 1            // Max Abilities pro Frage (außer passive)
    },
    // Datei-System
    FILE: {
        VERSION: '4.0',
        ENCRYPTION_KEY: 'QuizSystem2024'
    }
};
