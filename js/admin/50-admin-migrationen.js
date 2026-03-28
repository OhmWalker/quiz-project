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


// Dispatcher für Migration-Buttons
function _migRun(id) {
    if (id === 'remove_used_field') _migRunUsedField();
}
