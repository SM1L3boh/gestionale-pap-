import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,updateDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');

// FERIE-VARIE: tutte le caselle vuote mostrano NESSUNO di default.
function applyLeaveDefaults(){
  document.querySelectorAll('#schedule select[data-k*="|ferie|"]').forEach(s=>{
    if(![...s.options].some(o=>o.value==='NESSUNO')){
      const o=document.createElement('option');o.value='NESSUNO';o.textContent='NESSUNO';s.insertBefore(o,s.options[1]||null);
    }
    if(!s.value)s.value='NESSUNO';
  });
}
async function clearOnlyGenerated(e){
  e.preventDefault();e.stopImmediatePropagation();
  const month=document.getElementById('month')?.value;if(!month)return;
  if(!confirm(`Cancellare solo i turni generati automaticamente di ${month}? Tutti i turni inseriti o modificati manualmente resteranno invariati.`))return;
  const snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule={...(x.schedule||{})},generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]);let removed=0;
  for(const k of [...generated]){
    if(!k.startsWith(month+'-'))continue;
    if(Object.prototype.hasOwnProperty.call(schedule,k)){delete schedule[k];removed++}
    generated.delete(k);extra.delete(k);
  }
  for(const k of [...extra])if(k.startsWith(month+'-'))extra.delete(k);
  const sync=document.getElementById('sync');
  try{
    if(sync)sync.textContent='Cancellazione…';
    await updateDoc(root,{schedule,generatedKeys:[...generated],extraKeys:[...extra],updatedAt:new Date().toISOString()});
    if(sync){sync.textContent='● Salvato online';sync.className='status online'}
    alert(`Bozza ${month} cancellata. Rimossi ${removed} turni generati automaticamente. I turni manuali sono stati conservati.`);
    location.reload();
  }catch(err){if(sync)sync.textContent='Errore cancellazione';alert('Errore durante la cancellazione: '+err.message)}
}
function installSafeClear(){const b=document.getElementById('clearDraft');if(!b||b.dataset.manualSafe)return;b.dataset.manualSafe='1';b.addEventListener('click',clearOnlyGenerated,true)}
function startLeaveDefaults(){
  applyLeaveDefaults();installSafeClear();
  const schedule=document.getElementById('schedule');
  if(schedule)new MutationObserver(()=>{applyLeaveDefaults();installSafeClear()}).observe(schedule,{childList:true,subtree:true});
  document.getElementById('month')?.addEventListener('change',()=>setTimeout(applyLeaveDefaults,100));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLeaveDefaults);else startLeaveDefaults();
setTimeout(()=>{applyLeaveDefaults();installSafeClear()},400);setTimeout(()=>{applyLeaveDefaults();installSafeClear()},1200);
