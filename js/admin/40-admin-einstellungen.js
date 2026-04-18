// === Admin: Einstellungen ===

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

const _AVATAR_LEVELS = [
    { key: 'level1',  label: 'Lv 1–4'   },
    { key: 'level5',  label: 'Lv 5–14'  },
    { key: 'level15', label: 'Lv 15–29' },
    { key: 'level30', label: 'Lv 30–44' },
    { key: 'level45', label: 'Lv 45–59' },
    { key: 'level60', label: 'Lv 60–74' },
    { key: 'level75', label: 'Lv 75–89' },
    { key: 'level90', label: 'Lv 90+'   },
];

function _saveBtn(onclick, label) {
    return `<button class="btn-save" onclick="${onclick}" style="margin-top:12px">${label}</button>`;
}

function _secBlock(title, content) {
    return `<div class="section-block" style="margin-bottom:24px;padding:20px;background:var(--overlay-5);border-radius:12px">
        <div class="section-title" style="font-weight:600;margin-bottom:14px;font-size:1rem">${title}</div>
        ${content}
    </div>`;
}

function _row(label, hint, input) {
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap">
        <span class="field-label" style="min-width:200px">${label}${hint ? `<span class="hint" style="opacity:0.5;font-size:0.78rem;margin-left:4px">${hint}</span>` : ''}</span>
        ${input}
    </div>`;
}


AdminShell.registerPanel('einstellungen', 'Einstellungen', '⚙', container => {
    if (!dataLoaded) {
        container.innerHTML = `<div class="card"><p class="text-muted" style="text-align:center;padding:30px 0">
            Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").</p></div>`;
        return;
    }

    const s  = quizSettings;
    const sr = s.spacedRepetition || {};
    const t  = s.timer || {};
    const xp = s.xpSystem || {};
    const lb = s.leaderboard || {};
    const mg = s.miniGames || {};
    const bf = mg.bossFight || {};
    const av = s.avatars || {};
    const preset = s.avatarPreset || 1;
    const ov = s.abilityOverrides || {};

    // ── Allgemein ─────────────────────────────────────────────────────────────
    const secAllgemein = _secBlock('⚙️ Allgemein', `
        ${_row('Quiz-Name', '', `<input type="text" id="set_quizName" value="${_esc(s.quizName || '')}" style="width:220px">`)}
        ${_row('Fragen pro Quiz', '', `<input type="number" id="set_qPerQuiz" min="1" max="100" value="${s.questionsPerQuiz || 10}" style="width:80px">`)}
        ${_row('Podiumsplätze', '', `<input type="number" id="set_podium" min="1" max="20" value="${s.podiumPlaces || 3}" style="width:80px">`)}
        ${_row('Spielerdaten', '', `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="set_encrypt" ${s.encryptPlayerData ? 'checked' : ''}>
                Base64-kodiert (Klartext wenn aus)
            </label>`)}
        ${_saveBtn('_saveAllgemein()', '⚙️ Allgemein speichern')}
    `);

    // ── Bildanzeige ───────────────────────────────────────────────────────────
    const imgW = (s.mediaDisplay || {}).quizImageWidth || 80;
    const secBild = _secBlock('🖼️ Bildanzeige im Quiz', `
        ${_row('Bildbreite', '30–100 %', `
            <input type="range" id="set_imgWidth" min="30" max="100" step="5" value="${imgW}"
                oninput="document.getElementById('set_imgWidthVal').textContent=this.value+'%'">
            <span id="set_imgWidthVal" style="min-width:40px">${imgW}%</span>`)}
        ${_saveBtn('_saveBildanzeige()', '🖼️ Bildanzeige speichern')}
    `);

    // ── Timer ─────────────────────────────────────────────────────────────────
    const timerEnabled = t.enabled !== false;
    const secTimer = _secBlock('⏱️ Timer-Modus', `
        ${_row('Timer aktiv', '', `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="set_timerOn" ${timerEnabled ? 'checked' : ''}
                onchange="document.getElementById('set_timerFields').style.display=this.checked?'block':'none'">
            Timer einschalten
        </label>`)}
        <div id="set_timerFields" style="display:${timerEnabled ? 'block' : 'none'}">
            ${_row('Sekunden / Frage', '', `<input type="number" id="set_timerSec" min="2" max="120" step="0.5" value="${t.secondsPerQuestion || 3}" style="width:80px">`)}
            ${_row('Strafpunkte bei Timeout', '', `<input type="number" id="set_timerPenalty" min="0" max="50" value="${t.penalty || 5}" style="width:80px">`)}
            ${_row('XP-Multiplikator', '', `<input type="number" id="set_timerXPMult" min="1" max="5" step="0.1" value="${t.xpMultiplier || 1.5}" style="width:80px">`)}
            ${_row('Auto-Weiter (s)', '0 = aus', `<input type="number" id="set_timerAutoAdv" min="0" max="30" step="1" value="${t.autoAdvanceSec ?? 5}" style="width:80px">`)}
            <div style="margin:8px 0 4px;opacity:0.6;font-size:0.82rem">Geschwindigkeits-Boni (% verbleibende Zeit → Bonus-XP)</div>
            ${_row('Gold (≤ %  Zeit → +XP)', '', `
                <input type="number" id="set_goldPct" min="5" max="50" value="${t.goldPct || 25}" style="width:70px">
                <span style="opacity:0.5">→</span>
                <input type="number" id="set_goldXP" min="0" max="200" value="${t.goldXP || 50}" style="width:70px"> XP`)}
            ${_row('Silber', '', `
                <input type="number" id="set_silverPct" min="10" max="70" value="${t.silverPct || 50}" style="width:70px">
                <span style="opacity:0.5">→</span>
                <input type="number" id="set_silverXP" min="0" max="100" value="${t.silverXP || 25}" style="width:70px"> XP`)}
            ${_row('Bronze', '', `
                <input type="number" id="set_bronzePct" min="20" max="90" value="${t.bronzePct || 75}" style="width:70px">
                <span style="opacity:0.5">→</span>
                <input type="number" id="set_bronzeXP" min="0" max="50" value="${t.bronzeXP || 10}" style="width:70px"> XP`)}
            ${_row('', '', `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                    <input type="checkbox" id="set_timerDynamic" ${t.dynamicTimer !== false ? 'checked' : ''}> Dynamischer Timer
                </label>`)}
            ${_row('', '', `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                    <input type="checkbox" id="set_timerSpeed" ${t.speedBonus !== false ? 'checked' : ''}> Geschwindigkeits-Bonus
                </label>`)}
            ${_row('', '', `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                    <input type="checkbox" id="set_timerGhost" ${t.ghostRace !== false ? 'checked' : ''}> Geist-Rennen
                </label>`)}
        </div>
        ${_saveBtn('_saveTimer()', '⏱️ Timer speichern')}
    `);

    // ── Spaced Repetition ─────────────────────────────────────────────────────
    const srRand = sr.randomness ?? 30;
    const secSR = _secBlock('🔀 Spaced Repetition', `
        ${_row('Zufälligkeit', '0 = reines SR · 100 = komplett zufällig', `
            <input type="range" id="set_srRand" min="0" max="100" step="5" value="${srRand}"
                oninput="document.getElementById('set_srRandVal').textContent=this.value+'%'">
            <span id="set_srRandVal" style="min-width:40px">${srRand}%</span>`)}
        ${_row('Streak-Schwelle', '× korrekt in Folge → Cooldown', `<input type="number" id="set_srStreak" min="2" max="10" value="${sr.streakThreshold ?? 2}" style="width:80px">`)}
        ${_row('Cooldown-Dauer', 'Stunden', `<input type="number" id="set_srCooldown" min="1" max="720" value="${sr.streakCooldown ?? 48}" style="width:80px">`)}
        ${_row('Fresh-Quota', '% neue/seltene Fragen (0 = deaktiviert)', `<input type="number" id="set_srFresh" min="0" max="100" value="${sr.freshQuota ?? 50}" style="width:80px">`)}
        ${_row('Fresh-Schwelle', 'max. asked-Zahl für „selten gestellt"', `<input type="number" id="set_srFreshThresh" min="0" max="10" value="${sr.freshThreshold ?? 1}" style="width:80px">`)}
        ${_row('Max. Core (1. Quiz/Tag)', '', `<input type="number" id="set_srCoreFirst" min="0" max="100" value="${sr.maxCoreFirst ?? 7}" style="width:80px">`)}
        ${_row('Max. Core (Folge-Quizze)', '', `<input type="number" id="set_srCoreSubseq" min="0" max="100" value="${sr.maxCoreSubsequent ?? 3}" style="width:80px">`)}
        ${_row('Max. Non-Core / Gruppe', '0 = deaktiviert', `<input type="number" id="set_srMaxGroup" min="0" max="100" value="${sr.maxPerGroup ?? 3}" style="width:80px">`)}
        ${_saveBtn('_saveSR()', '🔀 SR speichern')}
    `);

    // ── XP-System ─────────────────────────────────────────────────────────────
    const secXP = _secBlock('⭐ XP-System', `
        ${_row('Basis-XP / Level', '', `<input type="number" id="set_baseXP" min="10" max="1000" value="${xp.baseXP || 50}" style="width:100px">`)}
        ${_row('XP-Exponent', '1.3 = moderat · 2.0 = stark', `<input type="number" id="set_xpExp" min="1" max="3" step="0.1" value="${xp.exponent || 1.3}" style="width:100px">`)}
        ${_row('1. Quiz/Tag Bonus', '%', `<input type="number" id="set_xpFirstDay" min="100" max="500" value="${xp.firstDailyBonus || 200}" style="width:100px">`)}
        ${_row('Weitere Quizze Bonus', '%', `<input type="number" id="set_xpSubseq" min="50" max="200" value="${xp.subsequentBonus || 100}" style="width:100px">`)}
        ${_row('XP bei richtiger Antwort', '', `<input type="number" id="set_xpCorrect" min="0" max="100" value="${xp.correctAnswerXP || 10}" style="width:100px">`)}
        ${_row('XP bei falscher Antwort', 'negativ = Abzug', `<input type="number" id="set_xpWrong" min="-50" max="50" value="${xp.wrongAnswerXP ?? -2}" style="width:100px">`)}
        ${_saveBtn('_saveXP()', '⭐ XP speichern')}
    `);

    // ── Bestenliste ───────────────────────────────────────────────────────────
    const secLB = _secBlock('🏆 Bestenliste', `
        ${_row('Ziel-Quiz / 90 Tage', 'für 100% Engagement', `<input type="number" id="set_lbTarget" min="1" max="500" value="${lb.engagementTarget || 60}" style="width:100px">`)}
        ${_row('Qualitäts-Verfall', 'pro Tag (0.99 = 1%/Tag)', `<input type="number" id="set_lbDecay" min="0.9" max="1" step="0.001" value="${lb.decayRate ?? 0.99}" style="width:100px">`)}
        ${_row('Max. inaktive Tage', 'nach X Tagen = 0 Engagement', `<input type="number" id="set_lbMaxAge" min="7" max="365" value="${lb.maxAgeDays || 90}" style="width:100px">`)}
        ${_row('Min. Quiz für Eintrag', '0 = alle', `<input type="number" id="set_lbMin" min="0" max="100" value="${lb.minQuizzes || 0}" style="width:100px">`)}
        ${_saveBtn('_saveLB()', '🏆 Bestenliste speichern')}
    `);

    // ── BossFight ─────────────────────────────────────────────────────────────
    const secBoss = _secBlock('🎮 BossFight', `
        ${_row('Aktiviert', '', `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="set_bossEnabled" ${bf.enabled !== false ? 'checked' : ''}> BossFight einschalten
        </label>`)}
        ${_row('Min. Fragen im Pool', 'unter diesem Wert kein BossFight', `<input type="number" id="set_bossThresh" min="1" max="100" value="${bf.threshold || 10}" style="width:80px">`)}
        ${_row('Boss-HP', '', `<input type="number" id="set_bossHP" min="10" max="500" value="${bf.hp || 100}" style="width:80px">`)}
        ${_row('Spieler-Leben', 'Fehler bis Niederlage', `<input type="number" id="set_bossLives" min="1" max="10" value="${bf.lives || 3}" style="width:80px">`)}
        ${_row('Sieg-XP', '', `<input type="number" id="set_bossWinXP" min="0" max="1000" value="${bf.winXP || 100}" style="width:80px">`)}
        ${_saveBtn('_saveBoss()', '🎮 BossFight speichern')}
    `);

    // ── Avatar-Bilder ─────────────────────────────────────────────────────────
    const presetBtns = [1,2].map(p => `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-right:16px">
            <input type="radio" name="avatarPreset" value="${p}" ${preset === p ? 'checked' : ''}
                onchange="_adminAvatarSetPreset(${p})">
            Preset ${p}
        </label>`).join('');

    const avatarRows = _AVATAR_LEVELS.map(lv => {
        const avData = av[lv.key] || {};
        const previewKey = preset === 2 ? 'image2' : 'image';
        const previewSrc = avData[previewKey];
        const preview = previewSrc
            ? `<img src="${previewSrc}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--overlay-20)">`
            : `<span style="font-size:1.8rem">${avData.icon || '?'}</span>`;
        return `<tr>
            <td style="width:60px;text-align:center">${preview}</td>
            <td style="opacity:0.65">${lv.label}</td>
            <td><input type="text" id="avIcon_${lv.key}" value="${_esc(avData.icon || '')}"
                maxlength="4" style="width:60px;text-align:center;padding:4px"
                onchange="quizSettings.avatars['${lv.key}'].icon=this.value"></td>
            <td>
                <input type="file" id="avFile_${lv.key}" accept="image/*" style="display:none"
                    onchange="_adminAvatarUpload('${lv.key}',event)">
                <button class="btn btn-small btn-secondary" style="padding:4px 10px;margin:0"
                    onclick="document.getElementById('avFile_${lv.key}').click()">🖼️ Bild</button>
                ${previewSrc ? `<button class="btn btn-small btn-secondary" style="padding:4px 8px;margin:0"
                    onclick="_adminAvatarRemove('${lv.key}')">✕</button>` : ''}
            </td>
        </tr>`;
    }).join('');

    const secAvatare = _secBlock('🖼️ Avatar-Bilder', `
        <div style="display:flex;margin-bottom:14px">${presetBtns}</div>
        <p class="text-muted" style="margin-bottom:12px;font-size:0.85rem">
            Aktives Preset: <strong>${preset}</strong> — Bild wird im Quiz angezeigt wenn vorhanden, sonst Emoji.
        </p>
        <table class="info-table" style="font-size:0.9rem">
            <thead><tr style="opacity:0.5;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px">
                <td>Vorschau</td><td>Stufe</td><td>Emoji</td><td>Bild (Preset ${preset})</td>
            </tr></thead>
            <tbody id="avatarTableBody">${avatarRows}</tbody>
        </table>
        ${_saveBtn('saveMasterBackup()', '🖼️ Avatare speichern')}
    `);

    // ── Sicherheit ────────────────────────────────────────────────────────────
    const secSicherheit = _secBlock('🔒 Sicherheit', `
        ${_row('Admin-Passwort', 'leer = kein Passwort', `<input type="password" id="set_pw" value="${_esc(s.adminPassword || '')}" style="width:200px">`)}
        ${_row('Neues Passwort bestätigen', '', `<input type="password" id="set_pw2" style="width:200px">`)}
        ${_saveBtn('_saveSicherheit()', '🔒 Passwort speichern')}
    `);

    // ── Fähigkeiten ───────────────────────────────────────────────────────────
    const abilRows = _ADMIN_ABILITY_DEFS.map(def => {
        const current = ov[def.key]?.earnPer ?? def.defaultEarnPer;
        return `<tr>
            <td style="font-size:1.2rem;width:36px">${def.icon}</td>
            <td class="td-bold">${def.name}</td>
            <td class="td-muted" style="font-size:0.82rem">${def.earnStat}</td>
            <td style="text-align:right;opacity:0.45;font-size:0.82rem">Standard: ${def.defaultEarnPer}</td>
            <td style="width:100px">
                <input type="number" min="1" max="9999"
                    id="earnPer_${def.key}" value="${current}"
                    style="margin:0;padding:5px 8px;width:80px;font-size:0.9rem;text-align:right">
            </td>
        </tr>`;
    }).join('');

    const secFaehigkeiten = _secBlock('⚡ Fähigkeiten — Freischalt-Schwellen', `
        <p class="text-muted mb-20" style="font-size:0.85rem">
            <strong>earnPer</strong>: Alle N Einheiten von <em>earnStat</em> erhält der Spieler eine Ladung.
        </p>
        <table class="info-table" style="font-size:0.9rem">
            <thead><tr style="opacity:0.5;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px">
                <td></td><td>Fähigkeit</td><td>Stat</td><td style="text-align:right">Standard</td><td style="text-align:right">Aktiv</td>
            </tr></thead>
            <tbody>${abilRows}</tbody>
        </table>
        <div style="margin-top:16px;display:flex;gap:12px;align-items:center">
            <button class="btn btn-small" onclick="_adminEinstellungenSave()">💾 Fähigkeiten speichern</button>
            <button class="btn btn-small btn-secondary" onclick="_adminEinstellungenReset()">↺ Standard</button>
            <span id="einstellungen_hint" class="text-muted"></span>
        </div>
    `);

    container.innerHTML = `
        <div class="card">
            ${secAllgemein}
            ${secBild}
            ${secTimer}
            ${secSR}
            ${secXP}
            ${secLB}
            ${secBoss}
            ${secAvatare}
            ${secSicherheit}
            ${secFaehigkeiten}
        </div>`;
});


