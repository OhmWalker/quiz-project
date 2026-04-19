// === Admin: Auswertung ===

let _avState = { view: 'nutzer', nutzerIdx: 0, fragenGrp: '__all__', fragenSort: 'difficulty', hideNew: true };

AdminShell.registerPanel('auswertung', 'Auswertung', '📊', container => {
    if (!dataLoaded || !users.length) {
        container.innerHTML = `<div class="card"><p class="text-muted" style="text-align:center;padding:30px 0">
            Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").</p></div>`;
        return;
    }
    _avRender(container);
});

// ── Sub-Navigation ────────────────────────────────────────────────────────────

function _avRender(container) {
    const views = [
        { id: 'nutzer', label: '👤 Nutzer-Detail' },
        { id: 'fragen', label: '📋 Fragen' },
        { id: 'gruppen', label: '🏆 Gruppen' },
    ];
    const navBtns = views.map(v => `
        <button class="btn btn-small ${_avState.view === v.id ? '' : 'btn-secondary'}"
            onclick="_avSwitch('${v.id}')" style="padding:8px 18px;margin:0">
            ${v.label}
        </button>`).join('');

    container.innerHTML = `
        <div class="card" style="padding:20px 24px">
            <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">${navBtns}</div>
            <div id="av-view"></div>
        </div>`;
    _avRenderView();
}

function _avSwitch(view) {
    _avState.view = view;
    const panel = document.getElementById('adminPanel_auswertung');
    if (panel) _avRender(panel);
}

function _avRenderView() {
    const el = document.getElementById('av-view');
    if (!el) return;
    if (_avState.view === 'nutzer')  _avRenderNutzer(el);
    if (_avState.view === 'fragen')  _avRenderFragen(el);
    if (_avState.view === 'gruppen') _avRenderGruppen(el);
}

// ── Helpers: Daten ────────────────────────────────────────────────────────────

function _avGroupPrefix(qid) {
    const m = String(qid).match(/^([a-z]+)_/);
    return m ? m[1] : '__none__';
}

function _avGroupLabel(prefix) {
    // Versuche echten _fileGroup-Namen aus questions-Array zu lesen
    if (typeof questions !== 'undefined') {
        const q = questions.find(q => q.questionId && _avGroupPrefix(q.questionId) === prefix);
        if (q && q._fileGroup) return q._fileGroup;
    }
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function _avAllPrefixes() {
    const s = new Set();
    users.forEach(u => Object.keys(u.questionStats || {}).forEach(qid => s.add(_avGroupPrefix(qid))));
    s.delete('__none__');
    return [...s].sort();
}

function _avUserGroupStats(user) {
    const gs = {};
    Object.entries(user.questionStats || {}).forEach(([qid, stat]) => {
        const g = _avGroupPrefix(qid);
        if (g === '__none__') return;
        if (!gs[g]) gs[g] = { asked: 0, correct: 0, questions: 0 };
        gs[g].asked    += stat.asked    || 0;
        gs[g].correct  += stat.correct  || 0;
        gs[g].questions++;
    });
    return gs;
}

function _avAggregateStats() {
    // Returns { qid: { asked, correct, userCount, _q, users[], monthlyStats{} } }
    const agg = {};
    users.forEach(u => {
        Object.entries(u.questionStats || {}).forEach(([qid, stat]) => {
            if (!agg[qid]) agg[qid] = { asked: 0, correct: 0, userCount: 0, _q: stat._q || '', users: [], monthlyStats: {} };
            agg[qid].asked    += stat.asked   || 0;
            agg[qid].correct  += stat.correct || 0;
            agg[qid].userCount++;
            agg[qid].users.push({ name: u.name, asked: stat.asked || 0, correct: stat.correct || 0,
                consecutiveCorrect: stat.consecutiveCorrect || 0, lastAsked: stat.lastAsked,
                askLog: stat.askLog || [], monthlyStats: stat.monthlyStats || {} });
            // Merge monthly stats across users
            Object.entries(stat.monthlyStats || {}).forEach(([mo, ms]) => {
                if (!agg[qid].monthlyStats[mo]) agg[qid].monthlyStats[mo] = { asked: 0, correct: 0 };
                agg[qid].monthlyStats[mo].asked   += ms.asked   || 0;
                agg[qid].monthlyStats[mo].correct += ms.correct || 0;
            });
        });
    });
    return agg;
}

function _avIsNew(qid, daysThreshold = 30) {
    if (typeof questions === 'undefined') return false;
    const q = questions.find(q => q.questionId === qid);
    if (!q || !q._createdAt) return false;
    return (Date.now() - new Date(q._createdAt).getTime()) < daysThreshold * 86400000;
}

function _avCreatedAt(qid) {
    if (typeof questions === 'undefined') return null;
    const q = questions.find(qq => qq.questionId === qid);
    return q ? q._createdAt : null;
}

function _avSR() {
    const sr = (typeof quizSettings !== 'undefined' ? quizSettings.spacedRepetition : null) || {};
    return {
        threshold:  sr.streakThreshold || 2,
        cooldownMs: (sr.streakCooldown  || 48) * 3600000,
    };
}

function _avPct(correct, asked) {
    if (!asked) return null;
    return Math.round(correct / asked * 100);
}

function _avFmtDate(iso) {
    if (!iso) return '–';
    return iso.slice(0, 10);
}

// ── Helpers: SVG ─────────────────────────────────────────────────────────────

const AV_COLORS = ['#FF6B35','#F7B801','#2ECC71','#3498DB','#9B59B6','#E74C3C','#1ABC9C','#E67E22','#F39C12','#16A085'];

function _avGrpColor(prefix, prefixes) {
    const i = prefixes.indexOf(prefix);
    return AV_COLORS[i % AV_COLORS.length];
}

function _avScoreColor(pct) {
    if (pct === null) return 'var(--overlay-20)';
    if (pct >= 80) return 'var(--correct)';
    if (pct >= 50) return 'var(--accent)';
    return 'var(--incorrect)';
}

function _avSVG(w, h, content, extraStyle = '') {
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;${extraStyle}" font-family="inherit">${content}</svg>`;
}

function _avLinePath(pts) {
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

function _avAreaPath(pts, baseY) {
    if (!pts.length) return '';
    return `${_avLinePath(pts)} L${pts[pts.length-1][0].toFixed(1)},${baseY} L${pts[0][0].toFixed(1)},${baseY} Z`;
}

function _avVizCard(vizId, title, content) {
    return `<div style="margin-bottom:28px">
        <div style="font-size:0.7rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
            opacity:0.4;margin-bottom:6px">${vizId}</div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:14px;opacity:0.85">${title}</div>
        ${content}
    </div>`;
}

// ── Ansicht: Nutzer-Detail ────────────────────────────────────────────────────

function _avRenderNutzer(el) {
    const opts = users.map((u, i) =>
        `<option value="${i}" ${i === _avState.nutzerIdx ? 'selected' : ''}>${_esc(u.name)}</option>`
    ).join('');

    el.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
            <label style="font-weight:700;white-space:nowrap">Nutzer:</label>
            <select style="background:var(--overlay-8);border:1px solid var(--overlay-15);color:var(--text);
                padding:8px 14px;border-radius:10px;font-size:0.95rem;cursor:pointer"
                onchange="_avNutzerSelect(this.value)">${opts}</select>
        </div>
        <div id="av-nutzer-charts"></div>`;

    _avRenderNutzerCharts(users[_avState.nutzerIdx]);
}

function _avNutzerSelect(idx) {
    _avState.nutzerIdx = +idx;
    _avRenderNutzerCharts(users[_avState.nutzerIdx]);
}

function _avRenderNutzerCharts(user) {
    const el = document.getElementById('av-nutzer-charts');
    if (!el) return;

    const history = user.history || [];
    const qs      = user.questionStats || {};
    const prefixes = _avAllPrefixes();
    const sr = _avSR();

    const cols = `display:grid;grid-template-columns:1fr 1fr;gap:24px;`;

    el.innerHTML = [
        `<div style="${cols}">`,
            _avVizCard('VIZ-N1', 'QuizKalender', _avVizQuizKalender(history)),
            _avVizCard('VIZ-N2', 'Lernkurve', _avVizLernkurve(history)),
        '</div>',
        `<div style="${cols}">`,
            _avVizCard('VIZ-N3', 'Gruppen-Kompass', _avVizGruppenKompass(qs, prefixes)),
            _avVizCard('VIZ-N4', 'Stärken-Balken', _avVizStaerkenBalken(qs, prefixes)),
        '</div>',
        `<div style="${cols}">`,
            _avVizCard('VIZ-N5', 'XP-Treppe', _avVizXPTreppe(history)),
            _avVizCard('VIZ-N6', 'Fragen-Wolke', _avVizFragenWolke(qs, prefixes)),
        '</div>',
        _avVizCard('VIZ-N7', 'Schwächen-Monitor', _avVizSchwaechenMonitor(qs)),
        _avVizCard('VIZ-N8', 'Cooldown-Röntgen', _avVizCooldownRoentgen(qs, sr)),
        _avVizCard('VIZ-N9', 'Rückkehr-Diagnose', _avVizRueckkehrDiagnose(qs, sr)),
    ].join('');
}

// VIZ-N1: QuizKalender ────────────────────────────────────────────────────────

function _avVizQuizKalender(history) {
    const counts = {};
    history.forEach(h => {
        const d = h.date ? h.date.slice(0, 10) : null;
        if (d) counts[d] = (counts[d] || 0) + 1;
    });

    const today = new Date();
    // Start = Montag vor 52 Wochen
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 363 - ((today.getDay() + 6) % 7));

    const cellSize = 13, gap = 2, labelW = 24;
    const weeks = 52, days = 7;
    const w = labelW + weeks * (cellSize + gap);
    const h = days * (cellSize + gap) + 28;

    const dayLabels = ['Mo','','Mi','','Fr','','So'];
    let cells = '';
    let monthLabels = '';
    let prevMonth = -1;

    for (let week = 0; week < weeks; week++) {
        for (let day = 0; day < days; day++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + week * 7 + day);
            if (d > today) continue;
            const iso = d.toISOString().slice(0, 10);
            const count = counts[iso] || 0;
            const x = labelW + week * (cellSize + gap);
            const y = 24 + day * (cellSize + gap);

            let fill;
            if (count === 0) fill = 'var(--overlay-8)';
            else if (count === 1) fill = '#FF6B3566';
            else if (count === 2) fill = '#FF6B35aa';
            else fill = 'var(--primary)';

            cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}"
                rx="3" fill="${fill}" opacity="${count === 0 ? 0.4 : 1}">
                <title>${iso}: ${count} Quiz</title></rect>`;

            const m = d.getMonth();
            if (day === 0 && m !== prevMonth) {
                const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
                monthLabels += `<text x="${x}" y="14" font-size="10" fill="var(--text)" opacity="0.5">${months[m]}</text>`;
                prevMonth = m;
            }
        }
    }

    const dayLabelsSVG = dayLabels.map((l, i) =>
        `<text x="${labelW - 4}" y="${24 + i * (cellSize + gap) + 10}" font-size="9"
            fill="var(--text)" opacity="0.4" text-anchor="end">${l}</text>`
    ).join('');

    const legend = `
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:0.75rem;opacity:0.5">
            <span>Weniger</span>
            <div style="width:12px;height:12px;border-radius:3px;background:var(--overlay-8)"></div>
            <div style="width:12px;height:12px;border-radius:3px;background:#FF6B3566"></div>
            <div style="width:12px;height:12px;border-radius:3px;background:#FF6B35aa"></div>
            <div style="width:12px;height:12px;border-radius:3px;background:var(--primary)"></div>
            <span>Mehr</span>
        </div>`;

    return `<div style="overflow-x:auto">${_avSVG(w, h, monthLabels + dayLabelsSVG + cells)}</div>${legend}`;
}

