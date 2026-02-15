// 04-appstate.js
// AppState central application state
// ============================================================

// APP STATE — Zentraler Anwendungszustand


const AppState = {
    // Daten (persistent — werden exportiert/importiert)
    data: {
        questions: [],
        users: []
    },
    
    // Session (flüchtig — pro Browser-Session)
    session: {
        currentUser: null,
        currentQuizQuestions: [],
        currentQuestionIndex: 0,
        userAnswers: [],
        answerInputCount: CONFIG.QUIZ.DEFAULT_ANSWER_COUNT,
        isAdminAuthenticated: false,
        dataLoaded: false,
        encryptionKey: CONFIG.FILE.ENCRYPTION_KEY,
        multiPlayerMode: false,
        loadedFolderName: '',
        loadedPlayerFiles: [],
        loadedQuestionFiles: []
    },
    
    // Quiz-Einstellungen (persistent)
    settings: null, // → wird durch quizSettings referenziert
    
    // Admin-State
    admin: {
        editingQuestionId: null,
        currentMediaData: null,
        currentMediaPath: null,
        viewingUserId: null,
        superAdminAuthenticated: false,
        superAdminTargetSection: null,
        previousRanks: {},
        selectedAvatarPresets: {}
    },
    
    // Timer-State (flüchtig)
    
    // Ability-State (flüchtig)
    abilities: {
        usedThisQuestion: {},
        doubleXPActive: false,
        shieldActive: false,
        secondChanceArmed: false
    },
    
    // Plugin-States werden hier von Plugins registriert
    plugins: {}
};
