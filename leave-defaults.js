import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,updateDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');
function applyManualDefaults(){document.querySelectorAll('#schedule select[data-k]').forEach(s=>{const k=s.dataset.k||'';if(!(k.includes('|ferie|')||k.includes('|guardia|')||k.includes('|giorno|')))return;if(![...s.options].some(o=>o.value==='NESSUNO')){const o=document.createElement('option');o.value='NESSUNO';o.textContent='NESSUNO';s.insertBefore(o,s.options[1]||null)}if(!s.value&&k.includes('|ferie|'))s.value='NESSUNO'})}
async function clearAutomaticDraft(e){
  e.preventDefault();
  e.stopImmediatePropagation();
  const month=document.getElementById('month')?.value;
  if(!month)return;

  // Attende eventuali autosalvataggi e poi legge SEMPRE lo stato corrente da Firestore.
  await new Promise(r=>setTimeout(r,450));
  const [snap,stateSnap]=await Promise.all([
    getDoc(root),
    getDoc(doc(db,'gestionale','state-'+month))
  ]);
  const x=snap.exists()?snap.data():{};
  const monthState=stateSnap.exists()?stateSnap.data():null;
  const legacyBaseline=x.savedStates?.[month];
  const baseline=monthState?.baseline??legacyBaseline;
  const hasBaseline=stateSnap.exists()||legacyBaseline!==undefined;

  if(!confirm(hasBaseline
    ?`Cancellare la bozza automatica di ${month}? Verrà ripristinato ESATTAMENTE l'ultimo SALVA STATO, mantenendo le assenze correnti.`
    :`Cancellare la bozza automatica di ${month}? Non esiste un SALVA STATO: verranno rimossi soltanto i turni marcati come generati automaticamente.`))return;

  const schedule={...(x.schedule||{})},
    generated=new Set(x.generatedKeys||[]),
    extra=new Set(x.extraKeys||[]),
    unresolved=new Set(x.unresolvedKeys||[]),
    manual=new Set(x.manualKeys||[]),
    opened=new Set(x.openedStructuralKeys||[]),
    doctors=x.doctors||[],
    contracts=new Set(doctors.filter(d=>d?.cat==='Contratto').map(d=>d.name));

  if(hasBaseline){
    // SALVA STATO è il riferimento assoluto: tutto il mese torna a quel baseline.
    for(const k of Object.keys(schedule))if(k.startsWith(month+'-'))delete schedule[k];
    for(const [k,v] of Object.entries(baseline||{}))if(k.startsWith(month+'-'))schedule[k]=v;

    // Ripristina anche le celle strutturalmente aperte/vuote registrate con SALVA STATO.
    const savedOpened=monthState?.opened??x.savedOpenedStates?.[month];
    if(Array.isArray(savedOpened)){
      for(const k of [...opened])if(k.startsWith(month+'-'))opened.delete(k);
      for(const k of savedOpened)if(k.startsWith(month+'-'))opened.add(k);
    }
    for(const k of opened)if(k.startsWith(month+'-')){
      delete schedule[k];
      manual.delete(k);
    }

    // Tutte le celle del baseline sono consolidate come manuali/protette.
    for(const k of Object.keys(baseline||{}))if(k.startsWith(month+'-'))manual.add(k);
  }else{
    // Senza SALVA STATO, elimina esclusivamente ciò che è marcato come generato.
    for(const k of [...generated]){
      if(k.startsWith(month+'-')&&!manual.has(k)&&!contracts.has(schedule[k]))delete schedule[k];
    }
    for(const k of [...extra]){
      if(k.startsWith(month+'-')&&!manual.has(k)&&!contracts.has(schedule[k]))delete schedule[k];
    }
  }

  // FERIE/ASSENZE vengono sempre ricostruite dall'archivio corrente.
  for(const k of Object.keys(schedule))if(k.startsWith(month+'-')&&k.includes('|ferie|'))delete schedule[k];
  const absence=x.absenceManagement||{},byDate={};
  for(const [n,dates] of Object.entries(absence)){
    for(const date of dates||[]){
      if(!date.startsWith(month+'-'))continue;
      byDate[date]??=[];
      if(!byDate[date].includes(n))byDate[date].push(n);
    }
  }
  for(const [date,names] of Object.entries(byDate)){
    names.slice(0,4).forEach((n,i)=>schedule[date+'|ferie|'+i]=n);
  }

  for(const set of [generated,extra,unresolved]){
    for(const k of [...set])if(k.startsWith(month+'-'))set.delete(k);
  }

  localStorage.setItem('turniLastMonth',month);
  const sync=document.getElementById('sync');
  try{
    if(sync)sync.textContent=hasBaseline?'Ripristino SALVA STATO…':'Cancellazione bozza…';
    await updateDoc(root,{
      schedule,
      generatedKeys:[...generated],
      extraKeys:[...extra],
      unresolvedKeys:[...unresolved],
      manualKeys:[...manual],
      openedStructuralKeys:[...opened],
      updatedAt:new Date().toISOString()
    });
    if(sync){
      sync.textContent=hasBaseline?'● SALVA STATO ripristinato':'● Bozza automatica cancellata';
      sync.className='status online';
    }
    alert(hasBaseline
      ?`Bozza ${month} cancellata. Ripristinato esattamente l'ultimo SALVA STATO con le assenze correnti.`
      :`Bozza ${month} cancellata. Rimossi soltanto i turni generati automaticamente.`);
    location.reload();
  }catch(err){
    if(sync)sync.textContent='Errore cancellazione';
    alert('Errore durante la cancellazione: '+err.message);
  }
}
function installAuthoritativeClear(){const old=document.getElementById('clearDraft');if(!old||old.dataset.authoritativeClear)return;const b=old.cloneNode(true);b.dataset.authoritativeClear='1';b.onclick=null;old.replaceWith(b);b.addEventListener('click',clearAutomaticDraft)}
function startLeaveDefaults(){applyManualDefaults();installAuthoritativeClear();const schedule=document.getElementById('schedule');if(schedule)new MutationObserver(()=>applyManualDefaults()).observe(schedule,{childList:true,subtree:true});document.getElementById('month')?.addEventListener('change',()=>setTimeout(applyManualDefaults,100))}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLeaveDefaults);else startLeaveDefaults();setTimeout(()=>{applyManualDefaults();installAuthoritativeClear()},400);setTimeout(()=>{applyManualDefaults();installAuthoritativeClear()},1200);