// 32-file-io.js
// File I/O: Load, Save, Export, Import functions
// ============================================================

async function loadFromFolderInput(event) {
  try {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // FileList → Array konvertieren für sichere Iteration
    const fileArray = Array.from(files);

    // Ordnername aus dem ersten Dateipfad extrahieren
    const firstPath = fileArray[0].webkitRelativePath;
    loadedFolderName = firstPath.split('/')[0];

    let masterData = null;
    let playerFiles = [];

    // Alle JSON-Dateien sammeln und lesen
    const readPromises = [];

    for (let fi = 0; fi < fileArray.length; fi++) {
        (function(file) {
        if (file.name.endsWith('.json')) {
            const promise = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        let raw = e.target.result;
                        let data;
                        try { data = JSON.parse(raw); } catch(e1) {
                            try { data = JSON.parse(decodeURIComponent(escape(atob(raw.trim())))); }
                            catch(e2) { throw new Error('Ungültiges Format'); }
                        }
                        resolve({
                            name: file.name,
                            data: data,
                            lastModified: file.lastModified
                        });
                    } catch (err) {
                        console.warn('Datei konnte nicht gelesen werden:', file.name, err.message);
                        resolve(null);
                    }
                };
                reader.onerror = () => { console.warn('Lesefehler:', file.name); resolve(null); };
                reader.readAsText(file);
            });
            readPromises.push(promise);
        }
        })(fileArray[fi]);
    }

    const results = await Promise.all(readPromises);

    // Ergebnisse verarbeiten
    let masterFiles = [];
    let questionFiles = [];
    const skippedFiles = [];
    const unrecognizedJsonFiles = [];
    for (const result of results) {
        if (!result) continue;

        // 01: Master (Settings + Backups)
        if (result.name.startsWith('02_quiz-master') || result.name.startsWith('02_QUIZ-MASTER') || result.name === 'quiz-master.json') {
            masterFiles.push(result);
        }
        // 02: Operator (Spielerdaten) — NUR exakter Präfix
        else if (result.name.startsWith('04_operator_') || result.name.startsWith('04_Operator_') || result.name.startsWith('spieler-')) {
            playerFiles.push(result);
        }
        // 03: Questions (Fragenkataloge) — NUR exakter Präfix
        else if (result.name.startsWith('03_questions_') || result.name.startsWith('03_Questions_')) {
            questionFiles.push(result);
        }
        // Fallback: JSON mit questions-Array → als Fragen laden, aber warnen
        else if (result.data && result.data.questions && Array.isArray(result.data.questions)) {
            questionFiles.push(result);
            unrecognizedJsonFiles.push(result.name);
        }
        // Nicht erkannt → ignorieren
        else {
            skippedFiles.push(result.name);
        }
    }

    // Warnung bei nicht korrekt benannten Dateien (werden trotzdem geladen)
    if (unrecognizedJsonFiles.length > 0) {
        console.warn('Fragen-Dateien ohne korrekten Präfix:', unrecognizedJsonFiles.join(', '));
        let warnMsg = '⚠️ ' + unrecognizedJsonFiles.length + ' Datei(en) wurden geladen, haben aber keinen Standard-Namen:\n\n';
        unrecognizedJsonFiles.forEach(function(f) { warnMsg += '• ' + f + '\n'; });
        warnMsg += '\nBitte umbenennen zu: 03_questions_THEMA_DATUM.json\n';
        warnMsg += 'Beim nächsten Export wird der Name automatisch korrekt gesetzt.';
        Toast.show(warnMsg, 'info');
    }
    console.log('Ordner-Laden: ' + results.filter(Boolean).length + ' JSON-Dateien, ' + masterFiles.length + ' Master, ' + questionFiles.length + ' Fragen-Dateien, ' + playerFiles.length + ' Spieler, ' + skippedFiles.length + ' übersprungen');
    if (playerFiles.length > 0) console.log('Spieler-Dateien:', playerFiles.map(function(p){ return p.name; }).join(', '));
    if (questionFiles.length > 0) console.log('Fragen-Dateien:', questionFiles.map(function(p){ return p.name; }).join(', '));
    if (skippedFiles.length > 0) console.log('Übersprungen:', skippedFiles.join(', '));

    // Neueste Master-Datei verwenden
    if (masterFiles.length > 0) {
        masterFiles.sort((a, b) => b.lastModified - a.lastModified);
        masterData = masterFiles[0].data;
    }

    // Wenn keine Master-Datei, erstelle Standard
    if (!masterData) {
        masterData = {
            version: CONFIG.FILE.VERSION,
            lastBackup: null,
            settings: quizSettings
        };
    }

    // Master-Daten laden (keine Fragen mehr im Master!)
    quizSettings = { ...quizSettings, ...masterData.settings };
    ensureSettingsDefaults(quizSettings);

    // Fähigkeiten-Overrides anwenden
    if (quizSettings.abilityOverrides) {
        Object.keys(quizSettings.abilityOverrides).forEach(function(key) {
            var ov = quizSettings.abilityOverrides[key];
            if (ov && ov.earnPer && ABILITY_DEFS[key]) {
                ABILITY_DEFS[key].earnPer = ov.earnPer;
                if (AbilityPlugin && AbilityPlugin.DEFS && AbilityPlugin.DEFS[key]) {
                    AbilityPlugin.DEFS[key].earnPer = ov.earnPer;
                }
            }
        });
    }

    // Plugin-Konfiguration aus Master laden (abwärtskompatibel)
    if (masterData.pluginConfig) {
        PluginRegistry.loadConfig(masterData.pluginConfig);
    }

    // Fragen aus 03_questions-Dateien laden
    questions = [];
    loadedQuestionFiles = [];
    if (questionFiles.length > 0) {
        questionFiles.forEach(qf => {
            const qData = qf.data;
            const theme = qData.theme || 'Unbekannt';
            const isCore = /^03_questions_CORE/i.test(qf.name);
            const qList = qData.questions || [];
            let qErrors = 0;
            qList.forEach((q, qi) => {
                try {
                    const normalized = normalizeQuestion(q);
                    // Duplikat-Check: questionId ODER Text (verhindert doppelte Fragen aus mehreren Dateien)
                    const isDupe = questions.some(function(eq) {
                        if (normalized.questionId && eq.questionId === normalized.questionId) return true;
                        return (eq.text || '').trim().toLowerCase() === (normalized.text || '').trim().toLowerCase();
                    });
                    if (isDupe) { qErrors++; return; }
                    // Eindeutige ID sicherstellen (verschiedene Dateien können gleiche IDs haben)
                    normalized.id = Date.now() + questions.length + qi;
                    normalized.sourceFile = qf.name;
                    normalized.theme = q.theme || theme;
                    normalized._fileGroup = q._fileGroup || q.theme || theme;
                    normalized.isCore = isCore;
                    questions.push(normalized);
                } catch(qErr) {
                    qErrors++;
                    console.warn('Frage ' + qi + ' in ' + qf.name + ' übersprungen:', qErr.message);
                }
            });
            loadedQuestionFiles.push({
                name: qf.name,
                theme: theme,
                count: qList.length - qErrors,
                lastModified: new Date(qf.lastModified).toLocaleString()
            });
            if (qErrors > 0) console.warn(qf.name + ': ' + qErrors + ' Fragen übersprungen (Fehler)');
        });
    } else if (masterData.questions && masterData.questions.length > 0) {
        // Rückwärtskompatibel: Fragen aus altem Master laden
        questions = masterData.questions.map(normalizeQuestion);
        questions.forEach(function(q, idx) {
            if (!q._fileGroup) q._fileGroup = q.theme || 'Legacy';
            q.id = Date.now() + idx; // Eindeutige ID sicherstellen
        });
        loadedQuestionFiles.push({
            name: '(aus Master)',
            theme: 'Legacy',
            count: questions.length,
            lastModified: '-'
        });
    }

    // Spieler aus Dateien laden (neueste Version pro Spieler)
    users = [];
    const playersByName = {};
    const playerFileCount = {}; // Zähle Dateien pro Spieler

    playerFiles.forEach(pf => {
        if (!pf.data || !pf.data.name) {
            console.warn('Spieler-Datei ohne name-Feld übersprungen:', pf.name, Object.keys(pf.data || {}));
            return;
        }
        const playerName = pf.data.name;

        // Dateien zählen
        playerFileCount[playerName] = (playerFileCount[playerName] || 0) + 1;

        // Nur neueste Version merken
        if (!playersByName[playerName] || pf.lastModified > playersByName[playerName].lastModified) {
            playersByName[playerName] = pf;
        }
    });

    // Duplikate zählen (wird in refreshPlayerFiles angezeigt, kein Popup)

    // Geladene Spieler-Dateien merken
    loadedPlayerFiles = Object.values(playersByName).map(pf => ({
        name: pf.name,
        playerName: pf.data.name,
        lastModified: new Date(pf.lastModified).toLocaleString(),
        totalFiles: playerFileCount[pf.data.name] || 1
    }));

    Object.values(playersByName).forEach(pf => {
        users.push(pf.data);
    });

    // Cross-Reference: Phone-Joker System (3 Phasen)
    const jokerExpiryMs = CONFIG.TIMER.GHOST_CLEANUP_MONTHS * 30 * 24 * 60 * 60 * 1000;
    const jokerExpiryThreshold = Date.now() - jokerExpiryMs;

    // Phase 1: Resolved Joker verarbeiten → Sender-Bonus berechnen
    // B hat eine Joker-Frage beantwortet (resolved:true auf B.pendingPhoneJoker).
    // Jetzt A's sentPhoneJokers als resolved markieren + Bonus auf A schreiben.
    users.forEach(function(target) {
        if (!target.pendingPhoneJoker) return;
        target.pendingPhoneJoker.forEach(function(entry) {
            if (!entry.resolved) return;
            var sender = users.find(function(u){ return u.name === entry.from; });
            if (!sender || !sender.sentPhoneJokers) return;
            var sentEntry = sender.sentPhoneJokers.find(function(s) {
                return s.questionId === entry.questionId && s.targetName === target.name && !s.resolved;
            });
            if (!sentEntry) return; // bereits verarbeitet
            // Sender's sent-Eintrag als resolved markieren (wird in Phase 2 aufgeräumt)
            sentEntry.resolved = true;
            // Bonus nur einmal anwenden (bonusApplied verhindert Doppel-Bonus)
            if (!entry.bonusApplied && entry.correct) {
                var xpSettings = quizSettings.xpSystem || {};
                var bonusXP = (xpSettings.correctAnswerXP || 10) * 5;
                if (!sender.pendingJokerBonus) sender.pendingJokerBonus = 0;
                sender.pendingJokerBonus += bonusXP;
            }
            entry.bonusApplied = true;
        });
    });

    // Phase 2: sentPhoneJokers aufräumen + pending aus sent erzeugen
    users.forEach(function(sender) {
        if (!sender.sentPhoneJokers || sender.sentPhoneJokers.length === 0) return;
        // Ghost-Joker Cleanup: resolved, abgelaufene, inaktive Fragen entfernen
        sender.sentPhoneJokers = sender.sentPhoneJokers.filter(function(joker) {
            if (joker.resolved) return false;
            if (joker.date && new Date(joker.date).getTime() < jokerExpiryThreshold) return false;
            var qExists = questions.some(function(qq){ return qq.questionId === joker.questionId && qq.active !== false; });
            return qExists;
        });
        // Pending-Einträge erzeugen für offene sent-Einträge
        sender.sentPhoneJokers.forEach(function(joker) {
            var target = users.find(function(u){ return u.name === joker.targetName; });
            if (target) {
                if (!target.pendingPhoneJoker) target.pendingPhoneJoker = [];
                var exists = target.pendingPhoneJoker.some(function(p) {
                    return p.from === joker.from && p.questionId === joker.questionId;
                });
                if (!exists) {
                    target.pendingPhoneJoker.push({
                        from: joker.from, questionId: joker.questionId,
                        questionText: joker.questionText, date: joker.date
                    });
                }
            }
        });
    });

    // Phase 3: Verwaiste resolved-Einträge aufräumen
    // Wenn der Sender keinen passenden sent-Eintrag mehr hat (schon gespeichert),
    // kann der resolved-Eintrag beim Empfänger entfernt werden.
    users.forEach(function(target) {
        if (!target.pendingPhoneJoker) return;
        target.pendingPhoneJoker = target.pendingPhoneJoker.filter(function(entry) {
            if (!entry.resolved) return true; // offene behalten
            // Abgelaufene resolved-Einträge entfernen
            if (entry.date && new Date(entry.date).getTime() < jokerExpiryThreshold) return false;
            // Wenn Sender keinen passenden sent-Eintrag mehr hat → Quittung entfernen
            var sender = users.find(function(u){ return u.name === entry.from; });
            if (!sender || !sender.sentPhoneJokers) return false;
            return sender.sentPhoneJokers.some(function(s) {
                return s.questionId === entry.questionId && s.targetName === target.name;
            });
        });
    });

    // Modus setzen
    multiPlayerMode = true;
    dataLoaded = true;
    syncToAppState();
    EventBus.emit('data:loaded', { questions: questions.length, users: users.length, source: 'folder' });

    // UI aktualisieren
    updateFolderStatus(playerFiles.length, Object.keys(playersByName).length, loadedQuestionFiles);

    document.getElementById('quizTitle').textContent = quizSettings.quizName || 'XY Quiz';
    const et = document.getElementById('encryptToggle');
    if (et) { et.checked = !!quizSettings.encryptPlayerData; document.getElementById('encryptHint').textContent = quizSettings.encryptPlayerData ? 'Base64-kodiert (alle Dateien)' : 'Klartext'; }

    renderUserSelect();
    renderLeaderboard();
    updateQuestionsList();
    updateUsersList();

    // Ordner-Anzeige
    document.getElementById('modeFolder').textContent = loadedFolderName;
    document.getElementById('modeOperatorCount').textContent = users.length;

    // Duplikate anzeigen
    let dupNames = [];
    let dupTotal = 0;
    loadedPlayerFiles.forEach(function(pf) {
        if (pf.totalFiles > 1) {
            dupNames.push(pf.playerName + '(' + pf.totalFiles + ')');
            dupTotal += pf.totalFiles - 1;
        }
    });
    let dupEl = document.getElementById('modeDuplicates');
    if (dupEl) {
        if (dupTotal > 0) {
            dupEl.textContent = 'Duplicates: ' + dupTotal + ' (' + dupNames.join(', ') + ')';
            dupEl.style.color = 'var(--incorrect)';
        } else {
            dupEl.textContent = 'Duplicates: 0';
        }
    }

    showScreen('startScreen');

    event.target.value = ''; // Reset input
  } catch(err) {
    console.error('Ordner-Laden Fehler:', err);
    GameDialog.showError('Fehler beim Laden des Ordners', err.message + '\n\nStack:\n' + (err.stack || '').split('\n').slice(0,5).join('\n'));
  }
}