// ── Save-Funktionen ────────────────────────────────────────────────────────────

function _saveAllgemein() {
    quizSettings.quizName        = document.getElementById('set_quizName').value.trim();
    quizSettings.questionsPerQuiz = parseInt(document.getElementById('set_qPerQuiz').value) || 10;
    quizSettings.podiumPlaces    = parseInt(document.getElementById('set_podium').value) || 3;
    quizSettings.encryptPlayerData = document.getElementById('set_encrypt').checked;
    saveMasterBackup();
}

function _saveBildanzeige() {
    if (!quizSettings.mediaDisplay) quizSettings.mediaDisplay = {};
    quizSettings.mediaDisplay.quizImageWidth = parseInt(document.getElementById('set_imgWidth').value) || 80;
    saveMasterBackup();
}

function _saveTimer() {
    const on = document.getElementById('set_timerOn').checked;
    quizSettings.timer = Object.assign(quizSettings.timer || {}, {
        enabled:           on,
        secondsPerQuestion: parseFloat(document.getElementById('set_timerSec').value) || 3,
        penalty:           parseInt(document.getElementById('set_timerPenalty').value) || 5,
        xpMultiplier:      parseFloat(document.getElementById('set_timerXPMult').value) || 1.5,
        autoAdvanceSec:    parseInt(document.getElementById('set_timerAutoAdv').value) ?? 5,
        goldPct:           parseInt(document.getElementById('set_goldPct').value) || 25,
        goldXP:            parseInt(document.getElementById('set_goldXP').value) || 50,
        silverPct:         parseInt(document.getElementById('set_silverPct').value) || 50,
        silverXP:          parseInt(document.getElementById('set_silverXP').value) || 25,
        bronzePct:         parseInt(document.getElementById('set_bronzePct').value) || 75,
        bronzeXP:          parseInt(document.getElementById('set_bronzeXP').value) || 10,
        dynamicTimer:      document.getElementById('set_timerDynamic').checked,
        speedBonus:        document.getElementById('set_timerSpeed').checked,
        ghostRace:         document.getElementById('set_timerGhost').checked,
    });
    saveMasterBackup();
}

