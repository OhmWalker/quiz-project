// === Forge: Sicherung & Spieler-Dateien aufräumen ===
//
// 1. Sicherung: EIN ZIP mit Master-Datei (Einstellungen), allen Fragen (eine Datei
//    pro Gruppe) und der aktuellen Datei jedes Spielers — Dateinamen wie beim
//    normalen Speichern. Wiederherstellen = ZIP in einen leeren Ordner entpacken.
// 2. Aufräumen: verkleinert Spieler-Dateien, ohne Erfolge zu verlieren.
//    Was erhalten bleibt und was gekürzt wird, steht in CLAUDE.md
//    („Spieler-JSON aufräumen — Übergabe“). Kurzfassung:
//      - unangetastet: XP/Level, Zähler, badgeStats, _badgeTiers, Fähigkeiten,
//        chargesEarned, Streak, Joker, focusQuiz, Lernstand je Frage
//      - history älter als N Tage → Summen in historyArchive (computeHistoryStats)
//      - askLog je Frage → letzte N Einträge, monthlyStats → letzte N Monate
//    Gearbeitet wird auf Kopien; die geladenen Daten bleiben unverändert.

let _fsLastBackup = null;   // Zeitpunkt der letzten Sicherung in dieser Sitzung
let _fsOpts = null;         // Aufräum-Optionen (Panel-State, überlebt Tab-Wechsel)
let _fsPreview = null;      // [{ name, before, after, histBefore, histAfter }]

AdminShell.registerPanel('sicherung', 'Sicherung', '💾', container => {
    if (!dataLoaded) {
        container.innerHTML = `<div class="card"><p class="text-muted" style="text-align:center;padding:30px 0">
            Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").</p></div>`;
        return;
    }
    _fsRender(container);
});


// ── ZIP (ohne Bibliothek) ─────────────────────────────────────────────────────
// Deflate über CompressionStream, wenn der Browser es kann — sonst unkomprimiert
// gespeichert. Beides ist ein gültiges ZIP.

const _FS_CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();

function _fsCrc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = _FS_CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

async function _fsDeflateRaw(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (e) { return null; }
}

// files: [{ name, text }] → Blob (application/zip)
async function _fsBuildZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [], central = [];
    let offset = 0;

    for (const f of files) {
        const name = enc.encode(f.name);
        const data = enc.encode(f.text);
        const crc  = _fsCrc32(data);
        const comp = await _fsDeflateRaw(data);
        const method = comp && comp.length < data.length ? 8 : 0;
        const body = method === 8 ? comp : data;

        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true);
        lh.setUint16(4, 20, true);
        lh.setUint16(6, 0x0800, true);          // Dateinamen in UTF-8
        lh.setUint16(8, method, true);
        lh.setUint16(10, dosTime, true);
        lh.setUint16(12, dosDate, true);
        lh.setUint32(14, crc, true);
        lh.setUint32(18, body.length, true);
        lh.setUint32(22, data.length, true);
        lh.setUint16(26, name.length, true);
        lh.setUint16(28, 0, true);
        parts.push(new Uint8Array(lh.buffer), name, body);

        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true);
        ch.setUint16(4, 20, true);
        ch.setUint16(6, 20, true);
        ch.setUint16(8, 0x0800, true);
        ch.setUint16(10, method, true);
        ch.setUint16(12, dosTime, true);
        ch.setUint16(14, dosDate, true);
        ch.setUint32(16, crc, true);
        ch.setUint32(20, body.length, true);
        ch.setUint32(24, data.length, true);
        ch.setUint16(28, name.length, true);
        ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);

        offset += 30 + name.length + body.length;
    }

    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

function _fsDownloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// ── Sicherung ─────────────────────────────────────────────────────────────────

