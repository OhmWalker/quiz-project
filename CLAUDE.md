# Quiz-Project — Claude Code Kontext

## Projekt-Überblick
- Quiz-System v4.0, Single-Page-App (HTML/CSS/JS)
- Modulare Plugin-Architektur: ~25 JS-Dateien, 4 CSS-Dateien
- Build: `python3 build.py` → vier Dateien (Präfix `z_` damit sie in GitHub-Listings ganz unten stehen):
  - `z_quiz-system-built.html` (~610 KB) — das Quiz + eingebetteter Admin-Bereich (Legacy)
  - `z_forge.html` (~332 KB) — Admin-/Wartungs-Tool (Standalone)
  - `z_herald.html` (~133 KB) — Fragen-Einreichungs-Tool (für Nutzer)
  - `z_LeanQuiz.html` (~336 KB) — Quiz-only, kein Admin (Quelle: `lean-index.html`)
- Langfristig: `z_quiz-system-built.html` wird durch `z_forge.html` + `z_LeanQuiz.html` ersetzt

## Architektur
- Plugins kommunizieren über `EventBus` (Events: USER_SELECTED, QUIZ_STARTED, QUIZ_QUESTION, QUIZ_COMPLETED)
- Globale Variablen: `currentUser`, `users`, `currentQuizQuestions`, `quizSettings`
- Wichtige Plugins: ClassicQuizPlugin, AbilityPlugin, BadgePlugin, LeaderboardPlugin, Fragen2Plugin
- Plugin-Registrierung in `js/20-plugin-usermanagement.js`
- Settings in `js/30-globals.js`, File-IO in `js/32-file-io.js`

## Fragen-Verwaltung (Fragen2Plugin)
- Datei: `js/19-plugin-fragen2.js`
- Enthält: Fragen-CRUD, Imagemap-Editor, Import/Export, Batch-Aktionen
- Geometrie-Funktionen (checkImagemapHit, pointInPolygon etc.) in `js/15-imagemap-geometry.js` (Lean-kritisch)
- Globale Wrapper in `js/40-init-and-functions.js` leiten an Fragen2Plugin weiter
- Gruppen-Dropdown hat "Neue Gruppe..."-Option (value `__new__`)
- Neue Gruppennamen werden validiert: mind. 2 Buchstaben, sonst Toast-Fehler
- Batch-Aktionen (Aktivieren/Deaktivieren/Export) arbeiten mit **ID-Präfix** (z.B. `allg`, `core`)

## Fragen-ID-System

### Stand (vollständig migriert, 2026-04)
- Alle Fragen haben stabile IDs `prefix_NNNNN` (z.B. `allg_00042`, `core_00007`)
- Alle Fragen-Dateien wurden 2026-04 neu exportiert — jede Frage trägt `_fileGroup` explizit
- Alle Spieler-`questionStats`-Keys sind auf stabile IDs umgeschrieben
- Hash-IDs (`Q_xxxxxxxx`), Legacy-Feldnamen (`frage`, `antworten`, `richtig`) und `_contentHash` existieren nicht mehr im System

### ID-Format
- Präfix = erste 4 Buchstaben des `_fileGroup`-Namens, lowercase, nur a-z (Umlaute → ae/oe/ue)
- Falls Gruppenname < 4 Buchstaben: alle verwenden
- Nummer = 5-stellig nullgepaddert, fortlaufend pro Präfix
- Beispiele: "Core" → `core_00001`, "Allgemeinwissen" → `allg_00042`, "BWL" → `bwl_00003`

### Relevante Funktionen
- `getGroupPrefix(groupName)` (`js/30-globals.js`) → 4-Buchstaben-Präfix
- `assignStableId(group, allQuestions)` (`js/30-globals.js`) → nächste freie ID
- `hasStableId(id)` (`js/30-globals.js`) → prüft ob ID stabil (nicht `Q_`, nicht rein numerisch)

### Verhalten bei Fragen-Bearbeitung (`js/19-plugin-fragen2.js`)
- Inhalt ändert sich → ID bleibt unverändert
- Gruppe wechselt → neue stabile ID mit neuem Präfix wird automatisch vergeben
- Admin kann ID manuell überschreiben (Feld im Edit-Formular) — hat immer Vorrang

### `normalizeQuestion` (`js/30-globals.js`)
- Gibt vollständiges kanonisches Fragen-Objekt zurück
- **`_fileGroup` muss VOR dem Aufruf auf `q` gesetzt sein** — wird für `assignStableId()` benötigt
- Kein `id`-Feld, kein `_contentHash` — `questionId` ist der einzige Schlüssel

