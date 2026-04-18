#!/usr/bin/env python3
"""
Build Script: Builds quiz-system-built.html and forge.html
Run from quiz-project directory: python3 build.py
"""

import os
import glob
import re

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
CSS_DIR       = os.path.join(SCRIPT_DIR, "css")
JS_DIR        = os.path.join(SCRIPT_DIR, "js")
JS_ADMIN_DIR  = os.path.join(SCRIPT_DIR, "js", "admin")
JS_HERALD_DIR = os.path.join(SCRIPT_DIR, "js", "herald")

# Core-JS-Dateien die ins Admin-Build kommen (Reihenfolge wichtig)
ADMIN_CORE_JS = [
    '01-constants.js',
    '02-toast-dialog.js',
    '03-eventbus.js',
    '04-appstate.js',
    '06-plugin-registry.js',
    '07-event-delegation.js',
    '16-plugin-badge.js',
    '30-globals.js',
    '32-file-io.js',
]

# Core-JS-Dateien die ins Herald-Build kommen
HERALD_CORE_JS = [
    '01-constants.js',
    '02-toast-dialog.js',
]


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def indent(text, spaces=8):
    lines = text.split('\n')
    return '\n'.join((' ' * spaces + line if line.strip() else line) for line in lines)


def build_css(css_files):
    combined = ""
    for cf in css_files:
        combined += f"/* === {os.path.basename(cf)} === */\n"
        combined += read_file(cf) + "\n"
    return combined


def build_js(js_files):
    combined = ""
    for jf in js_files:
        combined += f"\n// === {os.path.basename(jf)} ===\n"
        combined += read_file(jf) + "\n"
    return combined


def inject(html, css_combined, js_combined):
    # CSS: Link-Tags entfernen, inline <style> einfügen
    html = re.sub(r'\s*<link\s+rel="stylesheet"\s+href="css/[^"]*"\s*/?>', '', html)
    html = html.replace('</head>',
        f'    <style>\n{indent(css_combined.rstrip())}\n    </style>\n</head>', 1)
    # JS: Script-Tags entfernen, inline <script> einfügen
    html = re.sub(r'\s*<script\s+src="[^"]*"></script>', '', html)
    html = html.replace('</body>',
        f'    <script>\n{indent(js_combined.rstrip())}\n    </script>\n</body>')
    return html


# ── Quiz-Build ────────────────────────────────────────────────────────────────
html      = read_file(os.path.join(SCRIPT_DIR, "index.html"))
css_files = sorted(glob.glob(os.path.join(CSS_DIR, "*.css")))
js_files  = sorted(glob.glob(os.path.join(JS_DIR, "*.js")))

html = inject(html, build_css(css_files), build_js(js_files))
html = html.replace('Development Version (Split Files)', 'Single File · 100% Offline · No localStorage')

quiz_out = os.path.join(SCRIPT_DIR, "quiz-system-built.html")
with open(quiz_out, "w", encoding="utf-8") as f:
    f.write(html)

size_kb = os.path.getsize(quiz_out) / 1024
print(f"[OK] quiz-system-built.html  —  {size_kb:.1f} KB  |  CSS: {len(css_files)}  |  JS: {len(js_files)}")


# ── Admin-Build ───────────────────────────────────────────────────────────────
html           = read_file(os.path.join(SCRIPT_DIR, "forge-index.html"))
css_files_adm  = sorted(glob.glob(os.path.join(CSS_DIR, "*.css")))

# Core-JS-Pfade verifizieren
core_paths  = [os.path.join(JS_DIR, f) for f in ADMIN_CORE_JS]
missing     = [p for p in core_paths if not os.path.exists(p)]
if missing:
    print(f"[WARN] Admin-Core JS fehlt: {[os.path.basename(p) for p in missing]}")
    core_paths = [p for p in core_paths if os.path.exists(p)]

admin_paths = sorted(glob.glob(os.path.join(JS_ADMIN_DIR, "*.js")))
js_files_adm = core_paths + admin_paths

html = inject(html, build_css(css_files_adm), build_js(js_files_adm))
html = html.replace('Development Version (Split Files)', 'Single File · 100% Offline · No localStorage')

admin_out = os.path.join(SCRIPT_DIR, "forge.html")
with open(admin_out, "w", encoding="utf-8") as f:
    f.write(html)

size_kb = os.path.getsize(admin_out) / 1024
print(f"[OK] forge.html              —  {size_kb:.1f} KB  |  CSS: {len(css_files_adm)}  |  Core-JS: {len(core_paths)}  |  Admin-JS: {len(admin_paths)}")


# ── Herald-Build ──────────────────────────────────────────────────────────────
html             = read_file(os.path.join(SCRIPT_DIR, "herald-index.html"))
css_files_herald = sorted(glob.glob(os.path.join(CSS_DIR, "*.css")))

core_herald_paths = [os.path.join(JS_DIR, f) for f in HERALD_CORE_JS]
missing_herald    = [p for p in core_herald_paths if not os.path.exists(p)]
if missing_herald:
    print(f"[WARN] Herald-Core JS fehlt: {[os.path.basename(p) for p in missing_herald]}")
    core_herald_paths = [p for p in core_herald_paths if os.path.exists(p)]

herald_paths  = sorted(glob.glob(os.path.join(JS_HERALD_DIR, "*.js")))
js_files_herald = core_herald_paths + herald_paths

html = inject(html, build_css(css_files_herald), build_js(js_files_herald))
html = html.replace('Development Version (Split Files)', 'Single File · 100% Offline · No localStorage')

herald_out = os.path.join(SCRIPT_DIR, "herald.html")
with open(herald_out, "w", encoding="utf-8") as f:
    f.write(html)

size_kb = os.path.getsize(herald_out) / 1024
print(f"[OK] herald.html             —  {size_kb:.1f} KB  |  CSS: {len(css_files_herald)}  |  Core-JS: {len(core_herald_paths)}  |  Herald-JS: {len(herald_paths)}")
print(f"     Themen-Kategorien manuell editieren → Ctrl+F nach: HERALD_GRUPPEN_EDIT")


# ── LeanQuiz-Build ────────────────────────────────────────────────────────────
html           = read_file(os.path.join(SCRIPT_DIR, "lean-index.html"))
css_files_lean = sorted(glob.glob(os.path.join(CSS_DIR, "*.css")))
js_files_lean  = sorted(glob.glob(os.path.join(JS_DIR, "*.js")))

html = inject(html, build_css(css_files_lean), build_js(js_files_lean))
html = html.replace('Development Version (Split Files)', 'Single File · 100% Offline · No localStorage')

lean_out = os.path.join(SCRIPT_DIR, "LeanQuiz.html")
with open(lean_out, "w", encoding="utf-8") as f:
    f.write(html)

size_kb = os.path.getsize(lean_out) / 1024
print(f"[OK] LeanQuiz.html           —  {size_kb:.1f} KB  |  CSS: {len(css_files_lean)}  |  JS: {len(js_files_lean)}")
