// === Forge: ID-Migration (questionStats: alte IDs → Hash-IDs) ===
// Portiert aus 20-plugin-usermanagement.js + 40-init-and-functions.js

// ── Hilfsfunktionen (nicht in Admin-Core) ────────────────────────────────────

let questionIdMigrationMap = {};

function _fmHashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

function _fmGenerateQuestionHash(question) {
    const text    = (question.text || question.frage || '').toLowerCase().trim();
    const media   = question.media || question.bild || null;
    const mediaFp = media
        ? (media.path ? media.path.toLowerCase().trim() : (media.data ? media.data.slice(0, 80) : ''))
        : '';

    if (question.targets) {
        return 'Q_' + _fmHashString(text + '|' + JSON.stringify(question.targets));
    }

    const textAnswers = getCorrectTextAnswers(question); // in 01-constants.js ✓
    if (textAnswers.length > 0 && (!question.answers || !question.answers[0] || !question.answers[0].text)) {
        const answer = textAnswers.map(a => String(a).toLowerCase().trim()).sort().join('|');
        return 'Q_' + _fmHashString(text + '|' + answer + '|' + mediaFp);
    }

    if (question.answers || question.antworten) {
        const answers = question.answers || question.antworten;
        const answerTexts = answers.map(a =>
            (typeof a === 'string' ? a : (a.text || '')).toLowerCase().trim()
        ).join('|');
        return 'Q_' + _fmHashString(text + '|' + answerTexts + '|' + mediaFp);
    }

    return 'Q_' + _fmHashString(text + '|' + mediaFp);
}

function _fmGetGroupPrefix(groupName) {
    return (groupName || 'manu')
        .replace(/[^a-zA-ZäöüÄÖÜ]/g, '')
        .replace(/ä/gi,'a').replace(/ö/gi,'o').replace(/ü/gi,'u')
        .toLowerCase().slice(0, 4) || 'manu';
}

function _fmAssignStableId(group, allQuestions) {
    const prefix = _fmGetGroupPrefix(group);
    let max = 0;
    (allQuestions || questions).forEach(q => {
        if (q.questionId && q.questionId.startsWith(prefix + '_')) {
            const n = parseInt(q.questionId.split('_')[1], 10);
            if (!isNaN(n) && n > max) max = n;
        }
    });
    return prefix + '_' + String(max + 1).padStart(5, '0');
}

function _fmBuildMigrationMap() {
    questionIdMigrationMap = {};
    questions.forEach(q => {
        if (q._oldQuestionId && q._oldQuestionId !== q.questionId) {
            questionIdMigrationMap[q._oldQuestionId] = q.questionId;
        }
    });
}

function _fmMigrateUserQuestionStats(user) {
    if (!user.questionStats) return false;

    let migrated = false;
    const newStats = {};

    for (const oldId in user.questionStats) {
        if (oldId.startsWith('Q_')) {
            newStats[oldId] = user.questionStats[oldId];
            continue;
        }
        if (questionIdMigrationMap[oldId]) {
            newStats[questionIdMigrationMap[oldId]] = user.questionStats[oldId];
            migrated = true;
        } else {
            newStats[oldId] = user.questionStats[oldId];
        }
    }
    if (migrated) user.questionStats = newStats;

    // Feldnamen-Migration: timesAnswered/timesCorrect → asked/correct
    for (const id in user.questionStats) {
        const s = user.questionStats[id];
        if (s.timesAnswered !== undefined && s.asked === undefined) {
            s.asked   = s.timesAnswered;
            s.correct = s.timesCorrect || 0;
            delete s.timesAnswered;
            delete s.timesCorrect;
            migrated = true;
        }
        if (s.streakCooldownUntil !== undefined) {
            delete s.streakCooldownUntil;
            migrated = true;
        }
    }

    // Orphan-Cleanup: Stats zu gelöschten Fragen entfernen
    if (questions.length > 0) {
        const knownIds = new Set(questions.map(q => q.questionId));
        for (const id in user.questionStats) {
            if (!knownIds.has(id)) {
                delete user.questionStats[id];
                migrated = true;
            }
        }
    }

    return migrated;
}

// ── Analyse ───────────────────────────────────────────────────────────────────