// VIZ-N2: Lernkurve ───────────────────────────────────────────────────────────

function _avVizLernkurve(history) {
    if (history.length < 2) return `<p class="text-muted">Zu wenig Daten (mind. 2 Quizze).</p>`;

    const W = 420, H = 160, PL = 36, PR = 12, PT = 10, PB = 28;
    const iW = W - PL - PR, iH = H - PT - PB;

    const scores = history.map(h => h.score ?? 0);
    const n = scores.length;

    const toX = i => PL + (i / (n - 1)) * iW;
    const toY = v => PT + (1 - v / 100) * iH;

    // Gleitender Ø über 5
    const avg = scores.map((_, i) => {
        const slice = scores.slice(Math.max(0, i - 4), i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    });

    const rawPts = scores.map((v, i) => [toX(i), toY(v)]);
    const avgPts = avg.map((v, i) => [toX(i), toY(v)]);

    const areaPath = _avAreaPath(avgPts, PT + iH);
    const linePath = _avLinePath(avgPts);

    const gridLines = [0, 25, 50, 75, 100].map(v => {
        const y = toY(v);
        return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="var(--overlay-10)" stroke-width="1"/>
            <text x="${PL - 4}" y="${y + 4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">${v}</text>`;
    }).join('');

    const dots = rawPts.map(([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="3" fill="${_avScoreColor(scores[i])}" opacity="0.7">
            <title>Quiz ${i + 1}: ${scores[i]}%</title></circle>`
    ).join('');

    const lastDate = history[history.length - 1]?.date?.slice(0, 10) || '';
    const firstDate = history[0]?.date?.slice(0, 10) || '';

    return _avSVG(W, H, `
        <defs>
            <linearGradient id="avLK" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
            </linearGradient>
        </defs>
        ${gridLines}
        <path d="${areaPath}" fill="url(#avLK)"/>
        <path d="${linePath}" stroke="var(--primary)" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
        ${dots}
        <text x="${PL}" y="${H - 6}" font-size="9" fill="var(--text)" opacity="0.35">${firstDate}</text>
        <text x="${W - PR}" y="${H - 6}" font-size="9" fill="var(--text)" opacity="0.35" text-anchor="end">${lastDate}</text>
    `);
}

// VIZ-N3: Gruppen-Kompass (Radar) ─────────────────────────────────────────────

function _avVizGruppenKompass(qs, prefixes) {
    if (prefixes.length < 3) return `<p class="text-muted">Mind. 3 Gruppen nötig.</p>`;

    const W = 260, H = 260, cx = 130, cy = 130, R = 95;
    const grpStats = {};
    Object.entries(qs).forEach(([qid, stat]) => {
        const g = _avGroupPrefix(qid);
        if (!grpStats[g]) grpStats[g] = { asked: 0, correct: 0 };
        grpStats[g].asked   += stat.asked   || 0;
        grpStats[g].correct += stat.correct || 0;
    });

    const pts = prefixes.map((g, i) => {
        const angle = (i / prefixes.length) * Math.PI * 2 - Math.PI / 2;
        const pct   = grpStats[g] ? (grpStats[g].correct / grpStats[g].asked || 0) : 0;
        return { angle, pct, g, x: cx + Math.cos(angle) * R * pct, y: cy + Math.sin(angle) * R * pct };
    });

    const polygon = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

    // Achsen + Labels
    const axes = prefixes.map((g, i) => {
        const angle = (i / prefixes.length) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (R + 18);
        const ly = cy + Math.sin(angle) * (R + 18);
        const ax = cx + Math.cos(angle) * R;
        const ay = cy + Math.sin(angle) * R;
        const pct = grpStats[g] ? _avPct(grpStats[g].correct, grpStats[g].asked) : null;
        return `
            <line x1="${cx}" y1="${cy}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}"
                stroke="var(--overlay-15)" stroke-width="1"/>
            <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="10"
                fill="var(--text)" opacity="0.6" dominant-baseline="middle">
                ${_avGroupLabel(g)}${pct !== null ? ' ' + pct + '%' : ''}</text>`;
    }).join('');

    // Konzentrische Kreise
    const rings = [0.25, 0.5, 0.75, 1].map(r =>
        `<circle cx="${cx}" cy="${cy}" r="${(R * r).toFixed(1)}" fill="none"
            stroke="var(--overlay-10)" stroke-width="1"/>`
    ).join('');

    return _avSVG(W, H, `
        ${rings}${axes}
        <path d="${polygon}" fill="var(--primary)" fill-opacity="0.25"
            stroke="var(--primary)" stroke-width="2" stroke-linejoin="round"/>
        ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"
            fill="var(--primary)"><title>${_avGroupLabel(p.g)}: ${Math.round(p.pct*100)}%</title></circle>`).join('')}
    `, 'display:block;margin:auto');
}

// VIZ-N4: Stärken-Balken ──────────────────────────────────────────────────────

function _avVizStaerkenBalken(qs, prefixes) {
    if (!prefixes.length) return `<p class="text-muted">Keine Daten.</p>`;

    const gs = {};
    Object.entries(qs).forEach(([qid, stat]) => {
        const g = _avGroupPrefix(qid);
        if (g === '__none__') return;
        if (!gs[g]) gs[g] = { asked: 0, correct: 0, questions: 0 };
        gs[g].asked    += stat.asked   || 0;
        gs[g].correct  += stat.correct || 0;
        gs[g].questions++;
    });

    const sorted = Object.entries(gs)
        .map(([g, s]) => ({ g, pct: _avPct(s.correct, s.asked) ?? 0, ...s }))
        .sort((a, b) => b.pct - a.pct);

    const bars = sorted.map(({ g, pct, asked, questions }) => `
        <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px">
                <span style="font-weight:600">${_avGroupLabel(g)}</span>
                <span style="opacity:0.5">${pct}% · ${asked}× · ${questions} Fragen</span>
            </div>
            <div style="background:var(--overlay-8);border-radius:6px;height:14px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${_avScoreColor(pct)};
                    border-radius:6px;transition:width 0.4s ease"></div>
            </div>
        </div>`).join('');

    return `<div style="max-width:420px">${bars}</div>`;
}

// VIZ-N5: XP-Treppe ───────────────────────────────────────────────────────────

function _avVizXPTreppe(history) {
    if (history.length < 2) return `<p class="text-muted">Zu wenig Daten.</p>`;

    const W = 420, H = 160, PL = 50, PR = 12, PT = 10, PB = 28;
    const iW = W - PL - PR, iH = H - PT - PB;

    let cum = 0;
    const data = history.map(h => { cum += (h.xp || 0); return cum; });
    const maxXP = data[data.length - 1] || 1;
    const n = data.length;

    const toX = i => PL + (i / (n - 1)) * iW;
    const toY = v => PT + (1 - v / maxXP) * iH;

    // Treppe: horizontal dann vertikal
    let stepPath = `M${toX(0).toFixed(1)},${toY(data[0]).toFixed(1)}`;
    for (let i = 1; i < n; i++) {
        stepPath += ` H${toX(i).toFixed(1)} V${toY(data[i]).toFixed(1)}`;
    }
    const areaPath = stepPath + ` V${PT + iH} H${PL} Z`;

    const gridY = [0, 0.25, 0.5, 0.75, 1].map(r => {
        const v = Math.round(maxXP * r);
        const y = toY(v);
        return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="var(--overlay-10)" stroke-width="1"/>
            <text x="${PL - 4}" y="${y + 4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">${(v/1000).toFixed(1)}k</text>`;
    }).join('');

    return _avSVG(W, H, `
        <defs>
            <linearGradient id="avXP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
        </defs>
        ${gridY}
        <path d="${areaPath}" fill="url(#avXP)"/>
        <path d="${stepPath}" stroke="var(--accent)" stroke-width="2.5" fill="none"/>
        <text x="${W - PR}" y="${H - 6}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">
            ${data[n-1].toLocaleString()} XP gesamt</text>
    `);
}

