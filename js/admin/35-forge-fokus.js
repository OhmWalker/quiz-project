// === Forge: Fokus-Quiz ===
// Einstellungen, Rotationsplan und Vorschau für das Fokus-Quiz (FocusQuizPlugin).
// Rotations-Berechnung liegt in 30-globals.js (getFocusPeriods / getActiveFocusPeriod),
// damit Quiz und Forge garantiert dasselbe rechnen.
//
// Zustand: Änderungen landen sofort in quizSettings.focusQuiz (nur im Speicher);
// erst "Speichern" lädt die Master-JSON herunter. Das Panel-DOM wird bei jedem
// Tab-Wechsel neu gebaut — darum kein Zustand im DOM, nur in Modul-Variablen.
// Handler bekommen ausschließlich Indizes, nie Gruppennamen (Apostroph-Falle).

let _ffDirty = false;   // ungespeicherte Änderungen

AdminShell.registerPanel('fokus', 'Fokus-Quiz', '🎯', container => {
    if (!dataLoaded) {
        container.innerHTML = `<div class="card"><p class="text-muted" style="text-align:center;padding:30px 0">
            Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").</p></div>`;
        return;
    }
    _ffRender(container);
});

function _ffPanel() { return document.getElementById('adminPanel_fokus'); }

function _ffCfg() {
    ensureSettingsDefaults(quizSettings);
    const c = quizSettings.focusQuiz;
    if (!Array.isArray(c.rotation)) c.rotation = [];
    return c;
}

// Escaper inkl. Apostroph (sanitizeHTML gibt es im Forge-Build nicht)
function _ffEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _ffFmt(d) {
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
}

// Letzter Tag eines Zeitraums (end ist exklusiv)
function _ffLastDay(p) {
    return new Date(p.end.getFullYear(), p.end.getMonth(), p.end.getDate() - 1);
}

// Non-Core-Gruppen mit Anzahl aktiver Fragen
function _ffGroupCounts() {
    const counts = {};
    questions.forEach(q => {
        if (q.isCore || !q._fileGroup) return;
        if (!(q._fileGroup in counts)) counts[q._fileGroup] = 0;
        if (q.active !== false) counts[q._fileGroup]++;
    });
    return counts;
}