function _fmAnalyse() {
    let hashIdCount = 0, stableIdCount = 0;
    questions.forEach(q => {
        if (q.questionId && q.questionId.startsWith('Q_')) hashIdCount++;
        else stableIdCount++;
    });

    const userRows = users.map(u => {
        const stats   = u.questionStats || {};
        const total   = Object.keys(stats).length;
        const hashKeys   = Object.keys(stats).filter(id => id.startsWith('Q_')).length;
        const stableKeys = total - hashKeys;
        const hasTimesAnswered = Object.values(stats).some(s => s.timesAnswered !== undefined);
        const orphans = questions.length > 0
            ? Object.keys(stats).filter(id => !questions.some(q => q.questionId === id)).length
            : '?';
        const ok = hashKeys === 0 && !hasTimesAnswered && orphans === 0;
        return { name: u.name, total, hashKeys, stableKeys, hasTimesAnswered, orphans, ok };
    });

    return { hashIdCount, stableIdCount, userRows };
}

// ── Panel ─────────────────────────────────────────────────────────────────────

AdminShell.registerPanel('id-migration', 'ID-Migration', '🔑', container => {
    if (!dataLoaded || !users.length) {
        container.innerHTML = `
            <div class="card">
                <p class="text-muted" style="text-align:center;padding:30px 0">
                    Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").
                </p>
            </div>`;
        return;
    }

    _fmBuildMigrationMap();
    const { hashIdCount, stableIdCount, userRows } = _fmAnalyse();
    const mapSize    = Object.keys(questionIdMigrationMap).length;
    const needsMigration = hashIdCount > 0 || userRows.some(r => !r.ok);

    const statusColor = needsMigration ? 'var(--accent)' : 'var(--correct)';
    const statusText  = needsMigration ? '⚠ Migration empfohlen' : '✓ Alles auf aktuellem Stand';

    const userTableRows = userRows.map(r => `
        <tr>
            <td class="td-bold">${r.name}</td>
            <td style="text-align:right">${r.total}</td>
            <td style="text-align:right;color:var(--correct)">${r.stableKeys}</td>
            <td style="text-align:right;color:${r.hashKeys > 0 ? 'var(--accent)' : 'inherit'}">${r.hashKeys}</td>
            <td style="text-align:right;color:${r.hasTimesAnswered ? 'var(--accent)' : 'inherit'}">${r.hasTimesAnswered ? 'ja' : '—'}</td>
            <td style="text-align:right;color:${r.orphans > 0 ? 'var(--incorrect)' : 'inherit'}">${r.orphans}</td>
            <td style="text-align:center">${r.ok ? '✓' : '⚠'}</td>
        </tr>`).join('');

    const mapExamples = mapSize > 0
        ? Object.entries(questionIdMigrationMap).slice(0, 4)
            .map(([o, n]) => `<tr><td class="td-muted">${o}</td><td>→</td><td>${n}</td></tr>`).join('')
          + (mapSize > 4 ? `<tr><td colspan="3" class="td-muted">… und ${mapSize - 4} weitere</td></tr>` : '')
        : '<tr><td colspan="3" class="td-muted">Keine Mappings (keine _oldQuestionId in Fragen)</td></tr>';

    container.innerHTML = `
        <div class="card" style="border-color:${statusColor};background:rgba(0,0,0,0.1)">
            <strong style="color:${statusColor}">${statusText}</strong>
        </div>

        <div class="card">
            <h3 class="section-heading">Fragen</h3>
            <table class="info-table-sm">
                <tr><td class="td-bold">Gesamt</td><td>${questions.length}</td></tr>
                <tr><td class="td-bold" style="color:${hashIdCount > 0 ? 'var(--accent)' : ''}">Hash-IDs (Q_…, zu migrieren)</td>
                    <td style="color:${hashIdCount > 0 ? 'var(--accent)' : ''}">${hashIdCount}</td></tr>
                <tr><td class="td-bold">Stabile IDs (prefix_NNNNN)</td><td style="color:var(--correct)">${stableIdCount}</td></tr>
            </table>

            <h3 class="section-heading mt-15">Migration-Map</h3>
            <table class="info-table-sm">
                <tr><td class="td-bold">Mappings</td><td>${mapSize}</td></tr>
                ${mapExamples}
            </table>
        </div>

        <div class="card">
            <h3 class="section-heading">Nutzer-Statistiken</h3>
            <table class="info-table" style="font-size:0.85rem">
                <thead>
                    <tr style="opacity:0.5;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px">
                        <td>Name</td>
                        <td style="text-align:right">Stats</td>
                        <td style="text-align:right">Stabil</td>
                        <td style="text-align:right">Q_-Keys</td>
                        <td style="text-align:right">timesAnswered</td>
                        <td style="text-align:right">Orphans</td>
                        <td style="text-align:center">OK</td>
                    </tr>
                </thead>
                <tbody>${userTableRows}</tbody>
            </table>
        </div>

        <div class="card">
            <h3 class="section-heading">Migration ausführen</h3>
            <p class="text-muted mb-20">
                Weist allen Fragen mit <code>Q_…</code>-IDs stabile IDs (<code>prefix_NNNNN</code>) zu,
                baut Migration-Map, migriert alle Nutzer-Statistiken (Feldnamen-Fix, Orphan-Cleanup).
                Anschließend werden alle Fragen-JSON-Dateien und betroffene Spieler-Dateien heruntergeladen.
            </p>
            ${needsMigration
                ? `<button class="btn btn-small" onclick="_fmRunMigration()">▶ Migration ausführen</button>`
                : `<p class="text-muted">Keine Migration notwendig.</p>`
            }
        </div>`;
});

