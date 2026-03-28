// === Forge: Fragen-Verwaltung (Erstellen + Export) ===
// MC, Text und Bildklick-Fragen

let _fqShowForm    = false;
let _fqFormType    = QUESTION_TYPES.MULTIPLE_CHOICE;
let _fqGroupFilter = '';
let _fqEditIdx     = -1;   // -1 = neue Frage, >= 0 = Index in questions[]

// Imagemap editor state
let _fqImMode         = 'circle';
let _fqImPoints       = [];
let _fqImRadius       = 5;
let _fqImZones        = [];
let _fqImPolyFinalized = false;
let _fqImDragIdx      = -1;
let _fqImImageSrc     = null;
let _fqImPathVal      = '';

// ── Panel ─────────────────────────────────────────────────────────────────────

AdminShell.registerPanel('fragen', 'Fragen', '🗂', container => {
    if (!dataLoaded) {
        container.innerHTML = `
            <div class="card">
                <p class="text-muted" style="text-align:center;padding:30px 0">
                    Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").
                </p>
            </div>`;
        return;
    }
    _fqShowForm ? _fqRenderForm(container) : _fqRenderList(container);
});

// ── Listen-Ansicht ────────────────────────────────────────────────────────────

function _fqRenderList(container) {
    const groups  = [...new Set(questions.map(q => q._fileGroup || 'Manuell'))].sort();
    const filtered = _fqGroupFilter
        ? questions.filter(q => (q._fileGroup || 'Manuell') === _fqGroupFilter)
        : questions;

    const typeIcon = t => t === QUESTION_TYPES.TEXT ? '📝' : t === QUESTION_TYPES.IMAGEMAP ? '🗺' : '☑';

    const rows = questions
        .map((q, idx) => ({ q, idx }))
        .filter(({ q }) => !_fqGroupFilter || (q._fileGroup || 'Manuell') === _fqGroupFilter)
        .map(({ q, idx }) => `
        <tr>
            <td style="opacity:0.45;width:40px">${q.displayNumber ?? '—'}</td>
            <td style="width:28px;text-align:center" title="${q.type}">${typeIcon(q.type)}</td>
            <td style="max-width:380px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${_fqEsc(q.text)}</td>
            <td class="td-muted td-nowrap" style="font-size:0.82rem">${_fqEsc(q._fileGroup || 'Manuell')}</td>
            <td style="opacity:0.4;font-size:0.78rem">${q.questionId || '—'}</td>
            <td style="width:36px;text-align:center">
                <button class="btn btn-small btn-secondary" onclick="_fqOpenEdit(${idx})"
                    style="padding:3px 8px;font-size:0.8rem;background:var(--overlay-10);box-shadow:none"
                    title="Bearbeiten">✏</button>
            </td>
        </tr>`).join('');

    const groupOptions = groups.map(g =>
        `<option value="${_fqEsc(g)}" ${_fqGroupFilter === g ? 'selected' : ''}>${_fqEsc(g)}</option>`
    ).join('');

    container.innerHTML = `
        <div class="card">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <div style="flex:1;min-width:160px">
                    <h2 style="margin:0;font-size:1.2rem">${questions.length} Fragen geladen</h2>
                </div>
                <select id="fqGroupFilter" onchange="_fqSetGroupFilter(this.value)"
                    style="margin:0;width:auto;padding:8px 12px;font-size:0.85rem">
                    <option value="">Alle Gruppen</option>
                    ${groupOptions}
                </select>
                <button class="btn btn-small btn-secondary" onclick="_fqStartExport()">
                    ↓ Exportieren
                </button>
                <button class="btn btn-small" onclick="_fqOpenForm()">
                    + Neue Frage
                </button>
            </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden">
            <table class="info-table" style="font-size:0.88rem;margin:0">
                <thead>
                    <tr style="opacity:0.5;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;background:var(--overlay-5)">
                        <td style="padding:10px 8px">#</td>
                        <td></td>
                        <td style="padding:10px 8px">Frage</td>
                        <td style="padding:10px 8px">Gruppe</td>
                        <td style="padding:10px 8px">ID</td>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="6" style="text-align:center;padding:30px;opacity:0.4">Keine Fragen in dieser Gruppe</td></tr>'}
                </tbody>
            </table>
        </div>`;
}