function _ffRender(container) {
    container = container || _ffPanel();
    if (!container) return;
    const c = _ffCfg();
    const counts = _ffGroupCounts();
    const groupNames = Object.keys(counts).sort((a, b) => a.localeCompare(b));

    // ── Einstellungen ─────────────────────────────────────────────────────────
    const num = (id, val, min, max, w) =>
        `<input type="number" id="${id}" min="${min}" max="${max}" value="${_ffEsc(val)}" style="width:${w || 90}px" onchange="_ffChanged()">`;
    const secSettings = _secBlock('🎯 Fokus-Quiz — Einstellungen', `
        <p class="text-muted" style="font-size:0.85rem;margin:0 0 14px">
            Nach dem ersten normalen Quiz des Tages kann jeder Spieler ein Fokus-Quiz mit Fragen
            aus <strong>einer</strong> Gruppe spielen (Core ausgeschlossen). Die Gruppe bestimmt der Rotationsplan unten.
        </p>
        ${_row('Fokus-Quiz aktiv', '', `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="ff_enabled" ${c.enabled !== false ? 'checked' : ''} onchange="_ffChanged()"> anbieten
            </label>`)}
        ${_row('Fragen pro Fokus-Quiz', '', num('ff_count', c.questionCount, 1, 100))}
        ${_row('Erfolgsschwelle', '% richtig (übersprungene Fragen zählen als nicht richtig)', num('ff_pct', c.successPct, 1, 100))}
        ${_row('XP-Multiplikator', '× für richtige Antworten (Tagesbonus gilt hier immer mit 100 %)', num('ff_mult', c.xpMultiplier, 1, 20))}
        ${_row('Serienziel', 'Erfolge in Folge für die Prämie', num('ff_target', c.streakTarget, 1, 50))}
        ${_row('Vollendungs-Prämie', 'XP, einmal pro Fokus-Zeitraum', num('ff_bonus', c.completionXP, 0, 100000, 110))}
        ${_row('Max. pro Tag', '0 = unbegrenzt', num('ff_maxDay', c.maxPerDay, 0, 50))}
    `);

    // ── Rotationsplan ─────────────────────────────────────────────────────────
    const groupOptions = (sel) => {
        const names = groupNames.slice();
        // Gruppe aus dem Plan, die gerade nicht geladen ist, nicht stillschweigend verlieren
        if (sel && !names.includes(sel)) names.unshift(sel);
        return names.map(n => {
            const label = n in counts ? `${n} (${counts[n]})` : `${n} (nicht geladen)`;
            return `<option value="${_ffEsc(n)}" ${n === sel ? 'selected' : ''}>${_ffEsc(label)}</option>`;
        }).join('');
    };
    const btnStyle = 'padding:4px 10px;min-width:0;margin:0';
    const rows = c.rotation.map((e, i) => `
        <tr>
            <td style="opacity:0.6;padding:4px 8px">${i + 1}.</td>
            <td style="padding:4px 8px">
                <select id="ff_g_${i}" onchange="_ffChanged()" style="margin:0;min-width:220px">
                    ${e.group ? '' : '<option value="" selected>— Gruppe wählen —</option>'}${groupOptions(e.group)}
                </select>
            </td>
            <td style="padding:4px 8px">
                <input type="number" id="ff_len_${i}" min="1" max="52" value="${Math.max(1, Math.floor(Number(e.length)) || 1)}" style="width:70px;margin:0" onchange="_ffChanged()">
            </td>
            <td style="padding:4px 8px">
                <select id="ff_unit_${i}" onchange="_ffChanged()" style="margin:0">
                    <option value="week"  ${e.unit !== 'month' ? 'selected' : ''}>Woche(n)</option>
                    <option value="month" ${e.unit === 'month' ? 'selected' : ''}>Monat(e)</option>
                </select>
            </td>
            <td style="padding:4px 8px;white-space:nowrap">
                <button class="btn btn-small btn-secondary" style="${btnStyle}" onclick="_ffMove(${i},-1)" ${i === 0 ? 'disabled' : ''} title="nach oben">↑</button>
                <button class="btn btn-small btn-secondary" style="${btnStyle}" onclick="_ffMove(${i},1)" ${i === c.rotation.length - 1 ? 'disabled' : ''} title="nach unten">↓</button>
                <button class="btn btn-small btn-danger" style="${btnStyle}" onclick="_ffDel(${i})" title="Eintrag löschen">✕</button>
            </td>
        </tr>`).join('');

    const secRotation = _secBlock('🔁 Rotationsplan', `
        <p class="text-muted" style="font-size:0.85rem;margin:0 0 14px">
            Die Einträge laufen ab dem Startdatum <strong>in dieser Reihenfolge</strong> nacheinander ab.
            Umsortieren verschiebt die Zeiträume automatisch. Ein Monat ist ein Kalendermonat.
        </p>
        ${_row('Startdatum', '', `<input type="date" id="ff_start" value="${_ffEsc(c.rotationStart || '')}" style="width:170px;margin:0" onchange="_ffChanged()">`)}
        ${_row('Wiederholen', '', `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="ff_loop" ${c.rotationLoop !== false ? 'checked' : ''} onchange="_ffChanged()">
                nach dem letzten Eintrag wieder von vorn
            </label>`)}
        ${c.rotation.length
            ? `<table style="border-collapse:collapse;margin-top:8px">
                   <thead><tr style="text-align:left;font-size:0.8rem;opacity:0.6">
                       <th></th><th style="padding:4px 8px">Gruppe (aktive Fragen)</th><th style="padding:4px 8px">Dauer</th><th></th><th></th>
                   </tr></thead>
                   <tbody>${rows}</tbody>
               </table>`
            : `<p class="text-muted" style="margin:8px 0">Noch keine Einträge — ohne Plan wird kein Fokus-Quiz angeboten.</p>`}
        <button class="btn btn-small btn-secondary" style="margin-top:12px" onclick="_ffAdd()" ${groupNames.length ? '' : 'disabled'}>＋ Eintrag hinzufügen</button>
        ${groupNames.length ? '' : '<span class="text-muted" style="margin-left:10px;font-size:0.85rem">Keine Nicht-Core-Gruppen geladen.</span>'}
    `);

    // ── Vorschau + Speichern ──────────────────────────────────────────────────
    const secPreview = _secBlock('🔭 Vorschau', `<div id="ff_preview"></div>`);

    container.innerHTML = `
        <div class="card">
            ${secSettings}
            ${secRotation}
            ${secPreview}
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                ${_saveBtn('_ffSave()', '🎯 Fokus-Quiz speichern')}
                <span id="ff_dirty" style="margin-top:12px;font-size:0.85rem;color:var(--accent-warning,#f39c12)"></span>
            </div>
        </div>`;
    _ffRenderPreview();
    _ffUpdateDirty();
}

