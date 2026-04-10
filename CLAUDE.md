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

## Spaced-Repetition-Settings (in Master-JSON `spacedRepetition`-Block)

| Setting | Wert | Bedeutung |
|---|---|---|
| `maxCoreFirst` | **7** | Max. Core-Fragen im 1. Quiz des Tages (7 von 10 Slots) |
| `maxCoreSubsequent` | **3** | Max. Core-Fragen in Folge-Quizzen (3 von 10 Slots) |
| `freshQuota` | **50** | 50% der Non-Core-Slots für neue/seltene Fragen reserviert |
| `freshThreshold` | **1** | Frage gilt als "neu" wenn ≤ 1× gestellt |
| `randomness` | **50** | 50% Zufallsanteil (0 = reines SR, 100 = komplett zufällig) |
| `streakThreshold` | **2** | Cooldown nach 2 richtigen in Folge (statt 3) |
| `streakCooldown` | **48** | Cooldown-Dauer in Stunden |

### Simulations-Skript
`tools/simulate.py` — `python3 tools/simulate.py`
Settings oben in `CONFIG` anpassen (müssen identisch mit Master-JSON sein), dann neu starten.

### Simulations-Ergebnisse (100 Runs, 370 Fragen, 80 Core, 65–100% richtig)
- **287 von 290 Normal-Fragen** gestellt (99% — vorher 0% mit maxCore=999)
- Ø Core-Slots/Quiz: **7,0** (1. Quiz) / **3,0** (Folge-Quizze) / **4,16** (gesamt)
- Ø Normal-Slots/Quiz: **3,0** (1. Quiz) / **7,0** (Folge-Quizze) / **5,84** (gesamt)
- SR-Faktor: **7,55×** (schwierige Fragen erscheinen 7,55× häufiger als gut beherrschte)
- freshQuota: 97% der reservierten Slots mit echten Neu-Fragen besetzt
- 68 Fragen am Ende im 48h-Cooldown (streakThreshold=2 erzeugt mehr Rotation)

### Hinweis `freshQuota`
Wert in JSON als **Prozentzahl (0–100)** angeben — der Code teilt intern durch 100.
`freshQuota: 50` = 50% der Non-Core-Slots reserviert.

### Sticky-Question-Problem (analysiert + behoben)

**Problem:** Prioritätsformel `max(5, 100 − ratio × 80)` ist kumulativ — frühere Fehler werden nie vergessen. Selbst nach vielen richtigen Antworten konvergiert die Priorität asymptotisch gegen ~20, erreicht diesen Wert aber nie. Eine einmal falsch beantwortete Frage blieb dauerhaft erhöht.

**Simulation ergab:** Priorität fällt ohne Fix rechnerisch nie dauerhaft unter 20 — unabhängig von der Anzahl der Startfehler.

**Ziel:** Fragen die 2× richtig beantwortet wurden sollen wieder im normalen Pool landen.

**Fix (in `js/10-plugin-classic-quiz.js`, `scoreQuestion`):**
```javascript
if ((s.consecutiveCorrect || 0) >= 1)
    ratio = Math.min(1.0, ratio + (s.consecutiveCorrect || 0) * 0.2);
```
`consecutiveCorrect` hebt die effektive Ratio künstlich an — nach 2 richtigen in Folge (= streakThreshold) landet die Frage im Cooldown (Prio 2) und kehrt danach mit Prio ~36 zurück (normaler Pool). Ein erneuter Fehler setzt `consecutiveCorrect` auf 0 → Prio sofort wieder hoch.

**Prioritäten nach Fix (Beispiel: 3× falsch zu Beginn, streakThreshold=2):**

| Stand | Priorität |
|---|---|
| 3× falsch | 100 |
| +1× richtig (consec=1) | 64 |
| +2× richtig → Cooldown (consec=2) | 2 (48h) |
| Nach Cooldown | ~36 ← normaler Pool |
| Nächste falsch → consec=0 | 73 → sofort wieder hoch |

**Keine Änderung an Master-JSON nötig** — reine Berechnungslogik im Code.

