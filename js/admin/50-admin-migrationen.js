// === Admin: Daten-Migrationen ===
// Abgeschlossene Migrationen werden hier dokumentiert.
// Neue Migrationen immer in dieser Datei ergänzen (neuen Eintrag in MIGRATION_HISTORY + Funktion).

const MIGRATION_HISTORY = [
    {
        date:  '2026-10',
        title: 'Legacy-Admin entfernt, Super-Admin gestrichen',
        detail: `Der Komplett-Build <code>z_quiz-system-built.html</code> mit eingebettetem Admin
                 ist entfernt; es gibt nur noch Quiz (<code>z_LeanQuiz.html</code>), Forge und Herald.
                 Die Einstellung <code>superAdminPassword</code> wird beim Laden verworfen
                 (<code>ensureSettingsDefaults</code>) und verschwindet mit dem nächsten Master-Speichern.
                 Keine Änderung an Spieler- oder Fragen-Dateien nötig.`,
    },
    {
        date:  '2026-10',
        title: 'Spieler-Dateien aufräumen: historyArchive',
        detail: `Neues optionales Spieler-Feld <code>historyArchive</code>: Forge → Sicherung → Aufräumen
                 fasst History-Einträge älter als N Tage zu Summen zusammen (Tage, Wochen, Verbesserungen,
                 Comebacks, Marathon-Tage, Burst-Sessions, 3er-Tage, Monats-Summen). Badges und
                 Fähigkeiten rechnen über <code>computeHistoryStats(history, historyArchive)</code>
                 weiter, als wäre die History vollständig. Gekürzt werden außerdem <code>askLog</code>
                 und <code>monthlyStats</code> je Frage (nur die Auswertung liest sie).
                 Spieler ohne Archiv verhalten sich exakt wie vorher. Neue Einstellung
                 <code>compactPlayerFiles</code> (Standard aus). Außerdem: Forge-Master-Speichern
                 behält jetzt die geladene <code>pluginConfig</code> (vorher leer überschrieben),
                 und der Forge-Lade-Pfad setzt <code>isCore</code> wie das Quiz.`,
    },
    {
        date:  '2026-10',
        title: 'Fokus-Quiz: Spieler-Feld focusQuiz + Einstellungsblock',
        detail: `Neues Spieler-Feld <code>focusQuiz</code> (Serie, Bestwert, Prämien-Zähler,
                 Tageszähler, Zeitraum-Schlüssel). Es wird beim Laden in <code>normalizeUser</code>
                 → <code>normalizeFocusState</code> angelegt bzw. auf Zahlentypen gebracht —
                 Altdateien brauchen keine Umschreibung, das Feld erscheint beim nächsten
                 Spieler-Export. Neuer Master-Block <code>settings.focusQuiz</code> wird von
                 <code>ensureSettingsDefaults</code> mit Standardwerten ergänzt.
                 History-Einträge von Fokus-Quizzen tragen <code>focus: true</code>.
                 Das Laufzeit-Flag <code>focusQuizActive</code> ist eine flüchtige Variable
                 und wird nie exportiert.`,
    },
    {
        date:  '2026-10',
        title: 'Timer-Modus entfernt',
        detail: `Der Timer-Modus wurde im Quiz seit langem nicht mehr genutzt und war dort
                 nur noch als Ruine vorhanden: <code>timerModeActive</code> wurde gelesen,
                 aber nie deklariert (Fehler bei jedem Antwort-Klick), und
                 <code>clearAutoAdvance()</code> war dauerhaft wirkungslos.
                 Entfernt wurden der Einstellungsblock in Forge, <code>SETTINGS_DEFAULTS.timer</code>,
                 <code>CONFIG.TIMER</code> und die Reste im Quiz. Ein vorhandener
                 <code>settings.timer</code>-Block wird beim Laden aus der Master-JSON entfernt
                 (<code>ensureSettingsDefaults</code>) und ist nach dem nächsten Speichern weg.
                 <code>CONFIG.TIMER.GHOST_CLEANUP_MONTHS</code> steuerte in Wahrheit den Verfall
                 offener Telefon-Joker und heißt jetzt <code>CONFIG.ABILITIES.JOKER_EXPIRY_MONTHS</code>.`,
    },
    {
        date:  '2026-10',
        title: 'pendingTeamBonus → pendingTeamBonusQuiz',
        detail: `Der Mitspieler-Anteil des Team-Bonus war ein pauschaler XP-Betrag
                 (<code>pendingTeamBonus: 50</code>), obwohl die Fähigkeit "3× XP für dich und
                 einen Mitspieler" verspricht. Neu: <code>pendingTeamBonusQuiz</code> zählt
                 Quizze mit 3× XP und wird beim Quizstart eingelöst.
                 Altbestand wird beim Laden ein letztes Mal als XP ausgezahlt und das alte
                 Feld dann entfernt — beim nächsten Spieler-Export ist es verschwunden.`,
    },
    {
        date:  '2026-10',
        title: 'teamBonusActive-Feld entfernt',
        detail: `Das Flag <code>teamBonusActive</code> (3× XP durch Team-Bonus) wurde nie
                 zurückgesetzt und wanderte dadurch dauerhaft in die Spieler-Dateien — der
                 Multiplikator galt für alle Folge-Quizze. Das Flag wird jetzt am Quizende
                 gelöscht und beim Laden aus Altdateien entfernt (<code>normalizeUser</code>).
                 Beim nächsten Spieler-Export verschwindet es endgültig.`,
    },
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
    {
        date:  '2026-04',
        title: '_fileGroup explizit in Fragen-Dateien geschrieben',
        detail: `Alle Fragen-Dateien wurden über "Gruppen Export" in Forge neu exportiert.
                 Jede Frage trägt seitdem <code>_fileGroup</code> explizit im JSON-Objekt —
                 der Fallback über das datei-weite <code>theme</code>-Feld in
                 <code>file-io</code> entfällt damit. Neue Fragen erhalten <code>_fileGroup</code>
                 immer beim Erstellen (Forge) oder Einreichen (Herald).`,
    },
    {
        date:  '2026-07',
        title: 'Spieler-Schema: Normalisierung beim Load',
        detail: `Alte Spieler-JSONs (frühere App-Versionen) hatten teils weniger Felder oder
                 nutzten den alten History-Feldnamen <code>xpEarned</code> statt <code>xp</code>.
                 Beim Ordner-Load laufen geladene Spieler jetzt durch <code>normalizeUser()</code>
                 (<code>30-globals.js</code>): fehlende Felder werden auf die
                 <code>createUser</code>-Defaults gesetzt und <code>history[].xpEarned</code> →
                 <code>history[].xp</code> umbenannt. Die Normalisierung ist idempotent und läuft
                 nur im Speicher — die Datei auf der Platte bleibt bis zum nächsten Export des
                 Nutzers unverändert.`,
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
