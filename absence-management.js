import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');
const MN=['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'],DW=['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
let data={},view=new Date(),novDirty=false,mobileAbsenceDoctor='';
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
async function load(){let s=await getDoc(root);data=s.exists()?s.data():{};data.absenceManagement=data.absenceManagement||{};render()}
function syncNovemberLeave(schedule,n,date,on){if(!date.startsWith('2026-11-'))return;const prefix=date+'|ferie|';if(!on){for(let i=0;i<4;i++){let k=prefix+i;if(schedule[k]===n)delete schedule[k]}return}for(let i=0;i<4;i++)if(schedule[prefix+i]===n)return;let free=[0,1,2,3].find(i=>!schedule[prefix+i]||schedule[prefix+i]==='NESSUNO');if(free!==undefined)schedule[prefix+free]=n}
async function save(next,change){let snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule={...(x.schedule||{})};if(change&&change.date.startsWith('2026-11-'))syncNovemberLeave(schedule,change.n,change.date,change.on);await setDoc(root,{absenceManagement:next,schedule,updatedAt:new Date().toISOString()},{merge:true});data.absenceManagement=next;data.schedule=schedule;if(change&&change.date.startsWith('2026-11-'))novDirty=true;render()}
function absentOn(date,exclude=''){return doctors().filter(n=>n!==exclude&&(store()[n]||[]).includes(date))}
function warnCrowded(date,n){let names=absentOn(date,n);return names.length<2||confirm('ATTENZIONE: il '+date.split('-').reverse().join('/')+' risultano già assenti: '+names.join(', ')+'.\\n\\nVuoi inserire comunque questa assenza?')}
async function toggle(td){let n=td.dataset.doctor,date=td.dataset.date,next=structuredClone(store()),set=new Set(next[n]||[]);if(set.has(date))set.delete(date);else{if(!warnCrowded(date,n))return;set.add(date)}next[n]=[...set].sort();await save(next,{n,date,on:set.has(date)})}
async function reconcileMonthLeaves(month){if(!/^\d{4}-\d{2}$/.test(month))return;let r=await getDoc(root),rootData=r.exists()?r.data():{},absence=rootData.absenceManagement||{},schedule={...(rootData.schedule||{})},prefix=month+'-';for(const k of Object.keys(schedule)){let p=k.split('|');if(k.startsWith(prefix)&&(p[1]==='ferie'||k.includes('|ferie|')))delete schedule[k]};let byDate={};for(const [n,dates] of Object.entries(absence))for(const date of dates||[])if(date.startsWith(prefix)){byDate[date]??=[];if(!byDate[date].includes(n))byDate[date].push(n)}for(const [date,names] of Object.entries(byDate))names.slice(0,4).forEach((n,i)=>schedule[date+'|ferie|'+i]=n);await setDoc(root,{schedule,updatedAt:new Date().toISOString()},{mergeFields:['schedule','updatedAt']});let verify=await getDoc(root),vs=verify.exists()?(verify.data().schedule||{}):{},remaining=Object.keys(vs).filter(k=>k.startsWith(prefix)&&k.includes('|ferie|'));data.schedule=vs;if(!Object.values(absence).some(ds=>(ds||[]).some(d=>d.startsWith(prefix)))&&remaining.length)throw new Error('Verifica fallita: restano '+remaining.length+' celle ferie in '+month)}
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
  @media(max-width:760px){#absenceManageModal .modal{width:100vw!important;max-width:100vw!important;height:100vh!important;max-height:100vh!important;border-radius:0!important;margin:0!important;padding:12px!important;overflow:auto}#absenceManageModal{align-items:stretch!important;justify-content:stretch!important}#absenceManageModal p.small{margin:8px 0}#absenceManageModal .modalActions{position:sticky;bottom:0;background:white;padding-top:8px}}
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
    novDirty=false;
    await reconcileCurrentMonth(true,m)
  };
  $('absencePrevMonth').onclick=()=>move(-1);
  $('absenceNextMonth').onclick=()=>move(1)
}
async function reconcileCurrentMonth(reload=false,monthOverride=''){let m=monthOverride||$('month')?.value;if(!m)return;try{await reconcileMonthLeaves(m);sessionStorage.setItem('leaveReconciledAt',Date.now().toString());if(reload)location.reload()}catch(e){console.error('Errore congruità ferie',e);alert('Errore sincronizzazione ferie: '+e.message)}}
window.matchMedia('(max-width:760px)').addEventListener?.('change',()=>{if(!$('absenceManageModal')?.classList.contains('hidden'))render()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
