import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,updateDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');

// Gestore autorevole: intercetta Cancella bozza prima di QUALSIASI handler del bottone.
// Cancella esclusivamente le chiavi realmente presenti in generatedKeys.
async function clearOnlyGenerated(e){
  const b=e.target.closest?.('#clearDraft');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const m=$('month')?.value;if(!m)return;
  if(!confirm(`Cancellare solo i turni generati automaticamente di ${m}? Tutti i turni manuali resteranno invariati.`))return;
  await new Promise(r=>setTimeout(r,450));
  const snap=await getDoc(root),x=snap.exists()?snap.data():{};
  const schedule={...(x.schedule||{})},generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]),manual=new Set(x.manualKeys||[]);
  const contracts=new Set((x.doctors||[]).filter(d=>d.active&&d.cat==='Contratto').map(d=>d.name));
  let removed=0;
  for(const k of [...generated]){
    if(!k.startsWith(m+'-'))continue;
    // Una chiave divenuta manuale o assegnata a un medico a contratto non va mai cancellata.
    if(manual.has(k)||contracts.has(schedule[k])){generated.delete(k);extra.delete(k);continue}
    if(Object.prototype.hasOwnProperty.call(schedule,k)){delete schedule[k];removed++}
    generated.delete(k);extra.delete(k);
  }
  for(const k of [...extra])if(k.startsWith(m+'-')&&!generated.has(k))extra.delete(k);
  const sync=$('sync');
  try{
    if(sync)sync.textContent='Cancellazione…';
    await updateDoc(root,{schedule,generatedKeys:[...generated],extraKeys:[...extra],manualKeys:[...manual],updatedAt:new Date().toISOString()});
    if(sync){sync.textContent='● Salvato online';sync.className='status online'}
    alert(`Bozza ${m} cancellata. Rimossi ${removed} turni generati automaticamente. Nessun turno manuale è stato modificato.`);
    location.reload();
  }catch(err){if(sync)sync.textContent='Errore cancellazione';alert('Errore durante la cancellazione: '+err.message)}
}

// Document capture viene eseguito prima dei listener installati direttamente sul bottone.
document.addEventListener('click',clearOnlyGenerated,true);
