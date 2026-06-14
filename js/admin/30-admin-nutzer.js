// === Admin: Nutzer-Verwaltung ===

let _nutzerSort = { key: null, asc: true };

AdminShell.registerPanel('nutzer', 'Nutzer', '👤', container => {
    if (!dataLoaded) {
        container.innerHTML = `
            <div class="card">
                <p class="text-muted" style="text-align:center;padding:30px 0">
                    Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").
                </p>
            </div>`;
        return;
    }
    _renderNutzer(container);
});


function _renderNutzer(container) {
    // Sortierte Kopie der Originalindizes
    const indices = users.map((_, i) => i);
    if (_nutzerSort.key) {
        const dir = _nutzerSort.asc ? 1 : -1;
        const val = {
            name:   i => (users[i].name || '').toLowerCase(),
            level:  i => users[i].level || 0,
            xp:     i => users[i].totalXP || 0,
            quizze: i => users[i].quizzesTaken || 0,
            streak: i => users[i].streak || 0,
        }[_nutzerSort.key];
        indices.sort((a, b) => {
            const va = val(a), vb = val(b);
            return va < vb ? -dir : va > vb ? dir : 0;
        });
    }

    const arrow = key => {
        if (_nutzerSort.key !== key) return '<span style="opacity:0.25">⇅</span>';
        return _nutzerSort.asc ? '▲' : '▼';
    };
    const thStyle = 'cursor:pointer;user-select:none;white-space:nowrap';

    const rows = indices.map((oi, pos) => {
        const u = users[oi];
        return `
        <tr>
            <td class="td-nowrap" style="width:32px;opacity:0.5">${pos + 1}</td>
            <td>
                <span id="nutzer_name_${oi}">${_esc(u.name)}</span>
                <input id="nutzer_input_${oi}" value="${_esc(u.name)}"
                    style="display:none;width:160px;margin:0;padding:6px 10px;font-size:0.9rem"
                    onkeydown="if(event.key==='Enter') _adminNutzerSave(${oi}); if(event.key==='Escape') _adminNutzerCancelEdit(${oi})">
            </td>
            <td>Lv ${u.level || 1}</td>
            <td>${(u.totalXP || 0).toLocaleString()} XP</td>
            <td>${u.quizzesTaken || 0} Quiz</td>
            <td>${u.streak || 0} 🔥</td>
            <td class="td-nowrap">
                <button class="btn btn-small btn-secondary" id="nutzer_btn_edit_${oi}"
                    onclick="_adminNutzerStartEdit(${oi})" style="padding:6px 14px;margin:0">
                    ✏ Umbenennen
                </button>
                <button class="btn btn-small" id="nutzer_btn_save_${oi}"
                    onclick="_adminNutzerSave(${oi})"
                    style="display:none;padding:6px 14px;margin:0">
                    💾 Speichern
                </button>
                <button class="btn btn-small btn-secondary" id="nutzer_btn_cancel_${oi}"
                    onclick="_adminNutzerCancelEdit(${oi})"
                    style="display:none;padding:6px 14px;margin:0;background:var(--overlay-10);box-shadow:none">
                    ✕
                </button>
                <button class="btn btn-small btn-secondary" title="Spieler-JSON herunterladen"
                    onclick="_adminNutzerDownload(${oi})" style="padding:6px 10px;margin:0">
                    ⬇ Datei
                </button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="card">
            <h2 class="section-title" style="margin-top:0;display:flex;align-items:center;gap:12px;justify-content:space-between">
                <span>Nutzer (${users.length})</span>
                <button class="btn btn-small" onclick="_adminNutzerNew()"
                    style="padding:6px 14px;margin:0;font-size:0.85rem;text-transform:none;letter-spacing:0">
                    ＋ Neuer Spieler
                </button>
            </h2>
            <p class="text-muted mb-20">
                Nach dem Umbenennen wird die Spieler-Datei heruntergeladen.
                Die alte Datei im Ordner manuell löschen.
                Mit ⬇ Datei kann jede Spieler-JSON einzeln exportiert werden.
            </p>
            <table class="info-table" style="font-size:0.9rem">
                <thead>
                    <tr style="opacity:0.6;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px">
                        <td>#</td>
                        <td style="${thStyle}" onclick="_nutzerSortBy('name')">Name ${arrow('name')}</td>
                        <td style="${thStyle}" onclick="_nutzerSortBy('level')">Level ${arrow('level')}</td>
                        <td style="${thStyle}" onclick="_nutzerSortBy('xp')">XP ${arrow('xp')}</td>
                        <td style="${thStyle}" onclick="_nutzerSortBy('quizze')">Quizze ${arrow('quizze')}</td>
                        <td style="${thStyle}" onclick="_nutzerSortBy('streak')">Streak ${arrow('streak')}</td>
                        <td style="text-align:right">
                            <button class="btn btn-small btn-secondary" title="Alle Spieler-JSONs herunterladen"
                                onclick="_adminExportAllPlayers()" style="padding:6px 10px;margin:0;font-size:0.75rem;text-transform:none;letter-spacing:0">
                                ⬇ Alle Dateien
                            </button>
                        </td>
                    </tr>
                </thead>
                <tbody>${rows || `<tr><td colspan="7" class="text-muted" style="text-align:center;padding:24px 0">
                    Noch keine Spieler. Oben mit <strong>＋ Neuer Spieler</strong> anlegen.
                </td></tr>`}</tbody>
            </table>
        </div>`;
}


function _nutzerSortBy(key) {
    if (_nutzerSort.key === key) {
        _nutzerSort.asc = !_nutzerSort.asc;
    } else {
        _nutzerSort.key = key;
        _nutzerSort.asc = true;
    }
    const panel = document.getElementById('adminPanel_nutzer');
    if (panel) _renderNutzer(panel);
}


function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
}

function _adminNutzerStartEdit(i) {
    document.getElementById('nutzer_name_' + i).style.display = 'none';
    document.getElementById('nutzer_input_' + i).style.display = 'inline-block';
    document.getElementById('nutzer_btn_edit_' + i).style.display = 'none';
    document.getElementById('nutzer_btn_save_' + i).style.display = 'inline-block';
    document.getElementById('nutzer_btn_cancel_' + i).style.display = 'inline-block';
    document.getElementById('nutzer_input_' + i).focus();
}

function _adminNutzerCancelEdit(i) {
    const u = users[i];
    document.getElementById('nutzer_name_' + i).style.display = '';
    document.getElementById('nutzer_input_' + i).style.display = 'none';
    document.getElementById('nutzer_input_' + i).value = u.name;
    document.getElementById('nutzer_btn_edit_' + i).style.display = '';
    document.getElementById('nutzer_btn_save_' + i).style.display = 'none';
    document.getElementById('nutzer_btn_cancel_' + i).style.display = 'none';
}

function _adminNutzerSave(i) {
    const u = users[i];
    const newName = (document.getElementById('nutzer_input_' + i).value || '').trim();
    if (!newName) { Toast.show('Name darf nicht leer sein.', 'warning'); return; }
    if (newName === u.name) { _adminNutzerCancelEdit(i); return; }

    const conflict = users.find((other, j) => j !== i && other.name === newName);
    if (conflict) { Toast.show(`Name "${newName}" existiert bereits.`, 'error'); return; }

    u.name = newName;
    currentUser = u;
    saveCurrentPlayer();

    document.getElementById('nutzer_name_' + i).textContent = newName;
    _adminNutzerCancelEdit(i);
}

function _adminNutzerNew() {
    GameDialog.showPrompt('🧑', 'Neuer Spieler', 'Name des neuen Spielers:', function(name) {
        const user = createUser(name);
        if (!user) return false; // Validierung fehlgeschlagen → Dialog offen lassen
        const panel = document.getElementById('adminPanel_nutzer');
        if (panel) _renderNutzer(panel);
        // Neue Spieler-JSON herunterladen, damit sie in den Ordner gelegt werden kann
        _adminNutzerDownload(users.indexOf(user));
        Toast.show(`Spieler "${user.name}" angelegt & heruntergeladen.`, 'success');
    }, { placeholder: 'Name…', okLabel: 'Anlegen' });
}

function _adminNutzerDownload(i) {
    const u = users[i];
    const now = new Date();
    const ts = now.toISOString().slice(0,19).replace('T','_').replace(/:/g,'');
    const safeName = (u.name || 'unbekannt').replace(/[^a-zA-Z0-9_\-]/g, '_');
    _adminDownloadJSON(u, `04_operator_${safeName}_${ts}.json`);
    Toast.show(`${u.name} heruntergeladen.`, 'success');
}