// VIZ-N6: Fragen-Wolke (Scatter) ──────────────────────────────────────────────

function _avVizFragenWolke(qs, prefixes) {
    const entries = Object.entries(qs).filter(([, s]) => s.asked > 0);
    if (entries.length < 3) return `<p class="text-muted">Zu wenig Daten.</p>`;

    const W = 420, H = 220, PL = 36, PR = 12, PT = 10, PB = 36;
    const iW = W - PL - PR, iH = H - PT - PB;
    const maxAsked = Math.max(...entries.map(([, s]) => s.asked), 1);

    const toX = v => PL + (v / maxAsked) * iW;
    const toY = v => PT + (1 - v / 100) * iH;

    const dots = entries.map(([qid, stat]) => {
        const pct = _avPct(stat.correct, stat.asked) ?? 0;
        const x = toX(stat.asked);
        const y = toY(pct);
        const g = _avGroupPrefix(qid);
        const color = _avGrpColor(g, prefixes);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${color}" opacity="0.7">
            <title>${stat._q || qid}\n${stat.asked}× gestellt, ${pct}% richtig</title></circle>`;
    }).join('');

    const gridH = [0, 50, 100].map(v =>
        `<line x1="${PL}" y1="${toY(v)}" x2="${W - PR}" y2="${toY(v)}"
            stroke="var(--overlay-10)" stroke-width="1"/>
        <text x="${PL - 4}" y="${toY(v) + 4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">${v}%</text>`
    ).join('');

    const legend = prefixes.slice(0, 8).map((g, i) =>
        `<div style="display:flex;align-items:center;gap:4px;font-size:0.75rem;opacity:0.7">
            <div style="width:10px;height:10px;border-radius:50%;background:${AV_COLORS[i % AV_COLORS.length]};flex-shrink:0"></div>
            ${_avGroupLabel(g)}</div>`
    ).join('');

    return `
        <div style="overflow-x:auto">${_avSVG(W, H, `
            ${gridH}
            <text x="${PL}" y="${H - 6}" font-size="9" fill="var(--text)" opacity="0.4">0</text>
            <text x="${W - PR}" y="${H - 6}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">${maxAsked}×</text>
            <text x="${PL - 20}" y="${PT + iH/2}" font-size="9" fill="var(--text)" opacity="0.4"
                transform="rotate(-90,${PL - 20},${PT + iH/2})">% richtig</text>
            <text x="${PL + iW/2}" y="${H - 4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="middle">Häufigkeit</text>
            ${dots}
        `)}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">${legend}</div>`;
}

// VIZ-N7: Schwächen-Monitor ───────────────────────────────────────────────────

function _avVizSchwaechenMonitor(qs) {
    const entries = Object.entries(qs)
        .filter(([, s]) => s.asked >= 2)
        .map(([qid, s]) => ({ qid, pct: _avPct(s.correct, s.asked) ?? 100, asked: s.asked, _q: s._q || '' }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 15);

    if (!entries.length) return `<p class="text-muted">Noch zu wenig Daten (mind. 2× gestellt).</p>`;

    const rows = entries.map(({ qid, pct, asked, _q }) => {
        const status  = pct < 40 ? '🔴' : pct < 70 ? '🟡' : '🟢';
        const grp     = _avGroupLabel(_avGroupPrefix(qid));
        const isNew   = _avIsNew(qid);
        const newBadge = isNew ? ` <span style="background:var(--accent);color:#000;font-size:0.62rem;
            font-weight:700;padding:1px 4px;border-radius:5px;vertical-align:middle">NEU</span>` : '';
        return `<tr>
            <td style="opacity:0.45;font-size:0.8rem">${qid}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(_q)}">${_esc(_q) || '–'}${newBadge}</td>
            <td style="opacity:0.6;white-space:nowrap">${grp}</td>
            <td style="text-align:right;white-space:nowrap">${asked}×</td>
            <td style="text-align:right;font-weight:700;color:${_avScoreColor(pct)}">${pct}%</td>
            <td style="text-align:center">${status}</td>
        </tr>`;
    }).join('');

    return `<table class="info-table" style="font-size:0.82rem;width:100%">
        <thead><tr style="opacity:0.5;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px">
            <td>ID</td><td>Frage</td><td>Gruppe</td><td style="text-align:right">Gestellt</td>
            <td style="text-align:right">% richtig</td><td style="text-align:center">Status</td>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// VIZ-N8: Cooldown-Röntgen ────────────────────────────────────────────────────

function _avVizCooldownRoentgen(qs, sr) {
    const now = Date.now();
    const cats = { kuehl: [], aktiv: [], frisch: [], gemeistert: [] };

    Object.entries(qs).forEach(([qid, s]) => {
        const asked = s.asked || 0;
        const pct   = _avPct(s.correct, asked) ?? 0;
        const inCD  = s.consecutiveCorrect >= sr.threshold &&
                      s.lastAsked && (now - new Date(s.lastAsked).getTime()) < sr.cooldownMs;
        if (asked === 0 || asked <= 1) { cats.frisch.push({ qid, s }); return; }
        if (inCD) { cats.kuehl.push({ qid, s }); return; }
        if (asked >= 5 && pct >= 85) { cats.gemeistert.push({ qid, s }); return; }
        cats.aktiv.push({ qid, s });
    });

    const defs = [
        { key: 'kuehl',       icon: '🧊', label: 'Im Cooldown', color: '#3498DB' },
        { key: 'aktiv',       icon: '📚', label: 'Aktiv',       color: 'var(--primary)' },
        { key: 'frisch',      icon: '⚡', label: 'Neu/Selten',  color: 'var(--accent)' },
        { key: 'gemeistert',  icon: '✅', label: 'Gemeistert',  color: 'var(--correct)' },
    ];

    const cards = defs.map(d => {
        const list = cats[d.key];
        const topItems = list.slice(0, 5).map(({ qid, s }) =>
            `<div style="font-size:0.75rem;opacity:0.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${qid}: ${s._q ? s._q.slice(0, 30) + '…' : '–'}</div>`
        ).join('');
        const more = list.length > 5 ? `<div style="font-size:0.75rem;opacity:0.4">+${list.length - 5} weitere</div>` : '';
        return `<div style="background:var(--overlay-8);border:1px solid var(--overlay-10);border-radius:14px;
            padding:16px;border-top:3px solid ${d.color}">
            <div style="font-size:1.5rem;margin-bottom:6px">${d.icon}</div>
            <div style="font-weight:700;font-size:1.2rem;color:${d.color}">${list.length}</div>
            <div style="font-size:0.8rem;opacity:0.6;margin-bottom:10px">${d.label}</div>
            ${topItems}${more}
        </div>`;
    }).join('');

    return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">${cards}</div>`;
}

