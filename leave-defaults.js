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

// Unico gestore di "Cancella bozza". Il bottone viene clonato per rimuovere
// tutti i vecchi onclick/listener installati dagli altri moduli.
async function clearAutomaticDraft(e){
  e.preventDefault();e.stopImmediatePropagation();
  const month=document.getElementById('month')?.value;if(!month)return;
  if(!confirm(`Cancellare la bozza automatica di ${month}? I turni manuali resteranno invariati.`))return;

  // Lascia terminare un eventuale salvataggio manuale appena avviato.
  await new Promise(r=>setTimeout(r,400));
  const snap=await getDoc(root),x=snap.exists()?snap.data():{};
  const schedule={...(x.schedule||{})},manual=new Set(x.manualKeys||[]),generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]);
  const autoSvc=new Set(['disp1','disp2','gessi','gessirep','reparto','amb','op1','op2','oppom']);
  const manualDoctors=new Set(['PINI','LONDEI','ARMATO']);
  let removed=0;

  for(const[k,n]of Object.entries(schedule)){
    if(!k.startsWith(month+'-')||manual.has(k)||manualDoctors.has(n))continue;
    const[ds,s]=k.split('|'),w=new Date(ds+'T12:00:00').getDay();
    if(w!==0&&w!==6&&autoSvc.has(s)){
      delete schedule[k];generated.delete(k);extra.delete(k);removed++;
    }
  }
  for(const k of [...generated])if(k.startsWith(month+'-'))generated.delete(k);
  for(const k of [...extra])if(k.startsWith(month+'-'))extra.delete(k);

  const sync=document.getElementById('sync');
  try{
    if(sync)sync.textContent='Cancellazione…';
    await updateDoc(root,{schedule,generatedKeys:[...generated],extraKeys:[...extra],manualKeys:[...manual],updatedAt:new Date().toISOString()});

    // Aggiorna subito la griglia senza generare eventi change/salvataggi concorrenti.
    document.querySelectorAll('#schedule select[data-k]').forEach(s=>{
      const k=s.dataset.k;if(!k?.startsWith(month+'-'))return;
      const v=schedule[k];
      if(v!==undefined)s.value=v;
      else if(k.includes('|ferie|')||(/\|(gessi|amb)\|1$/.test(k)))s.value='NESSUNO';
      else s.value='';
      s.classList.remove('extraShift');
    });
    if(sync){sync.textContent='● Salvato online';sync.className='status online'}
    alert(`Bozza ${month} cancellata. Rimossi ${removed} turni automatici. I turni manuali sono stati conservati.`);
  }catch(err){
    if(sync)sync.textContent='Errore cancellazione';
    alert('Errore durante la cancellazione: '+err.message);
  }
}

function installAuthoritativeClear(){
  const old=document.getElementById('clearDraft');if(!old||old.dataset.authoritativeClear)return;
  const b=old.cloneNode(true);
  b.dataset.authoritativeClear='1';
  b.onclick=null;
  old.replaceWith(b);
  b.addEventListener('click',clearAutomaticDraft);
}
function startLeaveDefaults(){
  applyLeaveDefaults();installAuthoritativeClear();
  const schedule=document.getElementById('schedule');
  if(schedule)new MutationObserver(()=>applyLeaveDefaults()).observe(schedule,{childList:true,subtree:true});
  document.getElementById('month')?.addEventListener('change',()=>setTimeout(applyLeaveDefaults,100));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLeaveDefaults);else startLeaveDefaults();
setTimeout(()=>{applyLeaveDefaults();installAuthoritativeClear()},400);
setTimeout(()=>{applyLeaveDefaults();installAuthoritativeClear()},1200);
