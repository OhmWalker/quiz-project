// === Admin: Einstellungen (earnPer/earnStat für Fähigkeiten) ===
// Offener Punkt aus CLAUDE.md: Admin-UI für earnPer/earnStat-Anpassung

// Definitionen aus 11-plugin-ability.js (hardcoded für Admin-Kontext)
const _ADMIN_ABILITY_DEFS = [
    { key: 'fiftyFifty',   icon: '🎯', name: '50/50',         earnStat: '_fifty50Sessions',   defaultEarnPer: 1  },
    { key: 'skip',         icon: '⏭',  name: 'Überspringen',  earnStat: 'totalQuizzes',       defaultEarnPer: 10 },
    { key: 'hint',         icon: '💡', name: 'Hinweis',        earnStat: 'uniqueQuestions',    defaultEarnPer: 20 },
    { key: 'doubleXP',     icon: '✨', name: 'Doppel-XP',      earnStat: 'perfectQuizzes',     defaultEarnPer: 1  },
    { key: 'shield',       icon: '🛡', name: 'Schild',          earnStat: 'currentStreak',      defaultEarnPer: 7  },
    { key: 'secondChance', icon: '🔄', name: '2. Chance',      earnStat: 'currentStreak',      defaultEarnPer: 3  },
    { key: 'swap',         icon: '🎲', name: 'Tausch',         earnStat: 'activeDays3',        defaultEarnPer: 4  },
    { key: 'teamBonus',    icon: '👥', name: 'Team',           earnStat: '_phoneJokerUsed',    defaultEarnPer: 3  },
    { key: 'phoneJoker',   icon: '📞', name: 'Telefon',        earnStat: 'highAverageQuizzes', defaultEarnPer: 5  },
];


AdminShell.registerPanel('einstellungen', 'Einstellungen', '⚙', container => {
    if (!dataLoaded) {
        container.innerHTML = `
            <div class="card">
                <p class="text-muted" style="text-align:center;padding:30px 0">
                    Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").
                </p>
            </div>`;
        return;
    }

    const overrides = quizSettings.abilityOverrides || {};

    const rows = _ADMIN_ABILITY_DEFS.map(def => {
        const current = overrides[def.key]?.earnPer ?? def.defaultEarnPer;
        return `
            <tr>
                <td style="font-size:1.2rem;width:36px">${def.icon}</td>
                <td class="td-bold">${def.name}</td>
                <td class="td-muted" style="font-size:0.82rem">${def.earnStat}</td>
                <td style="text-align:right;opacity:0.45;font-size:0.82rem">Standard: ${def.defaultEarnPer}</td>
                <td style="width:100px">
                    <input type="number" min="1" max="9999"
                        id="earnPer_${def.key}" value="${current}"
                        style="margin:0;padding:5px 8px;width:80px;font-size:0.9rem;text-align:right"
                        ${current !== def.defaultEarnPer ? 'style="border-color:var(--accent)"' : ''}>
                </td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="card">
            <h2 class="section-title" style="margin-top:0">Fähigkeiten — Freischalt-Schwellen</h2>
            <p class="text-muted mb-20">
                <strong>earnPer</strong>: Alle N Einheiten von <em>earnStat</em> erhält der Spieler eine Ladung.
                Änderungen werden in der Master-Datei gespeichert.
            </p>
            <table class="info-table" style="font-size:0.9rem">
                <thead>
                    <tr style="opacity:0.5;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px">
                        <td></td><td>Fähigkeit</td><td>Stat</td><td style="text-align:right">Standard</td><td style="text-align:right">Aktiv</td>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="margin-top:20px;display:flex;gap:12px;align-items:center">
                <button class="btn btn-small" onclick="_adminEinstellungenSave()">
                    💾 Master-Datei speichern
                </button>
                <button class="btn btn-small btn-secondary" onclick="_adminEinstellungenReset()">
                    ↺ Auf Standard zurücksetzen
                </button>
                <span id="einstellungen_hint" class="text-muted"></span>
            </div>
        </div>`;
});


function _adminEinstellungenSave() {
    if (!quizSettings.abilityOverrides) quizSettings.abilityOverrides = {};

    let changed = 0;
    _ADMIN_ABILITY_DEFS.forEach(def => {
        const input = document.getElementById('earnPer_' + def.key);
        if (!input) return;
        const val = parseInt(input.value, 10);
        if (isNaN(val) || val < 1) { input.style.borderColor = 'var(--incorrect)'; return; }
        input.style.borderColor = '';
        if (val !== def.defaultEarnPer) {
            quizSettings.abilityOverrides[def.key] = { earnPer: val };
            changed++;
        } else {
            delete quizSettings.abilityOverrides[def.key];
        }
    });

    saveMasterBackup();

    const hint = document.getElementById('einstellungen_hint');
    if (hint) hint.textContent = changed > 0 ? `${changed} Override(s) gespeichert` : 'Alle Werte auf Standard';
}

function _adminEinstellungenReset() {
    _ADMIN_ABILITY_DEFS.forEach(def => {
        const input = document.getElementById('earnPer_' + def.key);
        if (input) input.value = def.defaultEarnPer;
    });
    const hint = document.getElementById('einstellungen_hint');
    if (hint) hint.textContent = 'Werte zurückgesetzt — noch nicht gespeichert';
}
