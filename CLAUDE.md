# Quiz-Project — Claude Code Kontext

## Projekt-Überblick
- Quiz-System v4.0, Single-Page-App (HTML/CSS/JS)
- Modulare Plugin-Architektur: ~20 JS-Dateien, 4 CSS-Dateien
- Build: `python3 build.py` → drei Dateien:
  - `quiz-system-built.html` (~605 KB) — das Quiz
  - `forge.html` (~279 KB) — Admin-/Wartungs-Tool
  - `herald.html` (~127 KB) — Fragen-Einreichungs-Tool (für Nutzer)
- Referenz-Datei: `01_quiz-Referenz.html` (alte monolithische Version)

## Architektur
- Plugins kommunizieren über `EventBus` (Events: USER_SELECTED, QUIZ_STARTED, QUIZ_QUESTION, QUIZ_COMPLETED)
- Globale Variablen: `currentUser`, `users`, `currentQuizQuestions`, `quizSettings`
- Wichtige Plugins: ClassicQuizPlugin, AbilityPlugin, BadgePlugin, LeaderboardPlugin, Fragen2Plugin
- Plugin-Registrierung in `js/20-plugin-usermanagement.js`
- Settings in `js/30-globals.js`, File-IO in `js/32-file-io.js`

## Fragen-Verwaltung (Fragen2Plugin)
- Datei: `js/19-plugin-fragen2.js` (~1490 Zeilen)
- Enthält: Fragen-CRUD, Imagemap-Editor, Import/Export, Batch-Aktionen
- Geometrie-Funktionen (checkImagemapHit, pointInPolygon etc.) in Fragen2Plugin
- Globale Wrapper in `js/40-init-and-functions.js` leiten an Fragen2Plugin weiter
- Gruppen-Dropdown hat "Neue Gruppe..."-Option (value `__new__`)
- Batch-Aktionen (Aktivieren/Deaktivieren/Export) arbeiten mit **ID-Präfix** (z.B. `allg`, `core`) — nicht mehr mit Nummern-Bereichen

## Fragen-ID-System (stabil, seit 2026-03)

### Aktueller Stand (gemischt — Migration noch ausstehend)
- **Neue Fragen** (ab jetzt): stabile ID `prefix_NNNNN` (z.B. `allg_00042`, `core_00007`)
- **Bestehende Fragen** (380 Stück): noch Hash-IDs `Q_xxxxxxxx` — warten auf einmalige Migration
- Die Migration wird über **Forge** (`forge.html` → Tab "ID-Migration") ausgelöst, nicht automatisch

### ID-Format
- Präfix = erste 4 Buchstaben des `_fileGroup`-Namens, lowercase, nur a-z (Umlaute → ae/oe/ue)
- Falls Gruppenname < 4 Buchstaben: alle verwenden
- Nummer = 5-stellig nullgepaddert, fortlaufend pro Präfix
- Beispiele: "Core" → `core_00001`, "Allgemeinwissen" → `allg_00042`, "BWL" → `bwl_00003`

### Relevante Funktionen (`js/20-plugin-usermanagement.js`)
- `getGroupPrefix(groupName)` → 4-Buchstaben-Präfix
- `assignStableId(group, allQuestions)` → nächste freie ID für diese Gruppe
- `hasStableId(id)` (`js/30-globals.js`) → prüft ob ID bereits stabil (nicht `Q_`, nicht rein numerisch)

### Verhalten bei Fragen-Bearbeitung (`js/19-plugin-fragen2.js`)
- Inhalt ändert sich → ID bleibt unverändert
- Gruppe wechselt → neue stabile ID mit neuem Präfix wird automatisch vergeben
- Admin kann ID manuell überschreiben (Feld im Edit-Formular) — hat immer Vorrang

### `_contentHash`-Feld auf Fragen
- Jede Frage hat `_contentHash: "Q_xxxxxxxx"` — der alte Hash, jetzt nur noch für Import-Duplikat-Erkennung
- Wird in `normalizeQuestion` gesetzt, nie als primäre ID verwendet

### Migration Hash → stabile ID (noch durchzuführen)
**Voraussetzung:** Alle Fragen haben korrekte `_fileGroup`-Zuordnung.

**Was die Migration tut:**
1. Jede Frage mit `Q_...`-ID bekommt neue stabile ID basierend auf `_fileGroup`
2. Mapping `Q_alt → prefix_neu` wird aufgebaut
3. Alle User-`questionStats`-Keys werden umgeschrieben (alte Hash-Keys → neue stabile Keys)
4. Einmalig, irreversibel

