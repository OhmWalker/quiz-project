// === Admin: Nutzer-Verwaltung ===

AdminShell.registerPanel('nutzer', 'Nutzer', '👤', container => {
    if (!dataLoaded || !users.length) {
        container.innerHTML = `
            <div class="card">
                <p class="text-muted" style="text-align:center;padding:30px 0">
                    Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").
                </p>
            </div>`;
        return;
    }

    const rows = users.map((u, i) => `
        <tr>
            <td class="td-nowrap" style="width:32px;opacity:0.5">${i + 1}</td>
            <td>
                <span id="nutzer_name_${i}">${_esc(u.name)}</span>
                <input id="nutzer_input_${i}" value="${_esc(u.name)}"
                    style="display:none;width:160px;margin:0;padding:6px 10px;font-size:0.9rem"
                    onkeydown="if(event.key==='Enter') _adminNutzerSave(${i}); if(event.key==='Escape') _adminNutzerCancelEdit(${i})">
            </td>
            <td>Lv ${u.level || 1}</td>
            <td>${(u.totalXP || 0).toLocaleString()} XP</td>
            <td>${u.quizzesTaken || 0} Quiz</td>
            <td>${u.streak || 0} 🔥</td>
            <td class="td-nowrap">
                <button class="btn btn-small btn-secondary" id="nutzer_btn_edit_${i}"
                    onclick="_adminNutzerStartEdit(${i})" style="padding:6px 14px;margin:0">
                    ✏ Umbenennen
                </button>
                <button class="btn btn-small" id="nutzer_btn_save_${i}"
                    onclick="_adminNutzerSave(${i})"
                    style="display:none;padding:6px 14px;margin:0">
                    💾 Speichern
                </button>
                <button class="btn btn-small btn-secondary" id="nutzer_btn_cancel_${i}"
                    onclick="_adminNutzerCancelEdit(${i})"
                    style="display:none;padding:6px 14px;margin:0;background:var(--overlay-10);box-shadow:none">
                    ✕
                </button>
            </td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="card">
            <h2 class="section-title" style="margin-top:0">Nutzer (${users.length})</h2>
            <p class="text-muted mb-20">
                Nach dem Umbenennen wird die Spieler-Datei heruntergeladen.
                Die alte Datei im Ordner manuell löschen.
            </p>
            <table class="info-table" style="font-size:0.9rem">
                <thead>
                    <tr style="opacity:0.5;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px">
                        <td>#</td><td>Name</td><td>Level</td><td>XP</td><td>Quizze</td><td>Streak</td><td></td>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
});


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

    // Label aktualisieren
    document.getElementById('nutzer_name_' + i).textContent = newName;
    _adminNutzerCancelEdit(i);
}
