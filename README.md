# Quiz System v4.0 — Modulares Projekt

## Projektstruktur

```
quiz-project/
├── index.html              ← Entwicklungs-HTML (lädt separate Dateien)
├── forge-index.html        ← Forge Entwicklungs-HTML
├── build.py                ← Build-Script: beide HTML-Dateien bauen
├── quiz-system-built.html  ← Gebautes Quiz (Single-File)
├── forge.html              ← Gebautes Forge (Single-File)
├── 01_quiz-Referenz.html   ← Alte monolithische Version (Referenz)
├── css/
│   ├── 00-base.css         ← Grundlagen, Variablen, Container
│   ├── 01-screens.css      ← Screen-Layouts (Start, Quiz, Results, Admin)
│   ├── 02-admin.css        ← Forge Styles
│   └── 03-plugins.css      ← Badges, Sidebars, Abilities, Mini-Games
└── js/
    ├── 01-constants.js            ← QUESTION_TYPES, LIMITS, TIMING, CONFIG
    ├── 02-toast-dialog.js         ← Toast-Benachrichtigungen, GameDialog
    ├── 03-eventbus.js             ← EventBus (Publish/Subscribe)
    ├── 04-appstate.js             ← AppState (zentraler Zustand)
    ├── 05-quizcore.js             ← QuizCore Namespace-Wrapper
    ├── 06-plugin-registry.js      ← PluginRegistry (Plugin-Verwaltung)
    ├── 07-event-delegation.js     ← Event-Delegation (ersetzt inline onclick)
    ├── 10-plugin-classic-quiz.js  ← Classic Quiz (Hauptlogik)
    ├── 11-plugin-ability.js       ← Fähigkeiten-System (9 Abilities)
    ├── 12-plugin-wheel.js         ← Glücksrad Mini-Game
    ├── 14-plugin-bossfight.js     ← Boss-Fight Mini-Game
    ├── 16-plugin-badge.js         ← Badge/Achievement-System
    ├── 17-plugin-leaderboard.js   ← Bestenliste/Podium
    ├── 19-plugin-fragen2.js       ← Fragen-Manager v2
    ├── 20-plugin-usermanagement.js ← Benutzer-Verwaltung + Plugin-Registrierung
    ├── 30-globals.js              ← Globale Variablen, Settings, Bridges
    ├── 32-file-io.js              ← Datei-Import/Export (Ordner, Spieler, Master)
    ├── 40-init-and-functions.js   ← init(), Utility-Funktionen
    ├── 50-plugin-ui.js            ← Plugin-UI, State-Bridges, Initialisierung
    └── admin/                     ← Forge Module (nur in forge.html)
        ├── 10-admin-shell.js      ← Tab-System & IO-Warnung
        ├── 20-admin-datei.js      ← Ordner laden (Admin-spezifischer Loader)
        ├── 30-admin-nutzer.js     ← Nutzer umbenennen, Übersicht
        ├── 40-admin-einstellungen.js ← earnPer/earnStat für Fähigkeiten
        └── 50-admin-migrationen.js   ← Daten-Migrationen (z.B. "used"-Feld)
```

## Entwicklung (VS Code)

1. Ordner `quiz-project/` in VS Code öffnen
2. Einzelne Dateien bearbeiten (CSS/JS)
3. `index.html` im Browser öffnen (mit Live Server Extension)

## Build

```bash
python3 build.py
```

Erzeugt zwei Dateien:
- `quiz-system-built.html` — Quiz, vollständig inline, 100% offline
- `forge.html` — Forge (Core-JS + js/admin/*.js), 100% offline

## Nummerierung

Die JS-Dateien sind nummeriert, um die **Ladereihenfolge** sicherzustellen:
- `01-07`: Core-System (Konstanten, State, EventBus, Registry, Delegation)
- `10-20`: Plugins (müssen nach Registry geladen werden)
- `30-32`: Globale Variablen, Settings, File-IO
- `40`: Utility-Funktionen und init()
- `50`: Plugin-UI und finale Initialisierung
