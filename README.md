# Quiz System v4.0 — Modulares Projekt

Offline-Quiz als Single-File-HTML. Drei Werkzeuge, alle aus denselben Quellen gebaut:

| Datei | Zweck |
|---|---|
| `z_LeanQuiz.html` | das Quiz für die Spieler |
| `z_forge.html` | Admin: Fragen, Nutzer, Einstellungen, Fokus-Quiz, Sicherung, Auswertung |
| `z_herald.html` | Fragen einreichen (Spieler schlagen Fragen vor, Admin nimmt sie in Forge an) |

Ausführliche Projekt-Doku: [CLAUDE.md](CLAUDE.md).

## Projektstruktur

```
quiz-project/
├── lean-index.html     ← Quelle Quiz      → z_LeanQuiz.html
├── forge-index.html    ← Quelle Forge     → z_forge.html
├── herald-index.html   ← Quelle Herald    → z_herald.html
├── build.py            ← baut alle drei Single-File-HTMLs
├── css/
│   ├── 00-base.css     ← Grundlagen, Variablen, Container
│   ├── 01-screens.css  ← Screen-Layouts (Start, Quiz, Ergebnis)
│   ├── 02-admin.css    ← Forge (nicht im Quiz)
│   └── 03-plugins.css  ← Badges, Sidebars, Fähigkeiten, Mini-Games, Fokus-Quiz
├── js/                 ← Quiz (alle Dateien landen in z_LeanQuiz.html)
│   ├── 01–07           ← Core: Konstanten, Toast/Dialog, EventBus, AppState, Registry, Event-Delegation
│   ├── 10–17           ← Plugins: Quiz, Fähigkeiten, Glücksrad, Fokus-Quiz, BossFight, Badges, Bestenliste
│   ├── 18              ← Plugin-Registrierung
│   ├── 30, 32          ← Globale Variablen/Settings, Datei-Laden/-Speichern
│   ├── 40, 50          ← init(), Hilfsfunktionen, Plugin-Sichtbarkeit
│   ├── admin/          ← Forge-Tabs (nur z_forge.html)
│   └── herald/         ← Herald (nur z_herald.html)
└── tools/simulate.py   ← Simulation der Spaced-Repetition-Auswahl
```

## Build

```bash
python3 build.py
```

Danach im Browser `Ctrl + Shift + R`.

## Nummerierung

Die Zahl am Dateianfang bestimmt die **Reihenfolge, in der der Build die Dateien zusammensetzt**
(`sorted(glob.glob(...))`). Beim Umbenennen das Präfix behalten.
