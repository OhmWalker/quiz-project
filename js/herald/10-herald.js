// === Herald — Fragen einreichen ===
// Standalone-App: Nutzer erstellt Fragen, lädt sie als pending-JSON herunter.
// Admin prüft die JSON in Forge (Tab "Einreichungen") und nimmt Fragen an.

// ── State ─────────────────────────────────────────────────────────────────────

let _hrFormType  = QUESTION_TYPES.MULTIPLE_CHOICE;
let _hrDrafts    = [];   // gesammelte Fragen in dieser Session
let _hrAuthor    = '';   // bleibt über Fragen-Einreichungen hinweg erhalten
let _hrLastGroup = '';   // zuletzt gewählte Gruppe

// Imagemap-State (identisch mit forge-fragen.js)
let _fqImMode          = 'circle';
let _fqImPoints        = [];
let _fqImRadius        = 5;
let _fqImZones         = [];
let _fqImPolyFinalized = false;
let _fqImDragIdx       = -1;
let _fqImImageSrc      = null;
let _fqImPathVal       = '';

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', _hrRender);

// ── Hauptrender ───────────────────────────────────────────────────────────────

function _hrRender() {
    const app = document.getElementById('heraldApp');
    if (!app) return;

    const isMC   = _hrFormType === QUESTION_TYPES.MULTIPLE_CHOICE;
    const isText = _hrFormType === QUESTION_TYPES.TEXT;
    const isIm   = _hrFormType === QUESTION_TYPES.IMAGEMAP;

    let answerFields;
    if (isMC) {
        answerFields = Array.from({ length: 4 }, (_, i) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <input type="checkbox" id="hrCorr_${i}"
                    style="width:auto;margin:0;flex-shrink:0" title="Korrekte Antwort">
                <input type="text" id="hrAns_${i}" placeholder="Antwort ${i + 1}"
                    style="margin:0;flex:1;padding:8px 12px;font-size:0.9rem">
            </div>`).join('');
    } else if (isText) {
        answerFields = `
            <textarea id="hrTextAns" rows="3"
                placeholder="Eine korrekte Antwort pro Zeile"
                style="margin:0;resize:vertical;font-size:0.9rem"></textarea>`;
    } else {
        answerFields = _fqImBuildHTML();
    }

    const mediaSection = isIm ? '' : `
        <details style="margin-top:12px">
            <summary style="cursor:pointer;opacity:0.7;font-size:0.85rem;padding:4px 0">
                Bild / Media (optional)
            </summary>
            <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
                <input type="text" id="hrMedia"
                    placeholder="Pfad zur Bilddatei, z.B. bilder/frage01.jpg"
                    style="margin:0;flex:1;font-size:0.9rem">
                <input type="file" id="hrMediaFile" accept="image/*" style="display:none"
                    onchange="_fqHandleMediaBrowse(event,'hrMedia')">
                <button class="btn btn-small btn-secondary"
                    onclick="document.getElementById('hrMediaFile').click()"
                    style="white-space:nowrap;padding:4px 10px;font-size:0.8rem;background:var(--overlay-10);box-shadow:none">
                    📂 Durchsuchen
                </button>
            </div>
        </details>`;

    const draftRows = _hrDrafts.map((q, i) => {
        const typeIcon = q.type === QUESTION_TYPES.TEXT ? '📝'
                       : q.type === QUESTION_TYPES.IMAGEMAP ? '🗺' : '☑';
        return `
            <tr>
                <td style="width:28px;text-align:center;opacity:0.6">${typeIcon}</td>
                <td style="max-width:360px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
                    ${_fqEsc(q.text)}
                </td>
                <td style="font-size:0.82rem;opacity:0.6;white-space:nowrap">
                    ${_fqEsc(q._fileGroup || '—')}
                </td>
                <td style="width:40px;text-align:center">
                    <button onclick="_hrRemoveDraft(${i})"
                        style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:1rem;padding:2px 8px"
                        title="Entfernen">✕</button>
                </td>
            </tr>`;
    }).join('');

    app.innerHTML = `
        <div class="card">
            <h2 style="margin:0 0 20px;font-size:1.2rem">⚔ Frage einreichen</h2>

            <label>Typ</label>
            <div style="display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                <button class="btn btn-small ${isMC ? '' : 'btn-secondary'}"
                    onclick="_hrSetType('${QUESTION_TYPES.MULTIPLE_CHOICE}')"
                    style="${isMC ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                    ☑ Multiple Choice
                </button>
                <button class="btn btn-small ${isText ? '' : 'btn-secondary'}"
                    onclick="_hrSetType('${QUESTION_TYPES.TEXT}')"
                    style="${isText ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                    📝 Freitext
                </button>
                <button class="btn btn-small ${isIm ? '' : 'btn-secondary'}"
                    onclick="_hrSetType('${QUESTION_TYPES.IMAGEMAP}')"
                    style="${isIm ? '' : 'background:var(--overlay-10);box-shadow:none'}">
                    🗺 Bildklick
                </button>
            </div>

            <label for="hrText">Fragetext *</label>
            <textarea id="hrText" rows="3" placeholder="Fragetext eingeben…"
                style="margin:0;resize:vertical"></textarea>

            <label for="hrGroup">Thema / Kategorie</label>
            ${_hrGroupInput()}

            <label>${isMC ? 'Antworten (✓ = korrekt)' : isText ? 'Korrekte Antworten' : 'Zielzonen'}</label>
            <div id="hrAnswers">${answerFields}</div>

            ${mediaSection}

            <details style="margin-top:8px">
                <summary style="cursor:pointer;opacity:0.7;font-size:0.85rem;padding:4px 0">
                    Erklärung (optional)
                </summary>
                <textarea id="hrExpl" rows="2"
                    placeholder="Erklärungstext der nach der Antwort angezeigt wird"
                    style="margin:8px 0 0;resize:vertical;font-size:0.9rem"></textarea>
            </details>

            <details style="margin-top:8px">
                <summary style="cursor:pointer;opacity:0.7;font-size:0.85rem;padding:4px 0">
                    Hinweis (optional)
                </summary>
                <textarea id="hrHint" rows="2"
                    placeholder="Hinweistext für die Hint-Fähigkeit"
                    style="margin:8px 0 0;resize:vertical;font-size:0.9rem"></textarea>
            </details>

            <label for="hrAuthor" style="margin-top:16px;display:block">
                Dein Name (optional)
            </label>
            <input type="text" id="hrAuthor"
                placeholder="Wird beim Admin als Einreicher angezeigt"
                value="${_fqEsc(_hrAuthor)}"
                style="margin:0 0 4px">

            <div style="margin-top:20px">
                <button class="btn" onclick="_hrSave()">
                    📬 Zur Liste hinzufügen
                </button>
            </div>
        </div>

        <div class="card" style="${_hrDrafts.length === 0 ? 'display:none' : ''}">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
                <h2 style="margin:0;flex:1;font-size:1.1rem">
                    ${_hrDrafts.length} Frage${_hrDrafts.length !== 1 ? 'n' : ''} bereit
                </h2>
                <button class="btn" onclick="_hrDownload()">⬇ Herunterladen</button>
            </div>
            <div class="card" style="padding:0;overflow:hidden;margin:0 0 12px">
                <table class="info-table" style="font-size:0.88rem;margin:0">
                    <tbody>${draftRows}</tbody>
                </table>
            </div>
            <p style="margin:0;font-size:0.82rem;opacity:0.5">
                Die heruntergeladene Datei beim Admin einreichen —
                er prüft die Fragen und fügt sie ins Quiz ein.
            </p>
        </div>`;

    if (isIm) _fqImRedraw();
}

// ── Aktionen ──────────────────────────────────────────────────────────────────

function _hrSetType(type) {
    _hrFormType = type;
    if (type === QUESTION_TYPES.IMAGEMAP) _fqImReset();
    _hrRender();
    if (type === QUESTION_TYPES.IMAGEMAP) _fqImRedraw();
}

function _hrSave() {
    const text = (document.getElementById('hrText')?.value || '').trim();
    if (!text) { Toast.show('Fragetext darf nicht leer sein.', 'warning'); return; }

    const group  = _hrReadGroup();
    const author = (document.getElementById('hrAuthor')?.value || '').trim();
    _hrLastGroup = group;
    _hrAuthor    = author;

    let answers, correctAnswer, targets;
    if (_hrFormType === QUESTION_TYPES.MULTIPLE_CHOICE) {
        answers = Array.from({ length: 4 }, (_, i) => ({
            text:    (document.getElementById('hrAns_' + i)?.value || '').trim(),
            correct: document.getElementById('hrCorr_' + i)?.checked || false
        })).filter(a => a.text);
        if (!answers.length)              { Toast.show('Mindestens eine Antwort angeben.', 'warning');              return; }
        if (!answers.some(a => a.correct)){ Toast.show('Mindestens eine Antwort als korrekt markieren.', 'warning'); return; }
    } else if (_hrFormType === QUESTION_TYPES.TEXT) {
        const raw = (document.getElementById('hrTextAns')?.value || '').trim();
        if (!raw) { Toast.show('Mindestens eine korrekte Antwort angeben.', 'warning'); return; }
        correctAnswer = raw.split('\n').map(s => s.trim()).filter(Boolean);
        answers = [{ type: 'text', correctAnswers: correctAnswer }];
    } else {
        targets = _fqGetTargets();
        if (!targets.length)  { Toast.show('Mindestens eine Zielzone definieren.', 'warning'); return; }
        if (!_fqImImageSrc)   { Toast.show('Bitte zuerst ein Bild laden!', 'warning'); return; }
    }

    const mediaPath = (document.getElementById('hrMedia')?.value || '').trim();
    const explText  = (document.getElementById('hrExpl')?.value  || '').trim();
    const hintText  = (document.getElementById('hrHint')?.value  || '').trim();

    const imMedia       = _hrFormType === QUESTION_TYPES.IMAGEMAP && _fqImPathVal
        ? { type: 'image', path: _fqImPathVal } : null;
    const resolvedMedia = imMedia || (mediaPath ? { type: 'image', path: mediaPath } : null);

    const q = {
        id:           Date.now() + Math.floor(Math.random() * 1000),
        text,
        type:         _hrFormType,
        active:       false,
        _fileGroup:   group,
        media:        resolvedMedia,
        explanation:  explText  || null,
        hint:         hintText  || null,
        _pending:     true,
        _submittedAt: new Date().toISOString(),
    };
    if (author) q._submittedBy = author;

    if (_hrFormType === QUESTION_TYPES.TEXT) {
        q.correctAnswer = correctAnswer;
        q.answers       = answers;
    } else if (_hrFormType === QUESTION_TYPES.IMAGEMAP) {
        q.targets = targets;
    } else {
        q.answers = answers;
    }

    _hrDrafts.push(q);
    _hrFormType = QUESTION_TYPES.MULTIPLE_CHOICE;
    _fqImReset();
    _hrRender();
    Toast.show('Frage zur Liste hinzugefügt!', 'success');
}

function _hrRemoveDraft(idx) {
    _hrDrafts.splice(idx, 1);
    _hrRender();
}

function _hrDownload() {
    if (!_hrDrafts.length) { Toast.show('Keine Fragen zum Herunterladen.', 'warning'); return; }
    const ts  = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
    const out = { submittedAt: new Date().toISOString(), questions: _hrDrafts };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `herald-pending_${ts}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    Toast.show(`${_hrDrafts.length} Frage(n) heruntergeladen!`, 'success');
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function _hrGroupInput() {
    const groups = (typeof HERALD_GROUPS !== 'undefined') ? HERALD_GROUPS : [];
    if (!groups.length) {
        return `<input type="text" id="hrGroup"
            placeholder="z.B. Geschichte, Geographie, Biologie …"
            value="${_fqEsc(_hrLastGroup)}"
            style="margin:0 0 4px">`;
    }
    const isOther  = _hrLastGroup === '' || !groups.includes(_hrLastGroup);
    const options  = groups.map(g =>
        `<option value="${_fqEsc(g)}" ${!isOther && _hrLastGroup === g ? 'selected' : ''}>${_fqEsc(g)}</option>`
    ).join('');
    return `
        <select id="hrGroup" onchange="_hrToggleGroupOther(this.value)" style="margin:0 0 4px">
            ${options}
            <option value="__other__" ${isOther ? 'selected' : ''}>Anderes Thema…</option>
        </select>
        <input type="text" id="hrGroupOther"
            placeholder="Thema eingeben"
            value="${isOther ? _fqEsc(_hrLastGroup) : ''}"
            style="display:${isOther ? 'block' : 'none'};margin:4px 0 0">`;
}

function _hrReadGroup() {
    const groups = (typeof HERALD_GROUPS !== 'undefined') ? HERALD_GROUPS : [];
    if (!groups.length) {
        return (document.getElementById('hrGroup')?.value || '').trim() || 'Allgemein';
    }
    const sel = document.getElementById('hrGroup')?.value;
    if (sel === '__other__') {
        return (document.getElementById('hrGroupOther')?.value || '').trim() || 'Allgemein';
    }
    return sel || groups[0] || 'Allgemein';
}

function _hrToggleGroupOther(val) {
    const inp = document.getElementById('hrGroupOther');
    if (inp) inp.style.display = val === '__other__' ? 'block' : 'none';
}

function _fqEsc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function _fqHandleMediaBrowse(event, targetInputId) {
    const file = event.target.files[0];
    if (!file) return;
    const relativePath = file.webkitRelativePath
        ? 'medien/' + file.webkitRelativePath
        : 'medien/' + file.name;
    const el = document.getElementById(targetInputId);
    if (el) el.value = relativePath;
}

// ── Imagemap Editor (aus forge-fragen.js übernommen) ─────────────────────────

function _fqImReset() {
    _fqImMode          = 'circle';
    _fqImPoints        = [];
    _fqImRadius        = 5;
    _fqImZones         = [];
    _fqImPolyFinalized = false;
    _fqImDragIdx       = -1;
    _fqImImageSrc      = null;
    _fqImPathVal       = '';
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
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
                <input type="text" id="fqImgPath" value="${_fqEsc(_fqImPathVal)}"
                    placeholder="Bildpfad (z.B. medien/karte.jpg)"
                    style="flex:1;margin:0;padding:8px 12px;font-size:0.85rem">
                <input type="file" id="fqImgFileInput" accept="image/*" style="display:none"
                    onchange="_fqImLoadFile(event)">
                <button class="btn btn-small btn-secondary"
                    style="background:var(--overlay-10);box-shadow:none;white-space:nowrap"
                    onclick="document.getElementById('fqImgFileInput').click()">📁 Bild</button>
                <button class="btn btn-small" style="white-space:nowrap"
                    onclick="_fqImLoadPath()">Laden</button>
            </div>
            ${controls}
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
                <button class="btn btn-small" onclick="_fqImAddZone()">＋ Zone speichern</button>
                <span style="font-size:0.82rem;opacity:0.5">${_fqImZones.length} Zonen</span>
            </div>
            <div id="fqImZoneInfo" style="margin-bottom:8px"></div>
            <div id="fqImgArea"
                style="position:relative;border:2px dashed var(--overlay-20);border-radius:10px;overflow:hidden;cursor:crosshair;min-height:100px">
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

    area.querySelectorAll('.fqIm-overlay').forEach(el => el.remove());

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'fqIm-overlay');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:20';

    let svgContent = '';

    _fqImZones.forEach(zone => {
        if (zone.mode === 'circle') {
            svgContent += `<circle cx="${zone.x}" cy="${zone.y}" r="${zone.radius}" fill="rgba(46,204,113,0.15)" stroke="rgba(46,204,113,0.8)" stroke-width="0.4"/>`;
        } else if (zone.mode === 'polygon' && zone.points?.length >= 3) {
            const pts = zone.points.map(p => `${p.x},${p.y}`).join(' ');
            svgContent += `<polygon points="${pts}" fill="rgba(46,204,113,0.2)" stroke="rgba(46,204,113,0.8)" stroke-width="0.4"/>`;
        }
    });

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
    const x = ((event.clientX - rect.left) / rect.width)  * 100;
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
        _fqImZones.push({
            mode:   'circle',
            x:      Math.round(_fqImPoints[0].x * 100) / 100,
            y:      Math.round(_fqImPoints[0].y * 100) / 100,
            radius: _fqImRadius
        });
        _fqImPoints = [];
    } else if (_fqImMode === 'polygon' && _fqImPoints.length >= 3) {
        _fqImZones.push({
            mode:      'polygon',
            points:    _fqImPoints.map(p => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })),
            tolerance: 2
        });
        _fqImPoints        = [];
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
        targets.push({
            mode:   'circle',
            x:      Math.round(_fqImPoints[0].x * 100) / 100,
            y:      Math.round(_fqImPoints[0].y * 100) / 100,
            radius: _fqImRadius
        });
    } else if (_fqImMode === 'polygon' && _fqImPoints.length >= 3) {
        targets.push({
            mode:      'polygon',
            points:    _fqImPoints.map(p => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })),
            tolerance: 2
        });
    }
    return targets;
}