function _fqSetGroupFilter(val) {
    _fqGroupFilter = val;
    AdminShell.showPanel('fragen');
}

// ── Formular ──────────────────────────────────────────────────────────────────

function _fqOpenForm() {
    _fqEditIdx  = -1;
    _fqShowForm = true;
    _fqFormType = QUESTION_TYPES.MULTIPLE_CHOICE;
    _fqImReset();
    AdminShell.showPanel('fragen');
}

function _fqOpenEdit(idx) {
    const q = questions[idx];
    if (!q) return;
    _fqEditIdx  = idx;
    _fqShowForm = true;
    _fqFormType = q.type || QUESTION_TYPES.MULTIPLE_CHOICE;
    _fqImReset();
    if (q.type === QUESTION_TYPES.IMAGEMAP) {
        _fqImZones    = q.targets ? JSON.parse(JSON.stringify(q.targets)) : [];
        _fqImPathVal  = q.media?.path || '';
        _fqImImageSrc = _fqImPathVal || null;
    }
    AdminShell.showPanel('fragen');
}

function _fqCloseForm() {
    _fqEditIdx  = -1;
    _fqShowForm = false;
    AdminShell.showPanel('fragen');
}

function _fqSetType(type) {
    _fqFormType = type;
    if (type === QUESTION_TYPES.IMAGEMAP) _fqImReset();
    AdminShell.showPanel('fragen');
}

