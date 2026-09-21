import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const cfg=await(await fetch('/__/firebase/init.json')).json();
const fb=getApps()[0]||initializeApp(cfg);
const db=getFirestore(fb);
const root=doc(db,'gestionale','dati');
const pending=new Map();

// Regola generale:
// - valore vuoto "" = casella vergine: nessun valore salvato, nessuna protezione manuale;
// - NESSUNO = scelta manuale esplicita e quindi resta protetta;
// - medico = scelta manuale e quindi resta protetta.
async function makeVirgin(k){
  const snap=await getDoc(root),x=snap.exists()?snap.data():{};
  const schedule={...(x.schedule||{})};
  const manual=new Set(x.manualKeys||[]);
  const generated=new Set(x.generatedKeys||[]);
  const extra=new Set(x.extraKeys||[]);
  delete schedule[k];
  manual.delete(k);
  generated.delete(k);
  extra.delete(k);
  await setDoc(root,{schedule,manualKeys:[...manual],generatedKeys:[...generated],extraKeys:[...extra],updatedAt:new Date().toISOString()},{merge:true});
  const sync=document.getElementById('sync');
  if(sync){sync.textContent='● Salvato online';sync.className='status online'}
}

// Intercetta anche gli eventi ferie che altri moduli fermano sul contenitore schedule.
document.addEventListener('change',e=>{
  const s=e.target;
  if(!(s instanceof HTMLSelectElement)||!s.dataset.k)return;
  const k=s.dataset.k;
  const old=pending.get(k);if(old)clearTimeout(old);
  if(s.value!==''){pending.delete(k);return}
  // Esegui dopo gli handler esistenti: l'ultimo stato (vuoto) è autorevole.
  const t=setTimeout(()=>{
    pending.delete(k);
    // Se nel frattempo l'utente ha scelto altro, non cancellare nulla.
    const current=document.querySelector(`#schedule select[data-k="${CSS.escape(k)}"]`);
    if(current&&current.value==='')makeVirgin(k).catch(()=>{const sync=document.getElementById('sync');if(sync)sync.textContent='Errore salvataggio'})
  },350);
  pending.set(k,t);
},true);
