# Quiz System v4.0 — Modulares Projekt

## Projektstruktur

```
quiz-project/
├── index.html              ← Entwicklungs-HTML (lädt separate Dateien)
├── build.py                ← Build-Script: alles → eine HTML-Datei
├── quiz-system-built.html  ← Gebaute Single-File Version
├── 01_quiz-Referenz.html   ← Alte monolithische Version (Referenz)
├── css/
│   ├── 00-base.css         ← Grundlagen, Variablen, Container
│   ├── 01-screens.css      ← Screen-Layouts (Start, Quiz, Results, Admin)
│   ├── 02-admin.css        ← Admin-Panel Styles
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
    ├── 11-plugin-ability.js       ← Fähigkeiten-System (7 Abilities)
    ├── 12-plugin-wheel.js         ← Glücksrad Mini-Game
    ├── 13-plugin-speedtap.js      ← Reaktionstest Mini-Game
    ├── 14-plugin-bossfight.js     ← Boss-Fight Mini-Game
    ├── 16-plugin-badge.js         ← Badge/Achievement-System (37 Badges)
    ├── 17-plugin-leaderboard.js   ← Bestenliste/Podium
    ├── 18-plugin-question-editor.js ← Fragen-Editor (Legacy)
    ├── 19-plugin-fragen2.js       ← Fragen-Manager v2
    ├── 20-plugin-usermanagement.js ← Benutzer-Verwaltung + Plugin-Registrierung
    ├── 30-globals.js              ← Globale Variablen, Settings, Bridges
    ├── 32-file-io.js              ← Datei-Import/Export (Ordner, Spieler, Master)
    ├── 40-init-and-functions.js   ← init(), Utility-Funktionen
    └── 50-plugin-ui.js            ← Plugin-UI, State-Bridges, Initialisierung
```

## Entwicklung (VS Code)

1. Ordner `quiz-project/` in VS Code öffnen
2. Einzelne Dateien bearbeiten (CSS/JS)
3. `index.html` im Browser öffnen (mit Live Server Extension)

## Build: Zurück zur Single-File HTML

```bash
python3 build.py
```

Erzeugt `quiz-system-built.html` — eine einzige HTML-Datei mit allem inline, 100% offline nutzbar.

## Nummerierung

Die JS-Dateien sind nummeriert, um die **Ladereihenfolge** sicherzustellen:
- `01-07`: Core-System (Konstanten, State, EventBus, Registry, Delegation)
- `10-20`: Plugins (müssen nach Registry geladen werden)
- `30-32`: Globale Variablen, Settings, File-IO
- `40`: Utility-Funktionen und init()
- `50`: Plugin-UI und finale Initialisierung
