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
  for(const k of Object.keys(schedule))if(k.startsWith(month+'-'))delete schedule[k];
  document.querySelectorAll('#schedule select[data-k]').forEach(s=>{
   const k=s.dataset.k;
   if(k?.startsWith(month+'-')&&s.value)schedule[k]=s.value;
  });
  await setDoc(root,{schedule,updatedAt:new Date().toISOString()},{merge:true});
  if(sync){sync.textContent='● Stato '+monthLabel(month)+' salvato';sync.className='status online'}
 }catch(err){if(sync)sync.textContent='Errore salvataggio stato';alert('Errore durante il salvataggio: '+err.message)}finally{busy=false;if(b)b.disabled=false}
}

function install(){
 const gen=document.getElementById('generate');if(!gen)return;
 let b=document.getElementById('saveStateBtn');
 if(!b){b=document.createElement('button');b.id='saveStateBtn';b.type='button';b.textContent='SALVA STATO';b.className='adminOnly';gen.insertAdjacentElement('afterend',b)}
 if(b.dataset.saveStateBound!=='1'){
  b.dataset.saveStateBound='1';
  b.addEventListener('click',saveVisibleState);
 }
}

document.getElementById('month')?.addEventListener('change',e=>{
 const m=e.target.value;if(!m)return;localStorage.setItem('turniLastMonth',m);setTimeout(()=>location.reload(),80)
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();setTimeout(install,500);setTimeout(install,1500);