function updateFolderStatus(totalFiles, uniquePlayers, qFiles) {
    document.getElementById('folderStatus').style.display = 'block';
    document.getElementById('folderName').textContent = loadedFolderName;
    let qInfo = '❓ ' + questions.length + ' Fragen geladen';
    if (qFiles && qFiles.length > 0) {
        qInfo += ' (' + qFiles.map(function(f){ return f.theme; }).join(', ') + ')';
    }
    document.getElementById('folderStats').innerHTML =
        '📄 ' + totalFiles + ' Spieler-Dateien gefunden<br>' +
        '👥 ' + uniquePlayers + ' aktive Spieler<br>' +
        qInfo;
}


function saveCurrentPlayer() {
    if (!currentUser) {
        Toast.show('Bitte zuerst einen Spieler auswählen.', 'warning');
        return;
    }

    // Format: 04_operator_NAME_YYYY-MM-DD_HHMM-SS.json
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
    const playerName = currentUser.name.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
    const fileName = `04_operator_${playerName}_${timestamp}.json`;

    let dataStr = JSON.stringify(currentUser, null, 2);
    if (quizSettings.encryptPlayerData) {
        try { dataStr = btoa(unescape(encodeURIComponent(dataStr))); } catch(e) { console.error('Encoding error:', e); }
    }
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Toast.show(`Spielerdaten gespeichert als:\n${fileName}\n\nBitte speichern Sie die Datei im Quiz-Ordner!`, 'success');
}


