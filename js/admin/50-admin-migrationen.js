// === Admin: Daten-Migrationen ===
// Offener Punkt aus CLAUDE.md: "used"-Feld in abilities komplett entfernen wenn alle User migriert

AdminShell.registerPanel('migrationen', 'Migrationen', '🔧', container => {
    if (!dataLoaded || !users.length) {
        container.innerHTML = `
            <div class="card">
                <p class="text-muted" style="text-align:center;padding:30px 0">
                    Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").
                </p>
            </div>`;
        return;
    }

    const migrations = [
        {
            id: 'remove_used_field',
            title: '"used"-Feld aus abilities entfernen',
            description: `Das <code>used</code>-Feld in <code>abilities{}</code> ist veraltet und wurde durch
                          <code>chargesEarned{}</code> abgelöst. Diese Migration entfernt <code>used</code>
                          aus allen Spieler-Dateien, die es noch enthalten.`,
            check: _migCheckUsedField,
            run:   _migRunUsedField,
        },
        {
            id: 'migrate_question_stats_ids',
            title: 'questionStats-Keys: Hash-IDs → stabile IDs',
            description: `Prüft ob Spieler in <code>questionStats{}</code> noch alte Hash-Keys (<code>Q_…</code>)
                          haben. Falls ja: Keys werden auf die stabilen IDs (<code>prefix_NNNNN</code>)
                          der geladenen Fragen umgeschrieben. Voraussetzung: Fragen-JSONs müssen geladen sein
                          und alle Fragen bereits stabile IDs haben.`,
            check: _migCheckQuestionStatsIds,
            run:   _migRunQuestionStatsIds,
        },
    ];

    const cards = migrations.map(m => {
        const affected = m.check();
        const statusColor = affected.length > 0 ? 'var(--accent)' : 'var(--correct)';
        const statusText  = affected.length > 0
            ? `${affected.length} Spieler betroffen: ${affected.join(', ')}`
            : 'Alle Spieler bereits migriert ✓';

        return `
            <div class="card" style="margin-bottom:16px">
                <h3 style="margin-bottom:8px">${m.title}</h3>
                <p class="text-muted mb-20">${m.description}</p>
                <div style="padding:8px 12px;border-radius:8px;background:var(--overlay-8);margin-bottom:16px;font-size:0.88rem">
                    <span style="color:${statusColor}">●</span>
                    &nbsp;${statusText}
                </div>
                ${affected.length > 0 ? `
                    <button class="btn btn-small" onclick="_migRun('${m.id}')">
                        ▶ Migration ausführen & Dateien speichern
                    </button>` : ''}
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="card" style="background:rgba(247,184,1,0.06);border-color:rgba(247,184,1,0.25)">
            <p class="text-muted">
                ⚠ Migrationen laden geänderte Spieler-Dateien herunter.
                Diese müssen manuell in den Quiz-Ordner kopiert und die alten Dateien gelöscht werden.
                <strong>Vorher ein Backup anlegen.</strong>
            </p>
        </div>
        ${cards}`;
});


// ── Migration: "used"-Feld entfernen ─────────────────────────────────────────

function _migCheckUsedField() {
    return users
        .filter(u => u.abilities && Object.values(u.abilities).some(ab => 'used' in ab))
        .map(u => u.name);
}

function _migRunUsedField() {
    const affected = users.filter(u =>
        u.abilities && Object.values(u.abilities).some(ab => 'used' in ab)
    );

    if (!affected.length) {
        Toast.show('Keine Spieler mit "used"-Feld gefunden.', 'info');
        return;
    }

    affected.forEach(u => {
        Object.values(u.abilities).forEach(ab => { delete ab.used; });
        currentUser = u;
        saveCurrentPlayer();
    });

    Toast.show(
        `Migration abgeschlossen: ${affected.length} Spieler-Datei(en) heruntergeladen.\n` +
        `Alte Dateien im Ordner bitte manuell ersetzen.`,
        'success'
    );

    // Panel neu rendern (zeigt jetzt "alle migriert")
    AdminShell.showPanel('migrationen');
}


// ── Migration: questionStats Hash-Keys → stabile IDs ─────────────────────────

function _migCheckQuestionStatsIds() {
    return users
        .filter(u => u.questionStats &&
            Object.keys(u.questionStats).some(k => k.startsWith('Q_')))
        .map(u => u.name);
}

function _migRunQuestionStatsIds() {
    const affected = _migCheckQuestionStatsIds();
    if (!affected.length) {
        Toast.show('Keine Spieler mit Hash-IDs in questionStats gefunden.', 'info');
        return;
    }

    // Migration-Map aufbauen: Q_... → prefix_NNNNN (aus geladenen Fragen)
    const map = {};
    questions.forEach(q => {
        if (q._contentHash && q._contentHash.startsWith('Q_') && q.questionId) {
            map[q._contentHash] = q.questionId;
        }
        if (q._oldQuestionId && q._oldQuestionId !== q.questionId) {
            map[q._oldQuestionId] = q.questionId;
        }
    });

    const noMapping = new Set();
    let totalRenamed = 0;

    users.filter(u => affected.includes(u.name)).forEach(u => {
        const oldStats = u.questionStats;
        const newStats = {};
        Object.entries(oldStats).forEach(([key, val]) => {
            if (key.startsWith('Q_')) {
                const newKey = map[key];
                if (newKey) {
                    newStats[newKey] = val;
                    totalRenamed++;
                } else {
                    noMapping.add(key);
                    newStats[key] = val; // unverändert lassen
                }
            } else {
                newStats[key] = val;
            }
        });
        u.questionStats = newStats;
        currentUser = u;
        saveCurrentPlayer();
    });

    let msg = `Migration abgeschlossen: ${affected.length} Spieler, ${totalRenamed} Keys umbenannt.`;
    if (noMapping.size > 0) {
        msg += `\n⚠ ${noMapping.size} Hash-Key(s) ohne Mapping (Frage nicht mehr vorhanden): ${[...noMapping].slice(0, 5).join(', ')}`;
    }
    Toast.show(msg, noMapping.size > 0 ? 'warning' : 'success');
    AdminShell.showPanel('migrationen');
}


// Dispatcher für Migration-Buttons
function _migRun(id) {
    if (id === 'remove_used_field')        _migRunUsedField();
    if (id === 'migrate_question_stats_ids') _migRunQuestionStatsIds();
}
