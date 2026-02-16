# Quiz System v4.0 — Modulares Projekt

## Projektstruktur

```
quiz-project/
├── index.html              ← Entwicklungs-HTML (lädt separate Dateien)
├── build.py                ← Build-Script: alles → eine HTML-Datei
├── quiz-system-built.html  ← Gebaute Single-File Version
├── css/
│   └── style.css           ← Komplettes CSS (2866 Zeilen)
└── js/
    ├── 01-constants.js         ← QUESTION_TYPES, LIMITS, TIMING, MESSAGES, CONFIG
    ├── 02-toast-dialog.js      ← Toast-Benachrichtigungen, GameDialog
    ├── 03-eventbus.js          ← EventBus (Publish/Subscribe)
    ├── 04-appstate.js          ← AppState (zentraler Zustand)
    ├── 05-quizcore.js          ← QuizCore Namespace-Wrapper
    ├── 06-plugin-registry.js   ← PluginRegistry (Plugin-Verwaltung)
    ├── 10-plugin-classic-quiz.js  ← Classic Quiz (Hauptlogik)
    ├── 11-plugin-ability.js       ← Fähigkeiten-System
    ├── 12-plugin-wheel.js         ← Glücksrad Mini-Game
    ├── 13-plugin-speedtap.js      ← Reaktionstest Mini-Game
    ├── 14-plugin-bossfight.js     ← Boss-Fight Mini-Game
    ├── 16-plugin-badge.js         ← Badge/Achievement-System
    ├── 17-plugin-leaderboard.js   ← Bestenliste/Podium
    ├── 18-plugin-question-editor.js ← Fragen-Editor (Legacy)
    ├── 19-plugin-fragen2.js       ← Fragen-Manager v2
    ├── 20-plugin-usermanagement.js ← Benutzer-Verwaltung
    ├── 30-globals.js              ← Globale Variablen, Settings, Bridges
    ├── 40-init-and-functions.js   ← init(), Utility-Funktionen, Export/Import
    └── 50-plugin-ui.js            ← Plugin-UI, State-Bridges, Initialisierung
```

## Entwicklung (VS Code)

1. Ordner `quiz-project/` in VS Code öffnen
2. Einzelne Dateien bearbeiten (CSS/JS)
3. `index.html` im Browser öffnen (mit Live Server Extension)

## Build: Zurück zur Single-File HTML

```bash
python build.py
```

Erzeugt `quiz-system-built.html` — eine einzige HTML-Datei mit allem inline, 100% offline nutzbar.

## Nummerierung

Die JS-Dateien sind nummeriert, um die **Ladereihenfolge** sicherzustellen:
- `01-06`: Core-System (Konstanten, State, Registry)
- `10-20`: Plugins (müssen nach Registry geladen werden)
- `30`: Globale Variablen (Bridges zu AppState)
- `40`: Utility-Funktionen und init()
- `50`: Plugin-UI und finale Initialisierung