// VIZ-N9: Rückkehr-Diagnose ───────────────────────────────────────────────────

function _avVizRueckkehrDiagnose(qs, sr) {
    const violations = [];
    Object.entries(qs).forEach(([qid, s]) => {
        const log = s.askLog || [];
        if (log.length < 2) return;
        for (let i = 1; i < log.length; i++) {
            const prev = log[i - 1], curr = log[i];
            if (!prev.c) continue; // vorher falsch → kein Cooldown erwartet
            const gap = new Date(curr.d).getTime() - new Date(prev.d).getTime();
            if (gap < sr.cooldownMs) {
                violations.push({ qid, prevDate: prev.d, currDate: curr.d,
                    gapH: (gap / 3600000).toFixed(1), prevCorrect: prev.c, currCorrect: curr.c,
                    _q: s._q || '' });
            }
        }
    });

    if (!violations.length) {
        const hasLog = Object.values(qs).some(s => s.askLog && s.askLog.length > 0);
        if (!hasLog) return `<p class="text-muted">Noch keine askLog-Daten — wird ab dem nächsten Quiz aufgezeichnet.</p>`;
        return `<div style="color:var(--correct);font-weight:700">✅ Keine Cooldown-Verletzungen gefunden.</div>`;
    }

    const rows = violations.slice(0, 20).map(v => `<tr>
        <td style="opacity:0.5;font-size:0.8rem">${v.qid}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(v._q)}">${_esc(v._q) || '–'}</td>
        <td style="white-space:nowrap">${_avFmtDate(v.prevDate)} ${v.prevCorrect ? '✓' : '✗'}</td>
        <td style="white-space:nowrap">${_avFmtDate(v.currDate)} ${v.currCorrect ? '✓' : '✗'}</td>
        <td style="color:var(--incorrect);font-weight:700;text-align:right">${v.gapH}h</td>
    </tr>`).join('');

    return `<p style="color:var(--incorrect);font-weight:700;margin-bottom:10px">
        ⚠ ${violations.length} mögliche Cooldown-Verletzung${violations.length > 1 ? 'en' : ''} gefunden</p>
    <table class="info-table" style="font-size:0.82rem">
        <thead><tr style="opacity:0.5;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px">
            <td>ID</td><td>Frage</td><td>Richtig um</td><td>Wieder gestellt</td><td style="text-align:right">Abstand</td>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// ── Ansicht: Fragen ───────────────────────────────────────────────────────────

function _avRenderFragen(el) {
    const prefixes = _avAllPrefixes();
    const grpOpts  = [{ v: '__all__', l: 'Alle Gruppen' }]
        .concat(prefixes.map(g => ({ v: g, l: _avGroupLabel(g) })))
        .map(o => `<option value="${o.v}" ${_avState.fragenGrp === o.v ? 'selected' : ''}>${_esc(o.l)}</option>`)
        .join('');

    const sortOpts = [
        { v: 'difficulty', l: '% richtig (schwächste zuerst)' },
        { v: 'asked',      l: 'Häufigkeit (meistgestellt)' },
        { v: 'recent',     l: 'Zuletzt gestellt' },
    ].map(o => `<option value="${o.v}" ${_avState.fragenSort === o.v ? 'selected' : ''}>${o.l}</option>`).join('');

    el.innerHTML = `
        <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;align-items:center">
            <select style="background:var(--overlay-8);border:1px solid var(--overlay-15);color:var(--text);
                padding:8px 14px;border-radius:10px;font-size:0.9rem"
                onchange="_avState.fragenGrp=this.value;_avFragenRefresh()">${grpOpts}</select>
            <select style="background:var(--overlay-8);border:1px solid var(--overlay-15);color:var(--text);
                padding:8px 14px;border-radius:10px;font-size:0.9rem"
                onchange="_avState.fragenSort=this.value;_avFragenRefresh()">${sortOpts}</select>
            <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;white-space:nowrap">
                <input type="checkbox" ${_avState.hideNew ? 'checked' : ''}
                    onchange="_avState.hideNew=this.checked;_avFragenRefresh()"
                    style="width:15px;height:15px;accent-color:var(--accent)">
                Neue Fragen ausblenden (&lt;30 Tage)
            </label>
        </div>
        <div id="av-fragen-charts"></div>`;

    _avFragenRefresh();
}

function _avFragenRefresh() {
    const el = document.getElementById('av-fragen-charts');
    if (!el) return;
    const agg  = _avAggregateStats();
    const prefixes = _avAllPrefixes();
    const grp  = _avState.fragenGrp;
    const sort = _avState.fragenSort;

    let entries = Object.entries(agg);
    if (grp !== '__all__') entries = entries.filter(([qid]) => _avGroupPrefix(qid) === grp);
    if (_avState.hideNew) entries = entries.filter(([qid]) => !_avIsNew(qid));

    if (sort === 'difficulty') entries.sort((a, b) => {
        const pa = _avPct(a[1].correct, a[1].asked) ?? 101;
        const pb = _avPct(b[1].correct, b[1].asked) ?? 101;
        return pa - pb;
    });
    if (sort === 'asked') entries.sort((a, b) => (b[1].asked - a[1].asked));
    if (sort === 'recent') entries.sort((a, b) => {
        const da = b[1].users.map(u => u.lastAsked).filter(Boolean).sort().pop() || '';
        const db = a[1].users.map(u => u.lastAsked).filter(Boolean).sort().pop() || '';
        return da.localeCompare(db);
    });

    const newCount = Object.entries(agg).filter(([qid]) => _avIsNew(qid)).length;
    const newBadge = newCount > 0
        ? `<span style="background:var(--accent);color:#000;padding:2px 8px;border-radius:10px;
            font-size:0.75rem;font-weight:700">${newCount} neue Fragen (&lt;30 Tage)</span>`
        : '';

    el.innerHTML = [
        _avVizCard('VIZ-F1', 'Schwierigkeits-Histogramm', _avVizHistogramm(entries)),
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">`,
            _avVizCard('VIZ-F2', 'Fragen-Matrix', _avVizFragenMatrix(entries, prefixes)),
            _avVizCard('VIZ-F3', 'Häufigkeits-Ranking', _avVizHaeufigkeitsRanking(entries)),
        '</div>',
        _avVizCard('VIZ-F4', 'Fortschritts-Ringe', _avVizFortschrittsRinge(entries)),
        _avVizCard('VIZ-F6', 'Monats-Trend', _avVizMonatsTrend(entries)),
        _avVizCard('VIZ-F5', `Fragen-Vergleichs-Tabelle ${newBadge}`, _avVizFragenTabelle(entries, agg)),
    ].join('');
}

