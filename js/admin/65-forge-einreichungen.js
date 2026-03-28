// === Forge: Einreichungen (Herald-Pending-Fragen prüfen) ===
// Lädt herald-pending_*.json, zeigt Einreichungen zur Review.
// Admin kann Fragen annehmen (→ questions[]) oder ablehnen.

let _eiPending = [];   // geladene pending-Fragen

// ── Panel ─────────────────────────────────────────────────────────────────────

AdminShell.registerPanel('einreichungen', 'Einreichungen', '📬', container => {
    _eiRender(container);
});

// ── Render ────────────────────────────────────────────────────────────────────

function _eiRender(container) {
    if (!dataLoaded) {
        container.innerHTML = `
            <div class="card">
                <p class="text-muted" style="text-align:center;padding:30px 0">
                    Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").
                </p>
            </div>`;
        return;
    }

    const rows = _eiPending.map((q, i) => {
        const typeIcon = q.type === QUESTION_TYPES.TEXT    ? '📝'
                       : q.type === QUESTION_TYPES.IMAGEMAP ? '🗺' : '☑';
        const author   = q._submittedBy
            ? `<span style="font-size:0.8rem;opacity:0.6">${_eiEsc(q._submittedBy)}</span>`
            : '<span style="opacity:0.3;font-size:0.8rem">—</span>';
        const dateStr  = q._submittedAt
            ? new Date(q._submittedAt).toLocaleDateString('de-DE')
            : '—';

        // Antworten-Vorschau
        let answerPreview = '';
        if (q.type === QUESTION_TYPES.MULTIPLE_CHOICE && q.answers?.length) {
            answerPreview = q.answers.map(a =>
                `<span style="font-size:0.78rem;padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;
                    background:${a.correct ? 'rgba(46,204,113,0.15)' : 'var(--overlay-5)'};
                    border:1px solid ${a.correct ? 'rgba(46,204,113,0.4)' : 'var(--overlay-10)'};
                    color:${a.correct ? 'var(--correct)' : 'inherit'}">
                    ${a.correct ? '✓ ' : ''}${_eiEsc(a.text)}
                </span>`
            ).join('');
        } else if (q.type === QUESTION_TYPES.TEXT) {
            const answers = getCorrectTextAnswers(q);
            answerPreview = answers.map(a =>
                `<span style="font-size:0.78rem;padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;
                    background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.4);color:var(--correct)">
                    ${_eiEsc(a)}
                </span>`
            ).join('');
        } else if (q.type === QUESTION_TYPES.IMAGEMAP) {
            const n = q.targets?.length || 0;
            answerPreview = `<span style="font-size:0.78rem;opacity:0.5">${n} Zielzone${n !== 1 ? 'n' : ''}</span>`;
        }

        return `
        <tr>
            <td style="width:28px;text-align:center;opacity:0.6;vertical-align:top;padding-top:12px">${typeIcon}</td>
            <td style="vertical-align:top">
                <div style="font-weight:500;margin-bottom:4px">${_eiEsc(q.text)}</div>
                <div style="flex-wrap:wrap;display:flex;gap:2px">${answerPreview}</div>
                ${q.explanation ? `<div style="font-size:0.78rem;opacity:0.5;margin-top:4px">💬 ${_eiEsc(q.explanation)}</div>` : ''}
            </td>
            <td style="white-space:nowrap;font-size:0.82rem;opacity:0.6;vertical-align:top;padding-top:12px">
                ${_eiEsc(q._fileGroup || '—')}
            </td>
            <td style="white-space:nowrap;vertical-align:top;padding-top:12px">${author}</td>
            <td style="white-space:nowrap;font-size:0.8rem;opacity:0.5;vertical-align:top;padding-top:12px">${dateStr}</td>
            <td style="white-space:nowrap;vertical-align:top;padding-top:10px">
                <div style="display:flex;gap:6px">
                    <button class="btn btn-small" onclick="_eiAccept(${i})"
                        style="padding:4px 12px;font-size:0.82rem">✓ Annehmen</button>
                    <button class="btn btn-small btn-secondary" onclick="_eiReject(${i})"
                        style="padding:4px 12px;font-size:0.82rem;background:rgba(231,76,60,0.1);color:#e74c3c;border-color:rgba(231,76,60,0.3);box-shadow:none">
                        ✕ Ablehnen
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="card">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <div style="flex:1">
                    <h2 style="margin:0;font-size:1.2rem">
                        Einreichungen
                        ${_eiPending.length > 0
                            ? `<span style="font-size:0.85rem;opacity:0.5;font-weight:400;margin-left:8px">${_eiPending.length} ausstehend</span>`
                            : ''}
                    </h2>
                </div>
                <label class="btn btn-small btn-secondary" style="cursor:pointer;margin:0">
                    📂 Datei laden
                    <input type="file" accept=".json" multiple style="display:none"
                        onchange="_eiLoadFile(event)">
                </label>
            </div>
        </div>

        ${_eiPending.length === 0 ? `
        <div class="card">
            <p class="text-muted" style="text-align:center;padding:20px 0">
                Keine Einreichungen geladen.<br>
                <span style="font-size:0.85rem;opacity:0.6">
                    Lade eine <code>herald-pending_*.json</code>-Datei um Einreichungen zu prüfen.
                </span>
            </p>
        </div>` : `
        <div class="card" style="padding:0;overflow:hidden">
            <table class="info-table" style="font-size:0.88rem;margin:0">
                <thead>
                    <tr style="opacity:0.5;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;background:var(--overlay-5)">
                        <td style="padding:10px 8px;width:28px"></td>
                        <td style="padding:10px 8px">Frage &amp; Antworten</td>
                        <td style="padding:10px 8px">Gruppe</td>
                        <td style="padding:10px 8px">Einreicher</td>
                        <td style="padding:10px 8px">Datum</td>
                        <td style="padding:10px 8px">Aktion</td>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`}`;
}

// ── Datei laden ───────────────────────────────────────────────────────────────

function _eiLoadFile(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    let totalLoaded = 0;
    let done = 0;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                const qs   = Array.isArray(data) ? data : (data.questions || []);
                const pending = qs.filter(q => q._pending === true);
                _eiPending.push(...pending);
                totalLoaded += pending.length;
            } catch (err) {
                Toast.show(`Fehler in "${file.name}": ${err.message}`, 'error');
            }
            done++;
            if (done === files.length) {
                Toast.show(`${totalLoaded} Einreichung(en) aus ${files.length} Datei(en) geladen.`, 'success');
                AdminShell.showPanel('einreichungen');
            }
        };
        reader.readAsText(file);
    });

    event.target.value = '';
}

// ── Annehmen / Ablehnen ───────────────────────────────────────────────────────

function _eiAccept(idx) {
    const q = _eiPending[idx];
    if (!q) return;

    // Stabile ID vergeben
    const group = q._fileGroup || 'Manuell';
    const newId = _fmAssignStableId(group, questions);
    q.questionId = newId;
    q.active     = true;

    // Herald-Metadaten entfernen
    delete q._pending;
    delete q._submittedBy;
    delete q._submittedAt;

    questions.push(q);
    _eiPending.splice(idx, 1);

    Toast.show(`✓ Frage ${newId} angenommen und zu "${group}" hinzugefügt.`, 'success');
    AdminShell.showPanel('einreichungen');
}

function _eiReject(idx) {
    const q = _eiPending[idx];
    if (!q) return;
    const preview = (q.text || '').substring(0, 60);
    if (!confirm(`Einreichung ablehnen?\n\n"${preview}…"`)) return;
    _eiPending.splice(idx, 1);
    Toast.show('Einreichung abgelehnt.', 'info');
    AdminShell.showPanel('einreichungen');
}

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

function _eiEsc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
