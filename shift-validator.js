import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $=id=>document.getElementById(id);
const cfg=await(await fetch('/__/firebase/init.json')).json();
const fb=getApps()[0]||initializeApp(cfg);
const db=getFirestore(fb);
const root=doc(db,'gestionale','dati');

const AM=new Set(['gessi','reparto','amb','esami','op1','op2']);
const PM=new Set(['giorno','gessirep','oppom']);
const REQUIRED=new Set(['gessi','gessirep','reparto','amb','esami','op1','op2','oppom']);
const LABELS={
  guardia:'GUARDIA NOTT.',giorno:'INTERD',disp1:'1ª DISP.',disp2:'2ª DISP.',
  gessi:'GESSI MAT',gessirep:'GESSI+REP POM',reparto:'REPARTO',amb:'AMBULATORIO',
  esami:'AMB ESAMI',op1:'OP1 MAT',op2:'OP2 MAT',oppom:'OP POM',ferie:'FERIE'
};
const FIXED_RULES={
  VIALE:{freePm:[3]},
  CALZAVARA:{freePm:[2]},
  COMELATO:{freePm:[1,4]},
  FRANCO:{freePm:[3]},
  CIPRIAN:{days:[1,2,3,4,5],services:['reparto']},
  RIVA:{days:[1,2,3],services:['gessi','amb']},
  FREGUIA:{days:[3,4,5],services:['amb']}
};