## Scoring-System
- **Qualität** (50%): Gewichteter Ø richtige Antworten mit Zeitverfall (decay 0.99/Tag)
- **Engagement** (50%): `min(QuizIn90Tagen / Ziel, 1) × max(0, 1 − TageSeitletztemQuiz / maxAge) × 100`
  - Ziel (Standard 60 Quiz/90 Tage) = 100% Engagement
  - Zerfall: **linear** −1.1 Punkte/Tag → nach exakt 90 Tagen Inaktivität = 0
  - Kein Raw-Reserve-Problem: Score ist immer direkt = angezeigter Wert
  - Einstellbar in Forge: „Ziel-Quiz/90 Tage" (engDecay-Setting entfernt)
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

### Themen-Kategorien (Dropdown)
- Konfiguration in `js/herald/00-herald-groups.js` — `HERALD_GROUPS`-Array befüllen, dann `python3 build.py`
- **Kein Build verfügbar?** Direkt in `herald.html` editieren: **Ctrl+F → `HERALD_GRUPPEN_EDIT`**
- Leeres Array = Nutzer tippt Thema frei ein (Freitext-Input)
- build.py gibt nach jedem Herald-Build den Hinweis auf das Suchwort aus

### Herald-Quellstruktur
| Datei | Funktion |
|---|---|
| `herald-index.html` | Quell-HTML (ohne inline JS/CSS) |
| `js/herald/00-herald-groups.js` | Themen-Kategorien für Dropdown (Admin konfiguriert) |
| `js/herald/10-herald.js` | Formular, Imagemap-Editor, Drafts-Liste, Download |

## BossFight-Plugin (`js/14-plugin-bossfight.js`)

### DOM-Reset-Muster (kritisch!)
`_victory()` und `_defeat()` ersetzen `bossQuestionCard.innerHTML` vollständig mit dem Endscreen.
Dadurch werden `bossQuestionText` und `bossAnswerArea` aus dem DOM **zerstört**.
`start()` stellt die Original-Struktur deshalb **vor** `nextQuestion()` explizit wieder her:
```javascript
document.getElementById('bossQuestionCard').innerHTML =
    '<div class="boss-question-text" id="bossQuestionText"></div><div id="bossAnswerArea"></div>';
```
**Regel:** Wenn weitere Overlays/Screens im Projekt `.innerHTML =` auf Container-Elemente setzen,
die Kind-IDs enthalten, muss der nächste `start()`/`open()`-Aufruf diese IDs ebenfalls wiederherstellen.

### Boss-Fähigkeiten-Anzeige
- `#bossAbilities` zeigt beim Start **dauerhaft beide Fähigkeiten** als Chips (`.boss-ability-chip`)
- Chip-Name in Boss-Farbe, Beschreibung darunter — bleibt die gesamte Runde sichtbar
- Beim Einsatz: **Puls-Animation** (`.active`-Klasse, 3× Glow in Boss-Farbe, 2,1 Sek.) + `#bossEffectText` zeigt `"[Name] wird eingesetzt!"` bis zur nächsten Frage
- `_showAbilityNotification(ability)` sucht den Chip per `ability.id`-Index (`bossChip0` / `bossChip1`)

## Feedback & Toasts
- **Toast-Dauer:** 8 Sekunden (Standard `TOAST_DURATION_MS` in `js/01-constants.js`) — alle hardcodierten Werte entfernt
- **Ability-Charge-Toast:** bei jeder neu verdienten Ladung erscheint `[Icon] [Name]: +N Ladung(en) verdient!`
- **Freitext-Fragen:** Eingabefeld erhält grünen/roten Hintergrund (`correct`/`incorrect`-Klassen in CSS); darunter immer die richtige Antwort — bei richtig `✓ [Antwort]`, bei falsch `✗ Richtig wäre: [Antwort]`

## Offene Punkte (Scoring)
- **Engagement vs. Qualität Balance:** Häufiges Spielen mit schlechten Ergebnissen schlägt selten-aber-perfekte Spieler (z.B. Eva 35% täglich > Stefan 95% wöchentlich). Aktuell gewollt, langfristig ggf. Mindest-Qualität als Engagement-Multiplikator einführen.

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
- **Lernprojekt-MDs nicht committen:** `FEATURE-ANALYSE.md`, `LEITFADEN.md`, `LERNPLAN-VORGEHEN.md`, `LERNPROJEKT-VORLAGE.md` bleiben unversioniert (gehören zum Lernprojekt, nicht zum Quiz-System)
