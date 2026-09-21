import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,updateDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');

// FERIE-VARIE, GUARDIA NOTTURNA e GIORNO: le caselle vuote mostrano NESSUNO di default.
function applyManualDefaults(){
  document.querySelectorAll('#schedule select[data-k]').forEach(s=>{
    const k=s.dataset.k||'';
    if(!(k.includes('|ferie|')||k.includes('|guardia|')||k.includes('|giorno|')))return;
    if(![...s.options].some(o=>o.value==='NESSUNO')){
      const o=document.createElement('option');o.value='NESSUNO';o.textContent='NESSUNO';s.insertBefore(o,s.options[1]||null);
    }
    if(!s.value)s.value='NESSUNO';
  });
}

// Unico gestore di "Cancella bozza". I medici di categoria Contratto sono sempre manuali.
async function clearAutomaticDraft(e){
  e.preventDefault();e.stopImmediatePropagation();
  const month=document.getElementById('month')?.value;if(!month)return;
  if(!confirm(`Cancellare la bozza automatica di ${month}? I turni manuali e quelli dei medici a contratto resteranno invariati.`))return;
  await new Promise(r=>setTimeout(r,400));
  const snap=await getDoc(root),x=snap.exists()?snap.data():{};
  const schedule={...(x.schedule||{})},manual=new Set(x.manualKeys||[]),generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]);
  const contractDoctors=new Set((x.doctors||[]).filter(d=>d.active&&d.cat==='Contratto').map(d=>d.name));
  const autoSvc=new Set(['disp1','disp2','gessi','gessirep','reparto','amb','op1','op2','oppom']);
  let removed=0;
  for(const[k,n]of Object.entries(schedule)){
    if(!k.startsWith(month+'-')||manual.has(k)||contractDoctors.has(n))continue;
    const[ds,s]=k.split('|'),w=new Date(ds+'T12:00:00').getDay();
    if(w!==0&&w!==6&&autoSvc.has(s)){delete schedule[k];generated.delete(k);extra.delete(k);removed++}
  }
  for(const k of [...generated])if(k.startsWith(month+'-'))generated.delete(k);
  for(const k of [...extra])if(k.startsWith(month+'-'))extra.delete(k);
  const sync=document.getElementById('sync');
  try{
    if(sync)sync.textContent='Cancellazione…';
    await updateDoc(root,{schedule,generatedKeys:[...generated],extraKeys:[...extra],manualKeys:[...manual],updatedAt:new Date().toISOString()});
    document.querySelectorAll('#schedule select[data-k]').forEach(s=>{
      const k=s.dataset.k;if(!k?.startsWith(month+'-'))return;
      const v=schedule[k];if(v!==undefined)s.value=v;else if(k.includes('|ferie|')||k.includes('|guardia|')||k.includes('|giorno|')||(/\|(gessi|amb)\|1$/.test(k)))s.value='NESSUNO';else s.value='';s.classList.remove('extraShift');
    });
    applyManualDefaults();
    if(sync){sync.textContent='● Salvato online';sync.className='status online'}
    alert(`Bozza ${month} cancellata. Rimossi ${removed} turni automatici. I turni manuali e dei medici a contratto sono stati conservati.`);
  }catch(err){if(sync)sync.textContent='Errore cancellazione';alert('Errore durante la cancellazione: '+err.message)}
}
function installAuthoritativeClear(){const old=document.getElementById('clearDraft');if(!old||old.dataset.authoritativeClear)return;const b=old.cloneNode(true);b.dataset.authoritativeClear='1';b.onclick=null;old.replaceWith(b);b.addEventListener('click',clearAutomaticDraft)}
function startLeaveDefaults(){applyManualDefaults();installAuthoritativeClear();const schedule=document.getElementById('schedule');if(schedule)new MutationObserver(()=>applyManualDefaults()).observe(schedule,{childList:true,subtree:true});document.getElementById('month')?.addEventListener('change',()=>setTimeout(applyManualDefaults,100))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLeaveDefaults);else startLeaveDefaults();
setTimeout(()=>{applyManualDefaults();installAuthoritativeClear()},400);setTimeout(()=>{applyManualDefaults();installAuthoritativeClear()},1200);