// ── Export-Helpers ────────────────────────────────────────────────────────────

function _fmBuildExportQ(q) {
    const out = {
        id:               q.id,
        questionId:       q.questionId,
        displayNumber:    q.displayNumber ?? null,
        text:             q.text,
        type:             q.type,
        active:           q.active !== false,
        media:            q.media || null,
        explanation:      q.explanation || null,
        explanationMedia: q.explanationMedia || null,
        hint:             q.hint || null,
        hintMedia:        q.hintMedia || null,
        _fileGroup:       q._fileGroup || 'Manuell',
    };
    if (q.type === QUESTION_TYPES.TEXT) {
        out.correctAnswer = getCorrectTextAnswers(q);
    } else if (q.type === QUESTION_TYPES.IMAGEMAP) {
        out.targets = q.targets;
    } else {
        out.answers = q.answers;
    }
    return out;
}

function _fmDownloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Migration ausführen ───────────────────────────────────────────────────────

function _fmRunMigration() {
    // 1. Fragen: Q_xxxxxxxx → prefix_NNNNN stabile IDs
    //    In-place-Loop damit _fmAssignStableId sofort die bereits vergebenen IDs sieht
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.questionId && q.questionId.startsWith('Q_')) {
            q._oldQuestionId = q.questionId;
            q.questionId = _fmAssignStableId(q._fileGroup || 'Manuell', questions);
        }
    }

    // 2. Migration-Map aufbauen (_oldQuestionId → neues questionId)
    _fmBuildMigrationMap();

    // 3. Nutzer-Statistiken migrieren + Spieler-Dateien herunterladen
    let migratedUsers = 0;
    users.forEach(u => {
        const changed = _fmMigrateUserQuestionStats(u);
        if (changed) {
            migratedUsers++;
            currentUser = u;
            saveCurrentPlayer();
        }
    });

    // 4. Fragen-JSONs pro Gruppe exportieren
    const byGroup = {};
    questions.forEach(q => {
        const g = q._fileGroup || 'Manuell';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(q);
    });
    const ts = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
    Object.entries(byGroup).forEach(([group, qs]) => {
        const safeName = group.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
        const data = { theme: group, questions: qs.map(_fmBuildExportQ) };
        _fmDownloadFile(JSON.stringify(data, null, 2), `03_questions_${safeName}_${ts}.json`);
    });

    Toast.show(
        `Migration abgeschlossen:\n` +
        `• ${Object.keys(questionIdMigrationMap).length} Fragen-IDs migriert\n` +
        `• ${Object.keys(byGroup).length} Fragen-Datei(en) exportiert\n` +
        `• ${migratedUsers} Spieler-Datei(en) heruntergeladen`,
        'success'
    );

    AdminShell.showPanel('id-migration');
}