function _fsBackupFiles(now) {
    const files = [{ name: masterFileName(now), text: encodeDataFile(buildMasterData(), false) }];

    // Fragen: eine Datei pro Gruppe, Format wie Forge-Export (_fqBuildExportQ).
    // Core wird beim Laden am Dateinamen erkannt (/^03_questions_CORE/i) — darum
    // getrennt nach Core/Nicht-Core und der Präfix passend gesetzt bzw. vermieden.
    const byGroup = {};
    questions.forEach(q => {
        const g = q._fileGroup || 'Manuell';
        const key = (q.isCore ? '1' : '0') + g;
        if (!byGroup[key]) byGroup[key] = { group: g, core: !!q.isCore, qs: [] };
        byGroup[key].qs.push(q);
    });
    const ts = _fileTimestamp(now);
    Object.values(byGroup).forEach(g => {
        const safe = g.group.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
        const name = g.core
            ? (/^core/i.test(safe) ? safe : `CORE_${safe}`)
            : (/^core/i.test(safe) ? `G_${safe}` : safe);   // "Corey" darf nicht als Core laden
        files.push({
            name: `03_questions_${name}_${ts}.json`,
            text: encodeDataFile({ theme: g.group, questions: g.qs.map(_fqBuildExportQ) }, false)
        });
    });

    // Spieler: aktueller Stand (= neueste Datei pro Spieler beim Laden)
    users.forEach(u => files.push({ name: playerFileName(u, now), text: serializePlayer(u) }));
    return files;
}

async function _fsMakeBackup() {
    const btn = document.getElementById('fs_backupBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sicherung wird erstellt…'; }
    try {
        const now = new Date();
        const files = _fsBackupFiles(now);
        const blob = await _fsBuildZip(files);
        const zipName = `Sicherung_${loadedFolderName || 'Quiz'}_${_fileTimestamp(now)}.zip`.replace(/[^\wäöüÄÖÜß.-]/g, '_');
        _fsDownloadBlob(blob, zipName);
        _fsLastBackup = now;
        Toast.show(`💾 Sicherung erstellt: ${files.length} Dateien (${(blob.size / 1024).toFixed(0)} KB)\n${zipName}`, 'success');
    } catch (e) {
        GameDialog.showError('Sicherung fehlgeschlagen', String(e && e.stack || e));
    }
    _fsRender();
}


// ── Aufräumen ─────────────────────────────────────────────────────────────────

function _fsDefaultOpts() {
    return { keepDays: _fsMinKeepDays() < 180 ? 180 : _fsMinKeepDays(), keepLog: 5, keepMonths: 6 };
}

// Die Bestenliste wertet die letzten maxAgeDays Tage aus — die müssen bleiben.
function _fsMinKeepDays() {
    const lb = quizSettings.leaderboard || {};
    return Math.max(90, Number(lb.maxAgeDays) || 90);
}

// History in archivierten und behaltenen Teil schneiden.
// Nie innerhalb eines Tages und nie mit < 1 h Abstand schneiden (computeHistoryStats).
function _fsSplitHistory(hist, keepDays, now) {
    const h = (hist || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - keepDays);
    let cut = h.findIndex(e => new Date(e.date) >= cutoff);
    if (cut === -1) cut = h.length;
    const t = e => new Date(e.date).getTime();
    const day = e => new Date(e.date).toDateString();
    while (cut > 0 && cut < h.length &&
           (day(h[cut - 1]) === day(h[cut]) || t(h[cut]) - t(h[cut - 1]) < 3600000)) cut--;
    return { archived: h.slice(0, cut), kept: h.slice(cut) };
}

// Bereinigte KOPIE eines Spielers. Original bleibt unverändert.
function _fsCleanUser(user, opts, now) {
    const u = JSON.parse(JSON.stringify(user));
    now = now || new Date();

    // 1. History → Archiv
    const { archived, kept } = _fsSplitHistory(u.history, opts.keepDays, now);
    if (archived.length) {
        const old = u.historyArchive && typeof u.historyArchive === 'object' ? u.historyArchive : null;
        const arch = computeHistoryStats(archived, old);
        // Monats-Summen für spätere Auswertungen (klein: ein Eintrag pro Monat)
        const months = Object.assign({}, old && old.months);
        archived.forEach(e => {
            const mo = String(e.date || '').slice(0, 7) || '?';
            const m = months[mo] || (months[mo] = { quizzes: 0, correct: 0, total: 0, xp: 0 });
            m.quizzes++;
            m.correct += Number(e.correct) || 0;
            m.total   += Number(e.total)   || 0;
            m.xp      += Number(e.xp)      || 0;
        });
        arch.months = months;
        arch.until = archived[archived.length - 1].date;
        u.historyArchive = arch;
    }
    u.history = kept;

    // 2. Fragen-Verlauf kürzen (nur Forge-Auswertung liest askLog/monthlyStats)
    const mNow = new Date(now.getFullYear(), now.getMonth() - (opts.keepMonths - 1), 1);
    const monthCut = mNow.getFullYear() + '-' + String(mNow.getMonth() + 1).padStart(2, '0');
    Object.values(u.questionStats || {}).forEach(s => {
        if (!s || typeof s !== 'object') return;
        if (Array.isArray(s.askLog)) {
            if (opts.keepLog > 0) s.askLog = s.askLog.slice(-opts.keepLog);
            else delete s.askLog;
        }
        if (s.monthlyStats && typeof s.monthlyStats === 'object') {
            Object.keys(s.monthlyStats).forEach(mo => { if (mo < monthCut) delete s.monthlyStats[mo]; });
            if (!Object.keys(s.monthlyStats).length) delete s.monthlyStats;
        }
    });
    return u;
}

