// 18-plugin-question-editor.js
// QuestionEditorPlugin - question editor
// ============================================================

const QuestionEditorPlugin = {
    name:'QuestionEditorPlugin',
    _imagemapEditorMode:'circle', _imagemapEditorPoints:[], _imagemapEditorRadius:20,
    _imagemapEditorZones:[], _imagemapPolyFinalized:false, _imagemapPlayerClick:null,
    init(){}, enable(){}, disable(){},
    addAnswerInput(){}, toggleQuestionType(){}, toggleMediaUpload(){},
    toggleGroupFilter(g){ if(!window._questionGroupFilters)window._questionGroupFilters={};window._questionGroupFilters[g]=!window._questionGroupFilters[g];updateQuestionsList(); },
    scrollToGroup(g){ const el=document.getElementById('group-'+g.replace(/[^a-zA-Z0-9]/g,'_'));if(el)el.scrollIntoView({behavior:'smooth'}); },
    clearGroupFilters(){ window._questionGroupFilters={};updateQuestionsList(); },
    addQuestion(e){ if(e)e.preventDefault(); },
    editQuestion(){}, cancelEdit(){}, deleteQuestion(id){ questions=questions.filter(q=>q.id!==id);updateQuestionsList();Toast.show('Frage gelöscht','info'); },
    calculateQuestionStats(qid){
        let asked=0,correct=0;
        users.forEach(u=>{if(u.questionStats&&u.questionStats[qid]){asked+=u.questionStats[qid].asked||0;correct+=u.questionStats[qid].correct||0;}});
        if(asked===0)return null;
        return{totalAsked:asked,totalCorrect:correct,percentage:Math.round((correct/asked)*100)};
    },
    resetQuestionStats(){ users.forEach(u=>{u.questionStats={};});Toast.show('Statistiken zurückgesetzt','success');updateQuestionsList(); },
    deleteAllQuestions(){ GameDialog.showConfirm('Alle Fragen löschen?','Dies kann nicht rückgängig gemacht werden!',()=>{questions=[];updateQuestionsList();Toast.show('Alle Fragen gelöscht','info');}); },
    toggleQuestionActive(id){ const q=questions.find(x=>x.id===id);if(q){q.active=q.active===false;updateQuestionsList();} },
    convertBase64ToPath(){},
    renumberAllQuestionsUI(){ renumberAllQuestions();updateQuestionsList();Toast.show('Fragen neu nummeriert','success'); },
    gotoQuestion(){
        const input=document.getElementById('batchQuestionInput');if(!input)return;
        const val=input.value.trim();if(!val)return;
        if(val.startsWith('Q_')){const el=document.querySelector(`[data-hash-id="${val}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});else Toast.show('Frage nicht gefunden','warning');}
    },
    batchActivateQuestions(activate){
        const input=document.getElementById('batchQuestionInput');if(!input||!input.value.trim())return;
        const nums=this.parseBatchInput(input.value);let count=0;
        questions.forEach(q=>{if(nums.includes(q.displayNumber)){q.active=activate;count++;}});
        updateQuestionsList();Toast.show(`${count} Fragen ${activate?'aktiviert':'deaktiviert'}`,'success');
    },
    parseBatchInput(input){
        const nums=[];input.split(',').forEach(part=>{part=part.trim();if(part.includes('-')){const[a,b]=part.split('-').map(Number);for(let i=a;i<=b;i++)nums.push(i);}else{const n=parseInt(part);if(!isNaN(n))nums.push(n);}});return nums;
    },
    batchSelectAll(activate){ questions.forEach(q=>q.active=activate);updateQuestionsList();Toast.show(`Alle Fragen ${activate?'aktiviert':'deaktiviert'}`,'success'); },
    batchInvertSelection(){ questions.forEach(q=>q.active=q.active===false);updateQuestionsList();Toast.show('Auswahl umgekehrt','success'); },
    updateDisplayNumber(id,val){ const q=questions.find(x=>x.id===id);if(q)q.displayNumber=parseInt(val)||null; },
    updateQuestionId(){ Toast.show('Fragen-ID ändern ist noch nicht implementiert', 'warning'); },
    findNextFreeQuestionId(){ return 'Q_'+(Date.now().toString(16)); },
    getFileGroups(){ const g={};questions.forEach(q=>{const fg=q._fileGroup||'Manuell';g[fg]=(g[fg]||0)+1;});return g; },
    updateFileGroupDropdown(){ Toast.show('Gruppen-Dropdown aktualisieren ist noch nicht implementiert', 'warning'); },
    addNewFileGroup(){ Toast.show('Neue Dateigruppe anlegen ist noch nicht implementiert', 'warning'); },
    changeQuestionGroup(){ Toast.show('Fragengruppe ändern ist noch nicht implementiert', 'warning'); },
    exportQuestionsByGroup(){ Toast.show('Export nach Gruppen ist noch nicht implementiert', 'warning'); },
    exportQuestionsUnencrypted(){
        const data={questions:questions,exportDate:new Date().toISOString()};
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='questions_export.json';a.click();
    },
    importQuestionsUnencrypted(event){
        const file=event.target.files[0];if(!file)return;
        const reader=new FileReader();reader.onload=e=>{try{const d=JSON.parse(e.target.result);const qs=d.questions||d.fragen||[];let c=0;qs.forEach(q=>{questions.push({...normalizeQuestion(q),id:Date.now()+c});c++;});updateQuestionsList();Toast.show(c+' Fragen importiert','success');}catch(err){Toast.show('Import-Fehler: '+err.message,'warning');}};reader.readAsText(file);event.target.value='';
    },
    initImagemapEditor(){}, buildImagemapEditor(){}, renderImagemapEditor(){},
    addImagemapZone(){}, getImagemapTargets(){return[];}, finalizePolygon(){},
    checkImagemapHit(cx,cy,targets){
        if(!targets||!Array.isArray(targets))return false;
        for(const t of targets){
            if(t.type==='polygon'&&t.points){if(this.pointInPolygon(cx,cy,t.points))return true;const d=this.distToPolygon(cx,cy,t.points);if(d<(t.tolerance||5))return true;}
            else{const dx=cx-(t.x||0),dy=cy-(t.y||0),r=t.radius||5;if(dx*dx+dy*dy<=r*r)return true;}
        }
        return false;
    },
    pointInPolygon(x,y,poly){
        let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
            const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
            if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
        }return inside;
    },
    distToPolygon(x,y,poly){
        let min=Infinity;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
            const d=this.distToSegment(x,y,poly[j].x,poly[j].y,poly[i].x,poly[i].y);if(d<min)min=d;
        }return min;
    },
    distToSegment(px,py,x1,y1,x2,y2){
        const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy)));
        return Math.sqrt((px-x1-t*dx)**2+(py-y1-t*dy)**2);
    },
    handleExtraMediaBrowser(){}, handlePathFileBrowser(){}
};
