// 20-plugin-usermanagement.js
// UserManagementPlugin - user management
// ============================================================

const UserManagementPlugin = {
    name:'UserManagementPlugin',
    init(){}, enable(){}, disable(){},
    renderUserList(){},
    updateUsersList(){
        const el=document.getElementById('usersListContent');if(!el)return;
        if(users.length===0){el.innerHTML='<p>Keine Benutzer</p>';return;}
        el.innerHTML=users.map(u=>`<div class="question-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px;">
            <div><strong>${sanitizeHTML(u.name)}</strong> · Level ${u.level||1} · ${u.totalXP||0} XP</div>
            <div style="display:flex;gap:8px;">
                <button class="btn btn-small" onclick="showUserDetail(${u.id})">Details</button>
                <button class="btn btn-danger btn-small" onclick="deleteUser(${u.id})">Löschen</button>
            </div></div>`).join('');
    },
    addUser(e){
        if(e)e.preventDefault();
        const input=document.getElementById('newUserName');if(!input)return;
        const name=input.value.trim();if(!name){Toast.show('Name eingeben!','warning');return;}
        if(users.find(u=>u.name===name)){Toast.show('Name existiert bereits!','warning');return;}
        users.push({id:Date.now(),name,correctAnswers:0,totalAnswers:0,quizzesTaken:0,xp:0,totalXP:0,level:1,streak:0,lastQuizDate:null,achievements:[],quizHistory:[],history:[],dailyQuizCount:0,questionStats:{},badgeStats:{}});
        input.value='';this.updateUsersList();renderUserSelect();Toast.show('Benutzer erstellt!','success');
    },
    deleteUser(id){
        GameDialog.showConfirm('Benutzer löschen?','',()=>{
            users=users.filter(u=>u.id!==id);if(currentUser&&currentUser.id===id)currentUser=null;
            this.updateUsersList();renderUserSelect();Toast.show('Benutzer gelöscht','info');
        });
    },
    showUserDetail(id){
        const user=users.find(u=>u.id===id);if(!user)return;
        adminState.viewingUserId=id;showAdminSection('userDetail');this.renderUserDetailContent(user);
    },
    renderUserDetailContent(user){
        const el=document.getElementById('adminUserDetail');if(!el)return;
        const lvl=calculateLevel(user.totalXP||0);

        // ── Quiz-Historie Auswertung ──────────────────────────────
        const hist = user.history || [];
        const scores = hist.map(h => h.score || 0).filter(s => s > 0);
        const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
        const bestScore = scores.length ? Math.max(...scores) : 0;
        const worstScore = scores.length ? Math.min(...scores) : 0;
        const totalXPEarned = hist.reduce((s,h)=>s+(h.xp||0),0);

        // ── questionStats Auswertung ──────────────────────────────
        const qs = user.questionStats || {};
        const qids = Object.keys(qs);
        const qAsked  = k => qs[k].asked   ?? 0;
        const qCorrect = k => qs[k].correct ?? 0;
        const totalAsked = qids.reduce((s,k)=>s+qAsked(k),0);
        const totalCorrect = qids.reduce((s,k)=>s+qCorrect(k),0);
        const overallRate = totalAsked > 0 ? Math.round(totalCorrect/totalAsked*100) : 0;
        const mastered = qids.filter(k=>qAsked(k)>=3 && Math.round(qCorrect(k)/(qAsked(k)||1)*100)>=80).length;

        // ── Prioritäts-Hilfsfunktion (ohne Zufall) ────────────────
        const calcPrio = (qid) => {
            const s = qs[qid];
            const a = qAsked(qid);
            if (!s || a===0) return 300;
            let score = 100;
            score -= Math.log2(a+1)*30;
            score += (1-qCorrect(qid)/a)*100;
            if (s.lastAsked) score += Math.min(Math.floor((Date.now()-new Date(s.lastAsked))/86400000),30)*3;
            return Math.max(0,Math.round(score));
        };

        // ── Fragen-Tabelle aufbauen ───────────────────────────────
        const statsRows = qids.map(qid => {
            const s = qs[qid];
            const q = (typeof questions !== 'undefined') ? questions.find(q=>q.questionId===qid) : null;
            return {
                qid,
                qidDisplay: q ? (q.questionId||'?') : '?',
                text: q ? (q.text||'') : '(Frage nicht gefunden)',
                asked: qAsked(qid),
                correct: qCorrect(qid),
                rate: qAsked(qid)>0 ? Math.round(qCorrect(qid)/qAsked(qid)*100) : -1,
                lastAsked: s.lastAsked ? new Date(s.lastAsked).toLocaleDateString('de-DE') : '–',
                prio: calcPrio(qid)
            };
        }).filter(r=>r.asked>0).sort((a,b)=>b.prio-a.prio);

        const tile = (label, value, color='') =>
            `<div class="card" style="padding:14px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;${color?'color:'+color+';':''}">${value}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:4px;">${label}</div>
            </div>`;

        const rateColor = r => r>=70?'var(--correct)':r>=50?'var(--accent)':'var(--incorrect)';

        el.innerHTML = `
        <a href="#" onclick="showAdminSection('users');return false;" style="display:inline-block;margin-bottom:15px;">← Zurück</a>
        <h3 style="margin:0 0 20px 0;">${sanitizeHTML(user.name)}</h3>

        <h4 style="margin:0 0 12px 0;opacity:0.7;">📈 Übersicht</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:28px;">
            ${tile('Level', lvl.level)}
            ${tile('Gesamt-XP', (user.totalXP||0).toLocaleString())}
            ${tile('Quizze', user.quizzesTaken||0)}
            ${tile('Streak', user.streak||0)}
        </div>

        <h4 style="margin:0 0 12px 0;opacity:0.7;">📊 Detaillierte Statistiken</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:28px;">
            ${tile('Ø Ergebnis', avgScore+'%', rateColor(avgScore))}
            ${tile('Bestes Ergebnis', bestScore+'%', 'var(--correct)')}
            ${tile('Schlechtestes', worstScore>0?worstScore+'%':'–', 'var(--incorrect)')}
            ${tile('Gesamt richtig', totalCorrect+' / '+totalAsked)}
            ${tile('Erfolgsrate', overallRate+'%', rateColor(overallRate))}
            ${tile('Verdiente XP', totalXPEarned.toLocaleString())}
            ${tile('Gemeistert ≥80%', mastered)}
        </div>

        <h4 style="margin:0 0 12px 0;opacity:0.7;">📜 Quiz-Historie (letzte 10)</h4>
        ${hist.length > 0 ? `
        <div style="max-height:240px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:28px;">
            <table style="width:100%;border-collapse:collapse;">
                <thead style="position:sticky;top:0;background:var(--bg-dark);">
                    <tr>
                        <th style="padding:10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.1);">Datum</th>
                        <th style="padding:10px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">Ergebnis</th>
                        <th style="padding:10px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">Richtig</th>
                        <th style="padding:10px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">XP</th>
                    </tr>
                </thead>
                <tbody>
                    ${hist.slice(-10).reverse().map(h=>`
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:8px;font-size:0.9rem;">${new Date(h.date).toLocaleDateString('de-DE')} ${new Date(h.date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</td>
                        <td style="padding:8px;text-align:center;"><span style="color:${rateColor(h.score||0)};font-weight:700;">${h.score||0}%</span></td>
                        <td style="padding:8px;text-align:center;">${h.correct||0} / ${h.total||0}</td>
                        <td style="padding:8px;text-align:center;color:var(--accent);">+${h.xp||0}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>` : `<div style="padding:20px;opacity:0.5;text-align:center;margin-bottom:28px;">Noch keine Quiz-Historie vorhanden.</div>`}

        <h4 style="margin:0 0 6px 0;opacity:0.7;">🎯 Fragen-Prioritäten</h4>
        <p style="font-size:0.85rem;opacity:0.5;margin:0 0 12px 0;">Höhere Priorität = wird eher im nächsten Quiz gestellt.</p>
        ${statsRows.length > 0 ? `
        <div style="max-height:350px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:28px;">
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead style="position:sticky;top:0;background:var(--bg-dark);">
                    <tr>
                        <th style="padding:10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.1);">Frage</th>
                        <th style="padding:10px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">Beantw.</th>
                        <th style="padding:10px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">Erfolg</th>
                        <th style="padding:10px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">Zuletzt</th>
                        <th style="padding:10px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">Prio</th>
                    </tr>
                </thead>
                <tbody>
                    ${statsRows.map(r=>`
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:10px;">
                            <span style="color:var(--accent);font-weight:700;font-size:0.82rem;font-family:monospace">${r.qidDisplay}</span>
                            <div style="font-size:0.8rem;opacity:0.55;margin-top:2px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitizeHTML(r.text.substring(0,80)+(r.text.length>80?'…':''))}</div>
                        </td>
                        <td style="padding:10px;text-align:center;">${r.asked}x</td>
                        <td style="padding:10px;text-align:center;"><span style="color:${rateColor(r.rate)};">${r.rate>=0?r.rate+'%':'–'}</span></td>
                        <td style="padding:10px;text-align:center;opacity:0.65;">${r.lastAsked}</td>
                        <td style="padding:10px;text-align:center;">
                            <span style="background:${r.prio>=200?'var(--correct)':r.prio>=100?'var(--accent)':'var(--secondary)'};color:white;padding:3px 8px;border-radius:4px;font-weight:700;">${r.prio}</span>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>` : `<div style="padding:20px;opacity:0.5;text-align:center;margin-bottom:28px;">Noch keine Fragen-Daten vorhanden.</div>`}

        <h4 style="margin:0 0 12px 0;opacity:0.7;">🔧 Datenverwaltung</h4>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
            <button class="btn btn-secondary btn-small" onclick="UserManagementPlugin.exportUserData(${user.id})">💾 Exportieren</button>
            <button class="btn btn-danger btn-small" onclick="UserManagementPlugin.confirmResetUserStats(${user.id})">🗑️ Statistiken zurücksetzen</button>
        </div>`;
    },
    renderSuperAdminEditForm(){return'';},
    getQuestionStatsArray(user){
        if(!user||!user.questionStats)return[];
        return Object.entries(user.questionStats).map(([qid,s])=>({questionId:qid,...s}));
    },
    authenticateSuperAdmin(){},
    saveUserEdits(){},
    exportUserData(id){
        const user=users.find(u=>u.id===id);if(!user)return;
        const blob=new Blob([JSON.stringify(user,null,2)],{type:'application/json'});
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`user_${user.name}.json`;a.click();
    },
    importUserData(){},
    confirmResetUserStats(id){
        GameDialog.showConfirm('Stats zurücksetzen?','Alle Quiz-Statistiken werden gelöscht.',()=>{
            const user=users.find(u=>u.id===id);if(!user)return;
            user.questionStats={};user.correctAnswers=0;user.totalAnswers=0;user.quizzesTaken=0;
            Toast.show('Stats zurückgesetzt','success');if(adminState.viewingUserId===id)this.renderUserDetailContent(user);
        });
    },
    uploadAvatar(){}, removeAvatar(){}, switchAvatarPreset(p){
        quizSettings.avatarPreset=parseInt(p)||1;renderUserSelect();Toast.show('Avatar-Preset gewechselt','success');
    },
    selectAvatarCircle(){}, uploadSelectedAvatar(){}, removeSelectedAvatar(){},
    updateAvatarCircles(){},
    updateAllAvatarCircles(){
        // No-op: full implementation in Session 4
    }
};

// Register all plugin stubs
PluginRegistry.register('ClassicQuizPlugin', ClassicQuizPlugin, {category:'quiz', required:true});
PluginRegistry.register('AbilityPlugin', AbilityPlugin, {category:'feature'});
PluginRegistry.register('WheelPlugin', WheelPlugin, {category:'minigame'});
PluginRegistry.register('BossFightPlugin', BossFightPlugin, {category:'minigame'});
PluginRegistry.register('BadgePlugin', BadgePlugin, {category:'feature'});
PluginRegistry.register('LeaderboardPlugin', LeaderboardPlugin, {category:'feature'});
PluginRegistry.register('Fragen2Plugin', Fragen2Plugin, {category:'admin'});
PluginRegistry.register('UserManagementPlugin', UserManagementPlugin, {category:'admin'});


function getGroupPrefix(groupName) {
    return (groupName || 'manu').replace(/[^a-zA-ZäöüÄÖÜ]/g, '')
        .replace(/ä/gi,'a').replace(/ö/gi,'o').replace(/ü/gi,'u')
        .toLowerCase().slice(0, 4) || 'manu';
}

function assignStableId(group, allQuestions) {
    const prefix = getGroupPrefix(group);
    let max = 0;
    (allQuestions || questions).forEach(q => {
        if (q.questionId && q.questionId.startsWith(prefix + '_')) {
            const n = parseInt(q.questionId.split('_')[1], 10);
            if (!isNaN(n) && n > max) max = n;
        }
    });
    return prefix + '_' + String(max + 1).padStart(5, '0');
}


