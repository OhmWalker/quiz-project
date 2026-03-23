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
        el.innerHTML=`<a href="#" onclick="showAdminSection('users');return false;" style="display:inline-block;margin-bottom:15px;">← Zurück</a>
        <h3>${sanitizeHTML(user.name)}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin:20px 0;">
            <div class="card" style="padding:15px;text-align:center;"><div style="font-size:2rem;">${lvl.level}</div><div style="opacity:0.7;">Level</div></div>
            <div class="card" style="padding:15px;text-align:center;"><div style="font-size:2rem;">${user.totalXP||0}</div><div style="opacity:0.7;">XP</div></div>
            <div class="card" style="padding:15px;text-align:center;"><div style="font-size:2rem;">${user.quizzesTaken||0}</div><div style="opacity:0.7;">Quizze</div></div>
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
PluginRegistry.register('SpeedTapPlugin', SpeedTapPlugin, {category:'minigame'});
PluginRegistry.register('BossFightPlugin', BossFightPlugin, {category:'minigame'});
PluginRegistry.register('BadgePlugin', BadgePlugin, {category:'feature'});
PluginRegistry.register('LeaderboardPlugin', LeaderboardPlugin, {category:'feature'});
PluginRegistry.register('Fragen2Plugin', Fragen2Plugin, {category:'admin'});
PluginRegistry.register('UserManagementPlugin', UserManagementPlugin, {category:'admin'});

function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}


function generateQuestionHash(question) {
    // Normalisiere Text (lowercase, trim)
    const text = (question.text || question.frage || '').toLowerCase().trim();

    // Media-Fingerprint: Pfad oder erste 80 Zeichen des Data-URLs
    const media = question.media || question.bild || null;
    const mediaFp = media
        ? (media.path ? media.path.toLowerCase().trim() : (media.data ? media.data.slice(0, 80) : ''))
        : '';

    // Für Imagemap: Text + Targets
    if (question.targets) {
        const targetStr = JSON.stringify(question.targets);
        return 'Q_' + hashString(text + '|' + targetStr);
    }

    // Für Freitext: Text + korrekte Antworten + Media
    const textAnswers = getCorrectTextAnswers(question);
    if (textAnswers.length > 0 && (!question.answers || !question.answers[0] || !question.answers[0].text)) {
        const answer = textAnswers.map(function(a){ return String(a).toLowerCase().trim(); }).sort().join('|');
        return 'Q_' + hashString(text + '|' + answer + '|' + mediaFp);
    }

    // Für Multiple-Choice: Text + alle Antwort-Texte + Media
    if (question.answers || question.antworten) {
        const answers = question.answers || question.antworten;
        const answerTexts = answers.map(a => {
            if (typeof a === 'string') return a.toLowerCase().trim();
            return (a.text || '').toLowerCase().trim();
        }).join('|');
        return 'Q_' + hashString(text + '|' + answerTexts + '|' + mediaFp);
    }

    // Fallback: Text + Media
    return 'Q_' + hashString(text + '|' + mediaFp);
}

// DISPLAY-NUMMER SYSTEM
// Fortlaufende Nummern für die Anzeige (1, 2, 3, ...)
// questionId (Hash) bleibt intern für Stats/Duplikate


function getNextDisplayNumber() {
    const usedNumbers = new Set(questions.map(q => q.displayNumber).filter(n => typeof n === 'number'));
    let next = 1;
    while (usedNumbers.has(next)) next++;
    return next;
}


function assignDisplayNumbers() {
    // Schritt 1+2: Versuche alte numerische IDs als displayNumber zu übernehmen
    questions.forEach(q => {
        if (typeof q.displayNumber === 'number') return;
        if (q._oldQuestionId && /^\d+$/.test(String(q._oldQuestionId))) {
            q.displayNumber = parseInt(String(q._oldQuestionId), 10);
            return;
        }
        if (q.questionId && /^\d+$/.test(String(q.questionId))) {
            q.displayNumber = parseInt(String(q.questionId), 10);
            return;
        }
    });

    // Schritt 3: Doppelte displayNumbers auflösen
    const seen = {};
    questions.forEach(q => {
        if (typeof q.displayNumber !== 'number') return;
        if (seen[q.displayNumber]) {
            seen[q.displayNumber].displayNumber = null;
            q.displayNumber = null;
        } else {
            seen[q.displayNumber] = q;
        }
    });

    // Schritt 4: Vergib nächste freie Nummer an alle ohne Nummer
    const usedNumbers = new Set(questions.map(q => q.displayNumber).filter(n => typeof n === 'number'));
    let next = 1;
    questions.forEach(q => {
        if (typeof q.displayNumber === 'number') return;
        while (usedNumbers.has(next)) next++;
        q.displayNumber = next;
        usedNumbers.add(next);
        next++;
    });
}


function renumberAllQuestions() {
    const sorted = [...questions].sort((a, b) => a.id - b.id);
    sorted.forEach((q, idx) => {
        q.displayNumber = idx + 1;
    });
}


function findQuestionByDisplayNumber(num) {
    return questions.find(q => q.displayNumber === num);
}

let questionIdMigrationMap = {};


function migrateUserQuestionStats(user) {
    if (!user.questionStats) return;
    
    let migrated = false;
    const newStats = {};
    
    for (const oldId in user.questionStats) {
        // Ist es bereits eine Hash-ID?
        if (oldId.startsWith('Q_')) {
            newStats[oldId] = user.questionStats[oldId];
            continue;
        }
        
        // Gibt es eine Migration?
        if (questionIdMigrationMap[oldId]) {
            const newId = questionIdMigrationMap[oldId];
            newStats[newId] = user.questionStats[oldId];
            migrated = true;
            console.log(`[Migration] User ${user.name}: ${oldId} → ${newId}`);
        } else {
            // Keine Migration gefunden - behalte alte ID
            newStats[oldId] = user.questionStats[oldId];
        }
    }
    
    if (migrated) {
        user.questionStats = newStats;
    }
}


function buildMigrationMap() {
    questionIdMigrationMap = {};
    
    questions.forEach(q => {
        // Wenn Frage eine alte numerische ID hatte (z.B. "001", "002")
        if (q._oldQuestionId && q._oldQuestionId !== q.questionId) {
            questionIdMigrationMap[q._oldQuestionId] = q.questionId;
        }
    });
    
    console.log(`[Migration Map] ${Object.keys(questionIdMigrationMap).length} Mappings erstellt`);
}