function _saveSR() {
    quizSettings.spacedRepetition = Object.assign(quizSettings.spacedRepetition || {}, {
        randomness:        parseInt(document.getElementById('set_srRand').value) ?? 30,
        streakThreshold:   parseInt(document.getElementById('set_srStreak').value) || 2,
        streakCooldown:    parseInt(document.getElementById('set_srCooldown').value) || 48,
        freshQuota:        parseInt(document.getElementById('set_srFresh').value) ?? 50,
        freshThreshold:    parseInt(document.getElementById('set_srFreshThresh').value) ?? 1,
        maxCoreFirst:      parseInt(document.getElementById('set_srCoreFirst').value) ?? 7,
        maxCoreSubsequent: parseInt(document.getElementById('set_srCoreSubseq').value) ?? 3,
        maxPerGroup:       parseInt(document.getElementById('set_srMaxGroup').value) ?? 3,
    });
    saveMasterBackup();
}

function _saveXP() {
    quizSettings.xpSystem = Object.assign(quizSettings.xpSystem || {}, {
        baseXP:          parseInt(document.getElementById('set_baseXP').value) || 50,
        exponent:        parseFloat(document.getElementById('set_xpExp').value) || 1.3,
        firstDailyBonus: parseInt(document.getElementById('set_xpFirstDay').value) || 200,
        subsequentBonus: parseInt(document.getElementById('set_xpSubseq').value) || 100,
        correctAnswerXP: parseInt(document.getElementById('set_xpCorrect').value) || 10,
        wrongAnswerXP:   parseInt(document.getElementById('set_xpWrong').value) ?? -2,
    });
    saveMasterBackup();
}

