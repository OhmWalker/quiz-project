// === Forge: Einreichungen (Herald-Pending-Fragen prüfen) ===
// Lädt herald-pending_*.json, zeigt Einreichungen zur Review.
// Inline-Edit vor Übernahme; angenommene Fragen bleiben ausgegraut sichtbar.

let _eiPending  = [];   // ausstehende Einreichungen
let _eiAccepted = [];   // bereits angenommene (sichtbar aber ausgegraut)
let _eiEditIdx  = -1;   // welche Frage ist aufgeklappt (-1 = keine)
let _eiEditType = QUESTION_TYPES.MULTIPLE_CHOICE;

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

    const pendingRows = _eiPending.map((q, i) => _eiPendingRow(q, i)).join('');

    const acceptedRows = _eiAccepted.map((q, i) => `
        <tr style="opacity:0.38">
            <td style="width:28px;text-align:center;padding-top:10px">${_eiTypeIcon(q.type)}</td>
            <td style="vertical-align:top;padding-top:10px">
                <span style="font-size:0.75rem;background:rgba(46,204,113,0.15);color:var(--correct);
                    border:1px solid rgba(46,204,113,0.3);padding:1px 7px;border-radius:4px;margin-right:6px">
                    ✓ Angenommen
                </span>
                ${_eiEsc(q.text)}
            </td>
            <td style="font-size:0.82rem;padding-top:10px">${_eiEsc(q._fileGroup || '—')}</td>
            <td style="font-size:0.8rem;padding-top:10px">${q._submittedBy ? _eiEsc(q._submittedBy) : '—'}</td>
            <td colspan="2"></td>
        </tr>`).join('');

    const hasPending  = _eiPending.length > 0;
    const hasAccepted = _eiAccepted.length > 0;
    const hasAny      = hasPending || hasAccepted;

    container.innerHTML = `
        <div class="card">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <div style="flex:1">
                    <h2 style="margin:0;font-size:1.2rem">
                        Einreichungen
                        ${hasPending
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

        ${!hasAny ? `
        <div class="card">
            <p class="text-muted" style="text-align:center;padding:20px 0">
                Keine Einreichungen geladen.<br>
                <span style="font-size:0.85rem;opacity:0.6">
                    Lade eine <code>herald-pending_*.json</code>-Datei.
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
                        <td style="padding:10px 8px"></td>
                    </tr>
                </thead>
                <tbody>
                    ${pendingRows}
                    ${acceptedRows}
                </tbody>
            </table>
        </div>`}`;
}

function _eiPendingRow(q, i) {
    const isOpen  = _eiEditIdx === i;
    const arrow   = isOpen ? '▼' : '▶';
    const dateStr = q._submittedAt ? new Date(q._submittedAt).toLocaleDateString('de-DE') : '—';
    const author  = q._submittedBy ? _eiEsc(q._submittedBy) : '<span style="opacity:0.35">—</span>';

    const answerPreview = _eiAnswerPreview(q);

    const mainRow = `
        <tr style="cursor:pointer;user-select:none" onclick="_eiToggleEdit(${i})">
            <td style="width:28px;text-align:center;opacity:0.6;padding-top:12px;vertical-align:top">${_eiTypeIcon(q.type)}</td>
            <td style="vertical-align:top">
                <div style="font-weight:500;margin-bottom:4px">${_eiEsc(q.text)}</div>
                <div style="display:flex;flex-wrap:wrap;gap:2px">${answerPreview}</div>
                ${q.explanation ? `<div style="font-size:0.78rem;opacity:0.5;margin-top:4px">💬 ${_eiEsc(q.explanation)}</div>` : ''}
            </td>
            <td style="white-space:nowrap;font-size:0.82rem;opacity:0.6;vertical-align:top;padding-top:12px">
                ${_eiEsc(q._fileGroup || '—')}
            </td>
            <td style="white-space:nowrap;font-size:0.8rem;vertical-align:top;padding-top:12px">${author}</td>
            <td style="white-space:nowrap;font-size:0.8rem;opacity:0.5;vertical-align:top;padding-top:12px">${dateStr}</td>
            <td style="width:20px;text-align:center;opacity:0.4;font-size:0.7rem;vertical-align:top;padding-top:14px">${arrow}</td>
        </tr>`;

    if (!isOpen) return mainRow;

    return mainRow + `<tr><td colspan="6" style="padding:0;background:rgba(247,184,1,0.03);border-left:3px solid var(--accent)">${_eiEditForm(q, i)}</td></tr>`;
}