function isAdminUI(){
  const b=$('validateShiftsBtn');
  return !!b&&!b.classList.contains('hidden');
}
function parts(k){const p=(k||'').split('|');return{ds:p[0]||'',s:p[1]||'',i:p[2]||'0'}}
function dayObj(ds){return new Date(ds+'T12:00:00')}
function shiftDay(ds,delta){const d=dayObj(ds);d.setDate(d.getDate()+delta);return d.toISOString().slice(0,10)}
function weekKey(ds){const d=dayObj(ds),w=d.getDay()||7;d.setDate(d.getDate()-w+1);return d.toISOString().slice(0,10)}
function hours(s,ds){
  if(s==='guardia')return 12;
  if(s==='ferie'||s==='giorno')return 6;
  if(s==='disp1'||s==='disp2'){const w=dayObj(ds).getDay();return(w===0||w===6)?6:0}
  return 6;
}
function scheduleFromDom(base={}){
  const a={...base};
  document.querySelectorAll('#schedule select[data-k]').forEach(sel=>{
    const k=sel.dataset.k,v=sel.value;
    if(!k)return;
    if(v&&v!=='NESSUNO')a[k]=v; else delete a[k];
  });
  return a;
}
function doctorMap(doctors){return new Map((doctors||[]).map(d=>[d.name,d]))}
function assignments(a,name,filter=()=>true){
  const out=[];
  for(const[k,v]of Object.entries(a)){
    if(v!==name)continue;
    const p=parts(k);
    if(filter(p,k))out.push({...p,k});
  }
  return out;
}
function hasService(a,name,ds,pred){
  return assignments(a,name,p=>p.ds===ds&&pred(p.s)).length>0;
}
function weekHours(a,name,wk){
  return assignments(a,name,p=>weekKey(p.ds)===wk).reduce((q,p)=>q+hours(p.s,p.ds),0);
}
function doubleDaysInWeek(a,name,wk){
  const d={};
  for(const p of assignments(a,name,p=>weekKey(p.ds)===wk)){
    if(!AM.has(p.s)&&!PM.has(p.s))continue;
    d[p.ds]??={am:false,pm:false};
    if(AM.has(p.s))d[p.ds].am=true;
    if(PM.has(p.s))d[p.ds].pm=true;
  }
  return Object.entries(d).filter(([,x])=>x.am&&x.pm).map(([ds])=>ds);
}
function sameBandCount(a,name,ds,s){
  const set=AM.has(s)?AM:PM.has(s)?PM:null;
  if(!set)return 0;
  return assignments(a,name,p=>p.ds===ds&&set.has(p.s)).length;
}
function consecutiveSame(a,name,s,ds){
  if(!REQUIRED.has(s))return false;
  const has=d=>hasService(a,name,d,x=>x===s);
  return (has(shiftDay(ds,-2))&&has(shiftDay(ds,-1))&&has(ds))||
         (has(shiftDay(ds,-1))&&has(ds)&&has(shiftDay(ds,1)))||
         (has(ds)&&has(shiftDay(ds,1))&&has(shiftDay(ds,2)));
}
function sundayRestIssue(a,name,ds){const w=dayObj(ds).getDay();if(w===1&&hasService(a,name,shiftDay(ds,-1),x=>x==='disp1'))return 'riposo compensativo: 1ª disponibilità della domenica → lunedì libero';if(w===2&&hasService(a,name,shiftDay(ds,-2),x=>x==='disp2'))return 'riposo compensativo: 2ª disponibilità della domenica → martedì libero';return ''}
function sundayAvailabilityFutureIssue(a,name,ds,s){if(dayObj(ds).getDay()!==0)return'';if(s==='disp1'){const d=shiftDay(ds,1);if(assignments(a,name,p=>p.ds===d&&p.s!=='ferie'&&p.s!=='guardia').length)return '1ª disponibilità della domenica: il lunedì successivo deve essere libero'}if(s==='disp2'){const d=shiftDay(ds,2);if(assignments(a,name,p=>p.ds===d&&p.s!=='ferie'&&p.s!=='guardia').length)return '2ª disponibilità della domenica: il martedì successivo deve essere libero'}return''}
function personalRuleIssues(doc,s,ds){
  const out=[],dt=dayObj(ds),w=dt.getDay();
  const custom=doc?.constraints?.freePm||[];
  const fixed=FIXED_RULES[doc?.name]||{};
  const free=[...new Set([...(fixed.freePm||[]),...custom.map(Number)])];
  if(PM.has(s)&&free.includes(w))out.push('pomeriggio impostato come libero per questo medico');
  if(fixed.days&&!fixed.days.includes(w))out.push('giorno non previsto dalle regole del medico');
  if(fixed.services&&!fixed.services.includes(s))out.push('servizio non previsto dalle regole del medico');
  return out;
}
function assignmentIssues(a,absence,docs,name,k){
  const {ds,s}=parts(k),doc=doctorMap(docs).get(name),issues=[];
  if(!name||name==='NESSUNO'||!ds||!s)return issues;
  if(doc?.cat==='Contratto'||name==='PINI')return issues;
  if((absence?.[name]||[]).includes(ds))issues.push('medico segnato in ferie/assenza in questa data');
  if(s!=='ferie'&&hasService(a,name,shiftDay(ds,-1),x=>x==='guardia'))issues.push('servizio il giorno successivo a una guardia notturna');
  if(s==='guardia'){
    const next=shiftDay(ds,1);
    const nextWork=assignments(a,name,p=>p.ds===next&&p.s!=='ferie'&&p.s!=='guardia');
    if(nextWork.length)issues.push('guardia notturna con servizio già assegnato il giorno successivo');
  }
  if((s==='disp1'&&hasService(a,name,ds,x=>x==='disp2'))||(s==='disp2'&&hasService(a,name,ds,x=>x==='disp1')))
    issues.push('stesso medico in 1ª e 2ª disponibilità nello stesso giorno');
  if((AM.has(s)||PM.has(s))&&sameBandCount(a,name,ds,s)>1)
    issues.push(AM.has(s)?'più servizi contemporanei nella fascia mattutina':'più servizi contemporanei nella fascia pomeridiana');
  const wk=weekKey(ds),wh=weekHours(a,name,wk);
  if(wh>36)issues.push('supera 36 ore nella settimana ('+wh+' h)');
  const dd=doubleDaysInWeek(a,name,wk);
  if(dd.length>1)issues.push('più di una giornata da 12 ore (mattina + pomeriggio) nella stessa settimana');
  if(name!=='CIPRIAN'&&s!=='reparto'&&consecutiveSame(a,name,s,ds))issues.push('tre giorni consecutivi nello stesso servizio: '+(LABELS[s]||s));
  issues.push(...personalRuleIssues(doc,s,ds));
  return [...new Set(issues)];
}
function audit(a,absence,docs,month){
  const anomalies=[],seen=new Set();
  const add=(type,name,ds,msg,keys=[])=>{
    const id=[type,name,ds,msg].join('|');
    if(seen.has(id))return;seen.add(id);
    anomalies.push({type,name,ds,msg,keys});
  };
  const names=(docs||[]).filter(d=>d.active&&d.cat!=='Contratto'&&d.name!=='PINI').map(d=>d.name);
  for(const name of names){
    const monthAsg=assignments(a,name,p=>p.ds.startsWith(month+'-')&&p.s!=='ferie');
    for(const p of monthAsg){
      if((absence?.[name]||[]).includes(p.ds))add('Ferie',name,p.ds,'turno assegnato durante ferie/assenza',[p.k]);
      if(hasService(a,name,shiftDay(p.ds,-1),x=>x==='guardia'))add('Post-guardia',name,p.ds,'turno il giorno successivo alla guardia',[p.k]);
      if((p.s==='disp1'&&hasService(a,name,p.ds,x=>x==='disp2'))||(p.s==='disp2'&&hasService(a,name,p.ds,x=>x==='disp1')))
        add('Disponibilità',name,p.ds,'presente sia in 1ª che in 2ª disponibilità',[p.k]);
      if((AM.has(p.s)||PM.has(p.s))&&sameBandCount(a,name,p.ds,p.s)>1)
        add('Sovrapposizione',name,p.ds,AM.has(p.s)?'più servizi nella stessa mattina':'più servizi nello stesso pomeriggio',[p.k]);
      if(name!=='CIPRIAN'&&p.s!=='reparto'&&consecutiveSame(a,name,p.s,p.ds))add('Sequenza',name,p.ds,'tre giorni consecutivi nello stesso servizio: '+(LABELS[p.s]||p.s),[p.k]);
      for(const msg of personalRuleIssues(doctorMap(docs).get(name),p.s,p.ds))
        add('Regola medico',name,p.ds,msg,[p.k]);
    }
    const weeks=new Set(monthAsg.map(p=>weekKey(p.ds)));
    for(const wk of weeks){
      const wh=weekHours(a,name,wk);
      if(wh>36)add('Ore settimanali',name,wk,'totale settimanale '+wh+' h (>36 h)',assignments(a,name,p=>weekKey(p.ds)===wk).map(p=>p.k));
      const dd=doubleDaysInWeek(a,name,wk);
      if(dd.length>1)add('Turni 12 h',name,wk,'più di una giornata mattina+pomeriggio nella settimana: '+dd.map(x=>x.slice(8)).join(', '),assignments(a,name,p=>dd.includes(p.ds)).map(p=>p.k));
    }
  }
  return anomalies.sort((x,y)=>x.ds.localeCompare(y.ds)||x.name.localeCompare(y.name));
}
function clearAuditMarks(){document.querySelectorAll('#schedule select.auditAnomaly').forEach(x=>x.classList.remove('auditAnomaly'))}
function markAnomalies(items){
  clearAuditMarks();
  for(const a of items)for(const k of a.keys||[]){
    const el=document.querySelector('#schedule select[data-k="'+CSS.escape(k)+'"]');
    el?.classList.add('auditAnomaly');
  }
}

