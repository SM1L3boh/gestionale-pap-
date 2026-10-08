import{getApps,initializeApp}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const MARKER='oct2026RecoveryV2';
const MONTHS=['2026-10'];
const PAYLOAD_GZIP_B64='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';

async function decodePayload(){
  const bin=Uint8Array.from(atob(PAYLOAD_GZIP_B64),c=>c.charCodeAt(0));
  const stream=new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
const stripMonths=arr=>(arr||[]).filter(k=>!MONTHS.some(m=>String(k).startsWith(m+'-')));

const cfg=await(await fetch('/__/firebase/init.json')).json(),
  fb=getApps()[0]||initializeApp(cfg),
  auth=getAuth(fb),
  db=getFirestore(fb),
  root=doc(db,'gestionale','dati');

onAuthStateChanged(auth,async user=>{
  if(!user)return;
  try{
    const ps=await getDoc(doc(db,'users',user.uid)),profile=ps.exists()?ps.data():{};
    if(profile.role!=='admin')return;

    const snap=await getDoc(root),x=snap.exists()?snap.data():{};
    if(x[MARKER])return;

    const payload=await decodePayload();
    const schedule={...(x.schedule||{})};
    for(const k of Object.keys(schedule))if(MONTHS.some(m=>k.startsWith(m+'-')))delete schedule[k];

    for(const m of MONTHS)Object.assign(schedule,payload[m].schedule||{});

    const absenceManagement=structuredClone(x.absenceManagement||{});
    for(const n of Object.keys(absenceManagement)){
      absenceManagement[n]=(absenceManagement[n]||[]).filter(ds=>!MONTHS.some(m=>String(ds).startsWith(m+'-')));
    }
    for(const m of MONTHS){
      for(const[n,dates]of Object.entries(payload[m].absences||{})){
        absenceManagement[n]??=[];
        absenceManagement[n]=[...new Set([...absenceManagement[n],...dates])].sort();
      }
    }

    const manualKeys=new Set(stripMonths(x.manualKeys));
    for(const m of MONTHS)for(const k of Object.keys(payload[m].schedule||{}))if(!k.includes('|ferie|'))manualKeys.add(k);

    const savedStates={...(x.savedStates||{})};
    const savedAbsenceStates={...(x.savedAbsenceStates||{})};
    const savedOpenedStates={...(x.savedOpenedStates||{})};
    for(const m of MONTHS){
      savedStates[m]={...(payload[m].schedule||{})};
      savedAbsenceStates[m]=structuredClone(absenceManagement);
      savedOpenedStates[m]=[];
    }

    await setDoc(root,{
      schedule,
      absenceManagement,
      manualKeys:[...manualKeys],
      generatedKeys:stripMonths(x.generatedKeys),
      extraKeys:stripMonths(x.extraKeys),
      unresolvedKeys:stripMonths(x.unresolvedKeys),
      openedStructuralKeys:stripMonths(x.openedStructuralKeys),
      savedStates,
      savedAbsenceStates,
      savedOpenedStates,
      [MARKER]:true,
      sepOct2026ExcelReloadInfo:{
        source:'Turni Griglia 2026(2).xlsx / SET 26 + OTT 26',
        octoberScheduleCells:Object.keys(payload['2026-10'].schedule||{}).length,
        octoberAbsenceDoctorDays:Object.values(payload['2026-10'].absences||{}).reduce((q,a)=>q+a.length,0),
        importedAt:new Date().toISOString()
      },
      updatedAt:new Date().toISOString()
    },{merge:true});

    const verifySnap=await getDoc(root),verify=verifySnap.exists()?verifySnap.data():{},vs=verify.schedule||{};
    const checkMonth=m=>Object.entries(payload[m].schedule||{}).every(([k,v])=>vs[k]===v);
    if(!checkMonth('2026-10'))throw new Error('verifica finale dei turni non riuscita');

    alert('Ottobre 2026 ripristinato dal file Excel corretto. La pagina verrà ricaricata.');
    location.reload();
  }catch(err){
    console.error('Recupero ottobre 2026 fallito',err);
    alert('Errore nel recupero di ottobre 2026: '+err.message);
  }
});