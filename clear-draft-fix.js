import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,updateDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');

// Gestore autorevole di Cancella bozza.
// La griglia visibile e' la fonte autorevole per i campi manuali: in questo modo
// un vecchio valore rimasto nel cloud non puo' ricomparire dopo la cancellazione.
async function clearOnlyGenerated(e){
  const b=e.target.closest?.('#clearDraft');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const m=$('month')?.value;if(!m)return;
  if(!confirm(`Cancellare solo i turni generati automaticamente di ${m}? Tutti i turni manuali resteranno invariati.`))return;

  // Fotografa PRIMA la griglia corrente. Serve anche a conservare correttamente un
  // campo manuale svuotato (es. GIORNO): il vecchio valore cloud viene eliminato.
  const visible=new Map();
  document.querySelectorAll('#schedule select[data-k]').forEach(s=>{
    const k=s.dataset.k;if(k?.startsWith(m+'-'))visible.set(k,s.value||'');
  });

  await new Promise(r=>setTimeout(r,450));
  const snap=await getDoc(root),x=snap.exists()?snap.data():{};
  const schedule={...(x.schedule||{})},generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]),manual=new Set(x.manualKeys||[]);
  const contracts=new Set((x.doctors||[]).filter(d=>d.active&&d.cat==='Contratto').map(d=>d.name));
  const alwaysManual=new Set(['guardia','giorno','esami','ferie']);

  // Sincronizza dal DOM tutti i campi che devono essere preservati manualmente.
  for(const[k,v]of visible){
    const parts=k.split('|'),svc=parts[1],day=new Date(parts[0]+'T12:00:00').getDay();
    const isManual=manual.has(k)||alwaysManual.has(svc)||day===0||day===6||contracts.has(v);
    if(!isManual)continue;
    if(v&&v!=='NESSUNO')schedule[k]=v;else delete schedule[k];
    generated.delete(k);extra.delete(k);
    if(!k.includes('|ferie|'))manual.add(k);
  }

  let removed=0;
  for(const k of [...generated]){
    if(!k.startsWith(m+'-'))continue;
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

document.addEventListener('click',clearOnlyGenerated,true);
