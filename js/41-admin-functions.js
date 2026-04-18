// 41-admin-functions.js
// Admin-only functions — ausgeschlossen vom LeanQuiz-Build
// Überschreibt Stubs aus 40-init-and-functions.js (lädt danach → gewinnt)
// ============================================================

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

// Mini-Game im Test-Modus starten (Admin-Panel)
function testMiniGame(plugin, method, ...args) {
    window._mgTestMode = true;
    call(plugin, method, ...args);
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

function updateMiniGameSettings() {
    let mg = getMG();
    mg.spinner.enabled = document.getElementById('mgSpinnerEnabled').checked;
    mg.spinner.minCorrect = parseInt(document.getElementById('mgSpinnerMinCorrect').value) || 10;
    mg.spinner.quizCount = parseInt(document.getElementById('mgSpinnerQuizCount').value) || 2;
    mg.spinner.maxXP = parseInt(document.getElementById('mgSpinnerMaxXP').value) || 50;
    mg.bossFight.enabled = document.getElementById('mgBossEnabled').checked;
    mg.bossFight.threshold = parseInt(document.getElementById('mgBossThreshold').value) || 10;
    mg.bossFight.hp = parseInt(document.getElementById('mgBossHP').value) || CONFIG.MINI_GAMES.BOSS_DEFAULT_HP;
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