function _fqRenderForm(container) {
    const isEdit  = _fqEditIdx >= 0;
    const eq      = isEdit ? questions[_fqEditIdx] : null;
    const groups  = [...new Set(questions.map(q => q._fileGroup || 'Manuell'))].sort();
    const isMC    = _fqFormType === QUESTION_TYPES.MULTIPLE_CHOICE;
    const isText  = _fqFormType === QUESTION_TYPES.TEXT;
    const isIm    = _fqFormType === QUESTION_TYPES.IMAGEMAP;

    // Vorausgefüllte Werte aus bestehender Frage
    const prefillText      = _fqEsc(eq?.text || '');
    const prefillGroup     = eq?._fileGroup || '';
    const prefillMedia     = (!isIm && eq?.media?.path)          ? _fqEsc(eq.media.path)           : '';
    const prefillExpl      = _fqEsc(eq?.explanation || '');
    const prefillExplMedia = _fqEsc(eq?.explanationMedia?.path || '');
    const prefillHint      = _fqEsc(eq?.hint || '');
    const prefillHintMedia = _fqEsc(eq?.hintMedia?.path || '');

    const groupOptions = groups.map(g =>
        `<option value="${_fqEsc(g)}" ${prefillGroup === g ? 'selected' : ''}>${_fqEsc(g)}</option>`
    ).join('');

    let answerFields;
    if (isMC) {
        const mcAnswers = (eq?.type === QUESTION_TYPES.MULTIPLE_CHOICE ? eq.answers : null) || [];
        answerFields = Array.from({ length: 4 }, (_, i) => {
            const a = mcAnswers[i] || { text: '', correct: false };
            return `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <input type="checkbox" id="fqCorr_${i}" style="width:auto;margin:0;flex-shrink:0"
                title="Korrekte Antwort" ${a.correct ? 'checked' : ''}>
            <input type="text" id="fqAns_${i}" placeholder="Antwort ${i + 1}"
                value="${_fqEsc(a.text)}"
                style="margin:0;flex:1;padding:8px 12px;font-size:0.9rem">
        </div>`;
        }).join('');
    } else if (isText) {
        const textVal = (eq?.type === QUESTION_TYPES.TEXT) ? getCorrectTextAnswers(eq).join('\n') : '';
        answerFields = `
        <textarea id="fqTextAns" rows="3" placeholder="Eine korrekte Antwort pro Zeile"
            style="margin:0;resize:vertical;font-size:0.9rem">${_fqEsc(textVal)}</textarea>`;
    } else {
        answerFields = _fqImBuildHTML();
    }

    const mediaOpen = prefillMedia ? 'open' : '';
    const explOpen  = (prefillExpl || prefillExplMedia) ? 'open' : '';
    const hintOpen  = (prefillHint || prefillHintMedia) ? 'open' : '';

    const mediaSection = isIm ? '' : `
            <details style="margin-top:12px" ${mediaOpen}>
                <summary style="cursor:pointer;opacity:0.7;font-size:0.85rem;padding:4px 0">
                    Bild / Media (optional)
                </summary>
                <input type="text" id="fqMedia" value="${prefillMedia}"
                    placeholder="Pfad zur Bilddatei, z.B. bilder/frage01.jpg"
                    style="margin:8px 0 0;font-size:0.9rem">
            </details>`;

    container.innerHTML = `
        <div class="card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
                <button class="btn btn-small btn-secondary" onclick="_fqCloseForm()"
                    style="background:var(--overlay-10);box-shadow:none">
                    ← Zurück
                </button>
                <h2 style="margin:0;font-size:1.2rem">${isEdit ? 'Frage bearbeiten' : 'Neue Frage'}</h2>
                ${isEdit ? `<span style="opacity:0.4;font-size:0.8rem">#${eq.displayNumber ?? '—'} · ${_fqEsc(eq.questionId || '')}</span>` : ''}
            </div>

            <!-- Typ -->
            <label>Typ</label>
            <div style="display:flex;gap:8px;margin-bottom:4px">
                <button class="btn btn-small ${isMC ? '' : 'btn-secondary'}"
                    onclick="_fqSetType('${QUESTION_TYPES.MULTIPLE_CHOICE}')"
                    style="${isMC ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                    ☑ Multiple Choice
                </button>
                <button class="btn btn-small ${isText ? '' : 'btn-secondary'}"
                    onclick="_fqSetType('${QUESTION_TYPES.TEXT}')"
                    style="${isText ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                    📝 Freitext
                </button>
                <button class="btn btn-small ${isIm ? '' : 'btn-secondary'}"
                    onclick="_fqSetType('${QUESTION_TYPES.IMAGEMAP}')"
                    style="${isIm ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                    🗺 Bildklick
                </button>
            </div>

            <!-- Text -->
            <label for="fqText">Fragetext *</label>
            <textarea id="fqText" rows="3" placeholder="Fragetext eingeben…"
                style="margin:0;resize:vertical">${prefillText}</textarea>

            <!-- Gruppe -->
            <label for="fqGroup">Gruppe</label>
            <select id="fqGroup" onchange="_fqToggleNewGroup(this.value)"
                style="margin:0 0 6px">
                ${groupOptions}
                <option value="__new__">+ Neue Gruppe…</option>
            </select>
            <input type="text" id="fqGroupNew" placeholder="Neuer Gruppenname"
                style="display:none;margin:0 0 6px;padding:8px 12px;font-size:0.9rem">

            <!-- Antworten / Zonen -->
            <label>${isMC ? 'Antworten (✓ = korrekt)' : isText ? 'Korrekte Antworten' : 'Zielzonen'}</label>
            <div id="fqAnswers">${answerFields}</div>

            ${mediaSection}

            <!-- Erklärung -->
            <details style="margin-top:8px" ${explOpen}>
                <summary style="cursor:pointer;opacity:0.7;font-size:0.85rem;padding:4px 0">
                    Erklärung (optional)
                </summary>
                <textarea id="fqExpl" rows="2" placeholder="Erklärungstext nach der Antwort"
                    style="margin:8px 0 4px;resize:vertical;font-size:0.9rem">${prefillExpl}</textarea>
                <input type="text" id="fqExplMedia" value="${prefillExplMedia}"
                    placeholder="Pfad zum Erklärungs-Bild" style="margin:0;font-size:0.9rem">
            </details>

            <!-- Hinweis -->
            <details style="margin-top:8px" ${hintOpen}>
                <summary style="cursor:pointer;opacity:0.7;font-size:0.85rem;padding:4px 0">
                    Hinweis (optional)
                </summary>
                <textarea id="fqHint" rows="2" placeholder="Hinweistext für Hint-Fähigkeit"
                    style="margin:8px 0 4px;resize:vertical;font-size:0.9rem">${prefillHint}</textarea>
                <input type="text" id="fqHintMedia" value="${prefillHintMedia}"
                    placeholder="Pfad zum Hinweis-Bild" style="margin:0;font-size:0.9rem">
            </details>

            <div style="display:flex;gap:10px;margin-top:24px">
                <button class="btn btn-small" onclick="_fqSave()">
                    💾 ${isEdit ? 'Änderungen speichern' : 'Frage speichern'}
                </button>
                <button class="btn btn-small btn-secondary" onclick="_fqCloseForm()"
                    style="background:var(--overlay-10);box-shadow:none">
                    Abbrechen
                </button>
            </div>
        </div>`;
}

function _fqToggleNewGroup(val) {
    const input = document.getElementById('fqGroupNew');
    if (input) input.style.display = val === '__new__' ? 'block' : 'none';
}

// ── Speichern ─────────────────────────────────────────────────────────────────

function _fqSave() {
    const text = (document.getElementById('fqText')?.value || '').trim();
    if (!text) { Toast.show('Fragetext darf nicht leer sein.', 'warning'); return; }

    // Gruppe
    const groupSel = document.getElementById('fqGroup')?.value || 'Manuell';
    let group = groupSel === '__new__'
        ? (document.getElementById('fqGroupNew')?.value || '').trim() || 'Manuell'
        : groupSel;

    // Antworten validieren
    let answers, correctAnswer, targets;
    if (_fqFormType === QUESTION_TYPES.MULTIPLE_CHOICE) {
        answers = Array.from({ length: 4 }, (_, i) => ({
            text:    (document.getElementById('fqAns_' + i)?.value || '').trim(),
            correct: document.getElementById('fqCorr_' + i)?.checked || false
        })).filter(a => a.text);
        if (!answers.length) { Toast.show('Mindestens eine Antwort angeben.', 'warning'); return; }
        if (!answers.some(a => a.correct)) { Toast.show('Mindestens eine Antwort als korrekt markieren.', 'warning'); return; }
    } else if (_fqFormType === QUESTION_TYPES.TEXT) {
        const raw = (document.getElementById('fqTextAns')?.value || '').trim();
        if (!raw) { Toast.show('Mindestens eine korrekte Antwort angeben.', 'warning'); return; }
        correctAnswer = raw.split('\n').map(s => s.trim()).filter(Boolean);
        answers = [{ type: 'text', correctAnswers: correctAnswer }];
    } else {
        // Imagemap
        targets = _fqGetTargets();
        if (!targets.length) { Toast.show('Mindestens eine Zielzone definieren.', 'warning'); return; }
        if (!_fqImImageSrc) { Toast.show('Bitte zuerst ein Bild laden!', 'warning'); return; }
    }

    // Media
    const mediaPath   = (document.getElementById('fqMedia')?.value || '').trim();
    const explText    = (document.getElementById('fqExpl')?.value || '').trim();
    const explMedia   = (document.getElementById('fqExplMedia')?.value || '').trim();
    const hintText    = (document.getElementById('fqHint')?.value || '').trim();
    const hintMedia   = (document.getElementById('fqHintMedia')?.value || '').trim();

    const imMedia = _fqFormType === QUESTION_TYPES.IMAGEMAP && _fqImPathVal
        ? { type: 'image', path: _fqImPathVal } : null;
    const resolvedMedia = imMedia || (mediaPath ? { type: 'image', path: mediaPath } : null);

    if (_fqEditIdx >= 0) {
        // ── Bestehende Frage aktualisieren ──────────────────────────────────
        const q        = questions[_fqEditIdx];
        const oldGroup = q._fileGroup;
        q.text         = text;
        q.type         = _fqFormType;
        q._fileGroup   = group;
        if (group !== oldGroup) {
            q._oldQuestionId = q.questionId;
            q.questionId     = _fmAssignStableId(group, questions);
        }
        q.media            = resolvedMedia;
        q.explanation      = explText  || null;
        q.explanationMedia = explMedia ? { type: 'image', path: explMedia } : null;
        q.hint             = hintText  || null;
        q.hintMedia        = hintMedia ? { type: 'image', path: hintMedia } : null;
        delete q.answers; delete q.correctAnswer; delete q.targets;
        if (_fqFormType === QUESTION_TYPES.TEXT) {
            q.correctAnswer = correctAnswer;
            q.answers       = answers;
        } else if (_fqFormType === QUESTION_TYPES.IMAGEMAP) {
            q.targets = targets;
        } else {
            q.answers = answers;
        }
        Toast.show(`Frage #${q.displayNumber} aktualisiert.`, 'success');
    } else {
        // ── Neue Frage anlegen ───────────────────────────────────────────────
        const usedNums = new Set(questions.map(q => q.displayNumber).filter(n => typeof n === 'number'));
        let dispNum = 1;
        while (usedNums.has(dispNum)) dispNum++;
        const questionId = _fmAssignStableId(group, questions);
        const newQ = {
            id:              Date.now() + Math.floor(Math.random() * 1000),
            questionId,
            displayNumber:   dispNum,
            text,
            type:            _fqFormType,
            active:          true,
            _fileGroup:      group,
            media:           resolvedMedia,
            explanation:     explText  || null,
            explanationMedia:explMedia ? { type: 'image', path: explMedia } : null,
            hint:            hintText  || null,
            hintMedia:       hintMedia ? { type: 'image', path: hintMedia } : null,
        };
        if (_fqFormType === QUESTION_TYPES.TEXT) {
            newQ.correctAnswer = correctAnswer;
            newQ.answers       = answers;
        } else if (_fqFormType === QUESTION_TYPES.IMAGEMAP) {
            newQ.targets = targets;
        } else {
            newQ.answers = answers;
        }
        questions.push(newQ);
        Toast.show(`Frage #${dispNum} erstellt (${group}).`, 'success');
    }

    _fqEditIdx  = -1;
    _fqShowForm = false;
    AdminShell.showPanel('fragen');
}