function _saveLB() {
    quizSettings.leaderboard = Object.assign(quizSettings.leaderboard || {}, {
        engagementTarget: parseInt(document.getElementById('set_lbTarget').value) || 60,
        decayRate:        parseFloat(document.getElementById('set_lbDecay').value) ?? 0.99,
        maxAgeDays:       parseInt(document.getElementById('set_lbMaxAge').value) || 90,
        minQuizzes:       parseInt(document.getElementById('set_lbMin').value) || 0,
    });
    saveMasterBackup();
}

function _saveBoss() {
    if (!quizSettings.miniGames) quizSettings.miniGames = {};
    quizSettings.miniGames.bossFight = Object.assign(quizSettings.miniGames.bossFight || {}, {
        enabled:   document.getElementById('set_bossEnabled').checked,
        threshold: parseInt(document.getElementById('set_bossThresh').value) || 10,
        hp:        parseInt(document.getElementById('set_bossHP').value) || 100,
        lives:     parseInt(document.getElementById('set_bossLives').value) || 3,
        winXP:     parseInt(document.getElementById('set_bossWinXP').value) || 100,
    });
    saveMasterBackup();
}

function _saveSicherheit() {
    const pw  = document.getElementById('set_pw').value;
    const pw2 = document.getElementById('set_pw2').value;
    if (pw !== pw2) { Toast.show('Passwörter stimmen nicht überein.', 'error'); return; }
    quizSettings.adminPassword = pw;
    saveMasterBackup();
}

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

