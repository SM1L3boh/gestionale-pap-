import{getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const fb=getApps()[0],auth=getAuth(fb),db=getFirestore(fb),$=id=>document.getElementById(id);
const root=doc(db,'gestionale','dati');
const MAIN_ADMINS=['EvF0UU31AwfgTPb6M0UnTX9IXbH3','EK0kFMLlFSPTg1aW83AllWI2DAV2'];
const serviceMeta={
  guardia:['GUARDIA NOTT.','20:00','08:00','night'],
  giorno:['INTERD','14:00','20:00','pm'],
  disp1:['1ª DISP.','20:00','08:00','availability'],
  disp2:['2ª DISP.','20:00','08:00','availability'],
  gessi:['GESSI MAT','08:00','14:00','am'],
  gessirep:['GESSI+REP POM','14:00','20:00','pm'],
  reparto:['REPARTO','08:00','14:00','am'],
  amb:['AMBULATORIO','08:00','14:00','am'],
  esami:['AMB ESAMI','08:00','14:00','am'],
  op1:['OP1 MAT','08:00','14:00','am'],
  op2:['OP2 MAT','08:00','14:00','am'],
  oppom:['OP POM','14:00','20:00','pm'],
  ferie:['FERIE','','','leave'],
  varie:['VARIE','','','other']
};
let currentUser=null,profile=null,doctorName='',viewMonth='',manualItems=[];

const pad=n=>String(n).padStart(2,'0');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dsFrom=(y,m,d)=>y+'-'+pad(m)+'-'+pad(d);
const isAgendaOwner=()=>!!currentUser&&(
  MAIN_ADMINS.includes(currentUser.uid)||profile?.role==='admin'
)&&(
  String(profile?.doctorName||'').toUpperCase()==='COMELATO' ||
  /comelato/i.test(currentUser.email||'')
);
function normalizeMonth(v){if(/^\d{4}-\d{2}$/.test(v))return v;const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)}

async function identify(){
  if(!currentUser)return false;
  const ps=await getDoc(doc(db,'users',currentUser.uid));
  profile=ps.exists()?ps.data():{};
  if(!isAgendaOwner())return false;
  doctorName=profile.doctorName||'COMELATO';
  $('agendaDoctorLabel').textContent='Turni importati automaticamente per '+doctorName;
  return true;
}

async function loadManualItems(){
  manualItems=[];
  if(!currentUser||!viewMonth)return;
  const ps=await getDoc(doc(db,'users',currentUser.uid));
  const p=ps.exists()?ps.data():{};
  profile={...(profile||{}),...p};
  manualItems=(Array.isArray(p.agendaItems)?p.agendaItems:[])
    .filter(i=>i&&i.date?.startsWith(viewMonth+'-'))
    .map(i=>({...i}));
  manualItems.sort((a,b)=>(a.date+(a.start||'')+(a.title||'')).localeCompare(b.date+(b.start||'')+(b.title||'')));
}

async function loadSchedule(){
  const snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule=x.schedule||{},byDate={};
  for(const [k,n] of Object.entries(schedule)){
    if(n!==doctorName||!k.startsWith(viewMonth+'-'))continue;
    const [date,svc]=k.split('|');
    if(svc==='varie')continue;
    byDate[date]??=[];
    if(svc==='ferie'){
      if(!byDate[date].some(x=>x.svc==='ferie'))byDate[date].push({svc,label:'FERIE',start:'',end:''});
      continue;
    }
    const meta=serviceMeta[svc]||[svc.toUpperCase(),'','','other'];
    if(!byDate[date].some(x=>x.svc===svc))byDate[date].push({svc,label:meta[0],start:meta[1],end:meta[2],kind:meta[3]});
  }
  return byDate;
}

function itemTime(i){
  if(i.start&&i.end)return i.start+'–'+i.end;
  if(i.start)return i.start;
  return '';
}

function renderManualList(){
  const box=$('agendaManualList');
  if(!manualItems.length){box.innerHTML='<div class="small">Nessun impegno manuale nel mese.</div>';return}
  box.innerHTML=manualItems.map(i=>`<div class="agendaManualItem">
    <div class="agendaManualItemMain">
      <div class="agendaManualItemTitle">${esc(i.title)}</div>
      <div class="agendaManualItemMeta">${esc(i.date.split('-').reverse().join('/'))}${itemTime(i)?' · '+esc(itemTime(i)):''}${i.notes?' · '+esc(i.notes):''}</div>
    </div>
    <div class="agendaManualItemActions"><button type="button" data-agenda-edit="${i.id}">Modifica</button><button type="button" data-agenda-del="${i.id}">Elimina</button></div>
  </div>`).join('');
  box.querySelectorAll('[data-agenda-edit]').forEach(b=>b.onclick=()=>editItem(b.dataset.agendaEdit));
  box.querySelectorAll('[data-agenda-del]').forEach(b=>b.onclick=()=>removeItem(b.dataset.agendaDel));
}

