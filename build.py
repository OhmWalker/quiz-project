#!/usr/bin/env python3
"""
Build Script: Combines separate CSS, JS, and HTML files back into a single HTML file.
Run from the quiz-project directory:  python build.py
Output: quiz-system-built.html (single file, ready for offline use)
"""

import os
import glob

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSS_DIR = os.path.join(SCRIPT_DIR, "css")
JS_DIR = os.path.join(SCRIPT_DIR, "js")
INDEX_HTML = os.path.join(SCRIPT_DIR, "index.html")
OUTPUT = os.path.join(SCRIPT_DIR, "quiz-system-built.html")

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def indent(text, spaces=8):
    """Add indentation to each line (matching original format)."""
    lines = text.split('\n')
    return '\n'.join((' ' * spaces + line if line.strip() else line) for line in lines)

# 1. Read index.html
html = read_file(INDEX_HTML)

# 2. Collect and inline CSS
css_files = sorted(glob.glob(os.path.join(CSS_DIR, "*.css")))
css_combined = ""
for cf in css_files:
    css_combined += f"/* === {os.path.basename(cf)} === */\n"
    css_combined += read_file(cf) + "\n"

# Replace all <link rel="stylesheet" ...> with a single inline <style>
import re
css_indented = indent(css_combined.rstrip())
# Remove all CSS link tags
html = re.sub(r'\s*<link\s+rel="stylesheet"\s+href="css/[^"]*"\s*/?>', '', html)
# Insert combined style before </head>
html = html.replace('</head>', f'    <style>\n{css_indented}\n    </style>\n</head>', 1)

# 3. Collect and inline JS (in sorted order)
js_files = sorted(glob.glob(os.path.join(JS_DIR, "*.js")))
js_combined = ""
for jf in js_files:
    js_combined += f"\n// === {os.path.basename(jf)} ===\n"
    js_combined += read_file(jf) + "\n"

# Replace all <script src="js/..."> tags with a single inline <script>
js_indented = indent(js_combined.rstrip())
# Remove all individual script tags
html = re.sub(r'\s*<script\s+src="js/[^"]*"></script>', '', html)
# Insert combined script before </body>
html = html.replace('</body>', f'    <script>\n{js_indented}\n    </script>\n</body>')

# 4. Clean up: fix "Development Version" comment
html = html.replace('Development Version (Split Files)', 'Single File · 100% Offline · No localStorage')

# 5. Write output
with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(html)

size_kb = os.path.getsize(OUTPUT) / 1024
print(f"✅ Build complete: {OUTPUT}")
print(f"   Size: {size_kb:.1f} KB")
print(f"   CSS files: {len(css_files)}")
print(f"   JS files:  {len(js_files)}")
