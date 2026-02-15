// 05-quizcore.js
// QuizCore namespace wrapper
// ============================================================

// QUIZ CORE — Namespace-Wrapper für zentrale Funktionen


const QuizCore = {
    
    Data: {
        getQuestions()       { return AppState.data.questions; },
        setQuestions(q)      { AppState.data.questions = q; },
        getUsers()           { return AppState.data.users; },
        setUsers(u)          { AppState.data.users = u; },
        getActiveQuestions() { 
            return AppState.data.questions.filter(q => q.active !== false); 
        },
        findQuestionById(id) {
            return AppState.data.questions.find(q => q.id === id || q.questionId === id);
        },
        findUserById(id) {
            return AppState.data.users.find(u => u.id === id);
        },
        findUserByName(name) {
            return AppState.data.users.find(u => u.name === name);
        }
    },
    
    
    Quiz: {
        getCurrentQuestions() { return AppState.session.currentQuizQuestions; },
        setCurrentQuestions(q) { AppState.session.currentQuizQuestions = q; },
        getCurrentIndex()    { return AppState.session.currentQuestionIndex; },
        setCurrentIndex(i)   { AppState.session.currentQuestionIndex = i; },
        getCurrentQuestion() {
            const qs = AppState.session.currentQuizQuestions;
            const idx = AppState.session.currentQuestionIndex;
            return (qs && idx >= 0 && idx < qs.length) ? qs[idx] : null;
        },
        getAnswers()         { return AppState.session.userAnswers; },
        setAnswers(a)        { AppState.session.userAnswers = a; },

    },
    
    
    User: {
        getCurrent()         { return AppState.session.currentUser; },
        setCurrent(u)        { AppState.session.currentUser = u; },
        isLoggedIn()         { return AppState.session.currentUser !== null; }
    },
    
    
    UI: {
        showScreen(id)       { if (typeof showScreen === 'function') showScreen(id); },
        toast(msg, type, dur){ Toast.show(msg, type, dur); },
        showAdminSection(s)  { if (typeof showAdminSection === 'function') showAdminSection(s); }
    },
    
    
    Utils: {
        sanitizeHTML(str)    { return typeof sanitizeHTML === 'function' ? sanitizeHTML(str) : str; },
        getMediaSource(m)    { return typeof getMediaSource === 'function' ? getMediaSource(m) : null; },
        getCorrectTextAnswers(q) { return typeof getCorrectTextAnswers === 'function' ? getCorrectTextAnswers(q) : []; },
        calculateLevel(xp)   { return typeof calculateLevel === 'function' ? calculateLevel(xp) : { level: 1, currentLevelXP: 0, xpForNextLevel: 50 }; },
        getAvatarForLevel(l) { return typeof getAvatarForLevel === 'function' ? getAvatarForLevel(l) : { icon: '🎯', gradient: 'linear-gradient(135deg, #808080, #A9A9A9)' }; },
        hashString(s)        { return typeof hashString === 'function' ? hashString(s) : ''; },
        validateQuestion(q)  { return typeof validateQuestion === 'function' ? validateQuestion(q) : false; },
        validateUser(u)      { return typeof validateUser === 'function' ? validateUser(u) : false; }
    }
};
