import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');
let busy=false;

function monthLabel(m){const[y,mo]=m.split('-');return`${mo}/${y}`}

async function saveVisibleState(){
 if(busy)return;const month=document.getElementById('month')?.value;if(!month)return;
 busy=true;const b=document.getElementById('saveStateBtn'),sync=document.getElementById('sync');
 try{
  if(b)b.disabled=true;if(sync)sync.textContent='Salvataggio stato…';
  const snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule={...(x.schedule||{})};
  // Il mese visibile diventa autorevole: prima elimina dal cloud tutte le sue caselle,
  // poi riscrive soltanto i valori realmente presenti nella griglia.
  for(const k of Object.keys(schedule))if(k.startsWith(month+'-'))delete schedule[k];
  document.querySelectorAll('#schedule select[data-k]').forEach(s=>{const k=s.dataset.k;if(k?.startsWith(month+'-')&&s.value&&s.value!=='NESSUNO')schedule[k]=s.value});
  await setDoc(root,{schedule,updatedAt:new Date().toISOString()},{merge:true});
  if(sync){sync.textContent='● Stato '+monthLabel(month)+' salvato';sync.className='status online'}
 }catch(err){if(sync)sync.textContent='Errore salvataggio stato';alert('Errore durante il salvataggio: '+err.message)}finally{busy=false;if(b)b.disabled=false}
}

function install(){
 const gen=document.getElementById('generate');if(!gen||document.getElementById('saveStateBtn'))return;
 const b=document.createElement('button');b.id='saveStateBtn';b.type='button';b.textContent='SALVA STATO';b.className='adminOnly';b.onclick=saveVisibleState;gen.insertAdjacentElement('afterend',b);
}

// Correzione del problema di stato locale: quando si cambia mese ricarica la pagina
// dopo aver memorizzato il mese scelto. app.js riparte quindi sempre dallo stato cloud,
// senza poter ridisegnare una vecchia bozza rimasta in memoria.
document.getElementById('month')?.addEventListener('change',e=>{
 if(sessionStorage.getItem('monthCloudReload')==='1'){sessionStorage.removeItem('monthCloudReload');return}
 const m=e.target.value;if(!m)return;localStorage.setItem('turniMonth',m);sessionStorage.setItem('monthCloudReload','1');setTimeout(()=>location.reload(),80)
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();setTimeout(install,500);setTimeout(install,1500);
