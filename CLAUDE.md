# Quiz-Project — Claude Code Kontext

## Projekt-Überblick
- Quiz-System v4.0, Single-Page-App (HTML/CSS/JS)
- Modulare Plugin-Architektur: 20 Quiz-JS-Dateien (`js/*.js`), Forge-Tabs in `js/admin/`, 4 CSS-Dateien
- Build: `python3 build.py` → drei Dateien (Präfix `z_` damit sie in GitHub-Listings ganz unten stehen):
  - `z_LeanQuiz.html` (~395 KB) — das Quiz (Quelle: `lean-index.html` + alle `js/*.js`) — läuft auf dem Live-Rechner
  - `z_forge.html` (~475 KB) — Admin-/Wartungs-Tool (Quelle: `forge-index.html` + Core-JS + `js/admin/*`)
  - `z_herald.html` (~140 KB) — Fragen-Einreichungs-Tool (für Nutzer)
- Der frühere Komplett-Build `z_quiz-system-built.html` (Quiz + eingebetteter Legacy-Admin, Quelle `index.html`)
  wurde 2026-10 entfernt — siehe „Entfernte Settings / Funktionen"

## Architektur
- Plugins kommunizieren über `EventBus` (Events: USER_SELECTED, QUIZ_STARTED, QUIZ_QUESTION, QUIZ_COMPLETED)
- Globale Variablen: `currentUser`, `users`, `currentQuizQuestions`, `quizSettings`
- Wichtige Plugins: ClassicQuizPlugin, AbilityPlugin, BadgePlugin, LeaderboardPlugin, FocusQuizPlugin
- Plugin-Registrierung in `js/18-plugin-registration.js` (einzige Stelle)
- Forge registriert **keine** Plugins; es bindet nur Core-JS ein (`ADMIN_CORE_JS` in `build.py`)
- Settings in `js/30-globals.js`, File-IO in `js/32-file-io.js`

