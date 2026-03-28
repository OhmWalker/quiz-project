// === Admin: Datei laden ===

AdminShell.registerPanel('datei', 'Datei', '📂', container => {
    const loaded = dataLoaded && users.length > 0;

    container.innerHTML = `
        <div class="card">
            <h2 class="section-title" style="margin-top:0">Ordner laden</h2>
            <p class="text-muted mb-20">
                Wähle den Quiz-Datenordner. Geladen werden: Master-Datei (Settings),
                Spieler-Dateien (<code>04_operator_*</code>) und Fragen-Dateien (<code>03_questions_*</code>).
            </p>
            <label for="adminFolderInput" style="cursor:pointer">
                <button class="btn btn-secondary btn-small" onclick="document.getElementById('adminFolderInput').click()">
                    📂 Ordner auswählen
                </button>
            </label>
            <input type="file" id="adminFolderInput" webkitdirectory multiple style="display:none">
        </div>

        <div id="adminLoadSummary" style="display:${loaded ? 'block' : 'none'}">
            <div class="card">
                <h3 class="section-heading">Geladene Daten</h3>
                <table class="info-table-sm mt-15">
                    <tr><td class="td-bold">Ordner</td><td id="aSum_folder">${loadedFolderName || '—'}</td></tr>
                    <tr><td class="td-bold">Spieler</td><td id="aSum_users">${users.length}</td></tr>
                    <tr><td class="td-bold">Fragen</td><td id="aSum_questions">${questions.length}</td></tr>
                    <tr><td class="td-bold">Fragen-Dateien</td><td id="aSum_qfiles">${loadedQuestionFiles.map(f => f.name).join(', ') || '—'}</td></tr>
                </table>
            </div>
        </div>`;

    document.getElementById('adminFolderInput').addEventListener('change', _adminLoadFolder);
});


async function _adminLoadFolder(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    loadedFolderName = files[0].webkitRelativePath.split('/')[0];

    // Alle JSON-Dateien lesen
    const results = await Promise.all(
        files
            .filter(f => f.name.endsWith('.json'))
            .map(f => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => {
                    try {
                        let raw = e.target.result;
                        let data;
                        try { data = JSON.parse(raw); }
                        catch { data = JSON.parse(decodeURIComponent(escape(atob(raw.trim())))); }
                        resolve({ name: f.name, data, lastModified: f.lastModified });
                    } catch { resolve(null); }
                };
                reader.onerror = () => resolve(null);
                reader.readAsText(f);
            }))
    );

    const valid = results.filter(Boolean);

    const masterFiles  = valid.filter(r => /^02_(quiz-master|QUIZ-MASTER)/i.test(r.name));
    const playerFiles  = valid.filter(r => /^04_(operator|Operator)_/i.test(r.name));
    const questionFiles = valid.filter(r => /^03_(questions|Questions)_/i.test(r.name));

    // Settings aus neuester Master-Datei
    if (masterFiles.length) {
        masterFiles.sort((a, b) => b.lastModified - a.lastModified);
        const master = masterFiles[0].data;
        quizSettings = ensureSettingsDefaults(Object.assign({}, quizSettings, master.settings || {}));
    }

    // Fragen laden
    questions = [];
    loadedQuestionFiles = [];
    questionFiles.forEach(qf => {
        const fileTheme = qf.data.theme || '';
        const qList = qf.data.questions || [];
        let loaded = 0;
        qList.forEach((q, qi) => {
            try {
                const n = normalizeQuestion(q);
                const isDupe = questions.some(eq =>
                    (n.questionId && eq.questionId === n.questionId) ||
                    (eq.text || '').trim().toLowerCase() === (n.text || '').trim().toLowerCase()
                );
                if (isDupe) return;
                n.id = Date.now() + questions.length + qi;
                n.sourceFile = qf.name;
                // _fileGroup: Frage selbst → Datei-Theme → 'Manuell'
                if (!n._fileGroup) n._fileGroup = fileTheme || 'Manuell';
                questions.push(n);
                loaded++;
            } catch { /* fehlerhafte Frage überspringen */ }
        });
        loadedQuestionFiles.push({ name: qf.name, theme: fileTheme || 'Unbekannt', count: loaded });
    });

    // Spieler laden (neueste Version pro Name)
    users = [];
    loadedPlayerFiles = [];
    const byName = {};
    playerFiles.forEach(pf => {
        if (!pf.data || !pf.data.name) return;
        if (!byName[pf.data.name] || pf.lastModified > byName[pf.data.name].lastModified)
            byName[pf.data.name] = pf;
    });
    Object.values(byName).forEach(pf => {
        users.push(pf.data);
        loadedPlayerFiles.push({ name: pf.name, playerName: pf.data.name });
    });

    dataLoaded = true;
    syncToAppState();

    event.target.value = '';

    Toast.show(`✅ Geladen: ${users.length} Spieler, ${questions.length} Fragen`, 'success');

    // Passwort prüfen → Tabs freischalten (oder direkt wenn leer)
    AdminShell.unlock();
}
