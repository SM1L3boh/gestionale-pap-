import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,getDocFromServer}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $=id=>document.getElementById(id);
const cfg=await(await fetch('/__/firebase/init.json')).json();
const fb=getApps()[0]||initializeApp(cfg);
const db=getFirestore(fb);
const root=doc(db,'gestionale','dati');

const countServices=[['guardia','GUARDIA NOTT.'],['giorno','GIORNO'],['disp1','1ª DISP.'],['disp2','2ª DISP.'],['gessi','GESSI MAT'],['gessirep','GESSI+REP POM'],['reparto','REPARTO'],['amb','AMBULATORIO'],['esami','AMB ESAMI'],['op1','OP1 MAT'],['op2','OP2 MAT'],['oppom','OP POM']];

function hoursFor(s,ds){
  if(s==='guardia')return 12;
  if(['disp1','disp2'].includes(s))return 0;
  return 6;
}

function monthlyTarget(d,m){
  const[y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate();
  if(d.name==='PINI')return Math.round(days/7*3);
  if(d.name==='CIPRIAN'){
    let n=0;
    for(let i=1;i<=days;i++){
      const w=new Date(y,mo-1,i).getDay();
      if(w>=1&&w<=5)n++;
    }
    return n;
  }
  if(d.cat==='Strutturato'){
    let n=0;
    for(let i=1;i<=days;i++)if(new Date(y,mo-1,i).getDay()!==0)n++;
    return n-1;
  }
  return'Specifico';
}

async function freshCloud(){
  let snap;
  try{snap=await getDocFromServer(root)}catch{snap=await getDoc(root)}
  return snap.exists()?snap.data():{};
}

function mergeVisibleGrid(schedule){
  document.querySelectorAll('#schedule select[data-k]').forEach(sel=>{
    const q=sel.dataset.k;
    if(!q)return;
    if(sel.value)schedule[q]=sel.value;
    else delete schedule[q];
  });
  return schedule;
}

async function recalcCounts(annual=false){
  const m=$('month')?.value;
  if(!m)return;
  const title=$('countTitle'),info=$('countInfo'),table=$('countTable'),modal=$('countModal');
  modal?.classList.remove('hidden');
  if(title)title.textContent=annual?'Conteggio totale annuale '+m.slice(0,4):'Conteggio turni del mese '+m;
  if(info)info.textContent='Ricalcolo in corso…';
  if(table)table.innerHTML='';

  try{
    const x=await freshCloud();
    const doctors=x.doctors||[];
    const schedule=mergeVisibleGrid({...x.schedule||{}});
    const prefix=annual?m.slice(0,4)+'-':m;
    const st={};
    doctors.forEach(d=>st[d.name]={eq:0,s:{}});
    for(const[q,n]of Object.entries(schedule)){
      const[ds,s]=q.split('|');
      if(!ds.startsWith(prefix)||s==='ferie'||n==='NESSUNO'||!st[n])continue;
      st[n].eq+=hoursFor(s,ds)/6;
      st[n].s[s]=(st[n].s[s]||0)+1;
    }
    let html='<tr><th>Medico</th>'+(annual?'':'<th>Target</th>')+'<th>Turni 6h eq.</th>'+countServices.map(s=>`<th>${s[1]}</th>`).join('')+'</tr>';
    for(const d of doctors){
      const z=st[d.name]||{eq:0,s:{}};
      html+=`<tr><td><b>${d.name}</b></td>${annual?'':`<td>${monthlyTarget(d,m)}</td>`}<td>${z.eq}</td>${countServices.map(s=>`<td>${z.s[s[0]]||0}</td>`).join('')}</tr>`;
    }
    table.innerHTML=html;
    const now=new Date().toLocaleTimeString('it-IT');
    info.textContent=(annual?'Totale gennaio–dicembre. ':'Conteggio mensile. ')+`Ricalcolato ora alle ${now} sui dati correnti. 1ª e 2ª disponibilità sono visualizzate ma non sommate ai turni.`;
  }catch(err){
    if(info)info.textContent='Errore durante il ricalcolo: '+err.message;
  }
}

$('countBtn')?.addEventListener('click',e=>{
  e.preventDefault();
  e.stopImmediatePropagation();
  recalcCounts(false);
},true);

$('annualCountBtn')?.addEventListener('click',e=>{
  e.preventDefault();
  e.stopImmediatePropagation();
  recalcCounts(true);
},true);
