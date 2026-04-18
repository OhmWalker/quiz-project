// === Admin: Daten-Migrationen ===
// Abgeschlossene Migrationen werden hier dokumentiert.
// Neue Migrationen immer in dieser Datei ergänzen (neuen Eintrag in MIGRATION_HISTORY + Funktion).

const MIGRATION_HISTORY = [
    {
        date:  '2026-04',
        title: 'abilities.used-Feld entfernt',
        detail: `Das veraltete Feld <code>used</code> in <code>abilities{}</code> wurde aus allen
                 Spieler-Dateien entfernt. Nachfolger ist <code>chargesEarned{}</code> mit
                 Watermark-Modell zur Vergabe-Kontrolle.`,
    },
    {
        date:  '2026-04',
        title: 'questionStats-Keys: Hash-IDs → stabile IDs',
        detail: `Keys in <code>questionStats{}</code> wurden von alten <code>Q_xxxxxxxx</code>-Hash-IDs
                 auf stabile <code>prefix_NNNNN</code>-IDs umgeschrieben (z.B.
                 <code>Q_a3f7c2d1</code> → <code>allg_00042</code>). Mapping über
                 <code>_contentHash</code> und <code>_oldQuestionId</code> der Fragen.`,
    },
    {
        date:  '2026-04',
        title: 'questionStats-Feldnamen: timesAnswered/timesCorrect → asked/correct',
        detail: `Veraltete Feldnamen <code>timesAnswered</code> und <code>timesCorrect</code> wurden
                 in <code>asked</code> und <code>correct</code> umbenannt.
                 <code>streakCooldownUntil</code> wurde ersatzlos entfernt.`,
    },
    {
        date:  '2026-04',
        title: 'Fragen-IDs: Q_xxxxxxxx → prefix_NNNNN',
        detail: `Alle 380 Fragen wurden von Hash-IDs (<code>Q_xxxxxxxx</code>) auf stabile,
                 gruppenbasierte IDs (<code>prefix_NNNNN</code>) migriert.
                 Präfix = erste 4 Buchstaben des Gruppennamens (Umlaute → ae/oe/ue),
                 Nummer 5-stellig nullgepaddert und pro Gruppe fortlaufend.`,
    },
];

AdminShell.registerPanel('migrationen', 'Migrationen', '🔧', container => {
    const cards = MIGRATION_HISTORY.map(m => `
        <div class="card" style="margin-bottom:12px">
            <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px">
                <span style="font-size:0.78rem;opacity:0.5;white-space:nowrap">${m.date}</span>
                <h3 style="margin:0">${m.title}</h3>
                <span style="margin-left:auto;color:var(--correct);font-size:0.88rem;white-space:nowrap">✓ abgeschlossen</span>
            </div>
            <p class="text-muted" style="margin:0">${m.detail}</p>
        </div>`).join('');

    container.innerHTML = `
        <div class="card" style="background:rgba(0,200,100,0.05);border-color:rgba(0,200,100,0.2);margin-bottom:8px">
            <p class="text-muted" style="margin:0">
                Alle bisherigen Migrationen sind abgeschlossen. Neue Migrationen werden hier
                ergänzt und erscheinen dann mit Status-Anzeige und Ausführen-Button.
            </p>
        </div>
        ${cards}`;
});
