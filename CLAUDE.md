# Quiz-Project — Claude Code Kontext

## Projekt-Überblick
- Quiz-System v4.0, Single-Page-App (HTML/CSS/JS)
- Modulare Plugin-Architektur: ~20 JS-Dateien, 4 CSS-Dateien
- Build: `python3 build.py` → `quiz-system-built.html` (einzelne HTML-Datei, ~594 KB)
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
`pendingPhoneJoker[]`, `sidebarPositions{}`

### abilities{}-Struktur (pro Key)
`{ charges: number, unlocked: boolean }`

### questionStats{}-Struktur (pro questionId)
`{ asked: number, correct: number, consecutiveCorrect: number, lastAsked: ISO-string }`

### History-Einträge
`{ date, correct, total, xp, score }`

## Offene Punkte
- `used`-Feld in abilities komplett entfernen wenn alle User migriert sind
- Admin-UI für earnPer/earnStat-Anpassung (Referenz hatte das)

## Workflow-Präferenzen
- User testet Änderungen erst in der Built-Datei, dann CSS-Quellen anpassen
- Nach CSS/JS-Änderung immer `python3 build.py` ausführen
- Browser-Cache: `Ctrl + Shift + R` nach Build
- Git: SSH-Zugang, E-Mail: `OhmWalker@users.noreply.github.com`
- User spricht Deutsch, Commit-Messages auf Deutsch