### MC-Fragen: `correctMode` (2026-04)
- `correctMode: 'any'` auf der Frage → eine der als `correct: true` markierten Antworten reicht
- Kein `correctMode` oder `'all'` → heutiges Verhalten (alle richtigen müssen ausgewählt werden)
- `correctMode` wird **nur gesetzt wenn `'any'`** — nie als `'all'` gespeichert (kein Rauschen in JSONs)
- UI: `'any'` rendert Radio-Buttons + Hinweis "☝ Eine richtige Antwort reicht"; Feedback markiert alle richtigen Antworten grün
- Forge: Checkbox "ODER-Wertung" unter den Antworten im MC-Edit-Formular

### Abgeschlossene Migrationen (dokumentiert in Forge → "Migrationen")
- `abilities.used`-Feld entfernt (2026-04)
- `questionStats`-Keys: Hash-IDs → stabile IDs (2026-04)
- `questionStats`-Feldnamen: `timesAnswered/timesCorrect` → `asked/correct` (2026-04)
- Fragen-IDs: `Q_xxxxxxxx` → `prefix_NNNNN` (2026-04)
- `_fileGroup` explizit in alle Fragen-Dateien geschrieben via Gruppen-Export (2026-04)

Zukünftige Migrationen: immer in `js/admin/50-admin-migrationen.js` als neuen Eintrag in `MIGRATION_HISTORY` ergänzen.

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
| `maxPerGroup` | **3** | Max. Non-Core-Fragen pro `_fileGroup` pro Quiz; `0` = deaktiviert |
| `freshQuota` | **50** | 50% der Non-Core-Slots für neue/seltene Fragen reserviert |
| `freshThreshold` | **1** | Frage gilt als "neu" wenn ≤ 1× gestellt |
| `randomness` | **30** | 30% Zufallsanteil (0 = reines SR, 100 = komplett zufällig) |
| `streakThreshold` | **2** | Cooldown nach 2 richtigen in Folge |
| `streakCooldown` | **48** | Cooldown-Dauer in Stunden |

**Hinweis `maxPerGroup`:** Gilt nur für Non-Core-Fragen. Wenn nach dem Cap Slots fehlen, werden Ersatzfragen aus anderen Gruppen mit freiem Budget nachgezogen (SR-gewichtet, ohne Cooldown-Fragen).

**Hinweis `freshQuota`:** Wert in JSON als **Prozentzahl (0–100)** angeben — der Code teilt intern durch 100.

### SR-Implementierung (`js/10-plugin-classic-quiz.js`)

**Scoring:** `max(5, 100 − ratio × 80) + random × randomness`
- Fragen ohne Stats: Prio 95, nie gestellt: Prio 90
- `consecutiveCorrect` boost: ratio wird künstlich erhöht (`+ consecutiveCorrect × 0.2`) → nach streakThreshold landen Fragen im Cooldown (Prio 2) und kehren mit ~36 zurück

**Cooldown:** `_statInCooldown(s, cooldownMs, threshold)` — gemeinsame Hilfsfunktion für Auswahl und Stats-Update. Reset nach Cooldown-Ablauf verhindert Endlosschleife (Frage pendelt sonst: Cooldown → 1× richtig → sofort Cooldown).

**Selektion:** `nonCoreQ` wird einmalig vorscored (`nonCoreScoredAll`) — `pickNC(predicate, n)` filtert daraus. Stellt sicher dass Fill-Fragen beim `maxPerGroup`-Cap dieselben Scores verwenden wie die ursprüngliche Auswahl.

**Beim Folder-Load** (`js/32-file-io.js`): `consecutiveCorrect` wird zurückgesetzt wenn Cooldown seit `lastAsked` bereits abgelaufen ist (schützt vor eingefrorenen Fragen aus alten JSONs).

### SR-Fallback-Defaults (`js/30-globals.js`)
Defaults greifen wenn kein `spacedRepetition`-Block in der Master-JSON:
`streakThreshold: 2, randomness: 30, freshQuota: 50, maxCoreFirst: 7, maxCoreSubsequent: 3, maxPerGroup: 3`

### SR-Abweichungs-Toast (`js/32-file-io.js`)
Nach jedem Master-JSON-Load werden die geladenen SR-Werte mit `SR_EXPECTED` verglichen. Bei Abweichung erscheint nach 1,5 Sekunden ein Toast:
> ⚠ SR-Einstellungen weichen ab: `streakThreshold=3 (erwartet: 2)`

### Simulations-Ergebnisse (100 Runs, 380 Fragen, 80 Core, random=30)
- **261 von 300 Normal-Fragen** gestellt (87%), SR-Faktor: **7,1×**
- Cluster-Indikator: **2,08** Ø gleiche Fragen in aufeinanderfolgenden Quizzen
- `python3 tools/simulate.py` / `python3 tools/simulate.py --szenarien`