// VIZ-F1: Schwierigkeits-Histogramm ──────────────────────────────────────────

function _avVizHistogramm(entries) {
    const buckets = Array(10).fill(0);
    entries.forEach(([, s]) => {
        if (!s.asked) return;
        const pct = _avPct(s.correct, s.asked) ?? 0;
        const b   = Math.min(9, Math.floor(pct / 10));
        buckets[b]++;
    });
    const maxB = Math.max(...buckets, 1);
    const W = 420, H = 120, PL = 30, PB = 28, barW = (W - PL) / 10;

    const bars = buckets.map((b, i) => {
        const x  = PL + i * barW + 2;
        const bh = (b / maxB) * (H - PB - 10);
        const y  = H - PB - bh;
        const pct = i * 10;
        const fill = pct < 40 ? 'var(--incorrect)' : pct < 70 ? 'var(--accent)' : 'var(--correct)';
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 4).toFixed(1)}" height="${bh.toFixed(1)}"
            rx="4" fill="${fill}" fill-opacity="0.8">
            <title>${pct}–${pct+10}%: ${b} Fragen</title></rect>
            <text x="${(x + barW/2 - 2).toFixed(1)}" y="${H - 10}" font-size="9" fill="var(--text)"
                opacity="0.4" text-anchor="middle">${pct}</text>
            ${b > 0 ? `<text x="${(x + barW/2 - 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="9"
                fill="var(--text)" opacity="0.7" text-anchor="middle">${b}</text>` : ''}`;
    }).join('');

    return _avSVG(W, H, bars);
}

// VIZ-F2: Fragen-Matrix (Scatter) ─────────────────────────────────────────────

function _avVizFragenMatrix(entries, prefixes) {
    if (entries.length < 2) return `<p class="text-muted">Zu wenig Daten.</p>`;

    const W = 300, H = 200, PL = 32, PR = 10, PT = 10, PB = 28;
    const iW = W - PL - PR, iH = H - PT - PB;
    const maxAsked = Math.max(...entries.map(([, s]) => s.asked), 1);

    const toX = v => PL + (v / maxAsked) * iW;
    const toY = v => PT + (1 - v / 100) * iH;

    const dots = entries.map(([qid, s]) => {
        const pct  = _avPct(s.correct, s.asked) ?? 0;
        const color = _avGrpColor(_avGroupPrefix(qid), prefixes);
        return `<circle cx="${toX(s.asked).toFixed(1)}" cy="${toY(pct).toFixed(1)}"
            r="4" fill="${color}" opacity="0.65">
            <title>${s._q || qid}\n${s.asked}× · ${pct}%</title></circle>`;
    }).join('');

    const grid = [0, 50, 100].map(v =>
        `<line x1="${PL}" y1="${toY(v)}" x2="${W-PR}" y2="${toY(v)}"
            stroke="var(--overlay-10)" stroke-width="1"/>
        <text x="${PL-3}" y="${toY(v)+4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">${v}%</text>`
    ).join('');

    return _avSVG(W, H, `${grid}${dots}
        <text x="${PL+iW/2}" y="${H-4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="middle">Häufigkeit →</text>
    `);
}

// VIZ-F3: Häufigkeits-Ranking ─────────────────────────────────────────────────

function _avVizHaeufigkeitsRanking(entries) {
    const top = [...entries].sort((a, b) => b[1].asked - a[1].asked).slice(0, 12);
    if (!top.length) return `<p class="text-muted">Keine Daten.</p>`;
    const maxAsked = top[0][1].asked || 1;

    const bars = top.map(([qid, s]) => {
        const pct   = _avPct(s.correct, s.asked) ?? 0;
        const w     = (s.asked / maxAsked) * 100;
        const label = (s._q || qid).slice(0, 28) + (s._q && s._q.length > 28 ? '…' : '');
        return `<div style="margin-bottom:7px">
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:3px">
                <span style="opacity:0.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%"
                    title="${_esc(s._q)}">${_esc(label)}</span>
                <span style="opacity:0.5;white-space:nowrap">${s.asked}× · ${pct}%</span>
            </div>
            <div style="background:var(--overlay-8);border-radius:4px;height:10px;overflow:hidden">
                <div style="height:100%;width:${w}%;background:${_avScoreColor(pct)};border-radius:4px;opacity:0.8"></div>
            </div>
        </div>`;
    }).join('');

    return `<div style="max-width:340px">${bars}</div>`;
}

// VIZ-F4: Fortschritts-Ringe (Donuts) ────────────────────────────────────────

function _avVizFortschrittsRinge(entries) {
    const total = entries.length;
    if (!total) return `<p class="text-muted">Keine Daten.</p>`;

    let gemeistert = 0, lernt = 0, unberuehrt = 0, kaempft = 0;
    entries.forEach(([, s]) => {
        if (!s.asked) { unberuehrt++; return; }
        const pct = _avPct(s.correct, s.asked) ?? 0;
        if (s.asked >= 5 && pct >= 85) gemeistert++;
        else if (pct >= 60) lernt++;
        else kaempft++;
    });

    const cats = [
        { label: 'Gemeistert', count: gemeistert, color: 'var(--correct)' },
        { label: 'Im Lernen',  count: lernt,       color: 'var(--accent)' },
        { label: 'Kämpft',     count: kaempft,     color: 'var(--incorrect)' },
        { label: 'Unberührt',  count: unberuehrt,  color: 'var(--overlay-20)' },
    ];

    function donut(count, color, label) {
        const r = 36, cx = 50, cy = 50, strokeW = 12;
        const circ  = 2 * Math.PI * r;
        const pct   = total ? count / total : 0;
        const dash  = (pct * circ).toFixed(2);
        const gap   = (circ - pct * circ).toFixed(2);
        const p     = Math.round(pct * 100);
        return `<div style="text-align:center">
            ${_avSVG(100, 100, `
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                    stroke="var(--overlay-10)" stroke-width="${strokeW}"/>
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                    stroke="${color}" stroke-width="${strokeW}"
                    stroke-dasharray="${dash} ${gap}"
                    stroke-dashoffset="${circ / 4}"
                    stroke-linecap="round"/>
                <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="16"
                    fill="var(--text)" font-weight="700">${count}</text>
                <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10"
                    fill="var(--text)" opacity="0.5">${p}%</text>
            `)}
            <div style="font-size:0.78rem;opacity:0.6;margin-top:4px">${label}</div>
        </div>`;
    }

    return `<div style="display:flex;gap:20px;justify-content:flex-start;flex-wrap:wrap">
        ${cats.map(c => donut(c.count, c.color, c.label)).join('')}
    </div>`;
}

// VIZ-F6: Monats-Trend ────────────────────────────────────────────────────────

function _avVizMonatsTrend(entries) {
    // Summiere monthlyStats aller gefilterten Fragen
    const monthly = {};
    entries.forEach(([, s]) => {
        Object.entries(s.monthlyStats || {}).forEach(([mo, ms]) => {
            if (!monthly[mo]) monthly[mo] = { asked: 0, correct: 0 };
            monthly[mo].asked   += ms.asked   || 0;
            monthly[mo].correct += ms.correct || 0;
        });
    });

    const keys = Object.keys(monthly).sort();
    if (keys.length < 2) return `<p class="text-muted">Noch zu wenig Daten — wird ab dem nächsten Quiz aufgezeichnet.</p>`;

    const W = 560, H = 160, PL = 40, PR = 12, PT = 10, PB = 36;
    const iW = W - PL - PR, iH = H - PT - PB;
    const n  = keys.length;
    const maxAsked = Math.max(...keys.map(k => monthly[k].asked), 1);

    const toX  = i  => PL + (i / (n - 1)) * iW;
    const toYA = v  => PT + (1 - v / maxAsked) * iH;
    const toYP = pct => PT + (1 - pct / 100) * iH;

    const askedPts = keys.map((k, i) => [toX(i), toYA(monthly[k].asked)]);
    const pctPts   = keys.map((k, i) => {
        const pct = _avPct(monthly[k].correct, monthly[k].asked) ?? 0;
        return [toX(i), toYP(pct)];
    });

    const gridH = [0, 50, 100].map(v =>
        `<line x1="${PL}" y1="${toYP(v)}" x2="${W-PR}" y2="${toYP(v)}"
            stroke="var(--overlay-8)" stroke-width="1"/>
        <text x="${PL-3}" y="${toYP(v)+4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">${v}%</text>`
    ).join('');

    const xLabels = keys.map((k, i) =>
        `<text x="${toX(i).toFixed(1)}" y="${H - 6}" font-size="9"
            fill="var(--text)" opacity="0.4" text-anchor="middle">${k.slice(5)}.${k.slice(2,4)}</text>`
    ).join('');

    // Balken für Anzahl (sekundäre Achse, skaliert auf halbe Höhe)
    const barW = Math.max(4, iW / n - 4);
    const bars = keys.map((k, i) => {
        const bh = (monthly[k].asked / maxAsked) * (iH * 0.4);
        const x  = toX(i) - barW / 2;
        const y  = PT + iH - bh;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}"
            rx="3" fill="var(--primary)" fill-opacity="0.2">
            <title>${k}: ${monthly[k].asked}× gestellt</title></rect>`;
    }).join('');

    const pctLine  = `<path d="${_avLinePath(pctPts)}" stroke="var(--correct)" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`;
    const pctDots  = pctPts.map(([x, y], i) => {
        const pct = _avPct(monthly[keys[i]].correct, monthly[keys[i]].asked) ?? 0;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="var(--correct)">
            <title>${keys[i]}: ${pct}% richtig, ${monthly[keys[i]].asked}×</title></circle>`;
    }).join('');

    const legend = `<div style="display:flex;gap:16px;margin-top:8px;font-size:0.75rem;opacity:0.6">
        <div style="display:flex;align-items:center;gap:5px">
            <div style="width:20px;height:3px;background:var(--correct);border-radius:2px"></div> % richtig
        </div>
        <div style="display:flex;align-items:center;gap:5px">
            <div style="width:14px;height:10px;background:var(--primary);opacity:0.4;border-radius:3px"></div> Anzahl Aufrufe
        </div>
    </div>`;

    return `${_avSVG(W, H, gridH + bars + pctLine + pctDots + xLabels)}${legend}`;
}

// VIZ-F5: Fragen-Vergleichs-Tabelle ──────────────────────────────────────────

function _avVizFragenTabelle(entries, allAgg) {
    if (!entries.length) return `<p class="text-muted">Keine Daten.</p>`;

    // Neue Fragen separat anzeigen wenn ausgeblendet
    const newEntries = _avState.hideNew && allAgg
        ? Object.entries(allAgg).filter(([qid]) => _avIsNew(qid))
        : [];

    const shown = entries.slice(0, 30);

    const rows = shown.map(([qid, s]) => {
        const pct     = _avPct(s.correct, s.asked);
        const grp     = _avGroupLabel(_avGroupPrefix(qid));
        const isNew   = _avIsNew(qid);
        const created = _avCreatedAt(qid);
        const status  = pct === null ? '–' : pct < 40 ? '🔴' : pct < 70 ? '🟡' : '✅';
        const newBadge = isNew ? `<span style="background:var(--accent);color:#000;font-size:0.65rem;
            font-weight:700;padding:1px 5px;border-radius:6px;margin-left:4px">NEU</span>` : '';
        const userBreakdown = s.users.map(u =>
            `${_esc(u.name)}: ${u.asked}×, ${_avPct(u.correct, u.asked) ?? '?'}%`
        ).join(' | ');
        const monthRow = Object.keys(s.monthlyStats).length
            ? Object.entries(s.monthlyStats).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
                .map(([mo, ms]) => `${mo.slice(5)}.${mo.slice(2,4)}: ${ms.asked}× (${_avPct(ms.correct,ms.asked)??'?'}%)`).join(' · ')
            : '';
        return `<tr style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
            <td style="opacity:0.45;font-size:0.8rem;white-space:nowrap">${qid}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(s._q)}">${_esc(s._q) || '–'}${newBadge}</td>
            <td style="opacity:0.6;white-space:nowrap">${grp}</td>
            <td style="opacity:0.45;font-size:0.8rem;white-space:nowrap">${created ? created.slice(0,10) : '–'}</td>
            <td style="text-align:right">${s.asked}</td>
            <td style="text-align:right;font-weight:700;color:${_avScoreColor(pct)}">${pct ?? '–'}%</td>
            <td style="text-align:center">${status}</td>
        </tr>
        <tr style="display:none">
            <td colspan="7" style="font-size:0.78rem;opacity:0.5;padding:4px 12px 10px">
                <div>${userBreakdown}</div>
                ${monthRow ? `<div style="margin-top:3px;font-style:italic">Monatlich: ${monthRow}</div>` : ''}
            </td>
        </tr>`;
    }).join('');

    const more = entries.length > 30 ? `<p class="text-muted" style="margin-top:8px">+${entries.length - 30} weitere (Filter verwenden)</p>` : '';

    const newSection = newEntries.length ? `
        <p style="margin-top:16px;font-size:0.82rem;opacity:0.55">
            ✨ ${newEntries.length} neue Fragen (&lt;30 Tage) ausgeblendet —
            <span style="cursor:pointer;text-decoration:underline"
                onclick="_avState.hideNew=false;_avFragenRefresh()">einblenden</span>
        </p>` : '';

    return `<table class="info-table" style="font-size:0.82rem;width:100%">
        <thead><tr style="opacity:0.5;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px">
            <td>ID</td><td>Frage</td><td>Gruppe</td><td>Erstellt</td>
            <td style="text-align:right">Gestellt</td>
            <td style="text-align:right">Ø %</td>
            <td style="text-align:center">Status</td>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>${more}${newSection}`;
}