function _ffRenderPreview() {
    const el = document.getElementById('ff_preview');
    if (!el) return;
    const c = _ffCfg();
    const counts = _ffGroupCounts();
    const need = Math.max(1, Math.floor(Number(c.questionCount)) || 10);
    const warnPool = g => {
        const n = counts[g] || 0;
        return n < need ? ` <span style="color:var(--incorrect)">⚠ nur ${n} aktive Fragen (benötigt ${need}) — wird nicht angeboten</span>` : '';
    };
    const lines = [];

    if (c.enabled === false) lines.push('⏸ Fokus-Quiz ist <strong>deaktiviert</strong> — Spieler sehen keinen Knopf.');
    if (!c.rotation.length) {
        lines.push('Kein Rotationsplan — es wird kein Fokus-Quiz angeboten.');
    } else if (!_focusParseDate(c.rotationStart)) {
        lines.push('Kein Startdatum gesetzt — es wird kein Fokus-Quiz angeboten.');
    } else {
        const today = new Date();
        const active = getActiveFocusPeriod(c, today);
        const periods = getFocusPeriods(c, today, 4);
        const empty = c.rotation.findIndex(e => !e.group);
        if (empty >= 0) lines.push(`<span style="color:var(--incorrect)">⚠ Eintrag ${empty + 1} hat keine Gruppe — in diesem Zeitraum gibt es kein Fokus-Quiz.</span>`);

        if (active) {
            lines.push(`<strong>Aktuell im Fokus: ${_ffEsc(active.group)}</strong> (${_ffFmt(active.start)} – ${_ffFmt(_ffLastDay(active))})${warnPool(active.group)}`);
        } else if (periods.length && periods[0].start > today) {
            lines.push(`Der Plan beginnt erst am <strong>${_ffFmt(periods[0].start)}</strong> — bis dahin kein Fokus-Quiz.`);
        } else if (!periods.length) {
            lines.push('Der Plan ist <strong>ausgelaufen</strong> (Wiederholen ist aus) — es wird kein Fokus-Quiz angeboten.');
        } else {
            lines.push('Im laufenden Zeitraum ist keine Gruppe gesetzt — kein Fokus-Quiz.');
        }

        const next = periods.filter(p => p !== periods[0] || !active).slice(0, 3);
        if (next.length) {
            lines.push('Danach:<ul style="margin:6px 0 0 18px;padding:0">' + next.map(p =>
                `<li>${_ffFmt(p.start)} – ${_ffFmt(_ffLastDay(p))} · ${p.group ? _ffEsc(p.group) : '<em>keine Gruppe</em>'}${p.group ? warnPool(p.group) : ''}</li>`
            ).join('') + '</ul>');
        } else if (active && c.rotationLoop === false) {
            lines.push('Danach: Plan endet (Wiederholen ist aus).');
        }

        const startDay = _focusParseDate(c.rotationStart).getDate();
        if (startDay > 28 && c.rotation.some(e => e.unit === 'month')) {
            lines.push(`<span class="text-muted" style="font-size:0.85rem">ℹ Der Plan beginnt am ${startDay}. eines Monats. In kürzeren Monaten wird auf den Monatsletzten gekürzt, und alle folgenden Zeiträume beginnen dann an diesem früheren Tag. Tipp: Monatspläne am 1. beginnen.</span>`);
        }
    }
    el.innerHTML = lines.map(l => `<div style="margin-bottom:8px">${l}</div>`).join('');
}

function _ffUpdateDirty() {
    const el = document.getElementById('ff_dirty');
    if (el) el.textContent = _ffDirty ? '● Ungespeicherte Änderungen — erst „Speichern" schreibt die Master-JSON.' : '';
}

// Formularwerte → quizSettings.focusQuiz (nur Speicher)
function _ffCollect() {
    const c = _ffCfg();
    if (!document.getElementById('ff_count')) return c;   // Panel nicht gerendert
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    c.enabled       = document.getElementById('ff_enabled').checked;
    c.questionCount = clamp(_numVal('ff_count', 10), 1, 100);
    c.successPct    = clamp(_numVal('ff_pct', 100), 1, 100);
    c.xpMultiplier  = clamp(_numVal('ff_mult', 3), 1, 20);
    c.streakTarget  = clamp(_numVal('ff_target', 5), 1, 50);
    c.completionXP  = clamp(_numVal('ff_bonus', 1000), 0, 100000);
    c.maxPerDay     = clamp(_numVal('ff_maxDay', 0), 0, 50);
    c.rotationStart = document.getElementById('ff_start').value || null;
    c.rotationLoop  = document.getElementById('ff_loop').checked;
    c.rotation = c.rotation.map((e, i) => {
        const g = document.getElementById('ff_g_' + i);
        const u = document.getElementById('ff_unit_' + i);
        return {
            group:  g ? g.value : e.group,
            unit:   (u ? u.value : e.unit) === 'month' ? 'month' : 'week',
            length: clamp(_numVal('ff_len_' + i, Number(e.length) || 1), 1, 52)
        };
    });
    return c;
}

function _ffChanged() {
    _ffCollect();
    _ffDirty = true;
    _ffRenderPreview();
    _ffUpdateDirty();
}

function _ffMove(i, dir) {
    const c = _ffCollect();
    const j = i + dir;
    if (j < 0 || j >= c.rotation.length) return;
    [c.rotation[i], c.rotation[j]] = [c.rotation[j], c.rotation[i]];
    _ffDirty = true;
    _ffRender();
}

function _ffDel(i) {
    const c = _ffCollect();
    c.rotation.splice(i, 1);
    _ffDirty = true;
    _ffRender();
}

function _ffAdd() {
    const c = _ffCollect();
    // Vorschlag: erste Gruppe, die noch nicht im Plan steht
    const names = Object.keys(_ffGroupCounts()).sort((a, b) => a.localeCompare(b));
    const used = new Set(c.rotation.map(e => e.group));
    const group = names.find(n => !used.has(n)) || names[0] || '';
    c.rotation.push({ group, unit: 'week', length: 1 });
    if (!c.rotationStart) c.rotationStart = _focusYMD(new Date());
    _ffDirty = true;
    _ffRender();
}

function _ffSave() {
    _ffCollect();
    saveMasterBackup();
    _ffDirty = false;
    _ffRender();
}