// ── Export ────────────────────────────────────────────────────────────────────

function _fqStartExport() {
    if (!questions.length) { Toast.show('Keine Fragen zum Exportieren.', 'warning'); return; }

    // Fragen nach Gruppe gruppieren
    const byGroup = {};
    questions.forEach(q => {
        const g = q._fileGroup || 'Manuell';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(q);
    });

    const ts = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');

    Object.entries(byGroup).forEach(([group, qs]) => {
        const safeName = group.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
        const data = {
            theme:     group,
            questions: qs.map(_fqBuildExportQ)
        };
        const filename = `03_questions_${safeName}_${ts}.json`;
        _fqDownload(JSON.stringify(data, null, 2), filename);
    });

    Toast.show(`${Object.keys(byGroup).length} Datei(en) exportiert.`, 'success');
}

function _fqBuildExportQ(q) {
    const out = {
        id:              q.id,
        questionId:      q.questionId,
        displayNumber:   q.displayNumber ?? null,
        text:            q.text,
        type:            q.type,
        active:          q.active !== false,
        media:           q.media || null,
        explanation:     q.explanation || null,
        explanationMedia:q.explanationMedia || null,
        hint:            q.hint || null,
        hintMedia:       q.hintMedia || null,
        _fileGroup:      q._fileGroup || 'Manuell',
    };
    if (q.type === QUESTION_TYPES.TEXT) {
        out.correctAnswer = getCorrectTextAnswers(q);
    } else if (q.type === QUESTION_TYPES.IMAGEMAP) {
        out.targets = q.targets;
    } else {
        out.answers = q.answers;
    }
    return out;
}