function _fsKB(n) { return (n / 1024).toFixed(0) + ' KB'; }

function _fsComputePreview() {
    const opts = _fsOpts;
    const now = new Date();
    _fsPreview = users.map(u => {
        const c = _fsCleanUser(u, opts, now);
        return {
            name: u.name,
            before: serializePlayer(u).length,
            after: serializePlayer(c).length,
            histBefore: (u.history || []).length,
            histAfter: c.history.length
        };
    });
}

function _fsReadOpts() {
    const minDays = _fsMinKeepDays();
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    _fsOpts = {
        keepDays:   clamp(_numVal('fs_keepDays', _fsOpts.keepDays), minDays, 3650),
        keepLog:    clamp(_numVal('fs_keepLog', _fsOpts.keepLog), 0, 15),
        keepMonths: clamp(_numVal('fs_keepMonths', _fsOpts.keepMonths), 1, 120)
    };
}

function _fsPreviewClick() {
    _fsReadOpts();
    _fsComputePreview();
    _fsRender();
}

function _fsCompactChanged(el) {
    quizSettings.compactPlayerFiles = !!el.checked;
    _fsPreview = null;   // Größen ändern sich
    _fsRender();
}

async function _fsCleanupClick() {
    _fsReadOpts();
    const run = async () => {
        const now = new Date();
        const files = users.map(u => ({ name: playerFileName(u, now), text: serializePlayer(_fsCleanUser(u, _fsOpts, now)) }));
        const blob = await _fsBuildZip(files);
        const zipName = `Spieler-aufgeraeumt_${_fileTimestamp(now)}.zip`;
        _fsDownloadBlob(blob, zipName);
        Toast.show(`🧹 ${files.length} aufgeräumte Spieler-Dateien in ${zipName}.\nIn den Quiz-Ordner entpacken — die neueste Datei pro Spieler wird geladen.`, 'success');
    };
    if (!_fsLastBackup) {
        GameDialog.showConfirm('⚠️', 'Noch keine Sicherung',
            'In dieser Sitzung wurde noch keine Sicherung erstellt. Gekürzte History und Fragen-Verläufe lassen sich danach nur aus einer Sicherung zurückholen.<br><br>Trotzdem aufräumen?',
            () => { run(); }, null);
        return;
    }
    await run();
}


// ── Panel ─────────────────────────────────────────────────────────────────────