## Scoring-System
- **Qualität** (50%): Gewichteter Ø richtige Antworten mit Zeitverfall (decay 0.99/Tag)
- **Engagement** (50%): `min(QuizIn90Tagen / Ziel, 1) × max(0, 1 − TageSeitletztemQuiz / maxAge) × 100`
  - Ziel (Standard 60 Quiz/90 Tage) = 100% Engagement
  - Zerfall: **linear** −1.1 Punkte/Tag → nach exakt 90 Tagen Inaktivität = 0
  - Einstellbar in Forge: „Ziel-Quiz/90 Tage"
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
- Neue Charges nur wenn `floor(stat/earnPer) > chargesEarned[key]`

## Badge-System
- `calculateBadgeStats` nutzt `q.questionId` für groupsPlayed
- Ability-Badge-Stats: `ab_fiftyFifty`, `ab_skip`, etc. aus `badgeStats.abilitiesUsed`
- **Emoji-Rendering-Bug (2026-04, gefixt):** `.badge-sidebar-section` hatte `color: rgba(255,255,255,0.4)` — dieses semi-transparente Weiß wurde von `.badge-item` geerbt und ließ Emojis in Chromium milchig/ausgewaschen erscheinen. Fix: `color: white` explizit auf `.badge-item` setzen. Merkrege: Immer `color` auf Emoji-Containern explizit setzen, nie von halbtransparenten Eltern-Elementen erben lassen.

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

### Phone-Joker: Phasen-Reihenfolge beim Folder-Load (`js/32-file-io.js`)
Kritisch: Phase 2 (Quittungen aufräumen) muss **vor** Phase 3 (sentPhoneJokers bereinigen + pending neu erzeugen) laufen.
- **Bug bei falscher Reihenfolge:** Phase 3 entfernt A's resolved sentEntry → Phase 2 findet B's Quittung nicht mehr → Phase 2 erstellt Joker neu → B muss Joker erneut beantworten
- **Spieler-Dialog:** 2-Spalten-Grid (`grid-template-columns: 1fr 1fr`), `max-height: 300px`, scrollbar

### abilities{}-Struktur (pro Key)
`{ charges: number, unlocked: boolean }`

### questionStats{}-Struktur (pro questionId)
`{ _q: string, asked: number, correct: number, consecutiveCorrect: number, lastAsked: ISO-string }`
- `_q`: Fragetext-Ausschnitt (max. 60 Zeichen, kein HTML) — wird nur beim ersten Anlegen gesetzt, danach nicht mehr aktualisiert

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
| Tab | Datei | Funktion |
|---|---|---|
| Datei | `20-admin-datei.js` | Ordner laden (Master-JSON + Spieler-JSONs) |
| Fragen | `25-forge-fragen.js` | Fragen erstellen/bearbeiten (MC, Text, Bildklick) + Export + **📥 Import**; Klick auf Zeile klappt Inline-Edit auf; ID editierbar mit Duplikat-Prüfung; **Suchfeld** filtert alle Gruppen live |
| Nutzer | `30-admin-nutzer.js` | Umbenennen, Übersicht, sortierbar; **Bug (gefixt 2026-04):** Sort muss `adminPanel_nutzer` verwenden, nicht `adminContent` — sonst werden alle anderen Panels zerstört |
| Einstellungen | `40-admin-einstellungen.js` | earnPer/earnStat für Fähigkeiten |
| Badges | `42-admin-badges.js` | Badges aktivieren/deaktivieren, Icon anpassen; speichert in `quizSettings.badges` (Overrides auf `BadgePlugin.DEFAULT_BADGES`) |
| *(Trennlinie)* | `45-admin-separator.js` | `AdminShell.registerSeparator()` |
| Migrationen | `50-admin-migrationen.js` | Abgeschlossene Migrationen dokumentiert; neue Migrationen hier ergänzen |
| Einreichungen | `65-forge-einreichungen.js` | Herald-Einreichungen prüfen: annehmen (→ stabile ID + questions[]) oder ablehnen |

### Fragen-Suchfunktion (`js/admin/25-forge-fragen.js`)
- State: `_fqSearchTerm` — persistiert beim Tab-Wechsel
- Suche über: Fragetext, Antworttext (MC + Freitext), Fragen-ID
- Gruppen ohne Treffer ausgeblendet; Gruppen mit Treffern automatisch aufgeklappt
- Gruppen-Header zeigt `Treffer / Gesamt` (z.B. `3 / 200`) während Suche aktiv

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

