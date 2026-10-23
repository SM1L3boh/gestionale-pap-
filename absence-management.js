import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,getDocFromServer,setDoc,updateDoc,runTransaction}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');
const MN=['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'],DW=['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
let data={},view=new Date(),mobileAbsenceDoctor='';
function store(){return data.absenceManagement||{}}
function doctors(){return(data.doctors||[]).filter(d=>d.active).map(d=>d.name).filter(Boolean)}
function key(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function isMobileAbsence(){return window.matchMedia('(max-width:760px)').matches}
function ensureMobileAbsenceUI(){
  const modal=$('absenceManageModal')?.querySelector('.modal'),wrap=$('absenceTable')?.closest('.countWrap');
  if(!modal||!wrap)return;
  let panel=$('absenceMobilePanel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='absenceMobilePanel';
    panel.innerHTML='<div id="absenceMobileControls"><label for="absenceMobileDoctor">Medico</label><select id="absenceMobileDoctor"></select></div><div id="absenceMobileSummary"></div><div id="absenceMobileGrid"></div>';
    wrap.insertAdjacentElement('afterend',panel);
    $('absenceMobileDoctor').addEventListener('change',e=>{mobileAbsenceDoctor=e.target.value;render()});
  }
}
function renderDesktopAbsence(y,m,days){
  let table=$('absenceTable');if(!table)return;
  let head='<tr><th style="position:sticky;left:0;z-index:3;background:#d9d2e9;min-width:105px">Medico</th>';
  for(let d=1;d<=days;d++){let dt=new Date(y,m,d,12),we=[0,6].includes(dt.getDay());head+=`<th style="min-width:24px;width:24px;padding:3px 1px;font-size:11px;${we?'background:#f4cccc':''}">${d}<br><small>${DW[dt.getDay()]}</small></th>`}
  head+='<th>Tot.</th></tr>';
  let body='';
  for(const n of doctors()){
    let set=new Set(store()[n]||[]),tot=0;
    body+=`<tr><td style="position:sticky;left:0;z-index:2;background:white;text-align:left"><b>${n}</b></td>`;
    for(let d=1;d<=days;d++){
      let dt=new Date(y,m,d,12),date=key(y,m,d),on=set.has(date),we=[0,6].includes(dt.getDay());if(on)tot++;
      body+=`<td class="absenceDayCell" data-doctor="${n}" data-date="${date}" title="${n} — ${date}" style="cursor:pointer;text-align:center;font-weight:700;padding:3px 1px;font-size:11px;width:24px;${on?'background:#fff2a8;':''}${!on&&we?'background:#f8dddd;':''}">${on?'A':''}</td>`
    }
    body+=`<td><b>${tot}</b></td></tr>`
  }
  table.innerHTML=head+body;
  table.querySelectorAll('.absenceDayCell').forEach(td=>td.onclick=()=>toggle(td).catch(e=>alert('Errore modifica assenza: '+e.message)))
}
function renderMobileAbsence(y,m,days){
  ensureMobileAbsenceUI();
  const panel=$('absenceMobilePanel'),sel=$('absenceMobileDoctor'),grid=$('absenceMobileGrid'),summary=$('absenceMobileSummary');
  if(!panel||!sel||!grid||!summary)return;
  const names=doctors();
  if(!mobileAbsenceDoctor||!names.includes(mobileAbsenceDoctor))mobileAbsenceDoctor=names[0]||'';
  sel.innerHTML=names.map(n=>`<option value="${n.replace(/"/g,'&quot;')}">${n}</option>`).join('');
  sel.value=mobileAbsenceDoctor;
  const set=new Set(store()[mobileAbsenceDoctor]||[]),monthPrefix=`${y}-${String(m+1).padStart(2,'0')}-`;
  const total=[...set].filter(d=>d.startsWith(monthPrefix)).length;
  summary.innerHTML=`<b>${mobileAbsenceDoctor||'—'}</b><span>${total} giorni di assenza nel mese</span><small>Tocca un giorno per aggiungere o togliere l'assenza.</small>`;
  let html='<div class="absenceMobileWeekHead">'+['LUN','MAR','MER','GIO','VEN','SAB','DOM'].map(x=>`<span>${x}</span>`).join('')+'</div><div class="absenceMobileDays">';
  const first=new Date(y,m,1,12),offset=(first.getDay()+6)%7;
  for(let i=0;i<offset;i++)html+='<span class="absenceMobileBlank"></span>';
  for(let d=1;d<=days;d++){
    const dt=new Date(y,m,d,12),date=key(y,m,d),on=set.has(date),we=[0,6].includes(dt.getDay());
    html+=`<button type="button" class="absenceMobileDay${on?' active':''}${we?' weekend':''}" data-doctor="${mobileAbsenceDoctor}" data-date="${date}"><b>${d}</b><small>${DW[dt.getDay()]}</small>${on?'<strong>ASSENTE</strong>':''}</button>`;
  }
  html+='</div>';
  grid.innerHTML=html;
  grid.querySelectorAll('.absenceMobileDay').forEach(btn=>btn.onclick=()=>toggle(btn).catch(e=>alert('Errore modifica assenza: '+e.message)))
}
function render(){
  let y=view.getFullYear(),m=view.getMonth(),days=new Date(y,m+1,0).getDate();
  $('absenceManageTitle').textContent=`${MN[m]} ${y}`;
  ensureMobileAbsenceUI();
  const mobile=isMobileAbsence(),wrap=$('absenceTable')?.closest('.countWrap'),panel=$('absenceMobilePanel');
  if(wrap)wrap.style.display=mobile?'none':'block';
  if(panel)panel.style.display=mobile?'block':'none';
  if(mobile)renderMobileAbsence(y,m,days);else renderDesktopAbsence(y,m,days)
}
const POST_NIGHT_FIX='absencePostNightCleanup202611v1';
async function removeImportedNightRest(){
  const snapshot=await getDoc(root),x=snapshot.exists()?snapshot.data():{};
  if(x[POST_NIGHT_FIX])return x;
  const absence=structuredClone(x.absenceManagement||{}),schedule={...(x.schedule||{})};
  const candidates=[
    ['VIALE','2026-11-05'],['LENTINI','2026-11-17'],
    ['COMELATO','2026-11-11'],['COMELATO','2026-11-20'],
    ['FRANCO','2026-11-25'],['FRANCO','2026-11-30'],
    ['DEI ROSSI','2026-11-27']
  ];
  const removed=[];
  for(const [name,date] of candidates){
    const previous=new Date(date+'T12:00:00');previous.setDate(previous.getDate()-1);
    const pd=previous.getFullYear()+'-'+String(previous.getMonth()+1).padStart(2,'0')+'-'+String(previous.getDate()).padStart(2,'0');
    const hasNight=Object.entries(schedule).some(([key,n])=>n===name&&key.startsWith(pd+'|guardia|'));
    const hasRest=Object.entries(schedule).some(([key,n])=>n===name&&key.startsWith(date+'|varie|'));
    if(!hasNight||!hasRest||!(absence[name]||[]).includes(date))continue;
    absence[name]=absence[name].filter(d=>d!==date);
    for(const key of Object.keys(schedule))if(key.startsWith(date+'|ferie|')&&schedule[key]===name)delete schedule[key];
    removed.push([name,date]);
  }
  const savedAbsenceStates={...(x.savedAbsenceStates||{})};
  if(savedAbsenceStates['2026-11']){
    const archive=structuredClone(savedAbsenceStates['2026-11']);
    for(const [name,date] of removed)if(Array.isArray(archive[name]))archive[name]=archive[name].filter(d=>d!==date);
    savedAbsenceStates['2026-11']=archive;
  }
  const savedStates={...(x.savedStates||{})};
  if(savedStates['2026-11']){
    const state={...savedStates['2026-11']};
    for(const [name,date] of removed)for(const key of Object.keys(state))if(key.startsWith(date+'|ferie|')&&state[key]===name)delete state[key];
    savedStates['2026-11']=state;
  }
  await updateDoc(root,{absenceManagement:absence,schedule,savedAbsenceStates,savedStates,[POST_NIGHT_FIX]:true,updatedAt:new Date().toISOString()});
  return {...x,absenceManagement:absence,schedule,savedAbsenceStates,savedStates,[POST_NIGHT_FIX]:true};
}
const DEI_ROSSI_17_FIX='absenceDeiRossi20261117V1';
async function repairDeiRossiNov17(x){
  // Correzione superata: il 17/11 DEI ROSSI è SMONTO/RECUPERO, non FERIE.
  return x;
}
async function syncAbsenceArchiveFromVisibleLeave(x){
  const schedule=x.schedule||{},absence=structuredClone(x.absenceManagement||{});
  let changed=false;
  for(const [k,n] of Object.entries(schedule)){
    if(!k.includes('|ferie|')||!n||n==='NESSUNO')continue;
    const date=k.split('|')[0];
    absence[n]??=[];
    if(!absence[n].includes(date)){absence[n]=[...absence[n],date].sort();changed=true}
  }
  if(!changed)return x;
  const savedAbsenceStates={...(x.savedAbsenceStates||{})};
  for(const month of new Set(Object.values(absence).flat().map(d=>String(d).slice(0,7)).filter(Boolean))){
    savedAbsenceStates[month]=structuredClone(absence);
  }
  await updateDoc(root,{absenceManagement:absence,savedAbsenceStates,updatedAt:new Date().toISOString()});
  return {...x,absenceManagement:absence,savedAbsenceStates};
}
async function load(){
  data=await removeImportedNightRest();
  data=await repairDeiRossiNov17(data);
  data=await syncAbsenceArchiveFromVisibleLeave(data);
  data.absenceManagement=data.absenceManagement||{};
  render()
}
function syncLeave(schedule,n,date,on){const prefix=date+'|ferie|';if(!on){for(let i=0;i<4;i++){let k=prefix+i;if(schedule[k]===n)delete schedule[k]}return}for(let i=0;i<4;i++)if(schedule[prefix+i]===n)return;let free=[0,1,2,3].find(i=>!schedule[prefix+i]||schedule[prefix+i]==='NESSUNO');if(free!==undefined)schedule[prefix+free]=n}
async function save(next,change){
  if(!change)return;
  // Read and update atomically to avoid losing other doctors' edits.
  // Only the selected doctor's absence and the month's FERIE slots change.
  await runTransaction(db,async tx=>{
    const snap=await tx.get(root);
    if(!snap.exists())throw new Error('Archivio turni non trovato');
    const x=snap.data(),absence=structuredClone(x.absenceManagement||{});
    const dates=new Set(absence[change.n]||[]);
    if(change.on)dates.add(change.date);else dates.delete(change.date);
    absence[change.n]=[...dates].sort();
    const schedule={...(x.schedule||{})};
    syncLeave(schedule,change.n,change.date,change.on);
    if(change.on&&!Object.entries(schedule).some(([k,v])=>k.startsWith(change.date+'|ferie|')&&v===change.n))
      throw new Error('Posti FERIE esauriti per questa data');
    const month=change.date.slice(0,7),savedStates={...(x.savedStates||{})};
    const state={...(savedStates[month]||{})};
    for(const k of Object.keys(state))if(k.startsWith(month+'-')&&k.includes('|ferie|'))delete state[k];
    for(const [k,v]of Object.entries(schedule))if(k.startsWith(month+'-')&&k.includes('|ferie|'))state[k]=v;
    savedStates[month]=state;
    const savedAbsenceStates={...(x.savedAbsenceStates||{})};
    savedAbsenceStates[month]=structuredClone(absence);
    tx.update(root,{absenceManagement:absence,schedule,savedStates,savedAbsenceStates,updatedAt:new Date().toISOString()});
  });
  // Force a server read rather than potentially checking an old offline cache.
  const verified=await getDocFromServer(root);
  if(!verified.exists())throw new Error('Archivio turni non disponibile');
  const fresh=verified.data(),va=fresh.absenceManagement||{},vs=fresh.schedule||{};
  const inArchive=(va[change.n]||[]).includes(change.date);
  const inLeave=Object.entries(vs).some(([k,v])=>k.startsWith(change.date+'|ferie|')&&v===change.n);
  data=fresh;
  render();
  if(change.on?(!inArchive||!inLeave):(inArchive||inLeave))
    throw new Error('L’assenza non risulta persistita nel gestionale. Aggiorna e riprova.');
}
function absentOn(date,exclude=''){return doctors().filter(n=>n!==exclude&&(store()[n]||[]).includes(date))}
const SHIFT_SERVICES=new Set(['guardia','giorno','disp1','disp2','gessi','gessirep','reparto','amb','esami','op1','op2','oppom']);
function assignedShifts(date,n){
  const schedule=data.schedule||{};
  const labels={guardia:'GUARDIA NOTT.',giorno:'INTERD',disp1:'1ª DISP.',disp2:'2ª DISP.',gessi:'GESSI MAT',gessirep:'GESSI+REP POM',reparto:'REPARTO',amb:'AMBULATORIO',esami:'AMB ESAMI',op1:'OP1 MAT',op2:'OP2 MAT',oppom:'OP POM'};
  const found=[];
  for(const [k,v] of Object.entries(schedule)){
    if(v!==n||!k.startsWith(date+'|'))continue;
    const svc=k.split('|')[1];
    if(SHIFT_SERVICES.has(svc)&&!found.includes(labels[svc]||svc))found.push(labels[svc]||svc);
  }
  return found;
}
function warnCrowded(date,n){let names=absentOn(date,n);return names.length<2||confirm('ATTENZIONE: il '+date.split('-').reverse().join('/')+' risultano già assenti: '+names.join(', ')+'.\\n\\nVuoi inserire comunque questa assenza?')}
function warnExistingShift(date,n){
  const shifts=assignedShifts(date,n);
  return !shifts.length||confirm('ATTENZIONE: '+n+' risulta già assegnato il '+date.split('-').reverse().join('/')+' a: '+shifts.join(', ')+'.\\n\\nL’assenza verrà registrata ma il turno non sarà cancellato automaticamente. Vuoi continuare?');
}
async function toggle(td){
  let n=td.dataset.doctor,date=td.dataset.date,next=structuredClone(store()),set=new Set(next[n]||[]),removing=set.has(date);
  if(removing)set.delete(date);
  else{
    const others=absentOn(date,n);
    if(others.length>=4){alert('Impossibile aggiungere l’assenza: per il '+date.split('-').reverse().join('/')+' sono già presenti 4 assenti, cioè tutti i posti disponibili nella colonna FERIE.');return}
    if(!warnCrowded(date,n)||!warnExistingShift(date,n))return;
    set.add(date);
  }
  next[n]=[...set].sort();
  await save(next,{n,date,on:set.has(date)})
}
async function reconcileMonthLeaves(month){
  if(!/^\d{4}-\d{2}$/.test(month))return;
  const prefix=month+'-';

  async function buildAndWrite(source){
    const schedule={...(source.schedule||{})};
    const absence=structuredClone(source.absenceManagement||{});

    // Se una FERIE è già visibile in turnistica ma manca dall'archivio assenze,
    // la conserviamo: la griglia visibile non deve perdere ferie valide.
    for(const [k,n] of Object.entries(schedule)){
      if(!k.startsWith(prefix)||!k.includes('|ferie|')||!n||n==='NESSUNO')continue;
      const date=k.split('|')[0];
      absence[n]??=[];
      if(!absence[n].includes(date))absence[n]=[...absence[n],date].sort();
    }

    const byDate={};
    for(const [n,dates] of Object.entries(absence))for(const date of dates||[])if(date.startsWith(prefix)){
      byDate[date]??=[];
      if(!byDate[date].includes(n))byDate[date].push(n);
    }

    for(const k of Object.keys(schedule))if(k.startsWith(prefix)&&k.includes('|ferie|'))delete schedule[k];
    for(const [date,names] of Object.entries(byDate))names.slice(0,4).forEach((n,i)=>schedule[date+'|ferie|'+i]=n);

    const savedStates={...(source.savedStates||{})};
    const state={...(savedStates[month]||{})};
    for(const k of Object.keys(state))if(k.startsWith(prefix)&&k.includes('|ferie|'))delete state[k];
    for(const [k,v] of Object.entries(schedule))if(k.startsWith(prefix)&&k.includes('|ferie|'))state[k]=v;
    savedStates[month]=state;

    const savedAbsenceStates={...(source.savedAbsenceStates||{})};
    savedAbsenceStates[month]=structuredClone(absence);

    await updateDoc(root,{schedule,absenceManagement:absence,savedStates,savedAbsenceStates,updatedAt:new Date().toISOString()});
    window.__turniApplyExternalSchedule?.(schedule);
    return {schedule,absence,byDate};
  }

  function compare(vs,byDate){
    const actualByDate={};
    for(const [k,v] of Object.entries(vs||{})){
      if(!k.startsWith(prefix)||!k.includes('|ferie|')||!v||v==='NESSUNO')continue;
      const date=k.split('|')[0];
      actualByDate[date]??=[];
      if(!actualByDate[date].includes(v))actualByDate[date].push(v);
    }
    const dates=new Set([...Object.keys(byDate),...Object.keys(actualByDate)]);
    const mismatches=[];
    for(const date of dates){
      const expected=[...(byDate[date]||[])].slice(0,4).sort();
      const actual=[...(actualByDate[date]||[])].sort();
      if(expected.length!==actual.length||expected.some((n,i)=>n!==actual[i]))mismatches.push({date,expected,actual});
    }
    return mismatches;
  }

  let snap=await getDoc(root),source=snap.exists()?snap.data():{};
  let built=await buildAndWrite(source);
  let verifySnap=await getDoc(root),verify=verifySnap.exists()?verifySnap.data():{};
  let mismatches=compare(verify.schedule||{},built.byDate);

  // Un secondo passaggio elimina eventuali scritture concorrenti/stati residui.
  if(mismatches.length){
    built=await buildAndWrite(verify);
    verifySnap=await getDoc(root);verify=verifySnap.exists()?verifySnap.data():{};
    mismatches=compare(verify.schedule||{},built.byDate);
  }

  if(mismatches.length){
    console.warn('Riallineamento ferie incompleto',month,mismatches);
    // Non bloccare l'utente: l'ultimo schedule canonico viene comunque mantenuto
    // nella memoria dell'app e il reload successivo riallinea la vista.
    window.__turniApplyExternalSchedule?.(built.schedule);
    data={...verify,schedule:built.schedule,absenceManagement:built.absence};
    return;
  }
  data=verify;
  window.__turniApplyExternalSchedule?.(verify.schedule||{});
}
function move(delta){view=new Date(view.getFullYear(),view.getMonth()+delta,1,12);render()}
function ensureAbsenceMobileStyle(){
  if($('absenceMobilePanelStyle'))return;
  const s=document.createElement('style');s.id='absenceMobilePanelStyle';s.textContent=`
  #absenceMobilePanel{display:none;margin-top:12px}
  #absenceMobileControls{display:flex;gap:8px;align-items:center;position:sticky;top:0;z-index:3;background:white;padding:6px 0 10px}
  #absenceMobileControls label{font-weight:700;color:#334155}
  #absenceMobileControls select{flex:1;min-width:0;padding:10px;border:1px solid #94a3b8;border-radius:8px;background:#fff}
  #absenceMobileSummary{display:flex;flex-direction:column;gap:3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:10px}
  #absenceMobileSummary span{font-size:13px;color:#334155}#absenceMobileSummary small{font-size:12px;color:#64748b}
  .absenceMobileWeekHead,.absenceMobileDays{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
  .absenceMobileWeekHead{margin-bottom:5px}.absenceMobileWeekHead span{text-align:center;font-size:10px;font-weight:800;color:#64748b}
  .absenceMobileDay{min-height:62px;padding:5px 2px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
  .absenceMobileDay b{font-size:16px}.absenceMobileDay small{font-size:9px;color:#64748b}.absenceMobileDay strong{font-size:8px;color:#854d0e}
  .absenceMobileDay.weekend{background:#fee2e2;border-color:#fecaca}.absenceMobileDay.active{background:#fef3c7;border-color:#f59e0b;box-shadow:inset 0 0 0 1px #f59e0b}
  .absenceMobileDay.active.weekend{background:#fde68a}.absenceMobileBlank{min-height:62px}
  @media(max-width:760px){
    #absenceManageModal{align-items:stretch!important;justify-content:stretch!important;padding:0!important;overflow:hidden!important}
    #absenceManageModal .modal{
      width:100vw!important;max-width:100vw!important;
      height:100dvh!important;max-height:100dvh!important;min-height:100dvh!important;
      border-radius:0!important;margin:0!important;padding:10px 10px 0!important;
      overflow:hidden!important;display:flex!important;flex-direction:column!important;
      overscroll-behavior:contain!important
    }
    #absenceManageModal .modal>div:first-child{
      position:sticky;top:0;z-index:8;background:white;
      flex:0 0 auto;padding:2px 0 6px
    }
    #absenceManageModal p.small{margin:4px 0 6px;flex:0 0 auto;font-size:11px;line-height:1.25}
    #absenceMobilePanel{
      display:block;flex:1 1 auto;min-height:0;overflow-y:auto!important;
      -webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;
      padding:0 1px 86px;margin-top:0!important
    }
    #absenceMobileControls{
      position:sticky!important;top:0!important;z-index:7!important;
      background:white!important;padding:8px 0!important;
      box-shadow:0 1px 0 #e2e8f0
    }
    #absenceMobileSummary{margin:8px 0!important}
    .absenceMobileWeekHead{
      position:sticky;top:58px;z-index:6;background:white;padding:5px 0 4px;margin-bottom:3px!important
    }
    .absenceMobileWeekHead,.absenceMobileDays{gap:4px!important}
    .absenceMobileDay{
      min-height:56px!important;padding:4px 1px!important;border-radius:7px!important;
      touch-action:manipulation;-webkit-tap-highlight-color:transparent;
      user-select:none;-webkit-user-select:none
    }
    .absenceMobileDay b{font-size:15px!important}
    .absenceMobileDay small{font-size:8px!important}
    .absenceMobileDay strong{font-size:7px!important;line-height:1.05}
    .absenceMobileBlank{min-height:56px!important}
    #absenceManageModal .countWrap{display:none!important}
    #absenceManageModal .modalActions{
      position:absolute!important;left:0;right:0;bottom:0;z-index:10;
      background:rgba(255,255,255,.97)!important;padding:8px 10px calc(8px + env(safe-area-inset-bottom))!important;
      border-top:1px solid #e2e8f0;margin:0!important
    }
    #absenceManageModal .modalActions button{width:100%;min-height:44px;font-weight:700}
  }
  `;document.head.appendChild(s)
}
function install(){
  ensureAbsenceMobileStyle();
  let b=$('absenceManageBtn');
  if(!b)return;
  b.onclick=async()=>{
    let mv=$('month')?.value;
    if(mv){
      let[y,m]=mv.split('-').map(Number);
      view=new Date(y,m-1,1,12);
    }else view=new Date();
    $('absenceManageModal').classList.remove('hidden');
    try{await load()}catch(e){alert('Errore caricamento assenze: '+e.message)}
  };
  $('absenceClose').onclick=async()=>{
    let m=`${view.getFullYear()}-${String(view.getMonth()+1).padStart(2,'0')}`;
    $('absenceManageModal').classList.add('hidden');
    sessionStorage.setItem('turniRestoreMonthOnce',m);
    localStorage.setItem('turniLastMonth',m);
    const monthInput=$('month');if(monthInput)monthInput.value=m;
    await reconcileCurrentMonth(true,m)
  };
  $('absencePrevMonth').onclick=()=>move(-1);
  $('absenceNextMonth').onclick=()=>move(1)
}
async function reconcileCurrentMonth(reload=false,monthOverride=''){let m=monthOverride||$('month')?.value;if(!m)return;try{await reconcileMonthLeaves(m);sessionStorage.setItem('leaveReconciledAt',Date.now().toString());if(reload)location.reload()}catch(e){console.error('Errore congruità ferie',e);alert('Errore sincronizzazione ferie: '+e.message)}}
window.matchMedia('(max-width:760px)').addEventListener?.('change',()=>{if(!$('absenceManageModal')?.classList.contains('hidden'))render()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