## Fragen-Verwaltung (Forge → Fragen, `js/admin/25-forge-fragen.js`)
- Fragen-CRUD (MC, Freitext, Bildklick mit Imagemap-Editor), Import, Export, Live-Suche
- Geometrie-Funktionen (checkImagemapHit, pointInPolygon etc.) in `js/15-imagemap-geometry.js` (Quiz braucht sie)
- Gruppen-Dropdown hat „+ Neue Gruppe…"-Option (value `__new__`)
- **Aktiv/Inaktiv:** Kästchen pro Frage, „alle an"/„alle aus" pro Gruppe, Kopfzeile zeigt `aktiv N/M`
  (ersetzt die früheren Präfix-Batch-Aktionen des Legacy-Editors). Dauerhaft erst nach „↓ Exportieren".
  Kein Panel-Neuaufbau (`_fqShowActiveState`), sonst gingen Eingaben im offenen Formular verloren. Bei aktiver
  Suche wirken die Gruppen-Knöpfe nur auf die Treffer („Treffer an/aus").
- **Export-Dateinamen** (`_fqExportFiles`, auch von der Sicherung genutzt): eine Datei pro Gruppe, Core getrennt.
  Core erkennt der Lader am Namen `/^03_questions_CORE/i` — Core-Gruppen bekommen den Präfix `CORE_`,
  Nicht-Core-Gruppen, deren Name mit „core" beginnt, den Präfix `G_`.
- **`isCore` bei neuen/verschobenen Fragen** (`_fqGroupIsCore`, genutzt von Formular, Import, Einreichungen):
  Der Dateiname hängt an `q.isCore`, darum muss jede Stelle, die eine Frage in eine Gruppe bringt, es setzen.
  Gruppe nur aus Core → Core; nur aus Nicht-Core → Nicht-Core; neue oder gemischte Gruppe → Name `/^core\b/i`.
  Import aus einer `03_questions_CORE…`-Datei ist immer Core.
- **Dieselbe `questionId` in mehreren Dateien** (`mergeLoadedQuestion` in `js/32-file-io.js`, Quiz und Forge):
  die neuere Datei gewinnt, dazu ein Warn-Toast. Bewusst Ersetzen statt Dateien umsortieren — die Lade-Reihenfolge
  bestimmt die IDs von Fragen ohne `questionId`, und eine neue Datei ohne IDs dürfte sonst vergebene IDs belegen.
- **Sicherungs-ZIP:** gleiche Dateinamen bekommen `_2` (`_fsBuildZip`), z.B. „Müller"/„Möller" → beide `MLLER`.

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

### Verhalten bei Fragen-Bearbeitung (Forge)
- ID ist ein Pflichtfeld im Formular; neue Fragen bekommen die nächste freie ID vorgeschlagen
- Inhalt oder Gruppe ändert sich → ID bleibt, Forge zeigt die nächste freie ID der neuen Gruppe als Hinweis
- Duplikat-Prüfung: eine vergebene ID wird abgelehnt (Toast nennt die nächste freie)

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
| `maxCoreFirst` | **6** | Max. Core-Fragen im 1. Quiz des Tages (6 von 10 Slots) |
| `maxCoreSubsequent` | **2** | Max. Core-Fragen in Folge-Quizzen (2 von 10 Slots) |
| `maxPerGroup` | **3** | Max. Non-Core-Fragen pro `_fileGroup` pro Quiz; `0` = deaktiviert |
| `freshQuota` | **50** | 50% der Non-Core-Slots für neue/seltene Fragen reserviert |
| `freshThreshold` | **1** | Frage gilt als "neu" wenn ≤ 1× gestellt |
| `randomness` | **30** | 30% Zufallsanteil (0 = reines SR, 100 = komplett zufällig) |
| `streakThreshold` | **2** | Cooldown nach 2 richtigen in Folge |
| `streakCooldown` | **96** | Cooldown-Dauer in Stunden |

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
`streakThreshold: 2, streakCooldown: 96, randomness: 30, freshQuota: 50, freshThreshold: 1, maxCoreFirst: 6, maxCoreSubsequent: 2`
(Live-Werte seit 2026-10-24; `maxPerGroup` hat keinen Eintrag in `SETTINGS_DEFAULTS`, der Code nimmt dann 3)

### SR-Abweichungs-Toast (`js/32-file-io.js`)
Nach jedem Master-JSON-Load werden die geladenen SR-Werte mit `SR_EXPECTED` verglichen — das ist seit 2026-10 direkt
`SETTINGS_DEFAULTS.spacedRepetition`, also nur eine Stelle ändern. Bei Abweichung erscheint nach 1,5 Sekunden ein Toast:
> ⚠ SR-Einstellungen weichen ab: `streakThreshold=3 (erwartet: 2)`

### Simulations-Ergebnisse (100 Quizze, 380 Fragen, 80 Core, random=30, Cooldown 96 h, Core 6/2 — Stand 2026-10-24)
- **300 von 300 Normal-Fragen** gestellt (100 %), SR-Faktor: **5,0×** (schwächste 25 % Ø 5,9× gestellt, beste 25 % Ø 1,2×)
- Core pro Quiz: 1. Quiz des Tages genau 6, Folge-Quizze genau 2 (Ø 3,2 Core / 6,8 Normal)
- Cluster-Indikator: **2,03** Ø gleiche Fragen in aufeinanderfolgenden Quizzen (Skript warnt ab > 2)
- Fresh-Slots zu 76 % mit neuen Fragen besetzt (Skript meldet „Fresh-Pool erschöpft")
- Zum Vergleich mit den alten Werten 48 h / 7 / 3: 261 von 300 (87 %), SR-Faktor 7,1×, Cluster 2,08 —
  der längere Cooldown verteilt breiter (volle Abdeckung), gewichtet schwache Fragen aber etwas weniger stark
- Fester Zufalls-Startwert im Skript → Läufe sind reproduzierbar. `maxPerGroup` bildet das Skript nicht nach.
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
| hint | `totalAnswers` | 15 | Alle 15 beantworteten Fragen = 1 Hinweis |
| doubleXP | `perfectQuizzes` | 1 | Jedes 100%-Quiz = 1 Doppel-XP |
| shield | `currentStreak` | 7 | Streak von 7 = 1 Schild |
| secondChance | `currentStreak` | 3 | Streak von 3 = 1 zweite Chance |
| swap | `activeDays3` | 4 | Alle 4 Tage mit 3+ Quizzen = 1 Tausch |
| teamBonus | `_phoneJokerUsed` | 3 | Alle 3 Phone-Joker-Nutzungen = 1 Team-Bonus |
| phoneJoker | `highAverageQuizzes` | 5 | Alle 5 Quizze ≥80% = 1 Telefon |

- `chargesEarned`-Akkumulationsmodell: Watermark verhindert Doppel-Vergabe
- Neue Charges nur wenn `floor(stat/earnPer) > chargesEarned[key]`

### Reichweite der Fähigkeiten (`perQuestion` / `passive` in `DEFS`)
| Reichweite | Fähigkeiten | Verhalten |
|---|---|---|
| `perQuestion: true` | fiftyFifty, skip, hint, doubleXP, swap, phoneJoker | Wirkt nur auf die aktuelle Frage. Nach der Antwort gesperrt (`useAbility` bricht ab, Button wird ausgegraut) und beim Frageswechsel zurückgesetzt. |
| `passive: true` | shield, secondChance | Bleibt scharf, bis der Schadensfall eintritt — ggf. über mehrere Fragen bis zum Quizende. Wird in `startQuiz` zurückgesetzt, **nicht** in `displayQuestion`. |
| quizweit | teamBonus | `currentUser.teamBonusActive` gilt für den Rest des Quiz, wird in `showResults`/`abandonQuiz` und in `normalizeUser` gelöscht. |

- Jede Ladung wird in `useAbility` **vor** dem Effekt abgezogen; kann der Effekt nicht
  angewendet werden (falscher Fragetyp, kein Hinweistext, kein Mitspieler, Dialog-Abbruch),
  gibt `_refund(key)` Ladung **und** `badgeStats.abilitiesUsed`-Zähler zurück.
  Der Zähler wird deshalb vor `_applyEffect()` erhöht — sonst ließe sich über
  Dialog-Abbrüche `_phoneJokerUsed` (= earnStat von teamBonus) hochzählen.
- `scope`-Text je Fähigkeit erscheint im Mouse-over; bei shield/secondChance/teamBonus
  zusätzlich als Toast mit 4 Sek. Dauer (`SCOPE_HINT_MS`), weil deren Reichweite
  über die aktuelle Frage hinausgeht.
- Nicht gebrauchter Schutz wird am Quizende gemeldet (`_reportUnusedProtection`) —
  ohne Rückerstattung, aber der Spieler erfährt, wo die Ladung geblieben ist.

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
`pendingPhoneJoker[]`, `pendingJokerBonus`, `pendingTeamBonusQuiz`, `sentTeamBonuses[]`, `receivedTeamBonuses[]`, `sidebarPositions{}`

- `pendingJokerBonus`: XP-Gutschrift für Phone-Joker-Sender (wird bei nächstem USER_SELECTED via `checkPendingJokers()` ausgezahlt)
- `pendingTeamBonusQuiz`: Anzahl Quizze mit 3× XP, die ein Mitspieler per Team-Bonus geschenkt hat. Einlösung in `_redeemPendingTeamBonus()` bei QUIZ_STARTED (nicht beim Auswählen des Spielers — sonst verfällt der Bonus ungenutzt). Abbruch ohne Antwort gibt ihn zurück (`_restoreRedeemedTeamBonus`). Ersetzt das alte Pauschal-Feld `pendingTeamBonus` (+50 XP).
- `sentTeamBonuses` / `receivedTeamBonuses`: Quittung `{ id, targetName, date }` beim Sender und zugestellte IDs beim Empfänger, siehe unten.
- `focusQuiz`: Fokus-Quiz-Stand, siehe Abschnitt „Fokus-Quiz". Struktur:
  `{ streak, bestStreak, completions, playedToday, lastPlayed, lastDate, periodKey, rewardedPeriod }`
  — angelegt/koersiert in `normalizeFocusState()` (`js/30-globals.js`), aufgerufen aus `normalizeUser`

### Phone-Joker: Phasen-Reihenfolge beim Folder-Load (`js/32-file-io.js`)
Kritisch: Phase 2 (Quittungen aufräumen) muss **vor** Phase 3 (sentPhoneJokers bereinigen + pending neu erzeugen) laufen.
- **Bug bei falscher Reihenfolge:** Phase 3 entfernt A's resolved sentEntry → Phase 2 findet B's Quittung nicht mehr → Phase 2 erstellt Joker neu → B muss Joker erneut beantworten
- **Spieler-Dialog:** 2-Spalten-Grid (`grid-template-columns: 1fr 1fr`), `max-height: 300px`, scrollbar

### Team-Bonus: Zustellung beim Folder-Load (`_syncTeamBonuses`, `js/32-file-io.js`, 2026-11)
Nach dem Quiz wird nur die Datei des Senders gespeichert (Nutzer-Entscheidung: keine zweite Datei). Darum Quittung
statt direkter Übergabe; die geladenen **Datei-Stände** entscheiden:
- Empfänger-Datei nennt die ID nicht → zustellen (`pendingTeamBonusQuiz + 1`), Quittung **bleibt**, bis die Empfänger-Datei
  die ID belegt — sonst ginge der Bonus verloren, wenn der Sender speichert, der Empfänger aber nicht.
- Empfänger-Datei nennt die ID → Quittung entfernen. Die ID beim Empfänger bleibt, solange eine geladene Sender-Datei sie
  noch nennt — sonst käme der Bonus aus einer noch nicht neu gespeicherten Sender-Datei doppelt.
- Offene Quittungen verfallen nach `JOKER_EXPIRY_MONTHS`.

### abilities{}-Struktur (pro Key)
`{ charges: number, unlocked: boolean }`

### questionStats{}-Struktur (pro questionId)
`{ _q: string, asked: number, correct: number, consecutiveCorrect: number, lastAsked: ISO-string }`
- `_q`: Fragetext-Ausschnitt (max. 60 Zeichen, kein HTML) — wird nur beim ersten Anlegen gesetzt, danach nicht mehr aktualisiert

### History-Einträge
`{ date, correct, total, xp, score, skipped?, groups, focus? }`
- `skipped`: Anzahl übersprungener Fragen (Skip/Phone-Joker) — nur gesetzt wenn > 0
- `total` zählt nur beantwortete Fragen (ohne Skips), Score berechnet sich nur daraus
- `focus`: `true` bei Fokus-Quizzen — nur gesetzt wenn Fokus-Quiz

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
| Nutzer | `30-admin-nutzer.js` | Anlegen, Umbenennen, ♻ Statistik zurücksetzen (Lernstand + Quiz-/Antwort-Zähler, lädt neue Datei), 🗑 Entfernen (aus den geladenen Daten — Dateien im Ordner von Hand löschen), Einzel-/Sammel-Export, sortierbar; **Bug (gefixt 2026-04):** Sort muss `adminPanel_nutzer` verwenden, nicht `adminContent` — sonst werden alle anderen Panels zerstört |
| Sicherung | `22-forge-sicherung.js` | **Sicherung** als ein ZIP (Master + Fragen je Gruppe + aktuelle Spieler-Dateien) und **Spieler-Dateien aufräumen** (siehe unten) |
| Fokus-Quiz | `35-forge-fokus.js` | Einstellungen, Rotationsplan (↑/↓, Woche/Monat), Vorschau der nächsten Zeiträume |
| Einstellungen | `40-admin-einstellungen.js` | Allgemein, Bild, SR, XP, Bestenliste, **Glücksrad**, BossFight, Avatare, Passwort, earnPer der Fähigkeiten. Glücksrad/BossFight an/aus wird zusätzlich in die `pluginConfig` geschrieben (`_forgeSyncPluginEnabled`) |
| Badges | `42-admin-badges.js` | Badges aktivieren/deaktivieren, Icon anpassen; speichert in `quizSettings.badges` (Overrides auf `BadgePlugin.DEFAULT_BADGES`) |
| *(Trennlinie)* | `45-admin-separator.js` | `AdminShell.registerSeparator()` |
| Migrationen | `50-admin-migrationen.js` | Abgeschlossene Migrationen dokumentiert; neue Migrationen hier ergänzen |
| Auswertung | `55-admin-auswertung.js` | Nutzer-Detail, Fragen, Gruppen, **Fokus-Quiz** (siehe unten) |
| Einreichungen | `65-forge-einreichungen.js` | Herald-Einreichungen prüfen: annehmen (→ stabile ID + questions[]) oder ablehnen |

### Auswertung (`js/admin/55-admin-auswertung.js`, Stand 2026-11)
- **Rohdaten:** Forge normalisiert Spieler nicht. Immer über `_avHistory` (Kopie, chronologisch, nur gültige Daten),
  `_avArchive`/`_avArchiveMonths` und `_avFocusState` lesen — sie vertragen fehlende Felder und verändern nichts.
  `normalizeFocusState` hier **nicht** aufrufen, es schreibt auf den Spieler.
- **Aufgeräumte Spieler:** Hinweis „History gekürzt bis TT.MM.JJJJ" oben in der Nutzer-Ansicht. Lernkurve und XP-Treppe
  zeigen `historyArchive.months` als Vorlauf (Quadrate, Trennlinie; ein Punkt je Monat, also andere Zeitachse als rechts
  davon). Der Kalender rahmt archivierte Tage gestrichelt, weil es keine Tageswerte gibt. Monats-Trend, Rückkehr-Diagnose
  und Gruppen-Trend tragen nur einen Hinweis.
- **Fokus-Quizze:** Raute in Lernkurve/XP-Treppe, blauer Rahmen im Kalender (nie Farbe allein). Ansicht „🎯 Fokus-Quiz":
  Überblick, Spieler-Tabelle, Erfolgsquote je Gruppe. Erfolg rechnet wie das Plugin (übersprungen = nicht richtig), aber mit
  der **aktuellen** `successPct`. Abgebrochene Versuche stehen nicht in der History, archivierte Monate kennen kein Fokus-Quiz.
- **`history[].groups` nutzt Gruppennamen**, die Ansichten ID-Präfixe — im Gruppen-Trend über `getGroupPrefix` umrechnen.

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

## Fokus-Quiz (`js/13-plugin-focus-quiz.js`, 2026-10)
Zusatz-Quiz aus **einer** Nicht-Core-Gruppe, freigeschaltet nach dem ersten normalen Quiz des Tages
(`lastQuizDate === heute && dailyQuizCount >= 1`). Kreis `#focusQuizBtn` mit Fadenkreuz-SVG oben rechts neben
der Siegertreppe (in `#leaderboardWrap`, index.html + lean-index.html), 168px wie die Podium-Avatare; darunter
Gruppe + Multiplikator + Serie. Erscheint nur wenn freigeschaltet; Mouse-over erklärt die Regeln.
Position `left: calc(50% + 425px)` (von der Treppenmitte aus, nicht am Kartenrand — sonst unter der rechten
Fähigkeiten-Leiste). Unter 1600px Fensterbreite rückt der Kreis mittig über die Treppe.

- **Einstellungen:** `quizSettings.focusQuiz` — `enabled, questionCount (10), successPct (100), xpMultiplier (3),
  streakTarget (5), completionXP (1000), maxPerDay (0 = unbegrenzt), rotationStart, rotationLoop, rotation[]`
- **Rotationsplan:** `rotation = [{ group, unit: 'week'|'month', length }]`, Array-Reihenfolge = Rotation, ab
  `rotationStart` aneinandergereiht (keine Datumspaare gespeichert). Monat = Kalendermonat, Tag > Monatsende
  wird gekappt. Berechnung in `getFocusPeriods()` / `getActiveFocusPeriod()` (`js/30-globals.js`, weil Forge sie
  für die Vorschau braucht). Zeitraum-Schlüssel `periodKey = Gruppe@YYYY-MM-DD`.
- **Ablauf:** `FocusQuizPlugin.start()` → `ClassicQuizPlugin.selectFocusQuestions()` (SR-gewichtet über
  `_srTools()`, ohne Core-Quoten/Fresh/maxPerGroup, Cooldown nur als Lückenfüller) →
  `ClassicQuizPlugin.startQuiz({ focus: true, questions })`. Telefon-Joker werden im Fokus-Quiz nicht eingefügt;
  Tausch-Joker tauscht nur innerhalb der Fokus-Gruppe.
- **`focusQuizActive`** (`js/40-init-and-functions.js`): flüchtige globale Variable, **nie** auf `currentUser`.
  Gesetzt in `startQuiz` (jeder normale Start setzt sie zurück), gelöscht nach `QUIZ_COMPLETED`/`QUIZ_ABANDONED`
  und beim Abbruch ohne Antwort.
- **XP:** Multiplikator in `_processAnswer` nur auf richtige Antworten. Der Tagesbonus gilt im Fokus-Quiz
  **immer mit 100 %** (`ClassicQuizPlugin._xpDayFactor()`, Nutzer-Entscheidung 2026-11-06) — sonst bekäme es als
  Folge-Quiz stets den niedrigen „Weitere Quizze"-Wert (live 20 % → aus 3× wurde 0,6×). Vollendungs-Prämie über
  `applyMiniGameXP`.
- **XP-Zähler im Quiz** (`_renderXPCounter`) zeigt für alle Quizze den Endwert inkl. Tagesbonus — vorher die Summe
  davor, was am Ende wie ein Verlust aussah.
- **Statistik:** zählt voll — `questionStats`, `quizzesTaken`, `badgeStats.totalQuizzes`, Bestenliste,
  Mini-Game-Trigger. History-Eintrag mit `focus: true`.
- **Serie (Nutzer-Entscheidung 2026-10-24):** zählt Versuche, nicht Tage. Gehört zu einem Zeitraum —
  Fokus-Wechsel setzt sie auf 0. Prämie **einmal pro Zeitraum** (`rewardedPeriod`); danach steht die Serie
  still bis zum Wechsel. Unter `successPct` oder Abbruch nach ≥ 1 Antwort → Serie 0 (Abbruch-Dialog warnt).
- **Erfolgsquote (Nutzer-Entscheidung 2026-11-06):** übersprungene Fragen (Skip/Telefon) zählen als nicht richtig
  (`focusPct` im QUIZ_COMPLETED-Event). Der `score` der History bleibt auf die beantworteten Fragen bezogen.
- **Abbruch speichert:** Nach bestätigtem Abbruch wird die Spieler-Datei geschrieben, wie am Quizende — sonst machte
  Neuladen einen Fehlversuch rückgängig. Abbruch ohne Antwort schreibt nichts.
- **Bekannte Eigenschaft:** unbegrenzt spielbar + Serie = Versuche → Prämie durch Wiederholen erreichbar.
  Drosseln ohne Codeänderung über `maxPerDay`.

## Spieler-JSON aufräumen — Übergabe (Forge → Sicherung, 2026-10)
Ziel: Spieler-Datei verkleinern, ohne dass Erfolge verloren gehen. Gemessen (Simulation 2 Jahre, 427 Fragen,
2 Quiz/Tag): ~2 MB eingerückt / ~1 MB kompakt. Davon Lernstand je Frage nur ~55 KB — der Rest ist Verlauf.

| Feld | Gelesen von | Beim Aufräumen |
|---|---|---|
| `totalXP`, `level`, `quizzesTaken`, `correctAnswers`, `totalAnswers`, `streak`, `_lastStreakDate`, `lastQuizDate`, `dailyQuizCount` | Quiz, Bestenliste, Level | unverändert |
| `badgeStats` (alle Zähler inkl. `abilitiesUsed`) | Badges, Fähigkeiten | unverändert |
| `_badgeTiers` | Badges (Wasserstand erreichter Stufen) | unverändert |
| `abilities`, `chargesEarned` | Fähigkeiten (Ladungen + Wasserstand) | unverändert |
| `sentPhoneJokers`, `pendingPhoneJoker`, `pendingJokerBonus`, `pendingTeamBonusQuiz`, `sentTeamBonuses`, `receivedTeamBonuses`, `focusQuiz`, `sidebarPositions` | Joker, Team, Fokus, UI | unverändert |
| `questionStats[id].asked/correct/consecutiveCorrect/lastAsked/_q` | SR-Auswahl, Badges (Entdecker/Meister/Vielspieler), Auswertung | unverändert |
| `questionStats[id].askLog` | nur Forge-Auswertung (Rückkehr-Diagnose) | letzte N Einträge (Std. 5) |
| `questionStats[id].monthlyStats` | nur Forge-Auswertung (Monats-Trend) | letzte N Monate (Std. 6) |
| `history[]` | Bestenliste (letzte `maxAgeDays`), Badges (Tage, Wochen, 1. Tag, Verbesserungen, Comebacks, Marathon), Fähigkeiten (50/50 = Burst-Sessions, Tausch = 3er-Tage), Auswertung | älter als N Tage (Std. 180, mind. `maxAgeDays`) → `historyArchive` |

- **`historyArchive`**: `{ quizzes, uniqueDays, activeWeeks, firstDayQuizzes, improvements, comebacks, marathonDays,
  burstSessions, activeDays3, lastDay, lastWeekKey, lastDate, lastScore, until, months{YYYY-MM:{quizzes,correct,total,xp}} }`
- **`computeHistoryStats(history, archive)`** (`js/30-globals.js`) ist die einzige Berechnung dieser Kennzahlen —
  Badges (`_computeBadgeStats`) und Fähigkeiten (`getStatValues`) nutzen sie. Ohne Archiv identisch zum alten Verhalten.
  Die `last*`-Felder zählen Paare über die Schnittkante (Verbesserung/Comeback) und verhindern doppelte Kalenderwochen.
  Zählt immer **chronologisch sortiert** (Badges zählten vorher in Speicher-Reihenfolge — Unterschied nur bei
  History außer der Reihe, z.B. nach Uhr-Verstellung).
- **Schnitt-Regel:** nie innerhalb eines Tages, nie mit < 1 h Abstand → Tages- und Burst-Zählungen bleiben exakt.
  Mehrfaches Aufräumen addiert ins bestehende Archiv.
- **Warum Archiv statt einfach kürzen:** Fähigkeiten vergeben Ladungen über `floor(stat/earnPer) > chargesEarned`.
  Sinkt der History-Wert, bekäme der Spieler lange keine neuen Ladungen. Badge-Stufen gingen nicht verloren
  (`_badgeTiers`), aber der Fortschritt zur nächsten Stufe fiele zurück.
- Aufräumen arbeitet auf Kopien und lädt ein ZIP mit neuen `04_operator_*`-Dateien; beim Laden gewinnt die neueste
  Datei pro Spieler. Forge-Auswertung zeigt danach Einzelwerte nur für die behaltene History, davor Monats-Summen
  (Details stecken in der Sicherung).
- **`compactPlayerFiles`** (Master-Einstellung, Std. aus): Spieler-Dateien ohne Einrückung (~halbe Größe),
  gilt für `serializePlayer()` überall.
- Serialisierung zentral in `js/32-file-io.js`: `playerFileName`, `serializePlayer`, `encodeDataFile`,
  `buildMasterData`, `masterFileName`. `buildMasterData` übernimmt die beim Laden gelesene `pluginConfig`
  (`_loadedPluginConfig`) — Forge hat keine registrierten Plugins und schrieb vorher eine leere Konfiguration.

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
- **Legacy-Admin + `z_quiz-system-built.html`** (2026-10): gelöscht wurden `index.html`, `01_quiz-Referenz.html`
  (Monolith vor der Aufteilung) und die sieben Admin-Dateien `19-plugin-fragen2.js`, `41-admin-functions.js`,
  `20-plugin-usermanagement.js`, `33-file-io-admin.js`, `16b-plugin-badge-admin.js`, `51-plugin-ui-admin.js`,
  `17b-plugin-leaderboard-admin.js`. Lean- und Forge-Build waren danach byte-gleich (die Dateien gehörten nie dazu).
  Vorher nach Forge übernommen: Glücksrad-Einstellungen, Nutzer zurücksetzen/entfernen, Fragen aktiv/inaktiv.
  Die alte Aufräumfunktion (löschte History/Fragen-Stats ohne Archiv → Fähigkeiten-Ladungen und Badge-Fortschritt
  fielen zurück) ist durch Forge → Sicherung ersetzt. **Super-Admin-Ebene gestrichen** (`superAdminPassword` wird beim
  Laden verworfen) — im `file://`-Betrieb ist jedes Passwort nur Sichtschutz. Wiederherstellbar über Git (Commit 5a98c64).
- **Timer-Modus** (2026-10): komplett entfernt — `quizSettings.timer`, `SETTINGS_DEFAULTS.timer`, `CONFIG.TIMER`, der Forge-Einstellungsblock „⏱️ Timer-Modus", `clearAutoAdvance()`/`autoAdvanceTimeout` und die undeklarierte Variable `timerModeActive` im Quiz. Im Quiz war seit langem keine Timer-Logik mehr vorhanden; `timerModeActive` warf bei jedem Antwort-Klick einen Fehler. Ein alter `settings.timer`-Block wird in `ensureSettingsDefaults()` beim Laden verworfen. Mit entfernt: die Boss-Timerleiste (`bossTimerBar`/`bossTimerFill` + `.boss-timer-*`-CSS) — sie stand in beiden Quiz-Vorlagen auf `display:none` und wurde von **keiner** Zeile JavaScript angesteuert; kein Boss-Angriff arbeitet mit Zeitdruck. Der Feature-Text nannte „Timer-Verkürzung" als Boss-Angriff, den es nie gab — ebenfalls korrigiert.

## Workflow-Präferenzen
- Nach CSS/JS-Änderung immer `python3 build.py` ausführen
- `lean-index.html` bindet im Entwicklungsmodus alle `js/*.js` per Script-Tag ein — neue Quiz-Datei dort mit eintragen
  (der Build ersetzt die Tags ohnehin durch das zusammengesetzte Skript)
- Browser-Cache: `Ctrl + Shift + R` nach Build
- Git: SSH-Zugang, E-Mail: `OhmWalker@users.noreply.github.com`
- Commit-Messages auf Deutsch
- **Lernprojekt-MDs nicht committen:** `FEATURE-ANALYSE.md`, `LEITFADEN.md`, `LERNPLAN-VORGEHEN.md`, `LERNPROJEKT-VORLAGE.md`