// ── Avatar-Hilfsfunktionen ─────────────────────────────────────────────────────

function _adminAvatarSetPreset(p) {
    quizSettings.avatarPreset = p;
    // Tabelle neu aufbauen mit korrekter Vorschau
    if (!quizSettings.avatars) quizSettings.avatars = {};
    const av = quizSettings.avatars;
    const previewKey = p === 2 ? 'image2' : 'image';
    const tbody = document.getElementById('avatarTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach((tr, i) => {
        const lv = _AVATAR_LEVELS[i];
        if (!lv) return;
        const avData = av[lv.key] || {};
        const previewSrc = avData[previewKey];
        const td = tr.querySelector('td:first-child');
        if (td) td.innerHTML = previewSrc
            ? `<img src="${previewSrc}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--overlay-20)">`
            : `<span style="font-size:1.8rem">${avData.icon || '?'}</span>`;
    });
}

function _adminAvatarUpload(levelKey, event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        if (!quizSettings.avatars) quizSettings.avatars = {};
        if (!quizSettings.avatars[levelKey]) quizSettings.avatars[levelKey] = { icon: '?', image: null, image2: null };
        const preset = quizSettings.avatarPreset || 1;
        const field = preset === 2 ? 'image2' : 'image';
        quizSettings.avatars[levelKey][field] = e.target.result;
        _adminAvatarSetPreset(preset);
        Toast.show(`Bild für ${levelKey} (Preset ${preset}) gesetzt.`, 'success');
    };
    reader.readAsDataURL(file);
}

function _adminAvatarRemove(levelKey) {
    if (!quizSettings.avatars || !quizSettings.avatars[levelKey]) return;
    const preset = quizSettings.avatarPreset || 1;
    const field = preset === 2 ? 'image2' : 'image';
    quizSettings.avatars[levelKey][field] = null;
    _adminAvatarSetPreset(preset);
    Toast.show(`Bild entfernt (${levelKey}, Preset ${preset}).`, 'success');
}
