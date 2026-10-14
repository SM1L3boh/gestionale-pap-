import{getApps,initializeApp}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const MARKER='nov2026AriannaManualImportV1';
const MONTH='2026-11';
const PAYLOAD={"schedule":{"2026-11-01|disp1|0":"LENTINI","2026-11-01|disp2|0":"CATALDI","2026-11-01|ferie|0":"FATTORETTO","2026-11-02|disp1|0":"DEI ROSSI","2026-11-02|disp2|0":"COMELATO","2026-11-02|gessi|0":"RIVA","2026-11-02|gessirep|0":"DEI ROSSI","2026-11-02|reparto|0":"CATALDI","2026-11-02|reparto|1":"CIPRIAN","2026-11-02|amb|0":"VIALE","2026-11-02|op1|0":"COMELATO","2026-11-02|op1|1":"FRANCO","2026-11-02|op2|0":"DEI ROSSI","2026-11-02|op2|1":"CALZAVARA","2026-11-02|oppom|0":"PINI","2026-11-02|oppom|1":"LENTINI","2026-11-02|ferie|0":"FATTORETTO","2026-11-03|disp1|0":"COMELATO","2026-11-03|disp2|0":"DEI ROSSI","2026-11-03|gessi|0":"CALZAVARA","2026-11-03|gessirep|0":"FRANCO","2026-11-03|reparto|0":"LENTINI","2026-11-03|reparto|1":"CIPRIAN","2026-11-03|amb|0":"RIVA","2026-11-03|op1|0":"PINI","2026-11-03|op1|1":"VIALE","2026-11-03|oppom|0":"DEI ROSSI","2026-11-03|oppom|1":"COMELATO","2026-11-03|ferie|0":"FATTORETTO","2026-11-03|ferie|1":"CATALDI","2026-11-04|guardia|0":"VIALE","2026-11-04|disp1|0":"CATALDI","2026-11-04|disp2|0":"LENTINI","2026-11-04|gessi|0":"RIVA","2026-11-04|gessirep|0":"COMELATO","2026-11-04|reparto|0":"CATALDI","2026-11-04|reparto|1":"CIPRIAN","2026-11-04|amb|0":"COMELATO","2026-11-04|op1|0":"PINI","2026-11-04|op1|1":"CALZAVARA","2026-11-04|op2|0":"DEI ROSSI","2026-11-04|op2|1":"FRANCO","2026-11-04|oppom|0":"LENTINI","2026-11-04|ferie|0":"FATTORETTO","2026-11-05|disp1|0":"DEI ROSSI","2026-11-05|disp2|0":"COMELATO","2026-11-05|gessi|0":"LONDEI","2026-11-05|gessirep|0":"DEI ROSSI","2026-11-05|reparto|0":"CATALDI","2026-11-05|reparto|1":"CIPRIAN","2026-11-05|amb|0":"FREGUIA","2026-11-05|op1|0":"PINI","2026-11-05|op1|1":"COMELATO","2026-11-05|op2|0":"FRANCO","2026-11-05|op2|1":"LENTINI","2026-11-05|oppom|0":"CALZAVARA","2026-11-05|oppom|1":"CATALDI","2026-11-05|ferie|0":"VIALE","2026-11-05|ferie|1":"FATTORETTO","2026-11-05|varie|0":"VIALE","2026-11-06|disp1|0":"COMELATO","2026-11-06|disp2|0":"DEI ROSSI","2026-11-06|gessi|0":"DEI ROSSI","2026-11-06|gessirep|0":"CALZAVARA","2026-11-06|reparto|0":"VIALE","2026-11-06|reparto|1":"CIPRIAN","2026-11-06|amb|0":"FREGUIA","2026-11-06|op1|0":"PINI","2026-11-06|op1|1":"CATALDI","2026-11-06|op2|0":"COMELATO","2026-11-06|op2|1":"FRANCO","2026-11-06|ferie|0":"LENTINI","2026-11-06|ferie|1":"FATTORETTO","2026-11-07|guardia|0":"CALZAVARA","2026-11-07|disp1|0":"FRANCO","2026-11-07|disp2|0":"VIALE","2026-11-07|ferie|0":"FATTORETTO","2026-11-08|giorno|0":"VIALE","2026-11-08|disp1|0":"VIALE","2026-11-08|disp2|0":"FRANCO","2026-11-08|ferie|0":"FATTORETTO","2026-11-08|varie|0":"CALZAVARA","2026-11-09|disp1|0":"VIALE","2026-11-09|disp2|0":"FRANCO","2026-11-09|gessi|0":"CATALDI","2026-11-09|gessirep|0":"COMELATO","2026-11-09|reparto|0":"FRANCO","2026-11-09|reparto|1":"CIPRIAN","2026-11-09|amb|0":"RIVA","2026-11-09|op1|0":"COMELATO","2026-11-09|op1|1":"CALZAVARA","2026-11-09|op2|0":"DEI ROSSI","2026-11-09|op2|1":"PINI","2026-11-09|oppom|0":"VIALE","2026-11-09|oppom|1":"CATALDI","2026-11-09|ferie|0":"LENTINI","2026-11-09|ferie|1":"FATTORETTO","2026-11-10|guardia|0":"COMELATO","2026-11-10|disp1|0":"FATTORETTO","2026-11-10|disp2|0":"CALZAVARA","2026-11-10|gessi|0":"RIVA","2026-11-10|gessirep|0":"LENTINI","2026-11-10|reparto|0":"FRANCO","2026-11-10|reparto|1":"CIPRIAN","2026-11-10|amb|0":"CALZAVARA","2026-11-10|op1|0":"PINI","2026-11-10|op1|1":"FATTORETTO","2026-11-10|oppom|0":"DEI ROSSI","2026-11-10|oppom|1":"CATALDI","2026-11-10|ferie|0":"VIALE","2026-11-10|ferie|1":"LENTINI","2026-11-11|disp1|0":"FRANCO","2026-11-11|disp2|0":"VIALE","2026-11-11|gessi|0":"CALZAVARA","2026-11-11|gessirep|0":"CALZAVARA","2026-11-11|reparto|0":"FRANCO","2026-11-11|reparto|1":"CIPRIAN","2026-11-11|amb|0":"RIVA","2026-11-11|op1|0":"VIALE","2026-11-11|op1|1":"CATALDI","2026-11-11|op2|0":"DEI ROSSI","2026-11-11|op2|1":"LENTINI","2026-11-11|oppom|0":"FATTORETTO","2026-11-11|ferie|0":"COMELATO","2026-11-11|varie|0":"COMELATO","2026-11-12|disp1|0":"CALZAVARA","2026-11-12|disp2|0":"FATTORETTO","2026-11-12|gessi|0":"LONDEI","2026-11-12|gessirep|0":"CATALDI","2026-11-12|reparto|0":"FRANCO","2026-11-12|reparto|1":"CIPRIAN","2026-11-12|amb|0":"FREGUIA","2026-11-12|amb|1":"VIALE","2026-11-12|op1|0":"COMELATO","2026-11-12|op1|1":"CALZAVARA","2026-11-12|op2|0":"FATTORETTO","2026-11-12|op2|1":"LENTINI","2026-11-12|oppom|0":"PINI","2026-11-12|oppom|1":"DEI ROSSI","2026-11-13|guardia|0":"FATTORETTO","2026-11-13|disp1|0":"VIALE","2026-11-13|disp2|0":"CALZAVARA","2026-11-13|gessi|0":"LENTINI","2026-11-13|gessirep|0":"VIALE","2026-11-13|reparto|0":"CATALDI","2026-11-13|reparto|1":"CIPRIAN","2026-11-13|amb|0":"FREGUIA","2026-11-13|amb|1":"LONDEI","2026-11-13|op1|0":"PINI","2026-11-13|op1|1":"DEI ROSSI","2026-11-13|op2|0":"COMELATO","2026-11-13|op2|1":"CALZAVARA","2026-11-13|ferie|0":"FRANCO","2026-11-14|giorno|0":"DEI ROSSI","2026-11-14|disp1|0":"DEI ROSSI","2026-11-14|disp2|0":"CATALDI","2026-11-14|varie|0":"FATTORETTO","2026-11-15|disp1|0":"CATALDI","2026-11-15|disp2|0":"DEI ROSSI","2026-11-16|guardia|0":"LENTINI","2026-11-16|disp1|0":"FRANCO","2026-11-16|disp2|0":"VIALE","2026-11-16|gessi|0":"RIVA","2026-11-16|gessirep|0":"DEI ROSSI","2026-11-16|reparto|0":"DEI ROSSI","2026-11-16|reparto|1":"CIPRIAN","2026-11-16|amb|0":"CALZAVARA","2026-11-16|op1|0":"VIALE","2026-11-16|op1|1":"CATALDI","2026-11-16|op2|0":"FRANCO","2026-11-16|op2|1":"FATTORETTO","2026-11-16|oppom|0":"PINI","2026-11-16|oppom|1":"COMELATO","2026-11-17|disp1|0":"VIALE","2026-11-17|disp2|0":"FRANCO","2026-11-17|gessi|0":"CALZAVARA","2026-11-17|gessirep|0":"FATTORETTO","2026-11-17|reparto|0":"CATALDI","2026-11-17|reparto|1":"CIPRIAN","2026-11-17|amb|0":"RIVA","2026-11-17|op1|0":"PINI","2026-11-17|op1|1":"VIALE","2026-11-17|oppom|0":"COMELATO","2026-11-17|oppom|1":"FRANCO","2026-11-17|ferie|0":"LENTINI","2026-11-17|ferie|1":"DEI ROSSI","2026-11-17|varie|0":"LENTINI","2026-11-18|disp1|0":"LENTINI","2026-11-18|disp2|0":"CATALDI","2026-11-18|gessi|0":"RIVA","2026-11-18|gessirep|0":"CATALDI","2026-11-18|reparto|0":"DEI ROSSI","2026-11-18|reparto|1":"CIPRIAN","2026-11-18|amb|0":"VIALE","2026-11-18|op1|0":"FATTORETTO","2026-11-18|op1|1":"CATALDI","2026-11-18|op2|0":"FRANCO","2026-11-18|op2|1":"LENTINI","2026-11-18|oppom|0":"CALZAVARA","2026-11-18|ferie|0":"COMELATO","2026-11-19|guardia|0":"COMELATO","2026-11-19|disp1|0":"FRANCO","2026-11-19|disp2|0":"LENTINI","2026-11-19|gessi|0":"LONDEI","2026-11-19|gessirep|0":"VIALE","2026-11-19|reparto|0":"DEI ROSSI","2026-11-19|reparto|1":"CIPRIAN","2026-11-19|amb|0":"FREGUIA","2026-11-19|op1|0":"PINI","2026-11-19|op1|1":"FATTORETTO","2026-11-19|op2|0":"VIALE","2026-11-19|op2|1":"CALZAVARA","2026-11-19|oppom|0":"LENTINI","2026-11-19|oppom|1":"FRANCO","2026-11-19|ferie|0":"CATALDI","2026-11-20|disp1|0":"LENTINI","2026-11-20|disp2|0":"VIALE","2026-11-20|gessi|0":"LONDEI","2026-11-20|gessirep|0":"DEI ROSSI","2026-11-20|reparto|0":"FATTORETTO","2026-11-20|reparto|1":"CIPRIAN","2026-11-20|amb|0":"FREGUIA","2026-11-20|op1|0":"PINI","2026-11-20|op1|1":"FRANCO","2026-11-20|op2|0":"CALZAVARA","2026-11-20|op2|1":"LENTINI","2026-11-20|ferie|0":"COMELATO","2026-11-20|ferie|1":"CATALDI","2026-11-20|varie|0":"COMELATO","2026-11-21|guardia|0":"LENTINI","2026-11-21|disp1|0":"CALZAVARA","2026-11-21|disp2|0":"FATTORETTO","2026-11-21|ferie|0":"COMELATO","2026-11-21|ferie|1":"CATALDI","2026-11-22|disp1|0":"FATTORETTO","2026-11-22|disp2|0":"CALZAVARA","2026-11-22|ferie|0":"COMELATO","2026-11-22|ferie|1":"CATALDI","2026-11-22|varie|0":"LENTINI","2026-11-23|disp1|0":"FATTORETTO","2026-11-23|disp2|0":"DEI ROSSI","2026-11-23|gessi|0":"VIALE","2026-11-23|gessirep|0":"FATTORETTO","2026-11-23|reparto|0":"CALZAVARA","2026-11-23|reparto|1":"CIPRIAN","2026-11-23|amb|0":"RIVA","2026-11-23|op1|0":"COMELATO","2026-11-23|op1|1":"FRANCO","2026-11-23|op2|0":"DEI ROSSI","2026-11-23|op2|1":"LENTINI","2026-11-23|oppom|0":"PINI","2026-11-23|oppom|1":"LENTINI","2026-11-23|ferie|0":"CATALDI","2026-11-24|guardia|0":"FRANCO","2026-11-24|disp1|0":"CALZAVARA","2026-11-24|disp2|0":"CATALDI","2026-11-24|gessi|0":"RIVA","2026-11-24|gessirep|0":"COMELATO","2026-11-24|reparto|0":"CALZAVARA","2026-11-24|reparto|1":"CIPRIAN","2026-11-24|amb|0":"LENTINI","2026-11-24|op1|0":"PINI","2026-11-24|op1|1":"CATALDI","2026-11-24|oppom|0":"DEI ROSSI","2026-11-24|oppom|1":"VIALE","2026-11-24|ferie|0":"FATTORETTO","2026-11-25|disp1|0":"CATALDI","2026-11-25|disp2|0":"FATTORETTO","2026-11-25|gessi|0":"RIVA","2026-11-25|gessirep|0":"CALZAVARA","2026-11-25|reparto|0":"CALZAVARA","2026-11-25|reparto|1":"CIPRIAN","2026-11-25|amb|0":"FATTORETTO","2026-11-25|op1|0":"COMELATO","2026-11-25|op1|1":"VIALE","2026-11-25|op2|0":"DEI ROSSI","2026-11-25|op2|1":"LENTINI","2026-11-25|oppom|0":"CATALDI","2026-11-25|ferie|0":"FRANCO","2026-11-25|varie|0":"FRANCO","2026-11-26|guardia|0":"DEI ROSSI","2026-11-26|disp1|0":"FATTORETTO","2026-11-26|disp2|0":"CALZAVARA","2026-11-26|gessi|0":"LONDEI","2026-11-26|gessirep|0":"FRANCO","2026-11-26|reparto|0":"COMELATO","2026-11-26|amb|0":"FREGUIA","2026-11-26|op1|0":"FATTORETTO","2026-11-26|op1|1":"FRANCO","2026-11-26|op2|0":"PINI","2026-11-26|op2|1":"LENTINI","2026-11-26|oppom|0":"CATALDI","2026-11-26|oppom|1":"CALZAVARA","2026-11-26|ferie|0":"VIALE","2026-11-26|ferie|1":"CIPRIAN","2026-11-27|disp1|0":"CATALDI","2026-11-27|disp2|0":"FATTORETTO","2026-11-27|gessi|0":"LONDEI","2026-11-27|gessirep|0":"CATALDI","2026-11-27|reparto|0":"COMELATO","2026-11-27|reparto|1":"CIPRIAN","2026-11-27|amb|0":"FREGUIA","2026-11-27|op1|0":"PINI","2026-11-27|op1|1":"CATALDI","2026-11-27|op2|0":"FATTORETTO","2026-11-27|op2|1":"LENTINI","2026-11-27|ferie|0":"VIALE","2026-11-27|ferie|1":"CALZAVARA","2026-11-27|ferie|2":"DEI ROSSI","2026-11-27|varie|0":"DEI ROSSI","2026-11-28|giorno|0":"LENTINI","2026-11-28|disp1|0":"LENTINI","2026-11-28|disp2|0":"COMELATO","2026-11-28|ferie|0":"VIALE","2026-11-29|guardia|0":"FRANCO","2026-11-29|disp1|0":"COMELATO","2026-11-29|disp2|0":"LENTINI","2026-11-30|disp1|0":"DEI ROSSI","2026-11-30|disp2|0":"COMELATO","2026-11-30|gessi|0":"RIVA","2026-11-30|gessirep|0":"FATTORETTO","2026-11-30|reparto|0":"LENTINI","2026-11-30|reparto|1":"CIPRIAN","2026-11-30|amb|0":"FATTORETTO","2026-11-30|op1|0":"DEI ROSSI","2026-11-30|op1|1":"CATALDI","2026-11-30|op2|0":"VIALE","2026-11-30|op2|1":"CALZAVARA","2026-11-30|oppom|0":"PINI","2026-11-30|oppom|1":"COMELATO","2026-11-30|ferie|0":"FRANCO","2026-11-30|varie|0":"FRANCO"},"absences":{"FATTORETTO":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-24"],"CATALDI":["2026-11-03","2026-11-19","2026-11-20","2026-11-21","2026-11-22","2026-11-23"],"VIALE":["2026-11-05","2026-11-10","2026-11-26","2026-11-27","2026-11-28"],"LENTINI":["2026-11-06","2026-11-09","2026-11-10","2026-11-17"],"COMELATO":["2026-11-11","2026-11-18","2026-11-20","2026-11-21","2026-11-22"],"FRANCO":["2026-11-13","2026-11-25","2026-11-30"],"DEI ROSSI":["2026-11-17","2026-11-27"],"CIPRIAN":["2026-11-26"],"CALZAVARA":["2026-11-27"]},"varieManualKeys":["2026-11-05|varie|0","2026-11-08|varie|0","2026-11-11|varie|0","2026-11-14|varie|0","2026-11-17|varie|0","2026-11-20|varie|0","2026-11-22|varie|0","2026-11-25|varie|0","2026-11-27|varie|0","2026-11-30|varie|0"]};
const stripMonth=arr=>(arr||[]).filter(k=>!String(k).startsWith(MONTH+'-'));

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

    const schedule={...(x.schedule||{})};
    for(const k of Object.keys(schedule))if(k.startsWith(MONTH+'-'))delete schedule[k];
    Object.assign(schedule,PAYLOAD.schedule);

    const absenceManagement=structuredClone(x.absenceManagement||{});
    for(const n of Object.keys(absenceManagement)){
      absenceManagement[n]=(absenceManagement[n]||[]).filter(ds=>!String(ds).startsWith(MONTH+'-'));
    }
    for(const[n,dates]of Object.entries(PAYLOAD.absences)){
      absenceManagement[n]??=[];
      absenceManagement[n]=[...new Set([...absenceManagement[n],...dates])].sort();
    }

    const manualKeys=new Set(stripMonth(x.manualKeys));
    for(const k of Object.keys(PAYLOAD.schedule))if(!k.includes('|ferie|'))manualKeys.add(k);

    const varieManualKeys=new Set(stripMonth(x.varieManualKeys));
    for(const k of PAYLOAD.varieManualKeys)varieManualKeys.add(k);

    const savedStates={...(x.savedStates||{})};
    const savedAbsenceStates={...(x.savedAbsenceStates||{})};
    const savedOpenedStates={...(x.savedOpenedStates||{})};
    savedStates[MONTH]={...PAYLOAD.schedule};
    savedAbsenceStates[MONTH]=structuredClone(absenceManagement);
    savedOpenedStates[MONTH]=[];

    await setDoc(root,{
      schedule,
      absenceManagement,
      manualKeys:[...manualKeys],
      varieManualKeys:[...varieManualKeys],
      generatedKeys:stripMonth(x.generatedKeys),
      extraKeys:stripMonth(x.extraKeys),
      unresolvedKeys:stripMonth(x.unresolvedKeys),
      openedStructuralKeys:stripMonth(x.openedStructuralKeys),
      savedStates,
      savedAbsenceStates,
      savedOpenedStates,
      [MARKER]:true,
      nov2026AriannaImportInfo:{
        source:'Turni manuali arianna(1).xlsx',
        scheduleCells:Object.keys(PAYLOAD.schedule).length,
        absenceDoctorDays:Object.values(PAYLOAD.absences).reduce((q,a)=>q+a.length,0),
        varieManualCells:PAYLOAD.varieManualKeys.length,
        importedAt:new Date().toISOString()
      },
      updatedAt:new Date().toISOString()
    },{merge:true});

    const verify=await getDoc(root),vs=verify.exists()?verify.data().schedule||{}:{};
    if(!Object.entries(PAYLOAD.schedule).every(([k,v])=>vs[k]===v))throw new Error('verifica finale dei turni non riuscita');

    alert('Novembre 2026 caricato da Turni manuali Arianna. La pagina verrà ricaricata.');
    location.reload();
  }catch(err){
    console.error('Import novembre Arianna fallito',err);
    alert('Errore import novembre Arianna: '+err.message);
  }
});