function _fqDownload(content, filename) {
    if (quizSettings?.encryptPlayerData) {
        try { content = btoa(unescape(encodeURIComponent(content))); } catch (e) {}
    }
    const blob = new Blob([content], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Imagemap Editor ───────────────────────────────────────────────────────────

function _fqImReset() {
    _fqImMode         = 'circle';
    _fqImPoints       = [];
    _fqImRadius       = 5;
    _fqImZones        = [];
    _fqImPolyFinalized = false;
    _fqImDragIdx      = -1;
    _fqImImageSrc     = null;
    _fqImPathVal      = '';
}

function _fqImBuildHTML() {
    const isCi   = _fqImMode === 'circle';
    const isPoly = _fqImMode === 'polygon';

    let controls = `
        <div style="display:flex;gap:8px;margin-bottom:8px">
            <button class="btn btn-small ${isCi ? '' : 'btn-secondary'}"
                onclick="_fqImMode='circle';_fqImPoints=[];_fqImPolyFinalized=false;_fqImRefresh()"
                style="${isCi ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                ⭕ Kreis
            </button>
            <button class="btn btn-small ${isPoly ? '' : 'btn-secondary'}"
                onclick="_fqImMode='polygon';_fqImPoints=[];_fqImPolyFinalized=false;_fqImRefresh()"
                style="${isPoly ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                🔷 Polygon
            </button>
        </div>`;

    if (isCi) {
        controls += `
        <div style="display:flex;gap:15px;align-items:center;margin-bottom:8px">
            <label style="font-size:0.82rem;margin:0">Radius: <strong id="fqImRadVal">${_fqImRadius}</strong>%</label>
            <input type="range" min="1" max="15" value="${_fqImRadius}" step="0.5"
                oninput="_fqImRadius=parseFloat(this.value);document.getElementById('fqImRadVal').textContent=this.value;_fqImRedraw()"
                style="flex:1;margin:0">
        </div>`;
    }

    if (isPoly) {
        const canClose = _fqImPoints.length >= 3 && !_fqImPolyFinalized;
        controls += `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
            <button class="btn btn-small btn-secondary" style="background:var(--overlay-10);box-shadow:none"
                onclick="_fqImPoints.pop();_fqImPolyFinalized=false;_fqImRefresh()">↩ Letzten Punkt</button>
            <button class="btn btn-small btn-secondary" style="background:var(--overlay-10);box-shadow:none"
                onclick="_fqImPoints=[];_fqImPolyFinalized=false;_fqImRefresh()">✕ Alle Punkte</button>
            ${canClose ? `<button class="btn btn-small" onclick="_fqImPolyFinalized=true;_fqImRefresh()">🔷 Polygon schließen</button>` : ''}
            <span style="font-size:0.8rem;opacity:0.6;padding:4px">${_fqImPoints.length} Punkte</span>
        </div>`;
    }

    const imgContent = _fqImImageSrc
        ? `<img id="fqImgEl" src="${_fqImImageSrc}" onclick="_fqImClick(event)"
              style="width:100%;display:block;user-select:none;cursor:crosshair">`
        : `<p style="padding:40px;text-align:center;opacity:0.4">Bild laden um Zielzonen zu definieren</p>`;

    return `
        <div id="fqImSection" style="padding:12px;background:var(--overlay-5);border:1px solid var(--overlay-15);border-radius:12px;margin:0">
            <!-- Bild-Loader -->
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
                <input type="text" id="fqImgPath" value="${_fqEsc(_fqImPathVal)}"
                    placeholder="Bildpfad (z.B. medien/karte.jpg)"
                    style="flex:1;margin:0;padding:8px 12px;font-size:0.85rem">
                <input type="file" id="fqImgFileInput" accept="image/*" style="display:none" onchange="_fqImLoadFile(event)">
                <button class="btn btn-small btn-secondary" style="background:var(--overlay-10);box-shadow:none;white-space:nowrap"
                    onclick="document.getElementById('fqImgFileInput').click()">📁 Bild</button>
                <button class="btn btn-small" style="white-space:nowrap" onclick="_fqImLoadPath()">Laden</button>
            </div>
            <!-- Modus-Controls -->
            ${controls}
            <!-- Zone speichern -->
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
                <button class="btn btn-small" onclick="_fqImAddZone()">＋ Zone speichern</button>
                <span style="font-size:0.82rem;opacity:0.5">${_fqImZones.length} Zonen</span>
            </div>
            <!-- Zone-Liste -->
            <div id="fqImZoneInfo" style="margin-bottom:8px"></div>
            <!-- Bild-Bereich -->
            <div id="fqImgArea" style="position:relative;border:2px dashed var(--overlay-20);border-radius:10px;overflow:hidden;cursor:crosshair;min-height:100px">
                ${imgContent}
            </div>
        </div>`;
}

function _fqImRefresh() {
    const section = document.getElementById('fqImSection');
    if (!section) return;
    _fqImPathVal = document.getElementById('fqImgPath')?.value || _fqImPathVal;
    section.outerHTML = _fqImBuildHTML();
    _fqImRedraw();
}

function _fqImRedraw() {
    const area = document.getElementById('fqImgArea');
    if (!area) return;

    // Remove old overlays
    area.querySelectorAll('.fqIm-overlay').forEach(el => el.remove());

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'fqIm-overlay');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:20';

    let svgContent = '';

    // Gespeicherte Zonen (grün)
    _fqImZones.forEach(zone => {
        if (zone.mode === 'circle') {
            svgContent += `<circle cx="${zone.x}" cy="${zone.y}" r="${zone.radius}" fill="rgba(46,204,113,0.15)" stroke="rgba(46,204,113,0.8)" stroke-width="0.4"/>`;
        } else if (zone.mode === 'polygon' && zone.points?.length >= 3) {
            const pts = zone.points.map(p => `${p.x},${p.y}`).join(' ');
            svgContent += `<polygon points="${pts}" fill="rgba(46,204,113,0.2)" stroke="rgba(46,204,113,0.8)" stroke-width="0.4"/>`;
        }
    });

    // Aktuelle Form (rot)
    if (_fqImMode === 'circle' && _fqImPoints.length > 0) {
        const p = _fqImPoints[0];
        svgContent += `<circle cx="${p.x}" cy="${p.y}" r="${_fqImRadius}" fill="rgba(231,76,60,0.15)" stroke="rgba(231,76,60,0.8)" stroke-width="0.4" stroke-dasharray="1,0.5"/>`;
        svgContent += `<circle cx="${p.x}" cy="${p.y}" r="1" fill="#e74c3c" stroke="#fff" stroke-width="0.3"/>`;
    } else if (_fqImMode === 'polygon' && _fqImPoints.length > 0) {
        if (_fqImPoints.length > 1) {
            const pts = _fqImPoints.map(p => `${p.x},${p.y}`).join(' ');
            if (_fqImPolyFinalized) {
                svgContent += `<polygon points="${pts}" fill="rgba(231,76,60,0.15)" stroke="rgba(231,76,60,0.8)" stroke-width="0.4"/>`;
            } else {
                svgContent += `<polyline points="${pts}" fill="none" stroke="rgba(231,76,60,0.8)" stroke-width="0.4" stroke-dasharray="1,0.5"/>`;
            }
        }
        _fqImPoints.forEach((p, i) => {
            svgContent += `<circle cx="${p.x}" cy="${p.y}" r="1.2" fill="#e74c3c" stroke="#fff" stroke-width="0.25"/>`;
            svgContent += `<text x="${p.x}" y="${p.y + 0.4}" text-anchor="middle" dominant-baseline="central" font-size="1.4" fill="#fff" font-weight="900" style="pointer-events:none">${i + 1}</text>`;
        });
    }

    svg.innerHTML = svgContent;
    area.appendChild(svg);

    // Polygon-Drag-Handles (echte DOM-Elemente für Mouse-Events)
    if (_fqImMode === 'polygon' && _fqImPoints.length > 0) {
        _fqImPoints.forEach((p, i) => {
            const handle = document.createElement('div');
            handle.className = 'fqIm-overlay';
            handle.style.cssText = 'position:absolute;width:18px;height:18px;background:transparent;border-radius:50%;transform:translate(-50%,-50%);z-index:25;cursor:move';
            handle.style.left = p.x + '%';
            handle.style.top  = p.y + '%';
            handle.addEventListener('mousedown', ev => {
                ev.stopPropagation();
                _fqImDragIdx = i;
                function onMove(me) {
                    const imgEl = area.querySelector('img');
                    if (!imgEl) return;
                    const rect = imgEl.getBoundingClientRect();
                    _fqImPoints[_fqImDragIdx].x = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
                    _fqImPoints[_fqImDragIdx].y = Math.max(0, Math.min(100, ((me.clientY - rect.top) / rect.height) * 100));
                    _fqImRedraw();
                }
                function onUp() {
                    _fqImDragIdx = -1;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                }
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
            area.appendChild(handle);
        });
    }

    // Zone-Info live aktualisieren
    const counterEl = document.getElementById('fqImZoneInfo');
    if (counterEl) {
        if (_fqImZones.length > 0) {
            let info = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">';
            _fqImZones.forEach((z, i) => {
                const label = `${i + 1}. ${z.mode === 'circle' ? 'Kreis' : 'Polygon'}`;
                info += `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);padding:4px 10px;border-radius:6px;font-size:0.82rem">`;
                info += `<span style="color:var(--correct)">${label}</span>`;
                info += `<span onclick="_fqImZoneDelete(${i})" style="cursor:pointer;color:#e74c3c;font-weight:700;margin-left:4px" title="Zone löschen">✕</span>`;
                info += `</span>`;
            });
            info += '</div>';
            counterEl.innerHTML = info;
        } else {
            counterEl.innerHTML = '';
        }
    }
}

function _fqImZoneDelete(i) {
    _fqImZones.splice(i, 1);
    _fqImRedraw();
}

function _fqImClick(event) {
    if (_fqImDragIdx >= 0) return;
    const img  = event.target;
    const rect = img.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top)  / rect.height) * 100;
    if (_fqImMode === 'circle') {
        _fqImPoints = [{ x, y }];
    } else {
        if (!_fqImPolyFinalized) _fqImPoints.push({ x, y });
    }
    _fqImRedraw();
}

function _fqImLoadPath() {
    const pathEl = document.getElementById('fqImgPath');
    if (!pathEl?.value.trim()) { Toast.show('Bitte Bildpfad eingeben!', 'warning'); return; }
    _fqImPathVal  = pathEl.value.trim();
    _fqImImageSrc = _fqImPathVal;
    _fqImRefresh();
}

function _fqImLoadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        _fqImImageSrc = e.target.result;
        const pathEl = document.getElementById('fqImgPath');
        if (pathEl && !pathEl.value.trim()) {
            _fqImPathVal = 'medien/' + file.name;
        } else {
            _fqImPathVal = pathEl?.value || '';
        }
        _fqImRefresh();
    };
    reader.readAsDataURL(file);
}