### Herald-Quellstruktur
| Datei | Funktion |
|---|---|
| `herald-index.html` | Quell-HTML (ohne inline JS/CSS) |
| `js/herald/00-herald-groups.js` | Themen-Kategorien für Dropdown |
| `js/herald/10-herald.js` | Formular, Imagemap-Editor, Drafts-Liste, Download |

## BossFight-Plugin (`js/14-plugin-bossfight.js`)

### DOM-Reset-Muster (kritisch!)
`_victory()` und `_defeat()` ersetzen `bossQuestionCard.innerHTML` vollständig.
Dadurch werden `bossQuestionText` und `bossAnswerArea` aus dem DOM **zerstört**.
`start()` stellt die Original-Struktur deshalb **vor** `nextQuestion()` explizit wieder her:
```javascript
document.getElementById('bossQuestionCard').innerHTML =
    '<div class="boss-question-text" id="bossQuestionText"></div><div id="bossAnswerArea"></div>';
```
**Regel:** Wenn `.innerHTML =` auf Container-Elemente mit Kind-IDs gesetzt wird, muss der nächste `start()`-Aufruf diese IDs wiederherstellen.

### Fragen-Pool
- `getBossQuestions()` filtert: nur MC-Fragen, aktiv, **kein `media`-Feld**

### Boss-Fähigkeiten-Anzeige
- `#bossAbilities` zeigt beim Start **dauerhaft beide Fähigkeiten** als Chips
- Beim Einsatz: Puls-Animation (`.active`-Klasse, 2,1 Sek.) + `#bossEffectText`
- `_showAbilityNotification(ability)` sucht Chip per Index (`bossChip0` / `bossChip1`)

## Mini-Game-Kette nach Quiz (`js/10-plugin-classic-quiz.js`)
- Reihenfolge: Glücksrad → Boss-Fight → Export-Button-Fokus
- **Race Condition (gefixt 2026-04):** Export-Button darf erst fokussiert werden wenn die Mini-Game-Kette abgeschlossen ist — sonst kann Enter den Download auslösen bevor Rad/Boss ihre XP gutgeschrieben haben
- Fokus-Punkte: Ende von `_checkBossTrigger()` (kein Mini-Game) + `BossFightPlugin.close()` (nach Boss)
- Rad-XP und Boss-XP werden in `currentUser` geschrieben; der Export liest `currentUser` → Reihenfolge ist korrekt wenn Fokus erst nach Kette kommt

## Feedback & Toasts
- **Toast-Dauer:** 8 Sekunden (`TOAST_DURATION_MS` in `js/01-constants.js`)
- **Ability-Charge-Toast:** bei jeder neu verdienten Ladung: `[Icon] [Name]: +N Ladung(en) verdient!`
- **Freitext-Fragen:** Eingabefeld erhält grünen/roten Hintergrund; darunter immer die richtige Antwort

## Offene Punkte
- **Engagement vs. Qualität Balance:** Häufiges Spielen mit schlechten Ergebnissen schlägt selten-aber-perfekte Spieler. Aktuell gewollt, langfristig ggf. Mindest-Qualität als Engagement-Multiplikator.
- **SR-Bug-4-Reset** (`js/32-file-io.js`): Läuft beim Folder-Load für alle User. Nach ~3 Monaten entfernen wenn alle alten JSONs einmal geladen wurden.

## Entfernte Settings / Funktionen (nicht mehr im Code)
- **`corePercent`** (2026-04): Slider hatte nie Wirkung — Core-Steuerung läuft über `maxCoreFirst`/`maxCoreSubsequent`
- **`generateQuestionHash()` + `hashString()`** (2026-04): Hash-IDs durch stabile IDs ersetzt
- **`_contentHash`** auf Fragen (2026-04): War für Import-Duplikat-Erkennung, wird nirgends gelesen
- **Legacy-Feldnamen** `frage`, `antworten`, `richtig`, `antwort`, `typ` (2026-04): Alle Fragen im kanonischen Format
- **Watermark-Migrations-Block** in AbilityPlugin (2026-04): `used`-Feld und Migration entfernt
- **`migrateUserQuestionStats()`** (2026-04): Konvertierung alter Feldnamen entfernt

## Workflow-Präferenzen
- Nach CSS/JS-Änderung immer `python3 build.py` ausführen
- Browser-Cache: `Ctrl + Shift + R` nach Build
- Git: SSH-Zugang, E-Mail: `OhmWalker@users.noreply.github.com`
- Commit-Messages auf Deutsch
- **Lernprojekt-MDs nicht committen:** `FEATURE-ANALYSE.md`, `LEITFADEN.md`, `LERNPLAN-VORGEHEN.md`, `LERNPROJEKT-VORLAGE.md`