function generatorWeekendRest(a,name,ds){
  const w=dayObj(ds).getDay();
  if(w===1&&hasService(a,name,shiftDay(ds,-2),x=>x==='disp1'))return 'riposo dopo 1ª DISP del sabato';
  if(w===2&&hasService(a,name,shiftDay(ds,-3),x=>x==='disp2'))return 'riposo dopo 2ª DISP del sabato';
  return '';
}
function generatorThreeConsecutive(a,name,s,ds){
  if(!REQUIRED.has(s)||name==='CIPRIAN')return false;
  const has=d=>hasService(a,name,d,x=>x===s);
  return (has(shiftDay(ds,-2))&&has(shiftDay(ds,-1)))||
         (has(shiftDay(ds,-1))&&has(shiftDay(ds,1)))||
         (has(shiftDay(ds,1))&&has(shiftDay(ds,2)));
}
function generatorBlockReasons(a,absence,doc,k){
  const {ds,s}=parts(k),name=doc?.name,out=[];
  if(!doc?.active)out.push('non attivo');
  if(doc?.cat==='Contratto'||['PINI','ARMATO','LONDEI'].includes(name))out.push('escluso dal generatore');
  if(out.length)return out;
  if((absence?.[name]||[]).includes(ds)||hasService(a,name,ds,x=>x==='ferie'))out.push('ferie/assenza');
  if(hasService(a,name,ds,x=>x==='guardia'))out.push('guardia nello stesso giorno');
  if(hasService(a,name,shiftDay(ds,-1),x=>x==='guardia'))out.push('post-guardia');
  const wr=generatorWeekendRest(a,name,ds);if(wr)out.push(wr);

  const dt=dayObj(ds),w=dt.getDay(),fixed=FIXED_RULES[name]||{},custom=doc?.constraints?.freePm||[];
  const free=[...new Set([...(fixed.freePm||[]),...custom.map(Number)])];
  if(fixed.days&&!fixed.days.includes(w))out.push('giorno non previsto');
  if(fixed.services&&!fixed.services.includes(s))out.push('servizio non previsto');
  if(PM.has(s)&&free.includes(w))out.push('pomeriggio libero');

  const wh=weekHours(a,name,weekKey(ds)),add=hours(s,ds);
  if(wh+add>Math.min(Number(doc.hours)||36,36))out.push('36 h settimanali ('+wh+'+'+add+' h)');

  if(AM.has(s)&&sameBandCount(a,name,ds,s)>0)out.push('mattina già occupata');
  if(PM.has(s)&&sameBandCount(a,name,ds,s)>0)out.push('pomeriggio già occupato');
  if(AM.has(s)&&assignments(a,name,p=>p.ds===ds&&PM.has(p.s)).length&&doubleDaysInWeek(a,name,weekKey(ds)).length>=1)out.push('già presente un doppio turno nella settimana');
  if(PM.has(s)&&assignments(a,name,p=>p.ds===ds&&AM.has(p.s)).length&&doubleDaysInWeek(a,name,weekKey(ds)).length>=1)out.push('già presente un doppio turno nella settimana');
  if(generatorThreeConsecutive(a,name,s,ds))out.push('3 giorni consecutivi nello stesso servizio');
  return [...new Set(out)];
}
function visibleEmptyRequiredCells(month){
  const out=[];
  document.querySelectorAll('#schedule select[data-k]').forEach(sel=>{
    const k=sel.dataset.k,{ds,s,i}=parts(k);
    if(!ds.startsWith(month+'-')||!REQUIRED.has(s))return;
    if(sel.value!=='')return;
    out.push({k,ds,s,i});
  });
  return out;
}
function ensureDiagnosticModal(){
  if($('emptyDiagnosticModal'))return;
  document.body.insertAdjacentHTML('beforeend',`
  <div id="emptyDiagnosticModal" class="modalBack hidden">
    <div class="modal" style="width:min(1250px,97vw)">
      <h2>Diagnostica celle vuote</h2>
      <p id="emptyDiagnosticInfo" class="small"></p>
      <div class="countWrap"><table id="emptyDiagnosticTable"></table></div>
      <div class="modalActions"><button id="emptyDiagnosticClose" type="button">Chiudi</button></div>
    </div>
  </div>`);
  $('emptyDiagnosticClose').onclick=()=>$('emptyDiagnosticModal').classList.add('hidden');
}
async function runEmptyDiagnostics(){
  const m=$('month')?.value;if(!m)return;
  ensureDiagnosticModal();
  $('emptyDiagnosticModal').classList.remove('hidden');
  $('emptyDiagnosticInfo').textContent='Analisi in corso…';
  $('emptyDiagnosticTable').innerHTML='';
  const snap=await getDoc(root),x=snap.exists()?snap.data():{},a=scheduleFromDom(x.schedule||{});
  const docs=(x.doctors||[]).filter(d=>d.active&&d.cat!=='Contratto'&&!['PINI','ARMATO','LONDEI'].includes(d.name));
  const holes=visibleEmptyRequiredCells(m);
  if(!holes.length){
    $('emptyDiagnosticInfo').textContent='Nessuna cella vuota da riempire nel mese selezionato.';
    $('emptyDiagnosticTable').innerHTML='<tr><td style="padding:18px"><b>✓ Tutte le celle generabili risultano coperte.</b></td></tr>';
    return;
  }
  const rows=holes.map(h=>{
    const detail=docs.map(d=>({name:d.name,reasons:generatorBlockReasons(a,x.absenceManagement||{},d,h.k)}));
    const direct=detail.filter(z=>!z.reasons.length).map(z=>z.name);
    const status=direct.length
      ? '<b style="color:#b45309">Candidati diretti: '+direct.join(', ')+'</b>'
      : '<b style="color:#b91c1c">Nessun candidato diretto</b>';
    const reasonHtml=detail.map(z=>'<div><b>'+z.name+':</b> '+(z.reasons.length?z.reasons.join('; '):'DISPONIBILE')+'</div>').join('');
    return '<tr><td>'+h.ds+'</td><td><b>'+(LABELS[h.s]||h.s)+'</b></td><td>'+(Number(h.i)+1)+'</td><td style="text-align:left">'+status+'<details style="margin-top:5px"><summary>Dettaglio medici</summary>'+reasonHtml+'</details></td></tr>';
  }).join('');
  $('emptyDiagnosticInfo').textContent=holes.length+' celle vuote analizzate. Se compare un candidato diretto, il generatore avrebbe teoricamente potuto coprire quella cella; altrimenti sono mostrati i vincoli che bloccano ciascun medico.';
  $('emptyDiagnosticTable').innerHTML='<tr><th>Data</th><th>Servizio</th><th>Slot</th><th>Diagnosi</th></tr>'+rows;
}
function installDiagnosticButton(){
  let b=$('diagnoseEmptyBtn');
  if(!b){
    const anchor=$('validateShiftsBtn');
    if(!anchor)return;
    b=document.createElement('button');
    b.id='diagnoseEmptyBtn';b.type='button';b.className='adminOnly';b.textContent='DIAGNOSTICA VUOTI';
    anchor.insertAdjacentElement('afterend',b);
  }
  if(!b.dataset.bound){
    b.dataset.bound='1';
    b.addEventListener('click',e=>{e.preventDefault();runEmptyDiagnostics().catch(err=>alert('Errore diagnostica vuoti: '+err.message))});
  }
}
function ensureModal(){
  if($('validatorModal'))return;
  document.body.insertAdjacentHTML('beforeend',`
  <div id="validatorModal" class="modalBack hidden">
    <div class="modal" style="width:min(1050px,96vw)">
      <h2>Controllo anomalie turni</h2>
      <p id="validatorInfo" class="small"></p>
      <div class="countWrap"><table id="validatorTable"></table></div>
      <div class="modalActions"><button id="validatorClose" type="button">Chiudi</button></div>
    </div>
  </div>`);
  $('validatorClose').onclick=()=>$('validatorModal').classList.add('hidden');
}
async function runAudit(){
  const m=$('month')?.value;if(!m)return;
  ensureModal();
  $('validatorModal').classList.remove('hidden');
  $('validatorInfo').textContent='Controllo in corso…';
  $('validatorTable').innerHTML='';
  const snap=await getDoc(root),x=snap.exists()?snap.data():{};
  const a=scheduleFromDom(x.schedule||{});
  const items=audit(a,x.absenceManagement||{},x.doctors||[],m);
  markAnomalies(items);
  if(!items.length){
    $('validatorInfo').textContent='Nessuna anomalia rilevata nel mese selezionato.';
    $('validatorTable').innerHTML='<tr><td style="padding:18px"><b>✓ Nessun contrasto con le regole controllate.</b></td></tr>';
    return;
  }
  $('validatorInfo').textContent=items.length+' anomalie rilevate. Le celle coinvolte sono evidenziate in rosso nella griglia.';
  $('validatorTable').innerHTML='<tr><th>Data/settimana</th><th>Medico</th><th>Tipo</th><th>Anomalia</th></tr>'+
    items.map(z=>'<tr><td>'+z.ds+'</td><td><b>'+z.name+'</b></td><td>'+z.type+'</td><td style="text-align:left">'+z.msg+'</td></tr>').join('');
}
function installButton(){
  const b=$('validateShiftsBtn');
  if(b&&!b.dataset.validatorBound){
    b.dataset.validatorBound='1';
    b.addEventListener('click',e=>{e.preventDefault();runAudit().catch(err=>alert('Errore controllo anomalie: '+err.message))});
  }
}
async function validateManualChange(sel){
  const k=sel.dataset.k,newVal=sel.value;
  if(!k||!newVal||newVal==='NESSUNO')return true;
  const snap=await getDoc(root),x=snap.exists()?snap.data():{};
  const a=scheduleFromDom(x.schedule||{});
  a[k]=newVal;
  const issues=assignmentIssues(a,x.absenceManagement||{},x.doctors||[],newVal,k);
  if(!issues.length)return true;
  const {ds,s}=parts(k);
  const msg='ATTENZIONE — inserimento manuale\n\n'+newVal+' · '+ds+' · '+(LABELS[s]||s)+'\n\n'+
    issues.map((x,i)=>(i+1)+'. '+x).join('\n')+
    '\n\nVuoi FORZARE comunque questo inserimento?';
  return confirm(msg);
}
function installManualAlerts(){
  if(document.documentElement.dataset.manualValidatorInstalled)return;
  document.documentElement.dataset.manualValidatorInstalled='1';
  document.addEventListener('pointerdown',e=>{
    const s=e.target.closest?.('#schedule select[data-k]');
    if(s)s.dataset.validatorPrev=s.value||'';
  },true);
  document.addEventListener('focusin',e=>{
    const s=e.target.closest?.('#schedule select[data-k]');
    if(s)s.dataset.validatorPrev=s.value||'';
  },true);
  document.addEventListener('change',async e=>{
    const s=e.target;
    if(!(s instanceof HTMLSelectElement)||!s.matches('#schedule select[data-k]')||!isAdminUI())return;
    if(s.dataset.validatorBypass==='1'){delete s.dataset.validatorBypass;return}
    if(!s.value||s.value==='NESSUNO')return;
    e.preventDefault();e.stopImmediatePropagation();
    const old=s.dataset.validatorPrev??'';
    let ok=false;
    try{ok=await validateManualChange(s)}catch(err){console.error(err);ok=confirm('Impossibile completare il controllo automatico. Vuoi forzare comunque?')}
    if(!ok){s.value=old;return}
    s.dataset.validatorBypass='1';
    s.dataset.validatorPrev=s.value;
    s.dispatchEvent(new Event('change',{bubbles:true}));
  },true);
}
function start(){ensureModal();ensureDiagnosticModal();installButton();installDiagnosticButton();installManualAlerts()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
setTimeout(installButton,700);setTimeout(installDiagnosticButton,700);setTimeout(installDiagnosticButton,1800);