function _fsRender(container) {
    container = container || document.getElementById('adminPanel_sicherung');
    if (!container) return;
    if (!_fsOpts) _fsOpts = _fsDefaultOpts();
    const groups = new Set(questions.map(q => q._fileGroup || 'Manuell'));
    const minDays = _fsMinKeepDays();

    const backupInfo = _fsLastBackup
        ? `<span style="color:var(--correct)">✓ Letzte Sicherung in dieser Sitzung: ${_fsLastBackup.toLocaleTimeString()}</span>`
        : `<span class="text-muted">In dieser Sitzung noch keine Sicherung.</span>`;

    const secBackup = _secBlock('💾 Sicherung', `
        <p class="text-muted" style="font-size:0.85rem;margin:0 0 12px">
            Lädt <strong>eine ZIP-Datei</strong> herunter mit: Master-Datei (alle Einstellungen),
            ${questions.length} Fragen in ${groups.size} Datei(en) (eine pro Gruppe) und der aktuellen Datei
            jedes der ${users.length} Spieler. Wiederherstellen: ZIP in einen leeren Ordner entpacken und diesen laden.
        </p>
        <button class="btn btn-small" id="fs_backupBtn" onclick="_fsMakeBackup()">💾 Sicherung herunterladen (ZIP)</button>
        <div style="margin-top:10px;font-size:0.85rem">${backupInfo}</div>
    `);

    let table = '';
    if (_fsPreview) {
        const sumB = _fsPreview.reduce((s, p) => s + p.before, 0);
        const sumA = _fsPreview.reduce((s, p) => s + p.after, 0);
        table = `
            <table style="border-collapse:collapse;margin-top:14px;font-size:0.85rem">
                <thead><tr style="text-align:left;opacity:0.6">
                    <th style="padding:4px 10px">Spieler</th><th style="padding:4px 10px">jetzt</th>
                    <th style="padding:4px 10px">danach</th><th style="padding:4px 10px">Quizze in History</th>
                </tr></thead>
                <tbody>${_fsPreview.map(p => `<tr>
                    <td style="padding:3px 10px">${_ffEsc(p.name)}</td>
                    <td style="padding:3px 10px">${_fsKB(p.before)}</td>
                    <td style="padding:3px 10px;color:var(--correct)">${_fsKB(p.after)}</td>
                    <td style="padding:3px 10px">${p.histBefore} → ${p.histAfter}</td></tr>`).join('')}
                    <tr style="font-weight:700"><td style="padding:6px 10px">Summe</td>
                    <td style="padding:6px 10px">${_fsKB(sumB)}</td><td style="padding:6px 10px;color:var(--correct)">${_fsKB(sumA)}</td><td></td></tr>
                </tbody>
            </table>`;
    }

    const secCleanup = _secBlock('🧹 Spieler-Dateien aufräumen', `
        <p class="text-muted" style="font-size:0.85rem;margin:0 0 12px">
            Verkleinert die Spieler-Dateien, <strong>ohne Erfolge zu verlieren</strong>: XP, Level, Badges,
            Fähigkeiten-Ladungen, Serien und der Lernstand jeder Frage bleiben vollständig.
            Alte Quiz-History wird zu Summen zusammengefasst, damit Badges und Fähigkeiten genauso weiterzählen.
            Gekürzt werden nur Verlaufsdaten, die allein die Auswertung nutzt.
        </p>
        ${_row('Quiz-History behalten', `Tage (mind. ${minDays} — Bestenliste)`,
            `<input type="number" id="fs_keepDays" min="${minDays}" max="3650" value="${_fsOpts.keepDays}" style="width:90px">`)}
        ${_row('Antwort-Verlauf je Frage', 'letzte Einträge (0–15)',
            `<input type="number" id="fs_keepLog" min="0" max="15" value="${_fsOpts.keepLog}" style="width:90px">`)}
        ${_row('Monatsstatistik je Frage', 'letzte Monate',
            `<input type="number" id="fs_keepMonths" min="1" max="120" value="${_fsOpts.keepMonths}" style="width:90px">`)}
        ${_row('Kompakt speichern', 'ohne Einrückung, ca. halb so groß', `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="fs_compact" ${quizSettings.compactPlayerFiles ? 'checked' : ''} onchange="_fsCompactChanged(this)">
                gilt für alle Spieler-Dateien (auch normales Speichern im Quiz)
            </label>`)}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
            <button class="btn btn-small btn-secondary" onclick="_fsPreviewClick()">🔍 Vorschau berechnen</button>
            <button class="btn btn-small" onclick="_fsCleanupClick()">🧹 Aufgeräumte Spieler-Dateien herunterladen (ZIP)</button>
        </div>
        ${quizSettings.compactPlayerFiles ? `<p style="font-size:0.8rem;color:var(--accent-warning,#f39c12);margin:10px 0 0">
            „Kompakt speichern" ist eine Einstellung der Master-Datei — damit das Quiz sie übernimmt,
            danach die Master-Datei speichern: <a href="#" onclick="saveMasterBackup();return false">Master-Datei jetzt speichern</a>.</p>` : ''}
        ${table}
        <p class="text-muted" style="font-size:0.8rem;margin:12px 0 0">
            Ablauf: 1. Sicherung · 2. Aufräumen · 3. ZIP in den Quiz-Ordner entpacken (die neueste Datei pro Spieler
            wird geladen; alte Dateien dürfen liegen bleiben oder in die Sicherung wandern) · 4. Ordner neu laden.
            Währenddessen nicht im Quiz spielen — sonst entsteht eine neuere, ungekürzte Datei.
        </p>
    `);

    container.innerHTML = `<div class="card">${secBackup}${secCleanup}</div>`;
}
