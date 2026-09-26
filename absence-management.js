import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');
const MN=['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'],DW=['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
let data={},view=new Date(),novDirty=false;
const OCTOBER_2026_IMPORT={
  'CATALDI':[1,2,3,4,5,6,7,8,9,10,11,12,13,14],
  'CALZAVARA':[6,19],
  'PINI':[7,8,9,12,13,14,15,16],
  'FATTORETTO':[7,8,9,13],
  'LENTINI':[8,19,20,21,22,23,27],
  'FRANCO':[9,12],
  'VIALE':[14,30],
  'COMELATO':[15,16,19,21],
  'RIVA':[20,21],
  'DEI ROSSI':[23]
};
function store(){return data.absenceManagement||{}}
function doctors(){return(data.doctors||[]).filter(d=>d.active).map(d=>d.name).filter(Boolean)}
function key(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function render(){let y=view.getFullYear(),m=view.getMonth(),days=new Date(y,m+1,0).getDate(),table=$('absenceTable');if(!table)return;$('absenceManageTitle').textContent=`${MN[m]} ${y}`;let head='<tr><th style="position:sticky;left:0;z-index:3;background:#d9d2e9;min-width:105px">Medico</th>';for(let d=1;d<=days;d++){let dt=new Date(y,m,d,12),we=[0,6].includes(dt.getDay());head+=`<th style="min-width:24px;width:24px;padding:3px 1px;font-size:11px;${we?'background:#f4cccc':''}">${d}<br><small>${DW[dt.getDay()]}</small></th>`}head+='<th>Tot.</th></tr>';let body='';for(const n of doctors()){let set=new Set(store()[n]||[]),tot=0;body+=`<tr><td style="position:sticky;left:0;z-index:2;background:white;text-align:left"><b>${n}</b></td>`;for(let d=1;d<=days;d++){let dt=new Date(y,m,d,12),date=key(y,m,d),on=set.has(date),we=[0,6].includes(dt.getDay());if(on)tot++;body+=`<td class="absenceDayCell" data-doctor="${n}" data-date="${date}" title="${n} — ${date}" style="cursor:pointer;text-align:center;font-weight:700;padding:3px 1px;font-size:11px;width:24px;${on?'background:#fff2a8;':''}${!on&&we?'background:#f8dddd;':''}">${on?'A':''}</td>`}body+=`<td><b>${tot}</b></td></tr>`}table.innerHTML=head+body;table.querySelectorAll('.absenceDayCell').forEach(td=>td.onclick=()=>toggle(td).catch(e=>alert('Errore modifica assenza: '+e.message)))}
async function load(){let s=await getDoc(root);data=s.exists()?s.data():{};data.absenceManagement=data.absenceManagement||{};render()}
function syncNovemberLeave(schedule,n,date,on){if(!date.startsWith('2026-11-'))return;const prefix=date+'|ferie|';if(!on){for(let i=0;i<4;i++){let k=prefix+i;if(schedule[k]===n)delete schedule[k]}return}for(let i=0;i<4;i++)if(schedule[prefix+i]===n)return;let free=[0,1,2,3].find(i=>!schedule[prefix+i]||schedule[prefix+i]==='NESSUNO');if(free!==undefined)schedule[prefix+free]=n}
async function save(next,change){let snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule={...(x.schedule||{})};if(change&&change.date.startsWith('2026-11-'))syncNovemberLeave(schedule,change.n,change.date,change.on);await setDoc(root,{absenceManagement:next,schedule,updatedAt:new Date().toISOString()},{merge:true});data.absenceManagement=next;data.schedule=schedule;if(change&&change.date.startsWith('2026-11-'))novDirty=true;render()}
function absentOn(date,exclude=''){return doctors().filter(n=>n!==exclude&&(store()[n]||[]).includes(date))}
function warnCrowded(date,n){let names=absentOn(date,n);return names.length<2||confirm('ATTENZIONE: il '+date.split('-').reverse().join('/')+' risultano già assenti: '+names.join(', ')+'.\\n\\nVuoi inserire comunque questa assenza?')}
async function toggle(td){let n=td.dataset.doctor,date=td.dataset.date,next=structuredClone(store()),set=new Set(next[n]||[]);if(set.has(date))set.delete(date);else{if(!warnCrowded(date,n))return;set.add(date)}next[n]=[...set].sort();await save(next,{n,date,on:set.has(date)})}
async function importJanSep2026FromBackup(){
  const EXPECTED_COUNT=474,EXPECTED_HASH='09a9f1d36c1c3547a256225fc71df847772b37eaebcb3e13860cc95e8229ac89';
  const EXPECTED_MONTHS={'2026-01':31,'2026-02':42,'2026-03':48,'2026-04':61,'2026-05':39,'2026-06':50,'2026-07':72,'2026-08':73,'2026-09':58};
  const sha=async s=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};
  const snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule=x.schedule||{},byDoctor={},pairs=[],months={};
  for(const[k,v]of Object.entries(schedule)){
    const p=k.split('|'),date=p[0],svc=p[1];
    if(svc!=='ferie'||!v||v==='NESSUNO'||date<'2026-01-01'||date>'2026-09-30')continue;
    byDoctor[v]??=new Set();byDoctor[v].add(date);
  }
  for(const[n,set]of Object.entries(byDoctor))for(const date of set){pairs.push(n+'|'+date);const m=date.slice(0,7);months[m]=(months[m]||0)+1}
  pairs.sort();
  const actualHash=await sha(pairs.join('\n'));
  const monthOK=Object.entries(EXPECTED_MONTHS).every(([m,n])=>(months[m]||0)===n);
  if(pairs.length!==EXPECTED_COUNT||actualHash!==EXPECTED_HASH||!monthOK){
    return alert('IMPORTAZIONE BLOCCATA: lo storico ferie gennaio-settembre presente nel database non coincide esattamente con il backup verificato. Nessun dato è stato modificato.');
  }
  const summary=Object.entries(EXPECTED_MONTHS).map(([m,n])=>m+': '+n).join('\n');
  if(!confirm('Importare in GESTIONE ASSENZE lo storico ferie GENNAIO–SETTEMBRE 2026 ricostruito dal backup verificato?\n\nVerranno sostituite SOLO le assenze dal 01/01/2026 al 30/09/2026. Ottobre e novembre resteranno invariati.\n\n'+summary+'\n\nTotale: '+EXPECTED_COUNT+' giornate-medico.'))return;
  const next=structuredClone(x.absenceManagement||{}),allNames=new Set([...(x.doctors||[]).map(d=>d.name).filter(Boolean),...Object.keys(next),...Object.keys(byDoctor)]);
  for(const n of allNames){
    const keep=(next[n]||[]).filter(d=>d<'2026-01-01'||d>'2026-09-30');
    const add=[...(byDoctor[n]||[])];
    next[n]=[...new Set([...keep,...add])].sort();
  }
  await setDoc(root,{absenceManagement:next,updatedAt:new Date().toISOString()},{merge:true});
  const verify=await getDoc(root),va=verify.exists()?(verify.data().absenceManagement||{}):{},vp=[];
  for(const[n,dates]of Object.entries(va))for(const date of dates||[])if(date>='2026-01-01'&&date<='2026-09-30')vp.push(n+'|'+date);
  vp.sort();
  const verifyHash=await sha(vp.join('\n'));
  if(vp.length!==EXPECTED_COUNT||verifyHash!==EXPECTED_HASH)throw new Error('Verifica finale fallita dopo il salvataggio.');
  data.absenceManagement=va;view=new Date(2026,8,1,12);render();
  alert('Importazione gennaio–settembre 2026 completata e verificata.\n\n474 giornate-medico importate.\nOttobre e novembre non sono stati modificati.');
}
async function importOctober2026FromExcel(){
  const expected=Object.values(OCTOBER_2026_IMPORT).reduce((n,a)=>n+a.length,0);
  if(!confirm('Importare le ferie di OTTOBRE 2026 dall\'Excel verificato?\n\nVerranno SOSTITUITE solo le assenze di ottobre 2026. Gli altri mesi resteranno invariati.\n\nTotale giornate-medico da importare: '+expected))return;
  const snap=await getDoc(root),x=snap.exists()?snap.data():{},next=structuredClone(x.absenceManagement||{});
  const allNames=new Set([...(x.doctors||[]).map(d=>d.name).filter(Boolean),...Object.keys(next),...Object.keys(OCTOBER_2026_IMPORT)]);
  for(const n of allNames){
    const keep=(next[n]||[]).filter(d=>!d.startsWith('2026-10-'));
    const add=(OCTOBER_2026_IMPORT[n]||[]).map(d=>'2026-10-'+String(d).padStart(2,'0'));
    next[n]=[...new Set([...keep,...add])].sort();
  }
  await setDoc(root,{absenceManagement:next,updatedAt:new Date().toISOString()},{merge:true});
  data.absenceManagement=next;
  view=new Date(2026,9,1,12);
  render();
  const actual=Object.values(next).reduce((n,arr)=>n+(arr||[]).filter(d=>d.startsWith('2026-10-')).length,0);
  if(actual!==expected)throw new Error('Verifica importazione fallita: attese '+expected+' giornate, trovate '+actual);
  alert('Importazione ottobre 2026 completata.\nGiornate-medico importate: '+actual+'\n\nSono state modificate solo le assenze di ottobre.');
}
async function reconcileMonthLeaves(month){if(!/^\d{4}-\d{2}$/.test(month))return;let r=await getDoc(root),rootData=r.exists()?r.data():{},absence=rootData.absenceManagement||{},schedule={...(rootData.schedule||{})},prefix=month+'-';for(const k of Object.keys(schedule)){let p=k.split('|');if(k.startsWith(prefix)&&(p[1]==='ferie'||k.includes('|ferie|')))delete schedule[k]};let byDate={};for(const [n,dates] of Object.entries(absence))for(const date of dates||[])if(date.startsWith(prefix)){byDate[date]??=[];if(!byDate[date].includes(n))byDate[date].push(n)}for(const [date,names] of Object.entries(byDate))names.slice(0,4).forEach((n,i)=>schedule[date+'|ferie|'+i]=n);await setDoc(root,{schedule,updatedAt:new Date().toISOString()},{mergeFields:['schedule','updatedAt']});let verify=await getDoc(root),vs=verify.exists()?(verify.data().schedule||{}):{},remaining=Object.keys(vs).filter(k=>k.startsWith(prefix)&&k.includes('|ferie|'));data.schedule=vs;if(!Object.values(absence).some(ds=>(ds||[]).some(d=>d.startsWith(prefix)))&&remaining.length)throw new Error('Verifica fallita: restano '+remaining.length+' celle ferie in '+month)}
function move(delta){view=new Date(view.getFullYear(),view.getMonth()+delta,1,12);render()}
function install(){let b=$('absenceManageBtn');if(!b)return;b.onclick=async()=>{let mv=$('month')?.value;if(mv){let[y,m]=mv.split('-').map(Number);view=new Date(y,m-1,1,12)}else view=new Date();$('absenceManageModal').classList.remove('hidden');try{await load()}catch(e){alert('Errore caricamento assenze: '+e.message)}};$('absenceClose').onclick=async()=>{let m=`${view.getFullYear()}-${String(view.getMonth()+1).padStart(2,'0')}`;$('absenceManageModal').classList.add('hidden');novDirty=false;await reconcileCurrentMonth(true,m)};$('absencePrevMonth').onclick=()=>move(-1);$('absenceNextMonth').onclick=()=>move(1);let x=$('importOctoberAbsencesBtn');if(!x){x=document.createElement('button');x.id='importOctoberAbsencesBtn';x.type='button';x.textContent='IMPORTA OTTOBRE 2026 DA EXCEL';x.className='adminOnly';$('absenceNextMonth')?.insertAdjacentElement('afterend',x)}if(x&&x.dataset.bound!=='1'){x.dataset.bound='1';x.onclick=()=>importOctober2026FromExcel().catch(e=>alert('Errore importazione ottobre: '+e.message))}let j=$('importJanSepAbsencesBtn');if(!j){j=document.createElement('button');j.id='importJanSepAbsencesBtn';j.type='button';j.textContent='IMPORTA GEN–SET 2026 DA BACKUP';j.className='adminOnly';x?.insertAdjacentElement('afterend',j)}if(j&&j.dataset.bound!=='1'){j.dataset.bound='1';j.onclick=()=>importJanSep2026FromBackup().catch(e=>alert('Errore importazione gennaio-settembre: '+e.message))}}
async function reconcileCurrentMonth(reload=false,monthOverride=''){let m=monthOverride||$('month')?.value;if(!m)return;try{await reconcileMonthLeaves(m);sessionStorage.setItem('leaveReconciledAt',Date.now().toString());if(reload)location.reload()}catch(e){console.error('Errore congruità ferie',e);alert('Errore sincronizzazione ferie: '+e.message)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