**Tool:** Forge (`forge.html`) → Tab "ID-Migration"
- Lädt Master-JSON + Player-JSONs per Ordner-Import
- Zeigt Analyse: Hash-IDs vs. stabile IDs, Nutzer-Stats-Zustand
- Führt Migration aus und lädt betroffene Spieler-Dateien herunter

**Nach der Migration:** `_oldQuestionId`-Mechanismus und `buildMigrationMap` können vereinfacht/entfernt werden

## Imagemap-Editor (SVG-basiert)
- **SVG-Overlays** statt div-Elementen (div-Overlays waren unsichtbar — Ursache nie geklärt)
- Click-Handler direkt per `onclick` auf dem `<img>`, kein addEventListener+setTimeout
- SVG: `setAttribute('class', ...)` statt `className` (SVGAnimatedString-Problem)
- Zonen-Zähler wird live in `_imRedraw()` aktualisiert, Zonen löschbar per ✕-Klick

## Scoring-System
- **Qualität** (50%): Gewichteter Ø richtige Antworten mit Zeitverfall (decay 0.99/Tag)
- **Engagement** (50%): Decay-Modell — jedes Quiz gibt Boost-Punkte (Standard 5), die täglich um 5% verfallen
- History-Einträge nutzen Feld `score` (nicht `pct`) für Prozent richtig

## Ability-System (earnStat-Modell)

| Ability | earnStat | earnPer | Beschreibung |
|---|---|---|---|
| fiftyFifty | `_fifty50Sessions` | 1 | Burst-Sessions (2+ Quizze/h) |
| skip | `totalQuizzes` | 10 | Alle 10 Quizze = 1 Skip |
| hint | `uniqueQuestions` | 20 | Alle 20 versch. Fragen = 1 Hinweis |
| doubleXP | `perfectQuizzes` | 1 | Jedes 100%-Quiz = 1 Doppel-XP |
| shield | `currentStreak` | 7 | Streak von 7 = 1 Schild |
| secondChance | `currentStreak` | 3 | Streak von 3 = 1 zweite Chance |
| swap | `activeDays3` | 4 | Alle 4 Tage mit 3+ Quizzen = 1 Tausch |
| teamBonus | `_phoneJokerUsed` | 3 | Alle 3 Phone-Joker-Nutzungen = 1 Team-Bonus |
| phoneJoker | `highAverageQuizzes` | 5 | Alle 5 Quizze ≥80% = 1 Telefon |

- `chargesEarned`-Akkumulationsmodell: Watermark verhindert Doppel-Vergabe
- Neue Charges nur wenn `floor(stat/earnPer) > chargesEarned`
- Migration: Wenn chargesEarned leer → Watermark = max(stat-basiert, charges+used)

## Badge-System
- `calculateBadgeStats` nutzt `q.questionId` für groupsPlayed
- Ability-Badge-Stats: `ab_fiftyFifty`, `ab_skip`, etc. aus `badgeStats.abilitiesUsed`

## Sidebar-Rendering
- JS nutzt explizite Display-Werte (`'flex'`/`'block'`/`'none'`)
- CSS: Sidebars bei ≤1200px versteckt (ohne !important), bei ≤1700px an Bildschirmrand

## User-JSON Felder

### Kernfelder
`id`, `name`, `totalXP`, `level`, `quizzesTaken`, `correctAnswers`, `totalAnswers`,
`streak`, `history[]`, `badgeStats{}`, `questionStats{}`, `lastQuizDate`,
`dailyQuizCount`, `abilities{}`, `chargesEarned{}`, `sentPhoneJokers[]`,
`pendingPhoneJoker[]`, `pendingJokerBonus`, `sidebarPositions{}`

- `pendingJokerBonus`: XP-Gutschrift für Phone-Joker-Sender (wird bei nächstem USER_SELECTED via `checkPendingJokers()` ausgezahlt)

### abilities{}-Struktur (pro Key)
`{ charges: number, unlocked: boolean }`

### questionStats{}-Struktur (pro questionId)
`{ _q: string, asked: number, correct: number, consecutiveCorrect: number, lastAsked: ISO-string }`
- `_q`: Fragetext-Ausschnitt (max. 60 Zeichen, kein HTML) — für Lesbarkeit in der JSON, wird bei jeder Beantwortung aktualisiert
- Keys sind aktuell noch Hash-IDs (`Q_...`) bei bestehenden Usern — nach Migration stabile IDs