// ── Inline-Edit-Formular ──────────────────────────────────────────────────────

function _eiEditForm(q, i) {
    const isMC   = _eiEditType === QUESTION_TYPES.MULTIPLE_CHOICE;
    const isText = _eiEditType === QUESTION_TYPES.TEXT;
    const isIm   = _eiEditType === QUESTION_TYPES.IMAGEMAP;

    let answerFields;
    if (isMC) {
        const mcAnswers = (q.type === QUESTION_TYPES.MULTIPLE_CHOICE ? q.answers : null) || [];
        answerFields = Array.from({ length: 4 }, (_, ai) => {
            const a = mcAnswers[ai] || { text: '', correct: false };
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                <input type="checkbox" id="eiCorr_${ai}" style="width:auto;margin:0;flex-shrink:0" ${a.correct ? 'checked' : ''}>
                <input type="text" id="eiAns_${ai}" placeholder="Antwort ${ai + 1}"
                    value="${_eiEsc(a.text)}"
                    style="margin:0;flex:1;padding:6px 10px;font-size:0.88rem">
            </div>`;
        }).join('');
    } else if (isText) {
        const textVal = (q.type === QUESTION_TYPES.TEXT) ? getCorrectTextAnswers(q).join('\n') : '';
        answerFields = `<textarea id="eiTextAns" rows="3"
            placeholder="Eine korrekte Antwort pro Zeile"
            style="margin:0;resize:vertical;font-size:0.88rem">${_eiEsc(textVal)}</textarea>`;
    } else {
        answerFields = `<p style="font-size:0.83rem;opacity:0.55;padding:10px 0;margin:0">
            Zonen können nach der Übernahme im Tab <strong>Fragen</strong> bearbeitet werden.
        </p>`;
    }

    return `
    <div onclick="event.stopPropagation()" style="padding:16px 20px">
        <!-- Typ -->
        <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
            <button class="btn btn-small ${isMC ? '' : 'btn-secondary'}"
                onclick="_eiSetEditType('${QUESTION_TYPES.MULTIPLE_CHOICE}')"
                style="${isMC ? '' : 'background:var(--overlay-10);box-shadow:none'}">☑ MC</button>
            <button class="btn btn-small ${isText ? '' : 'btn-secondary'}"
                onclick="_eiSetEditType('${QUESTION_TYPES.TEXT}')"
                style="${isText ? '' : 'background:var(--overlay-10);box-shadow:none'}">📝 Text</button>
            <button class="btn btn-small ${isIm ? '' : 'btn-secondary'}"
                onclick="_eiSetEditType('${QUESTION_TYPES.IMAGEMAP}')"
                style="${isIm ? '' : 'background:var(--overlay-10);box-shadow:none'}">🗺 Bild</button>
        </div>

        <!-- Fragetext -->
        <textarea id="eiText" rows="2"
            placeholder="Fragetext…"
            style="margin:0 0 8px;resize:vertical;font-size:0.9rem">${_eiEsc(q.text || '')}</textarea>

        <!-- Gruppe -->
        <div style="margin-bottom:8px">
            <label style="font-size:0.78rem;opacity:0.6;display:block;margin-bottom:2px">Gruppe</label>
            <input type="text" id="eiGroup" value="${_eiEsc(q._fileGroup || '')}"
                placeholder="Gruppenname"
                style="margin:0;font-size:0.88rem">
        </div>

        <!-- Antworten -->
        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px">
            ${isMC ? 'Antworten (✓ = korrekt)' : isText ? 'Korrekte Antworten' : 'Zielzonen'}
        </label>
        <div id="eiAnswers" style="margin-bottom:8px">${answerFields}</div>

        <!-- Erklärung -->
        <details style="margin-bottom:6px" ${q.explanation ? 'open' : ''}>
            <summary style="cursor:pointer;opacity:0.7;font-size:0.82rem;padding:4px 0">Erklärung (optional)</summary>
            <textarea id="eiExpl" rows="2"
                style="margin:6px 0 0;resize:vertical;font-size:0.88rem">${_eiEsc(q.explanation || '')}</textarea>
        </details>

        <!-- Hinweis -->
        <details style="margin-bottom:12px" ${q.hint ? 'open' : ''}>
            <summary style="cursor:pointer;opacity:0.7;font-size:0.82rem;padding:4px 0">Hinweis (optional)</summary>
            <textarea id="eiHint" rows="2"
                style="margin:6px 0 0;resize:vertical;font-size:0.88rem">${_eiEsc(q.hint || '')}</textarea>
        </details>

        <!-- Aktions-Buttons -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-small" onclick="_eiAccept(${i})" style="padding:6px 16px">
                ✓ Annehmen
            </button>
            <button class="btn btn-small btn-secondary" onclick="_eiSaveEdit(${i})"
                style="padding:6px 16px;background:var(--overlay-10);box-shadow:none">
                💾 Speichern
            </button>
            <button class="btn btn-small btn-secondary" onclick="_eiToggleEdit(${i})"
                style="padding:6px 12px;background:var(--overlay-10);box-shadow:none">
                Schließen
            </button>
            <button class="btn btn-small btn-secondary" onclick="_eiReject(${i})"
                style="margin-left:auto;padding:6px 12px;background:rgba(231,76,60,0.1);color:#e74c3c;border-color:rgba(231,76,60,0.3);box-shadow:none">
                ✕ Ablehnen
            </button>
        </div>
    </div>`;
}

// ── Antworten-Vorschau (für kollabierte Zeile) ────────────────────────────────

function _eiAnswerPreview(q) {
    if (q.type === QUESTION_TYPES.MULTIPLE_CHOICE && q.answers?.length) {
        return q.answers.map(a =>
            `<span style="font-size:0.78rem;padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;
                background:${a.correct ? 'rgba(46,204,113,0.15)' : 'var(--overlay-5)'};
                border:1px solid ${a.correct ? 'rgba(46,204,113,0.4)' : 'var(--overlay-10)'};
                color:${a.correct ? 'var(--correct)' : 'inherit'}">
                ${a.correct ? '✓ ' : ''}${_eiEsc(a.text)}
            </span>`
        ).join('');
    }
    if (q.type === QUESTION_TYPES.TEXT) {
        return getCorrectTextAnswers(q).map(a =>
            `<span style="font-size:0.78rem;padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;
                background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.4);color:var(--correct)">
                ${_eiEsc(a)}
            </span>`
        ).join('');
    }
    if (q.type === QUESTION_TYPES.IMAGEMAP) {
        const n = q.targets?.length || 0;
        return `<span style="font-size:0.78rem;opacity:0.5">${n} Zielzone${n !== 1 ? 'n' : ''}</span>`;
    }
    return '';
}

function _eiTypeIcon(type) {
    return type === QUESTION_TYPES.TEXT ? '📝' : type === QUESTION_TYPES.IMAGEMAP ? '🗺' : '☑';
}

// ── Edit-Aktionen ─────────────────────────────────────────────────────────────

function _eiToggleEdit(idx) {
    if (_eiEditIdx === idx) {
        _eiEditIdx = -1;
    } else {
        _eiEditIdx  = idx;
        _eiEditType = _eiPending[idx]?.type || QUESTION_TYPES.MULTIPLE_CHOICE;
    }
    AdminShell.showPanel('einreichungen');
}

function _eiSetEditType(type) {
    _eiEditType = type;
    AdminShell.showPanel('einreichungen');
}

function _eiSaveEdit(idx) {
    if (_eiApplyEdit(idx)) {
        Toast.show('Änderungen gespeichert.', 'success');
        AdminShell.showPanel('einreichungen');
    }
}

// Liest das Edit-Formular und schreibt Werte zurück nach _eiPending[idx].
// Gibt false zurück wenn Validierung fehlschlägt.
function _eiApplyEdit(idx) {
    const q    = _eiPending[idx];
    if (!q) return false;

    const text  = (document.getElementById('eiText')?.value  || '').trim();
    if (!text) { Toast.show('Fragetext darf nicht leer sein.', 'warning'); return false; }

    const group = (document.getElementById('eiGroup')?.value || '').trim() || 'Manuell';
    const expl  = (document.getElementById('eiExpl')?.value  || '').trim();
    const hint  = (document.getElementById('eiHint')?.value  || '').trim();

    let answers, correctAnswer;
    if (_eiEditType === QUESTION_TYPES.MULTIPLE_CHOICE) {
        answers = Array.from({ length: 4 }, (_, i) => ({
            text:    (document.getElementById('eiAns_' + i)?.value || '').trim(),
            correct: document.getElementById('eiCorr_' + i)?.checked || false
        })).filter(a => a.text);
        if (!answers.length)               { Toast.show('Mindestens eine Antwort angeben.', 'warning');              return false; }
        if (!answers.some(a => a.correct)) { Toast.show('Mindestens eine Antwort als korrekt markieren.', 'warning'); return false; }
    } else if (_eiEditType === QUESTION_TYPES.TEXT) {
        const raw = (document.getElementById('eiTextAns')?.value || '').trim();
        if (!raw) { Toast.show('Mindestens eine korrekte Antwort angeben.', 'warning'); return false; }
        correctAnswer = raw.split('\n').map(s => s.trim()).filter(Boolean);
        answers = [{ type: 'text', correctAnswers: correctAnswer }];
    }
    // Imagemap: Zonen bleiben unberührt, nur Text/Gruppe/Expl/Hint werden übernommen

    q.text        = text;
    q._fileGroup  = group;
    q.explanation = expl || null;
    q.hint        = hint || null;
    q.type        = _eiEditType;

    if (_eiEditType !== QUESTION_TYPES.IMAGEMAP) {
        q.answers = answers;
        if (_eiEditType === QUESTION_TYPES.TEXT) {
            q.correctAnswer = correctAnswer;
        } else {
            delete q.correctAnswer;
        }
        delete q.targets;
    }
    return true;
}

// ── Annehmen / Ablehnen ───────────────────────────────────────────────────────

function _eiAccept(idx) {
    // Wenn das Edit-Formular offen ist, erst speichern
    if (_eiEditIdx === idx) {
        if (!_eiApplyEdit(idx)) return;
    }

    const q = _eiPending[idx];
    if (!q) return;

    const group = q._fileGroup || 'Manuell';
    const newId = assignStableId(group, questions);
    q.questionId = newId;
    q.active     = true;

    q._createdAt = new Date().toISOString();
    delete q._pending;
    delete q._submittedAt;

    // Kopie für die Anzeige behalten (mit Einreicher-Info)
    const displayCopy = { ...q, _submittedBy: q._submittedBy };
    delete q._submittedBy;

    questions.push(q);
    _eiPending.splice(idx, 1);
    _eiAccepted.unshift(displayCopy);   // oben in der Accepted-Liste
    _eiEditIdx = -1;

    Toast.show(`✓ Frage ${newId} angenommen und zu "${group}" hinzugefügt.`, 'success');
    AdminShell.showPanel('einreichungen');
}

function _eiReject(idx) {
    const q = _eiPending[idx];
    if (!q) return;
    const preview = (q.text || '').substring(0, 60);
    if (!confirm(`Einreichung ablehnen?\n\n"${preview}…"`)) return;
    _eiPending.splice(idx, 1);
    if (_eiEditIdx === idx) _eiEditIdx = -1;
    Toast.show('Einreichung abgelehnt.', 'info');
    AdminShell.showPanel('einreichungen');
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
                const data    = JSON.parse(e.target.result);
                const qs      = Array.isArray(data) ? data : (data.questions || []);
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

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

function _eiEsc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