// ── Ansicht: Gruppen ──────────────────────────────────────────────────────────

function _avRenderGruppen(el) {
    const prefixes = _avAllPrefixes();
    if (!prefixes.length) {
        el.innerHTML = `<p class="text-muted">Keine Gruppen-Daten vorhanden.</p>`;
        return;
    }

    const cols = `display:grid;grid-template-columns:1fr 1fr;gap:24px;`;
    el.innerHTML = [
        `<div style="${cols}">`,
            _avVizCard('VIZ-G1', 'Gruppen-Vergleich', _avVizGruppenVergleich(prefixes)),
            _avVizCard('VIZ-G4', 'Fortschritts-Ampeln', _avVizFortschrittsAmpeln(prefixes)),
        '</div>',
        _avVizCard('VIZ-G3', 'Nutzer × Gruppen — Heatmap', _avVizNutzerGruppenHeatmap(prefixes)),
        _avVizCard('VIZ-G2', 'Gruppen-Trend (benötigt Quiz-Daten mit Gruppen-Info)', _avVizGruppenTrend(prefixes)),
    ].join('');
}

// VIZ-G1: Gruppen-Vergleich ───────────────────────────────────────────────────

function _avVizGruppenVergleich(prefixes) {
    // Aggregiere pro Gruppe über alle User
    const gs = {};
    prefixes.forEach(g => gs[g] = { asked: 0, correct: 0, questions: new Set() });
    users.forEach(u => {
        Object.entries(u.questionStats || {}).forEach(([qid, s]) => {
            const g = _avGroupPrefix(qid);
            if (!gs[g]) return;
            gs[g].asked    += s.asked   || 0;
            gs[g].correct  += s.correct || 0;
            gs[g].questions.add(qid);
        });
    });

    const sorted = prefixes.map(g => ({
        g, pct: _avPct(gs[g].correct, gs[g].asked) ?? 0,
        asked: gs[g].asked, qCount: gs[g].questions.size
    })).sort((a, b) => b.pct - a.pct);

    const W = 340, H = 30 * sorted.length + 30, PL = 80, PR = 60;
    const maxPct = 100;

    const bars = sorted.map(({ g, pct, asked, qCount }, i) => {
        const y   = 10 + i * 30;
        const bw  = ((pct / maxPct) * (W - PL - PR));
        const fill = _avScoreColor(pct);
        return `
            <text x="${PL - 6}" y="${y + 12}" font-size="11" fill="var(--text)" opacity="0.7"
                text-anchor="end">${_avGroupLabel(g)}</text>
            <rect x="${PL}" y="${y}" width="${bw.toFixed(1)}" height="20"
                rx="4" fill="${fill}" fill-opacity="0.75"/>
            <text x="${PL + bw + 6}" y="${y + 13}" font-size="10" fill="var(--text)" opacity="0.6">
                ${pct}% · ${qCount} Fragen</text>`;
    }).join('');

    return _avSVG(W, H, bars);
}