### questionStats — bereinigte Feldnamen (seit 2026-03)
Alte Felder `timesAnswered`, `timesCorrect`, `streakCooldownUntil` existieren nicht mehr im Code.
`migrateUserQuestionStats()` konvertiert sie beim Laden automatisch → `asked`, `correct`.

### History-Einträge
`{ date, correct, total, xp, score, skipped? }`
- `skipped`: Anzahl übersprungener Fragen (Skip/Phone-Joker) — nur gesetzt wenn > 0
- `total` zählt nur beantwortete Fragen (ohne Skips), Score berechnet sich nur daraus

## Forge (`forge.html`)
- Gebaut via `python3 build.py` — Core-JS + `js/admin/*.js`
- Passwort-geschützt: nach Ordner-Import zeigt `AdminShell.unlock()` Passwort-Modal
- Kein Passwort gesetzt → Enter reicht
- Tab-System via `AdminShell.registerPanel(id, label, icon, renderFn)`
- `renderFn` wird bei **jedem** Tab-Wechsel neu aufgerufen (kein einmaliges Init)

### Forge-Tabs
Reihenfolge in der Nav (von oben nach unten):

| Tab | Datei | Funktion |
|---|---|---|
| Datei | `20-admin-datei.js` | Ordner laden (Master-JSON + Spieler-JSONs) |
| Fragen | `25-forge-fragen.js` | Fragen erstellen/bearbeiten (MC, Text, Bildklick) + Export; Klick auf Zeile klappt Inline-Edit auf; ID editierbar mit Duplikat-Prüfung; 📂-Buttons für Medien-Pfade |
| Nutzer | `30-admin-nutzer.js` | Umbenennen, Übersicht |
| Einstellungen | `40-admin-einstellungen.js` | earnPer/earnStat für Fähigkeiten |
| *(Trennlinie)* | `45-admin-separator.js` | `AdminShell.registerSeparator()` |
| Migrationen | `50-admin-migrationen.js` | `used`-Feld entfernen |
| ID-Migration | `60-forge-id-migration.js` | Hash-IDs → stabile IDs migrieren |
| Einreichungen | `65-forge-einreichungen.js` | Herald-Einreichungen prüfen: annehmen (→ stabile ID + questions[]) oder ablehnen |

## Herald (`herald.html`)
- Gebaut via `python3 build.py` — nur `01-constants.js` + `02-toast-dialog.js` + `js/herald/*.js`
- Kein Passwort, kein Datei-Load — eigenständige Seite für Nutzer
- Unterstützt MC, Freitext und Bildklick (voller Imagemap-Editor)
- Nutzer sammelt Fragen in der Session → Download als `herald-pending_DATUM.json`
- Jede eingereichte Frage trägt: `_pending: true`, `_submittedAt`, optional `_submittedBy`
- `active: false` — verhindert Laden ins Quiz bis Admin annimmt
- Admin lädt JSON in Forge → Tab "Einreichungen" → annehmen/ablehnen
- Bei "Annehmen": `_fmAssignStableId()` vergibt stabile ID, Herald-Felder werden entfernt

### Herald-Quellstruktur
| Datei | Funktion |
|---|---|
| `herald-index.html` | Quell-HTML (ohne inline JS/CSS) |
| `js/herald/10-herald.js` | Formular, Imagemap-Editor, Drafts-Liste, Download |

## Offene Punkte
- **Hash → Stabile ID Migration** ausführen (Forge → "ID-Migration") sobald alle `_fileGroup`-Zuordnungen korrekt sind
- Nach Migration: `buildMigrationMap` + `_oldQuestionId`-Logik vereinfachen
- `used`-Feld in abilities komplett entfernen wenn alle User migriert sind (Forge → "Migrationen")

## Workflow-Präferenzen
- User testet Änderungen erst in der Built-Datei, dann CSS-Quellen anpassen
- Nach CSS/JS-Änderung immer `python3 build.py` ausführen
- Browser-Cache: `Ctrl + Shift + R` nach Build
- Git: SSH-Zugang, E-Mail: `OhmWalker@users.noreply.github.com`
- User spricht Deutsch, Commit-Messages auf Deutsch