function _fqImAddZone() {
    if (_fqImMode === 'circle' && _fqImPoints.length > 0) {
        _fqImZones.push({ mode: 'circle',
            x: Math.round(_fqImPoints[0].x * 100) / 100,
            y: Math.round(_fqImPoints[0].y * 100) / 100,
            radius: _fqImRadius });
        _fqImPoints = [];
    } else if (_fqImMode === 'polygon' && _fqImPoints.length >= 3) {
        _fqImZones.push({ mode: 'polygon',
            points: _fqImPoints.map(p => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })),
            tolerance: 2 });
        _fqImPoints = [];
        _fqImPolyFinalized = false;
    } else {
        Toast.show(_fqImMode === 'circle' ? 'Erst auf Bild klicken.' : 'Mindestens 3 Punkte setzen.', 'warning');
        return;
    }
    _fqImRedraw();
    Toast.show(`Zone ${_fqImZones.length} gespeichert!`, 'success');
}

function _fqGetTargets() {
    const targets = JSON.parse(JSON.stringify(_fqImZones));
    if (_fqImMode === 'circle' && _fqImPoints.length > 0) {
        targets.push({ mode: 'circle',
            x: Math.round(_fqImPoints[0].x * 100) / 100,
            y: Math.round(_fqImPoints[0].y * 100) / 100,
            radius: _fqImRadius });
    } else if (_fqImMode === 'polygon' && _fqImPoints.length >= 3) {
        targets.push({ mode: 'polygon',
            points: _fqImPoints.map(p => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })),
            tolerance: 2 });
    }
    return targets;
}

function _fqEsc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
