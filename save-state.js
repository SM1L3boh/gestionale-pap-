import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc,updateDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');let busy=false;
function monthLabel(m){const[y,mo]=m.split('-');return`${mo}/${y}`}
function easter(y){let a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,n=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*n+114)/31),da=(h+l-7*n+114)%31+1;return new Date(y,mo-1,da,12)}
function isHoliday(dt){const md=`${dt.getMonth()+1}-${dt.getDate()}`;if(new Set(['1-1','1-6','4-25','5-1','6-2','8-15','8-16','11-1','12-8','12-25','12-26']).has(md))return true;const p=easter(dt.getFullYear());p.setDate(p.getDate()+1);return p.toDateString()===dt.toDateString()}
function paintHolidays(){const m=document.getElementById('month')?.value;if(!m)return;document.querySelectorAll('#schedule tbody tr').forEach(r=>{const s=r.querySelector('select[data-k]');if(!s)return;const ds=s.dataset.k.split('|')[0],dt=new Date(ds+'T12:00:00');if(isHoliday(dt))r.classList.add('weekend')})}
function isStructuralDefaultNessuno(k){
  const [ds,s,iRaw]=(k||'').split('|'),i=Number(iRaw||0),m=ds?.slice(0,7);
  if(!ds||!m||m<'2026-11')return false;
  const w=new Date(ds+'T12:00:00').getDay();
  if(s==='ferie'||s==='guardia'||s==='giorno'||s==='esami')return true;
  if(s==='gessi'||s==='amb')return i===1;
  if(s==='op2')return w===2;
  if(s==='oppom'){
    if(w===3)return i===1;
    if([1,2,4].includes(w))return false;
    return true;
  }
  return false;
}
async function saveVisibleState(){if(busy)return;const month=document.getElementById('month')?.value;if(!month)return;busy=true;const b=document.getElementById('saveStateBtn'),sync=document.getElementById('sync');try{if(b)b.disabled=true;if(sync)sync.textContent='Salvataggio stato…';const snap=await getDoc(root),x=snap.exists()?snap.data():{},manual=new Set(x.manualKeys||[]),generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]),opened=new Set(x.openedStructuralKeys||[]),baseline={},schedule={...(x.schedule||{})};for(const k of Object.keys(schedule))if(k.startsWith(month+'-'))delete schedule[k];document.querySelectorAll('#schedule select[data-k]').forEach(s=>{const k=s.dataset.k,v=s.value;if(!k?.startsWith(month+'-'))return;if(!v){if(isStructuralDefaultNessuno(k))opened.add(k);else opened.delete(k);manual.delete(k);generated.delete(k);extra.delete(k);return}opened.delete(k);baseline[k]=v;schedule[k]=v});for(const k of [...opened])if(k.startsWith(month+'-')){delete baseline[k];delete schedule[k];manual.delete(k);generated.delete(k);extra.delete(k)}const savedStates={...(x.savedStates||{}),[month]:baseline},savedAbsenceStates={...(x.savedAbsenceStates||{}),[month]:structuredClone(x.absenceManagement||{})},savedOpenedStates={...(x.savedOpenedStates||{}),[month]:[...opened].filter(k=>k.startsWith(month+'-'))};for(const k of Object.keys(baseline)){manual.add(k);generated.delete(k);extra.delete(k)}await updateDoc(root,{schedule,savedStates,savedAbsenceStates,savedOpenedStates,openedStructuralKeys:[...opened],manualKeys:[...manual],generatedKeys:[...generated],extraKeys:[...extra],updatedAt:new Date().toISOString()});if(sync){sync.textContent='● Stato '+monthLabel(month)+' salvato';sync.className='status online'}}catch(err){if(sync)sync.textContent='Errore salvataggio stato';alert('Errore durante il salvataggio: '+err.message)}finally{busy=false;if(b)b.disabled=false}}
function monthDefaultCells(month){
  const out={};
  if(month<'2026-11')return out;
  const [y,mo]=month.split('-').map(Number),days=new Date(y,mo,0).getDate();
  for(let d=1;d<=days;d++){
    const dt=new Date(y,mo-1,d,12),w=dt.getDay(),ds=`${month}-${String(d).padStart(2,'0')}`;
    const put=(svc,i)=>out[ds+'|'+svc+'|'+i]='NESSUNO';
    // FERIE-VARIE: default NESSUNO in all four slots, later overwritten by official absences.
    for(let i=0;i<4;i++)put('ferie',i);
    // Weekend only exposes these services.
    put('guardia',0); put('giorno',0);
    if(w===0||w===6)continue;
    put('esami',0);
    put('gessi',1);
    put('amb',1);
    if(w===2){put('op2',0);put('op2',1)}
    if(w===3){put('oppom',1)}else if(![1,2,4].includes(w)){put('oppom',0);put('oppom',1)}
  }
  return out;
}
async function emptyCurrentMonth(){
  if(busy)return;
  const month=document.getElementById('month')?.value;
  if(!month)return;
  if(!confirm('SVUOTA MESE '+monthLabel(month)+'?\n\nVerranno cancellati TUTTI i turni del mese attivo, compresi gli inserimenti manuali. Rimarranno solo ferie/assenze registrate in Gestione Assenze. Gli altri mesi non saranno modificati.'))return;
  busy=true;
  const btn=document.getElementById('emptyMonthBtn'),sync=document.getElementById('sync');
  try{
    if(btn)btn.disabled=true;
    if(sync)sync.textContent='Svuotamento mese…';
    const snap=await getDoc(root),x=snap.exists()?snap.data():{};
    const schedule={...(x.schedule||{})};
    for(const k of Object.keys(schedule))if(k.startsWith(month+'-'))delete schedule[k];
    Object.assign(schedule,monthDefaultCells(month));

    const absence=x.absenceManagement||{},byDate={};
    for(const [name,dates] of Object.entries(absence)){
      for(const ds of dates||[]){
        if(!ds.startsWith(month+'-'))continue;
        byDate[ds]??=[];
        if(!byDate[ds].includes(name))byDate[ds].push(name);
      }
    }
    const expectedLeaves={};
    for(const [ds,names] of Object.entries(byDate)){
      names.slice(0,4).forEach((name,i)=>{
        const k=ds+'|ferie|'+i;
        schedule[k]=name;
        expectedLeaves[k]=name;
      });
    }

    const stripMonth=arr=>(arr||[]).filter(k=>!String(k).startsWith(month+'-'));
    const savedStates={...(x.savedStates||{})};
    savedStates[month]={};
    const savedAbsenceStates={...(x.savedAbsenceStates||{})};
    savedAbsenceStates[month]=structuredClone(absence);
    const savedOpenedStates={...(x.savedOpenedStates||{})};
    savedOpenedStates[month]=[];

    const nextData={
      schedule,
      generatedKeys:stripMonth(x.generatedKeys),
      extraKeys:stripMonth(x.extraKeys),
      manualKeys:stripMonth(x.manualKeys),
      unresolvedKeys:stripMonth(x.unresolvedKeys),
      openedStructuralKeys:stripMonth(x.openedStructuralKeys),
      savedStates,
      savedAbsenceStates,
      savedOpenedStates,
      updatedAt:new Date().toISOString()
    };
    await updateDoc(root,nextData);

    const verifySnap=await getDoc(root),verify=verifySnap.exists()?verifySnap.data():{},verifySchedule=verify.schedule||{};
    const missing=Object.entries(expectedLeaves).filter(([k,v])=>verifySchedule[k]!==v);
    const defaults=monthDefaultCells(month);
    const unexpected=Object.entries(verifySchedule).filter(([k,val])=>k.startsWith(month+'-')&&!k.includes('|ferie|')&&defaults[k]!==val);
    if(missing.length||unexpected.length){
      await updateDoc(root,{
        schedule:x.schedule||{},
        generatedKeys:x.generatedKeys||[],
        extraKeys:x.extraKeys||[],
        manualKeys:x.manualKeys||[],
        unresolvedKeys:x.unresolvedKeys||[],
        savedStates:x.savedStates||{},
        savedAbsenceStates:x.savedAbsenceStates||{},
        updatedAt:new Date().toISOString()
      });
      throw new Error('verifica di sicurezza fallita: il mese è stato ripristinato automaticamente');
    }

    if(sync){sync.textContent='● '+monthLabel(month)+' svuotato — ferie/assenze verificate';sync.className='status online'}
    sessionStorage.setItem('turniRestoreMonthOnce',month);
    location.reload();
  }catch(e){
    if(sync)sync.textContent='Errore svuotamento mese';
    alert('Errore durante SVUOTA MESE: '+e.message);
  }finally{
    busy=false;
    if(btn)btn.disabled=false;
  }
}
async function cleanNovemberBaseline(){
  const month=document.getElementById('month')?.value;
  if(month!=='2026-11')return alert('La pulizia mirata è disponibile solo per novembre 2026.');
  if(!confirm('Ripulire la baseline di novembre 2026 da RIVA e FREGUIA? La griglia corrente, i medici, le regole e gli altri mesi non verranno modificati.'))return;
  try{
    const snap=await getDoc(root),x=snap.exists()?snap.data():{},savedStates={...(x.savedStates||{})},b={...(savedStates['2026-11']||{})};
    const badKeys=Object.entries(b).filter(([k,v])=>k.startsWith('2026-11-')&&['RIVA','FREGUIA'].includes(v)).map(([k])=>k);
    for(const k of badKeys)delete b[k];
    savedStates['2026-11']=b;
    const manualKeys=(x.manualKeys||[]).filter(k=>!badKeys.includes(k));
    await updateDoc(root,{savedStates,manualKeys,updatedAt:new Date().toISOString()});
    alert('Baseline novembre 2026 ripulita. Rimossi '+badKeys.length+' riferimenti a RIVA/FREGUIA. La griglia corrente non è stata modificata.');
    await inspectBaseline();
  }catch(e){alert('Errore pulizia baseline: '+e.message)}
}
async function inspectBaseline(){const month=document.getElementById('month')?.value;if(!month)return;try{const snap=await getDoc(root),x=snap.exists()?snap.data():{},b=x.savedStates?.[month]||{},hits=Object.entries(b).filter(([k,v])=>k.startsWith(month+'-')&&['RIVA','FREGUIA'].includes(v));let msg='BASELINE '+month+'\nCelle salvate: '+Object.keys(b).filter(k=>k.startsWith(month+'-')).length+'\nRIVA: '+hits.filter(([,v])=>v==='RIVA').length+'\nFREGUIA: '+hits.filter(([,v])=>v==='FREGUIA').length;if(hits.length)msg+='\n\nOccorrenze:\n'+hits.map(([k,v])=>k+' = '+v).join('\n');else msg+='\n\nNessuna occorrenza RIVA/FREGUIA.';alert(msg)}catch(e){alert('Errore controllo baseline: '+e.message)}}
async function exportDataBackup(){
  const btn=document.getElementById('exportDataBackupBtn');
  const sync=document.getElementById('sync');
  try{
    if(btn)btn.disabled=true;
    if(sync)sync.textContent='Esportazione backup dati…';
    const snap=await getDoc(root);
    if(!snap.exists())throw new Error('Documento dati non trovato');
    const payload={
      format:'gestionale-pap-backup-v1',
      exportedAt:new Date().toISOString(),
      source:'gestionale/dati',
      data:snap.data()
    };
    const ts=new Date().toISOString().replace(/[:.]/g,'-');
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='backup-gestionale-'+ts+'.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    if(sync){sync.textContent='● Backup dati esportato';sync.className='status online'}
  }catch(e){
    if(sync)sync.textContent='Errore esportazione backup';
    alert('Errore esportazione backup: '+e.message);
  }finally{
    if(btn)btn.disabled=false;
  }
}
function install(){
  ['inspectBaselineBtn','cleanNovemberBaselineBtn'].forEach(id=>document.getElementById(id)?.remove());
  const gen=document.getElementById('generate');
  if(gen){
    let s=document.getElementById('saveStateBtn');
    if(!s){
      s=document.createElement('button');
      s.id='saveStateBtn';
      s.type='button';
      s.textContent='SALVA STATO';
      s.className='adminOnly';
      gen.insertAdjacentElement('afterend',s);
    }
    if(s.dataset.bound!=='1'){
      s.dataset.bound='1';
      s.addEventListener('click',saveVisibleState);
    }
    if(gen.classList.contains('hidden'))s.classList.add('hidden');else s.classList.remove('hidden');
    let eBtn=document.getElementById('emptyMonthBtn');
    if(!eBtn){
      eBtn=document.createElement('button');
      eBtn.id='emptyMonthBtn';
      eBtn.type='button';
      eBtn.textContent='SVUOTA MESE';
      eBtn.className='adminOnly';
      eBtn.style.cssText='background:#facc15!important;border-color:#eab308!important;color:#713f12!important;font-weight:800!important;box-shadow:0 2px 5px #a1620744!important';
      const clear=document.getElementById('clearDraft');
      if(clear)clear.insertAdjacentElement('beforebegin',eBtn);else s.insertAdjacentElement('afterend',eBtn);
    }
    if(eBtn.dataset.bound!=='1'){
      eBtn.dataset.bound='1';
      eBtn.addEventListener('click',emptyCurrentMonth);
    }
    if(gen.classList.contains('hidden'))eBtn.classList.add('hidden');else eBtn.classList.remove('hidden');
    let b=document.getElementById('exportDataBackupBtn');
    if(!b){
      b=document.createElement('button');
      b.id='exportDataBackupBtn';
      b.type='button';
      b.textContent='ESPORTA BACKUP DATI';
      b.className='adminOnly';
    }
    const excel=document.getElementById('exportExcelBtn');
    if(excel&&b.previousElementSibling!==excel)excel.insertAdjacentElement('afterend',b);
    if(b.dataset.bound!=='1'){
      b.dataset.bound='1';
      b.addEventListener('click',exportDataBackup);
    }
  }
  paintHolidays();
}
document.getElementById('month')?.addEventListener('change',e=>{const m=e.target.value;if(!m)return;localStorage.setItem('turniLastMonth',m);setTimeout(()=>location.reload(),80)},true);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();setTimeout(install,500);setTimeout(install,1500);setTimeout(install,3000);setInterval(install,5000);setTimeout(paintHolidays,2500);