function saveMultiPlayerData() {
    if (!currentUser) {
        Toast.show('Bitte zuerst einen Spieler auswählen.', 'warning');
        return;
    }

    // 1. Spieler-Datei speichern
    saveCurrentPlayer();

}


function saveMasterBackup() {
    const masterData = {
        version: CONFIG.FILE.VERSION,
        lastBackup: new Date().toISOString(),
        settings: quizSettings,
        badges: quizSettings.badges || null,
        pluginConfig: PluginRegistry.getConfig(),
        questionSources: loadedQuestionFiles.map(function(f){ return f.name; })
    };

    // Format: 02_quiz-master_YYYY-MM-DD_HHMM-SS.json
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
    const fileName = `02_QUIZ-MASTER_${timestamp}.json`;

    const dataStr = JSON.stringify(masterData, null, 2);
    if (quizSettings.encryptPlayerData) {
        try { dataStr = btoa(unescape(encodeURIComponent(dataStr))); } catch(e) { console.error('Encoding error:', e); }
    }
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    let a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const encInfo = quizSettings.encryptPlayerData ? ' (Base64-kodiert)' : '';
    Toast.show('Master-Datei gespeichert als:\n' + fileName + encInfo + '\n\nEnthält Settings und Plugin-Konfiguration.\nFragen werden separat in 03_questions-Dateien gespeichert.\n\nBitte speichern Sie die Datei im Quiz-Ordner!', 'success');
}