// VIZ-G2: Gruppen-Trend ───────────────────────────────────────────────────────

function _avVizGruppenTrend(prefixes) {
    // Sammle history-Einträge mit groups-Feld
    const timeline = [];
    users.forEach(u => {
        (u.history || []).forEach(h => {
            if (h.groups && h.date) timeline.push({ date: h.date.slice(0, 10), groups: h.groups });
        });
    });
    timeline.sort((a, b) => a.date.localeCompare(b.date));

    if (!timeline.length) {
        return `<p class="text-muted">Noch keine Gruppen-Daten in der History — werden ab dem nächsten Quiz aufgezeichnet.</p>`;
    }

    // Wöchentliche Aggregation
    const weeks = {};
    timeline.forEach(({ date, groups }) => {
        const d = new Date(date);
        const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const wKey = mon.toISOString().slice(0, 10);
        if (!weeks[wKey]) weeks[wKey] = {};
        Object.entries(groups).forEach(([g, stat]) => {
            if (!weeks[wKey][g]) weeks[wKey][g] = { asked: 0, correct: 0 };
            weeks[wKey][g].asked   += stat.asked   || 0;
            weeks[wKey][g].correct += stat.correct || 0;
        });
    });

    const wKeys = Object.keys(weeks).sort();
    if (wKeys.length < 2) return `<p class="text-muted">Mind. 2 Wochen Daten nötig.</p>`;

    const W = 560, H = 180, PL = 36, PR = 12, PT = 10, PB = 28;
    const iW = W - PL - PR, iH = H - PT - PB;
    const nW = wKeys.length;

    const toX = i => PL + (i / (nW - 1)) * iW;
    const toY = v => PT + (1 - v / 100) * iH;

    const lines = prefixes.slice(0, 8).map((g, gi) => {
        const pts = wKeys.map((wk, i) => {
            const stat = weeks[wk][g];
            if (!stat || !stat.asked) return null;
            return [toX(i), toY(_avPct(stat.correct, stat.asked) ?? 0)];
        }).filter(Boolean);
        if (pts.length < 2) return '';
        const color = AV_COLORS[gi % AV_COLORS.length];
        return `<path d="${_avLinePath(pts)}" stroke="${color}" stroke-width="2"
            fill="none" stroke-linejoin="round" opacity="0.85">
            <title>${_avGroupLabel(g)}</title></path>
            ${pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"/>`).join('')}`;
    }).join('');

    const gridH = [0, 50, 100].map(v =>
        `<line x1="${PL}" y1="${toY(v)}" x2="${W-PR}" y2="${toY(v)}"
            stroke="var(--overlay-10)" stroke-width="1"/>
        <text x="${PL-3}" y="${toY(v)+4}" font-size="9" fill="var(--text)" opacity="0.4" text-anchor="end">${v}%</text>`
    ).join('');

    const xLabels = wKeys.filter((_, i) => i % Math.ceil(nW / 6) === 0).map(wk => {
        const i = wKeys.indexOf(wk);
        return `<text x="${toX(i).toFixed(1)}" y="${H - 6}" font-size="9"
            fill="var(--text)" opacity="0.4" text-anchor="middle">${wk.slice(5)}</text>`;
    }).join('');

    const legend = prefixes.slice(0, 8).map((g, i) =>
        `<div style="display:flex;align-items:center;gap:4px;font-size:0.75rem;opacity:0.7">
            <div style="width:20px;height:3px;background:${AV_COLORS[i % AV_COLORS.length]};border-radius:2px"></div>
            ${_avGroupLabel(g)}</div>`
    ).join('');

    return `${_avSVG(W, H, gridH + lines + xLabels)}
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">${legend}</div>`;
}