async function render(){
  if(!isAgendaOwner())return;
  viewMonth=normalizeMonth(viewMonth||$('agendaMonth')?.value||$('month')?.value);
  $('agendaMonth').value=viewMonth;
  await loadManualItems();
  const shifts=await loadSchedule();
  const [y,m]=viewMonth.split('-').map(Number),days=new Date(y,m,0).getDate(),first=new Date(y,m-1,1,12),offset=(first.getDay()+6)%7;
  const manualByDate={};
  for(const i of manualItems)(manualByDate[i.date]??=[]).push(i);
  let html='';
  for(let i=0;i<offset;i++)html+='<div class="agendaBlank"></div>';
  const wd=['DOM','LUN','MAR','MER','GIO','VEN','SAB'],today=new Date(),todayDs=dsFrom(today.getFullYear(),today.getMonth()+1,today.getDate());
  for(let d=1;d<=days;d++){
    const date=dsFrom(y,m,d),dt=new Date(y,m-1,d,12),weekend=[0,6].includes(dt.getDay());
    const shiftEvents=(shifts[date]||[]).map(s=>`<div class="agendaEvent agendaShift agendaShift-${esc(s.kind||'other')}"><span class="agendaEventTime">${esc(s.start?(s.start+'–'+s.end):'')}</span> ${esc(s.label)}</div>`).join('');
    const personal=(manualByDate[date]||[]).map(i=>`<div class="agendaEvent agendaPersonal" data-agenda-open="${i.id}"><span class="agendaEventTime">${esc(itemTime(i))}</span> ${esc(i.title)}</div>`).join('');
    html+=`<div class="agendaDay${weekend?' weekend':''}${date===todayDs?' today':''}" data-agenda-date="${date}">
      <div class="agendaDayHead"><span class="agendaDayNum">${d}</span><span class="agendaDayName">${wd[dt.getDay()]}</span></div>
      ${shiftEvents}${personal}
    </div>`;
  }
  $('agendaCalendar').innerHTML=html;
  $('agendaCalendar').querySelectorAll('[data-agenda-open]').forEach(x=>x.onclick=e=>{e.stopPropagation();editItem(x.dataset.agendaOpen)});
  $('agendaCalendar').querySelectorAll('[data-agenda-date]').forEach(x=>x.onclick=()=>{resetForm();$('agendaDate').value=x.dataset.agendaDate;$('agendaTitleInput').focus()});
  renderManualList();
}

function resetForm(){
  $('agendaEditId').value='';
  $('agendaFormTitle').textContent='Nuovo impegno';
  $('agendaForm').reset();
  const d=new Date();
  $('agendaDate').value=viewMonth===normalizeMonth()?dsFrom(d.getFullYear(),d.getMonth()+1,d.getDate()):viewMonth+'-01';
}
function editItem(id){
  const i=manualItems.find(x=>x.id===id);if(!i)return;
  $('agendaEditId').value=i.id;
  $('agendaDate').value=i.date||'';
  $('agendaStart').value=i.start||'';
  $('agendaEnd').value=i.end||'';
  $('agendaTitleInput').value=i.title||'';
  $('agendaNotes').value=i.notes||'';
  $('agendaFormTitle').textContent='Modifica impegno';
  $('agendaTitleInput').focus();
}
async function removeItem(id){
  const i=manualItems.find(x=>x.id===id);if(!i)return;
  if(!confirm('Eliminare l’impegno “'+i.title+'”?'))return;
  const ref=doc(db,'users',currentUser.uid),ps=await getDoc(ref),p=ps.exists()?ps.data():{};
  const all=(Array.isArray(p.agendaItems)?p.agendaItems:[]).filter(x=>x?.id!==id);
  await setDoc(ref,{agendaItems:all},{merge:true});
  await render();
  resetForm();
}
async function saveItem(e){
  e.preventDefault();
  if(!isAgendaOwner())return;
  const date=$('agendaDate').value,title=$('agendaTitleInput').value.trim();
  if(!date||!title)return;
  const payload={
    date,month:date.slice(0,7),start:$('agendaStart').value||'',end:$('agendaEnd').value||'',
    title,notes:$('agendaNotes').value.trim(),updatedAt:new Date().toISOString()
  };
  const ref=doc(db,'users',currentUser.uid),ps=await getDoc(ref),p=ps.exists()?ps.data():{};
  const all=(Array.isArray(p.agendaItems)?p.agendaItems:[]).map(x=>({...x}));
  const id=$('agendaEditId').value||crypto.randomUUID();
  const idx=all.findIndex(x=>x?.id===id);
  const saved={...payload,id,createdAt:idx>=0?(all[idx].createdAt||new Date().toISOString()):new Date().toISOString()};
  if(idx>=0)all[idx]=saved;else all.push(saved);
  await setDoc(ref,{agendaItems:all},{merge:true});
  viewMonth=date.slice(0,7);
  await render();
  resetForm();
}
function moveMonth(delta){
  const [y,m]=viewMonth.split('-').map(Number),d=new Date(y,m-1+delta,1,12);
  viewMonth=d.getFullYear()+'-'+pad(d.getMonth()+1);
  render().catch(e=>alert('Errore agenda: '+e.message));
}
function bind(){
  $('agendaPrev').onclick=()=>moveMonth(-1);
  $('agendaNext').onclick=()=>moveMonth(1);
  $('agendaMonth').onchange=e=>{viewMonth=normalizeMonth(e.target.value);render().catch(x=>alert('Errore agenda: '+x.message))};
  $('agendaForm').onsubmit=saveItem;
  $('agendaCancelEdit').onclick=resetForm;
}
window.__openAgenda=async()=>{
  if(!isAgendaOwner())return;
  viewMonth=normalizeMonth($('agendaMonth')?.value||$('month')?.value);
  await render();
  resetForm();
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();

onAuthStateChanged(auth,async u=>{
  currentUser=u;profile=null;doctorName='';
  const tab=$('tabAgenda');
  if(!u){tab?.classList.add('hidden');return}
  try{
    const ok=await identify();
    tab?.classList.toggle('hidden',!ok);
  }catch(e){
    console.error('Agenda: errore identificazione profilo',e);
    tab?.classList.add('hidden');
  }
});
