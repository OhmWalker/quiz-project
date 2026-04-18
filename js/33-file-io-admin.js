// 33-file-io-admin.js
// Admin-only File-I/O — ausgeschlossen vom LeanQuiz-Build
// ============================================================

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