function refreshPlayerFiles() {
    const container = document.getElementById('playerFilesList');

    if (!multiPlayerMode || loadedPlayerFiles.length === 0) {
        container.innerHTML = '<p style="opacity: 0.6; font-style: italic;">Keine Spieler-Dateien geladen</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

    loadedPlayerFiles.forEach(pf => {
        const hasMultiple = pf.totalFiles > 1;
        const warningStyle = hasMultiple ? 'border-left: 3px solid var(--incorrect); padding-left: 10px;' : '';
        const warningBadge = hasMultiple ? `<span style="background: var(--incorrect); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">⚠️ ${pf.totalFiles} Dateien</span>` : '';

        html += `
            <div style="display: flex; justify-content: space-between; align-items: center;
                        padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; ${warningStyle}">
                <div>
                    <strong>${pf.playerName}</strong>${warningBadge}<br>
                    <span style="font-size: 0.85rem; opacity: 0.7;">
                        ${pf.name}<br>
                        Geladen: ${pf.lastModified}
                    </span>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}


function refreshRestoreList() {
    const select = document.getElementById('restorePlayerSelect');
    select.innerHTML = '<option value="">-- Spieler auswählen --</option>';

    // Spieler die in users sind aber evtl. gelöscht werden könnten
    users.forEach(user => {
        select.innerHTML += `<option value="${user.name}">${user.name}</option>`;
    });
}


function restorePlayerFromBackup() {
    const select = document.getElementById('restorePlayerSelect');
    const playerName = select.value;

    if (!playerName) {
        Toast.show('Bitte wählen Sie einen Spieler aus.', 'warning');
        return;
    }

    const user = users.find(u => u.name === playerName);
    if (!user) {
        Toast.show('Spieler nicht gefunden.', 'warning');
        return;
    }

    // Format: 04_operator_NAME_YYYY-MM-DD_HHMM-SS.json
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
    const safeName = playerName.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
    const fileName = `04_operator_${safeName}_${timestamp}.json`;

    const dataStr = JSON.stringify(user, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    GameDialog.showInfo('💾', 'Spieler exportiert!', 'Spieler: <strong>' + sanitizeHTML(playerName) + '</strong><br>Datei: <strong>' + sanitizeHTML(fileName) + '</strong><br><br>Speichern Sie die Datei im Quiz-Ordner!');
}


function createNewMultiplayerFiles() {
    // 20 Nutzer – alle Werte auf 0 (fairer Start)
    const userProfiles = [
        { name: 'AA' }, { name: 'AB' }, { name: 'AC' }, { name: 'AD' }, { name: 'AE' },
        { name: 'AF' }, { name: 'AG' }, { name: 'AH' }, { name: 'AI' }, { name: 'AJ' },
        { name: 'AK' }, { name: 'AL' }, { name: 'AM' }, { name: 'AN' }, { name: 'AO' },
        { name: 'AP' }, { name: 'AQ' }, { name: 'AR' }, { name: 'AS' }, { name: 'AT' }
    ];

    const users = userProfiles.map((profile, index) => ({
        id: index + 1,
        name: profile.name,
        score: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        quizzesTaken: 0,
        xp: 0,
        level: 1,
        streak: 0,
        totalXP: 0,
        lastQuizDate: null,
        achievements: [],
        quizHistory: [],
        history: [],
        dailyQuizCount: 0,
        questionStats: {},
        badgeStats: {
            totalQuizzes: 0, totalCorrect: 0, totalAnswered: 0,
            perfectQuizzes: 0, earlyQuizzes: 0, lateQuizzes: 0,
            weekendQuizzes: 0, mondayQuizzes: 0, fastQuizzes: 0,
            highAverageQuizzes: 0, marathonDays: 0, uniqueQuestions: 0,
            timesFirst: 0, daysWithQuiz: 0, currentStreak: 0,
            maxStreak: 0, monthsActive: 0, comebacks: 0, totalXP: 0, level: 1
        }
    }));

    // 10 Multiple-Choice Fragen (Allgemeinwissen)
    const multipleChoiceQuestions = [
        { frage: 'Wie viele Kontinente gibt es auf der Erde?', antworten: ['5', '6', '7', '8'], richtig: 2 },
        { frage: 'Welches ist das größte Organ des menschlichen Körpers?', antworten: ['Herz', 'Leber', 'Haut', 'Gehirn'], richtig: 2 },
        { frage: 'In welchem Jahr fiel die Berliner Mauer?', antworten: ['1987', '1989', '1991', '1990'], richtig: 1 },
        { frage: 'Wie viele Planeten hat unser Sonnensystem?', antworten: ['7', '8', '9', '10'], richtig: 1 },
        { frage: 'Welches chemische Element hat das Symbol "O"?', antworten: ['Gold', 'Osmium', 'Sauerstoff', 'Zink'], richtig: 2 },
        { frage: 'Wie heißt die Hauptstadt von Australien?', antworten: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], richtig: 2 },
        { frage: 'Welches Tier ist das schnellste Landtier?', antworten: ['Löwe', 'Gepard', 'Pferd', 'Antilope'], richtig: 1 },
        { frage: 'Wie viele Zähne hat ein erwachsener Mensch normalerweise?', antworten: ['28', '30', '32', '34'], richtig: 2 },
        { frage: 'In welchem Ozean liegt Hawaii?', antworten: ['Atlantik', 'Indischer Ozean', 'Pazifik', 'Arktischer Ozean'], richtig: 2 },
        { frage: 'Welches ist das härteste natürliche Material?', antworten: ['Gold', 'Eisen', 'Diamant', 'Titan'], richtig: 2 }
    ];

    // 10 Freitext-Fragen (Allgemeinwissen)
    const freetextQuestions = [
        { frage: 'Wie heißt die Hauptstadt von Frankreich?', antwort: 'Paris' },
        { frage: 'Welcher Planet ist der Erde am nächsten?', antwort: 'Venus' },
        { frage: 'Wie nennt man die Wissenschaft von den Lebewesen?', antwort: 'Biologie' },
        { frage: 'Welches Gas atmen Pflanzen ein?', antwort: 'Kohlendioxid' },
        { frage: 'Wie heißt das größte Land der Welt?', antwort: 'Russland' },
        { frage: 'Welches Metall ist flüssig bei Raumtemperatur?', antwort: 'Quecksilber' },
        { frage: 'Wie nennt man den längsten Fluss Afrikas?', antwort: 'Nil' },
        { frage: 'Welches Vitamin produziert der Körper durch Sonnenlicht?', antwort: 'Vitamin D' },
        { frage: 'Wie heißt die Währung von Japan?', antwort: 'Yen' },
        { frage: 'Welches Tier ist das größte Säugetier der Welt?', antwort: 'Blauwal' }
    ];

    // Alle Fragen zusammenfügen
    const questions = [];
    let id = 1;

    // Multiple-Choice hinzufügen
    multipleChoiceQuestions.forEach(q => {
        questions.push({
            id: id,
            questionId: String(id).padStart(3, '0'),
            frage: q.frage,
            antworten: q.antworten,
            richtig: q.richtig,
            active: true
        });
        id++;
    });

    // Freitext hinzufügen
    freetextQuestions.forEach(q => {
        questions.push({
            id: id,
            questionId: String(id).padStart(3, '0'),
            frage: q.frage,
            antwort: q.antwort,
            typ: 'freitext',
            active: true
        });
        id++;
    });

    // Standard Master-Daten (OHNE Fragen!)
    const masterData = {
        version: CONFIG.FILE.VERSION,
        lastBackup: new Date().toISOString(),
        settings: {
            quizName: 'Mein Quiz',
            questionsPerQuiz: CONFIG.QUIZ.DEFAULT_QUESTIONS_PER_QUIZ,
            corePercent: 70,
            podiumPlaces: 3,
            adminPassword: 'admin',
            superAdminPassword: 'super',
            xpSystem: { ...SETTINGS_DEFAULTS.xpSystem }
        },
        badges: null,
        questionSources: ['03_questions_Allgemeinwissen_' + new Date().toISOString().slice(0,10) + '.json']
    };

    // Fragen-Datei erstellen (03_questions_...)
    const questionsFileData = {
        version: '1.0',
        theme: 'Allgemeinwissen',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        questions: questions
    };

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');

    // 1. Master-Datei herunterladen
    const masterFileName = '02_QUIZ-MASTER_' + timestamp + '.json';
    const dataStr = JSON.stringify(masterData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = masterFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 2. Fragen-Datei herunterladen
    setTimeout(function() {
        let qFileName = '03_questions_Allgemeinwissen_' + timestamp + '.json';
        const qStr = JSON.stringify(questionsFileData, null, 2);
        const qBlob = new Blob([qStr], { type: 'application/json' });
        const qUrl = URL.createObjectURL(qBlob);
        const qa = document.createElement('a');
        qa.href = qUrl;
        qa.download = qFileName;
        document.body.appendChild(qa);
        qa.click();
        document.body.removeChild(qa);
        URL.revokeObjectURL(qUrl);
    }, 300);

    // 3. Spieler-Dateien herunterladen
    setTimeout(() => {
        if (confirm('Dateien erstellt!\n\n' + users.length + ' Spieler + ' + questions.length + ' Fragen (Allgemeinwissen).\n\nMöchten Sie auch die einzelnen Spieler-Dateien herunterladen?')) {
            users.forEach((user, index) => {
                setTimeout(() => {
                    // Format: 04_operator_NAME_YYYY-MM-DD_HHMM-SS.json
                    const playerFileName = `04_operator_${user.name}_${timestamp}.json`;
                    const playerStr = JSON.stringify(user, null, 2);
                    const playerBlob = new Blob([playerStr], { type: 'application/json' });
                    const playerUrl = URL.createObjectURL(playerBlob);

                    const pa = document.createElement('a');
                    pa.href = playerUrl;
                    pa.download = playerFileName;
                    document.body.appendChild(pa);
                    pa.click();
                    document.body.removeChild(pa);
                    URL.revokeObjectURL(playerUrl);
                }, index * 300);
            });

            setTimeout(function() {
                Toast.show('Alle Dateien erstellt!\n\n1. Speichern Sie alle Dateien in einem neuen Ordner\n2. Wählen Sie dann diesen Ordner aus um zu starten', 'info');
            }, users.length * 300 + 500);
        } else {
            Toast.show('Master + Fragen-Datei erstellt!\n\n1. Speichern Sie alle Dateien in einem Ordner\n2. Wählen Sie dann diesen Ordner aus um zu starten', 'info');
        }
    }, 800);
}


function importLegacyFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedData;
            const content = e.target.result;

            // Prüfen ob verschlüsselt
            try {
                importedData = JSON.parse(content);
            } catch(e1) {
                // Versuche zu entschlüsseln
                const decoded = decodeURIComponent(escape(atob(content)));
                const jsonStr = decoded.substring(0, decoded.length - encryptionKey.length);
                importedData = JSON.parse(jsonStr);
            }

            // Daten übernehmen
            if (importedData.questions) {
                questions = importedData.questions;
                // _fileGroup aus theme setzen falls nicht vorhanden
                questions.forEach(function(q) {
                    if (!q._fileGroup) q._fileGroup = q.theme || 'Import';
                });
            } else if (importedData.fragen) {
                questions = importedData.fragen;
                questions.forEach(function(q) {
                    if (!q._fileGroup) q._fileGroup = q.theme || 'Import';
                });
            }

            if (importedData.settings) {
                quizSettings = { ...quizSettings, ...importedData.settings };
                ensureSettingsDefaults(quizSettings);
                // Fähigkeiten-Overrides anwenden
                if (quizSettings.abilityOverrides) {
                    Object.keys(quizSettings.abilityOverrides).forEach(function(key) {
                        var ov = quizSettings.abilityOverrides[key];
                        if (ov && ov.earnPer && ABILITY_DEFS[key]) {
                            ABILITY_DEFS[key].earnPer = ov.earnPer;
                            if (AbilityPlugin && AbilityPlugin.DEFS && AbilityPlugin.DEFS[key]) AbilityPlugin.DEFS[key].earnPer = ov.earnPer;
                        }
                    });
                }
            }

            if (importedData.users) {
                users = importedData.users;
            }

            // Master-Datei erstellen OHNE Fragen
            const masterData = {
                version: CONFIG.FILE.VERSION,
                lastBackup: new Date().toISOString(),
                importedFrom: file.name,
                settings: quizSettings,
                badges: quizSettings.badges || null,
                questionSources: ['03_questions_Import_' + new Date().toISOString().slice(0,10) + '.json']
            };

            // Master-Datei herunterladen
            const dataStr = JSON.stringify(masterData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'quiz-master.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Fragen-Datei separat herunterladen
            if (questions.length > 0) {
                setTimeout(function() {
                    const qData = { version: '1.0', theme: 'Import', created: new Date().toISOString(), lastModified: new Date().toISOString(), questions: questions };
                    const qStr = JSON.stringify(qData, null, 2);
                    const qBlob = new Blob([qStr], { type: 'application/json' });
                    const qUrl = URL.createObjectURL(qBlob);
                    const qa = document.createElement('a');
                    qa.href = qUrl;
                    qa.download = '03_questions_Import_' + new Date().toISOString().slice(0,10) + '.json';
                    document.body.appendChild(qa);
                    qa.click();
                    document.body.removeChild(qa);
                    URL.revokeObjectURL(qUrl);
                }, 300);
            }

            // Spieler-Dateien herunterladen
            setTimeout(() => {
                if (users.length > 0 && confirm(`${users.length} Spieler gefunden. Möchten Sie die Spieler-Dateien einzeln herunterladen?`)) {
                    users.forEach((user, index) => {
                        setTimeout(() => {
                            const timestamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
                            const playerName = user.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            const fileName = `spieler-${playerName}-${timestamp}.json`;

                            const playerStr = JSON.stringify(user, null, 2);
                            const playerBlob = new Blob([playerStr], { type: 'application/json' });
                            const playerUrl = URL.createObjectURL(playerBlob);

                            const pa = document.createElement('a');
                            pa.href = playerUrl;
                            pa.download = fileName;
                            document.body.appendChild(pa);
                            pa.click();
                            document.body.removeChild(pa);
                            URL.revokeObjectURL(playerUrl);
                        }, index * 500);
                    }, 500);
                }

                Toast.show('Konvertierung abgeschlossen!\n\nSpeichern Sie alle Dateien in einem Ordner und wählen Sie diesen dann aus.', 'info');
            }, 500);

        } catch (error) {
            GameDialog.showError('Import-Fehler', error.message);
            console.error(error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}


function applyQuizImageWidth() {
    ensureSettingsDefaults(quizSettings);
    var pct = quizSettings.mediaDisplay.quizImageWidth || 80;
    document.documentElement.style.setProperty('--quiz-img-width', pct + '%');
}
