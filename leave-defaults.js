import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,updateDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');
function applyManualDefaults(){document.querySelectorAll('#schedule select[data-k]').forEach(s=>{const k=s.dataset.k||'';if(!(k.includes('|ferie|')||k.includes('|guardia|')||k.includes('|giorno|')))return;if(![...s.options].some(o=>o.value==='NESSUNO')){const o=document.createElement('option');o.value='NESSUNO';o.textContent='NESSUNO';s.insertBefore(o,s.options[1]||null)}if(!s.value&&k.includes('|ferie|'))s.value='NESSUNO'})}
async function clearAutomaticDraft(e){
  e.preventDefault();
  e.stopImmediatePropagation();
  const month=document.getElementById('month')?.value;
  if(!month)return;

  await new Promise(r=>setTimeout(r,450));
  const [snap,stateSnap]=await Promise.all([
    getDoc(root),
    getDoc(doc(db,'gestionale','state-'+month))
  ]);
  const x=snap.exists()?snap.data():{};
  const monthState=stateSnap.exists()?stateSnap.data():null;
  const legacyBaseline=x.savedStates?.[month];

  const exactSchedule=monthState?.scheduleMonth&&typeof monthState.scheduleMonth==='object'
    ?monthState.scheduleMonth
    :null;
  const baseline=monthState?.baseline??legacyBaseline;
  const hasSavedState=!!exactSchedule||stateSnap.exists()||legacyBaseline!==undefined;

  if(!confirm(hasSavedState
    ?`Cancellare la bozza automatica di ${month}? Verrà ripristinato ESATTAMENTE l'ultimo SALVA STATO del mese.`
    :`Cancellare la bozza automatica di ${month}? Non esiste un SALVA STATO: verranno rimossi soltanto i turni marcati come generati automaticamente.`))return;

  const schedule={...(x.schedule||{})},
    generated=new Set(x.generatedKeys||[]),
    extra=new Set(x.extraKeys||[]),
    unresolved=new Set(x.unresolvedKeys||[]),
    manual=new Set(x.manualKeys||[]),
    opened=new Set(x.openedStructuralKeys||[]),
    doctors=x.doctors||[],
    contracts=new Set(doctors.filter(d=>d?.cat==='Contratto').map(d=>d.name));

  const replaceMonthSet=(target,saved=[])=>{
    for(const k of [...target])if(k.startsWith(month+'-'))target.delete(k);
    for(const k of saved||[])if(String(k).startsWith(month+'-'))target.add(k);
  };

  if(hasSavedState){
    // Rollback puro: nessuna ricostruzione, nessun merge con ferie/assenze correnti.
    for(const k of Object.keys(schedule))if(k.startsWith(month+'-'))delete schedule[k];

    if(exactSchedule){
      for(const [k,v] of Object.entries(exactSchedule))if(k.startsWith(month+'-'))schedule[k]=v;
      replaceMonthSet(manual,monthState.manualMonth||Object.keys(exactSchedule));
      replaceMonthSet(generated,monthState.generatedMonth||[]);
      replaceMonthSet(extra,monthState.extraMonth||[]);
      replaceMonthSet(unresolved,monthState.unresolvedMonth||[]);
      replaceMonthSet(opened,monthState.opened||[]);
    }else{
      for(const [k,v] of Object.entries(baseline||{}))if(k.startsWith(month+'-'))schedule[k]=v;
      const savedOpened=monthState?.opened??x.savedOpenedStates?.[month]??[];
      replaceMonthSet(opened,savedOpened);
      for(const k of opened)if(k.startsWith(month+'-'))delete schedule[k];
      replaceMonthSet(manual,Object.keys(baseline||{}));
      replaceMonthSet(generated,[]);
      replaceMonthSet(extra,[]);
      replaceMonthSet(unresolved,[]);
    }
  }else{
    // Senza SALVA STATO: rimuove soltanto ciò che il generatore ha marcato come bozza.
    for(const k of [...generated]){
      if(k.startsWith(month+'-')&&!manual.has(k)&&!contracts.has(schedule[k]))delete schedule[k];
    }
    for(const k of [...extra]){
      if(k.startsWith(month+'-')&&!manual.has(k)&&!contracts.has(schedule[k]))delete schedule[k];
    }
    replaceMonthSet(generated,[]);
    replaceMonthSet(extra,[]);
    replaceMonthSet(unresolved,[]);
  }

  localStorage.setItem('turniLastMonth',month);
  const sync=document.getElementById('sync');
  try{
    if(sync)sync.textContent=hasSavedState?'Ripristino SALVA STATO…':'Cancellazione bozza…';
    await updateDoc(root,{
      schedule,
      generatedKeys:[...generated],
      extraKeys:[...extra],
      unresolvedKeys:[...unresolved],
      manualKeys:[...manual],
      openedStructuralKeys:[...opened],
      updatedAt:new Date().toISOString()
    });

    // Verifica post-write: il mese deve coincidere con lo snapshot salvato.
    if(hasSavedState){
      const verifySnap=await getDoc(root),verify=verifySnap.exists()?verifySnap.data():{},verifyMonth=Object.fromEntries(Object.entries(verify.schedule||{}).filter(([k])=>k.startsWith(month+'-')));
      const expected=exactSchedule
        ?Object.fromEntries(Object.entries(exactSchedule).filter(([k])=>k.startsWith(month+'-')))
        :Object.fromEntries(Object.entries(baseline||{}).filter(([k])=>k.startsWith(month+'-')&&!opened.has(k)));
      if(JSON.stringify(verifyMonth)!==JSON.stringify(expected)){
        throw new Error('verifica fallita: il mese non coincide con l’ultimo SALVA STATO');
      }
    }

    if(sync){
      sync.textContent=hasSavedState?'● SALVA STATO ripristinato':'● Bozza automatica cancellata';
      sync.className='status online';
    }
    alert(hasSavedState
      ?`Bozza ${month} cancellata. Ripristinato esattamente l'ultimo SALVA STATO.`
      :`Bozza ${month} cancellata. Rimossi soltanto i turni generati automaticamente.`);
    location.reload();
  }catch(err){
    if(sync)sync.textContent='Errore cancellazione';
    alert('Errore durante la cancellazione: '+err.message);
  }
}
function installAuthoritativeClear(){const old=document.getElementById('clearDraft');if(!old||old.dataset.authoritativeClear)return;const b=old.cloneNode(true);b.dataset.authoritativeClear='1';b.onclick=null;old.replaceWith(b);b.addEventListener('click',clearAutomaticDraft)}
function startLeaveDefaults(){applyManualDefaults();installAuthoritativeClear();const schedule=document.getElementById('schedule');if(schedule)new MutationObserver(()=>applyManualDefaults()).observe(schedule,{childList:true,subtree:true});document.getElementById('month')?.addEventListener('change',()=>setTimeout(applyManualDefaults,100))}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLeaveDefaults);else startLeaveDefaults();setTimeout(()=>{applyManualDefaults();installAuthoritativeClear()},400);setTimeout(()=>{applyManualDefaults();installAuthoritativeClear()},1200);