// VIZ-G3: Nutzer × Gruppen — Heatmap ─────────────────────────────────────────

function _avVizNutzerGruppenHeatmap(prefixes) {
    const cellW = 64, cellH = 32, labelW = 100, headerH = 36;
    const W = labelW + prefixes.length * cellW;
    const H = headerH + users.length * cellH;

    const header = prefixes.map((g, i) =>
        `<div style="width:${cellW}px;font-size:0.72rem;font-weight:700;opacity:0.55;
            text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            padding:2px 4px">${_avGroupLabel(g)}</div>`
    ).join('');

    const userRows = users.map(u => {
        const gs = _avUserGroupStats(u);
        const cells = prefixes.map(g => {
            const stat = gs[g];
            const pct  = stat ? (_avPct(stat.correct, stat.asked) ?? null) : null;
            const bg   = pct === null ? 'var(--overlay-5)' : _avScoreColor(pct);
            const text = pct !== null ? pct + '%' : '–';
            const title = stat ? `${_avGroupLabel(g)}: ${stat.correct}/${stat.asked} (${pct}%)` : 'Keine Daten';
            return `<div title="${title}" style="width:${cellW}px;height:${cellH}px;
                background:${bg};opacity:${pct !== null ? 0.75 : 0.2};
                display:flex;align-items:center;justify-content:center;
                font-size:0.75rem;font-weight:700;color:white;border:1px solid var(--overlay-5)">
                ${text}</div>`;
        }).join('');
        return `<div style="display:flex;align-items:center">
            <div style="width:${labelW}px;font-size:0.82rem;opacity:0.7;white-space:nowrap;
                overflow:hidden;text-overflow:ellipsis;padding-right:8px">${_esc(u.name)}</div>
            ${cells}
        </div>`;
    }).join('');

    return `<div style="overflow-x:auto">
        <div style="min-width:${W}px">
            <div style="display:flex;margin-left:${labelW}px;margin-bottom:4px">${header}</div>
            ${userRows}
        </div>
    </div>`;
}

// VIZ-G4: Fortschritts-Ampeln ─────────────────────────────────────────────────

function _avVizFortschrittsAmpeln(prefixes) {
    // Aggregiere per Gruppe
    const gs = {};
    prefixes.forEach(g => gs[g] = { asked: 0, correct: 0, total: 0, mastered: 0 });

    users.forEach(u => {
        Object.entries(u.questionStats || {}).forEach(([qid, s]) => {
            const g = _avGroupPrefix(qid);
            if (!gs[g]) return;
            gs[g].asked   += s.asked   || 0;
            gs[g].correct += s.correct || 0;
            gs[g].total++;
            const pct = _avPct(s.correct, s.asked);
            if (s.asked >= 5 && pct >= 85) gs[g].mastered++;
        });
    });

    const cards = prefixes.map(g => {
        const s   = gs[g];
        const pct = _avPct(s.correct, s.asked);
        const icon = pct === null ? '⚪' : pct >= 75 ? '🟢' : pct >= 45 ? '🟡' : '🔴';
        const barW = pct ?? 0;
        const mastPct = s.total ? Math.round(s.mastered / s.total * 100) : 0;
        return `<div style="background:var(--overlay-8);border:1px solid var(--overlay-10);
            border-radius:14px;padding:16px;min-width:140px">
            <div style="font-size:1.4rem;margin-bottom:6px">${icon}</div>
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">${_avGroupLabel(g)}</div>
            <div style="font-size:0.78rem;opacity:0.5;margin-bottom:10px">${s.total} Fragen</div>
            <div style="background:var(--overlay-8);border-radius:6px;height:8px;overflow:hidden;margin-bottom:6px">
                <div style="height:100%;width:${barW}%;background:${_avScoreColor(pct)};border-radius:6px"></div>
            </div>
            <div style="font-size:0.82rem;font-weight:700;color:${_avScoreColor(pct)}">${pct ?? '–'}% Ø richtig</div>
            <div style="font-size:0.75rem;opacity:0.5;margin-top:2px">${mastPct}% gemeistert</div>
        </div>`;
    }).join('');

    return `<div style="display:flex;gap:12px;flex-wrap:wrap">${cards}</div>`;
}
