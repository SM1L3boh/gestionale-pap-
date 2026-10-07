import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati');
document.head.insertAdjacentHTML('beforeend','<style>#schedule select.manualShift{background:#dff1ff!important}#schedule select.autoShift{background:#e3f6e9!important}#schedule select.extraShift{background:#ffdede!important}.doctorFilter{display:flex;gap:5px;align-items:center;flex-wrap:nowrap;margin-left:0;width:auto;flex:1 1 auto;min-width:0;border-left:0;padding-left:0;padding-top:4px;white-space:nowrap}.doctorFilterLabel{font-size:12px;font-weight:700;color:#334155}.doctorFilter button{padding:5px 8px;font-size:11px}.doctorFilter button.active{background:var(--doctor-color,#1d5b93)!important;color:#fff!important;border-color:var(--doctor-color,#1d5b93)!important;font-weight:800}.doctorHighlighted{background:var(--doctor-color,#fff3b0)!important;box-shadow:0 0 0 2px var(--doctor-border,#64748b)!important;border-color:var(--doctor-border,#64748b)!important;color:#111!important;font-weight:800!important;position:relative;z-index:2}.leaveCell{grid-template-columns:1fr 1fr!important}#openLeave,#leaveModal{display:none!important}.printValue{display:none}.noneValue{background:#fff!important}.leaveValue{background:#fff2b3!important}@media print{.printValue{display:block!important}}.mobileShiftPanel{display:none}.mobileShiftControls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}.mobileShiftControls label{font-size:12px;font-weight:700;color:#334155}.mobileShiftControls select{min-width:180px;padding:8px;border:1px solid #94a3b8;border-radius:7px;background:#fff}.mobileShiftList{display:flex;flex-direction:column;gap:10px}.mobileDayCard{background:#fff;border:1px solid #dbe3ec;border-radius:10px;padding:10px 12px;box-shadow:0 1px 2px #0f172a12}.mobileDayCard.mobileHoliday{background:#fee2e2;border-color:#fecaca}.mobileDayCard.mobileAvailability{background:#fff9d9;border-color:#f3e7a2}.mobileShiftRow.mobileAvailabilityRow{background:#fff9d9;border-radius:7px;padding-left:7px;padding-right:7px}.mobileDayCard.mobileHome{background:#e8f7e8;border-color:#bfe3bf}.mobileHomeLabel{padding:10px 0 4px;font-weight:800;color:#2f6b3a;font-size:14px}.mobileDayHead{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:7px}.mobileDayHead b{font-size:15px}.mobileDayHead span{font-size:12px;color:#64748b}.mobileShiftRow{display:grid;grid-template-columns:minmax(120px,1fr) minmax(120px,1.25fr);gap:8px;padding:6px 0;border-top:1px solid #eef2f7;font-size:13px}.mobileShiftRow:first-of-type{border-top:0}.mobileShiftSvc{font-weight:700;color:#334155}.mobileShiftWho{color:#0f172a}.mobileShiftEmpty{padding:18px;text-align:center;color:#64748b;background:#fff;border:1px dashed #cbd5e1;border-radius:10px}.mobileViewToggle{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important;font-weight:800!important}.mobileShiftsView #gridwrap,.mobileShiftsView .scrollDock,.mobileShiftsView #turni>.notice,.mobileShiftsView #doctorFilter{display:none!important}.mobileShiftsView .mobileShiftPanel{display:block!important}.mobileShiftsView #turni .toolbar>*{display:none!important}.mobileShiftsView #turni .toolbar #prev,.mobileShiftsView #turni .toolbar #month,.mobileShiftsView #turni .toolbar #next,.mobileShiftsView #turni .toolbar #mobileViewBtn{display:inline-flex!important}.mobileShiftsView #turni .toolbar{gap:6px;flex-wrap:wrap}.mobileShiftsView #mobileViewBtn{margin-left:auto}@media(max-width:760px){.mobileShiftRow{grid-template-columns:1fr}.mobileDayCard{padding:10px}.mobileShiftControls{position:sticky;top:0;z-index:4;background:#f8fafc;padding:8px 0;margin-top:4px}.mobileShiftControls select{flex:1;min-width:150px}}</style>');
const highlightedDoctors=new Set();const doctorHighlightColors=['#dbeafe','#dcfce7','#ffedd5','#f3e8ff','#fee2e2','#cffafe','#fce7f3','#fef3c7','#e0e7ff','#ccfbf1','#fae8ff','#e2e8f0','#ecfccb','#ffe4e6'];let building=false,doctorNames=[],leaveBusy=false;const manualKeys=new Set();let leaveSaveQueue=Promise.resolve();
function mergeWeekendServiceCells(){document.querySelectorAll('#schedule tbody tr.weekend').forEach(row=>{if(row.dataset.weekendMerged)return;let tds=[...row.children];if(tds.length<15)return;let first=tds[6],leave=tds[14];if(!first||!leave)return;first.colSpan=8;first.classList.add('weekendMerged');first.innerHTML='<div class="weekendReperibili"><b>I reperibile 14–20</b><b>II reperibile 14–20</b></div>';for(let i=13;i>=7;i--)tds[i]?.remove();row.dataset.weekendMerged='1'})}
async function applyValueColors(){let snap=await getDoc(root),x=snap.exists()?snap.data():{},generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]);document.querySelectorAll('#schedule select[data-k]').forEach(s=>{let k=s.dataset.k,none=!s.value||s.value==='NESSUNO',ferie=k?.includes('|ferie|');s.classList.remove('manualShift','autoShift','extraShift','leaveValue','noneValue');s.classList.toggle('noneValue',none);s.classList.toggle('leaveValue',ferie&&!none);if(!none&&!ferie){s.classList.toggle('extraShift',extra.has(k));s.classList.toggle('autoShift',generated.has(k)&&!extra.has(k));s.classList.toggle('manualShift',!generated.has(k)&&!extra.has(k))}})}
function doctorColor(name){
  const i=Math.max(0,doctorNames.indexOf(name));
  return doctorHighlightColors[i%doctorHighlightColors.length];
}
function darkenHex(hex){
  const n=parseInt(hex.slice(1),16),r=Math.max(0,((n>>16)&255)-70),g=Math.max(0,((n>>8)&255)-70),b=Math.max(0,(n&255)-70);
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function applyDoctorHighlight(){
  document.querySelectorAll('#schedule select').forEach(s=>{
    const active=highlightedDoctors.has(s.value);
    s.classList.toggle('doctorHighlighted',active);
    if(active){
      const col=doctorColor(s.value);
      s.style.setProperty('--doctor-color',col);
      s.style.setProperty('--doctor-border',darkenHex(col));
    }else{
      s.style.removeProperty('--doctor-color');
      s.style.removeProperty('--doctor-border');
    }
  });
}
function removeDuplicateFilters(toolbar){toolbar.querySelectorAll('.doctorFilter,#doctorFilter,[data-doctor-filter]').forEach(x=>x.remove());[...toolbar.children].forEach(x=>{let t=(x.textContent||'').trim().toLowerCase();if(t.startsWith('evidenzia medico:')||t.startsWith('evidenzia:'))x.remove()})}
async function buildDoctorFilter(){
  if(building)return;
  let toolbar=document.querySelector('#turni .toolbar');
  if(!toolbar)return;
  building=true;
  try{
    removeDuplicateFilters(toolbar);
    let snap=await getDoc(root),x=snap.exists()?snap.data():{};
    doctorNames=(x.doctors||[]).filter(d=>d.active).map(d=>d.name).filter(Boolean);
    for(const n of [...highlightedDoctors])if(!doctorNames.includes(n))highlightedDoctors.delete(n);
    if(!doctorNames.length)return;

    let box=document.createElement('div');
    box.id='doctorFilter';
    box.dataset.doctorFilter='1';
    box.className='doctorFilter';
    box.innerHTML='<span class="doctorFilterLabel">Evidenzia medico:</span>';

    let all=document.createElement('button');
    all.type='button';
    all.textContent='Tutti';
    const refreshButtons=()=>{
      all.classList.toggle('active',highlightedDoctors.size===0);
      all.style.removeProperty('--doctor-color');
      box.querySelectorAll('button[data-doctor]').forEach(btn=>{
        const name=btn.dataset.doctor,active=highlightedDoctors.has(name),col=doctorColor(name);
        btn.classList.toggle('active',active);
        if(active)btn.style.setProperty('--doctor-color',darkenHex(col));
        else btn.style.removeProperty('--doctor-color');
      });
    };
    all.onclick=()=>{
      highlightedDoctors.clear();
      refreshButtons();
      applyDoctorHighlight();
    };
    box.appendChild(all);

    for(const n of doctorNames){
      let b=document.createElement('button');
      b.type='button';
      b.textContent=n;
      b.dataset.doctor=n;
      b.onclick=()=>{
        if(highlightedDoctors.has(n))highlightedDoctors.delete(n);
        else highlightedDoctors.add(n);
        refreshButtons();
        applyDoctorHighlight();
      };
      box.appendChild(b);
    }
    toolbar.appendChild(box);
    refreshButtons();
    applyDoctorHighlight();
  }finally{building=false}
}
function serviceLabel(s){return({guardia:'GUARDIA NOTT. 20–08',giorno:'GIORNO 14–20',disp1:'1ª DISP. 20–08',disp2:'2ª DISP. 20–08',gessi:'GESSI MAT 08–14',gessirep:'GESSI+REP POM 14–20',reparto:'REPARTO 08–14',amb:'AMBULATORIO 08–14',esami:'AMB ESAMI 08–14',op1:'OP1 MAT 08–14',op2:'OP2 MAT 08–14',oppom:'OP POM 14–20',ferie:'FERIE-VARIE'})[s]||s}
async function printMyShifts(){
  let month=$('month')?.value;
  if(!month)return alert('Seleziona un mese.');
  let doctor=highlightedDoctors.size===1?[...highlightedDoctors][0]:'';
  if(!doctor){
    let email=($('loggedUser')?.textContent||'').split('·')[0].trim().toLowerCase(),local=email.split('@')[0].replace(/[._-]+/g,' ');
    doctor=doctorNames.find(n=>{let q=n.toLowerCase();return local.includes(q)||q.split(' ').every(p=>local.includes(p))})||'';
  }
  if(!doctor){
    let choice=prompt('Seleziona prima un medico da “Evidenzia medico”, oppure scrivi il cognome da stampare:','');
    if(!choice)return;
    doctor=doctorNames.find(n=>n.toLowerCase()===choice.trim().toLowerCase())||'';
  }
  if(!doctor)return alert('Medico non riconosciuto.');

  let snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule=x.schedule||{},rows=[],leaveDates=new Set();
  for(const[q,n]of Object.entries(schedule)){
    if(n!==doctor||!q.startsWith(month+'-'))continue;
    let[ds,s]=q.split('|');
    if(s==='ferie'){leaveDates.add(ds);continue;}
    rows.push({ds,s});
  }
  const officialAbsence=x.absenceManagement?.[doctor]||[];
  for(const ds of officialAbsence)if(ds.startsWith(month+'-'))leaveDates.add(ds);
  rows.sort((a,b)=>a.ds.localeCompare(b.ds)||a.s.localeCompare(b.s));

  let[y,mo]=month.split('-'),names=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

  const isWeekdayAvailability=r=>{
    if(!['disp1','disp2'].includes(r.s))return false;
    const w=new Date(r.ds+'T12:00:00').getDay();
    return w>=1&&w<=5;
  };
  const isWeekendAvailability=r=>{
    if(!['disp1','disp2'].includes(r.s))return false;
    const w=new Date(r.ds+'T12:00:00').getDay();
    return w===0||w===6;
  };
  const isMorning=r=>{
    if(isWeekendAvailability(r))return true;
    return ['gessi','reparto','amb','esami','op1','op2'].includes(r.s);
  };
  const isAfternoon=r=>['giorno','gessirep','oppom'].includes(r.s);
  const isNight=r=>r.s==='guardia';

  const workRows=rows.filter(r=>!isWeekdayAvailability(r));
  const availabilityRows=rows.filter(isWeekdayAvailability);

  const byDate=new Map();
  for(const r of workRows){
    if(!byDate.has(r.ds))byDate.set(r.ds,{mattino:[],pomeriggio:[]});
    const z=byDate.get(r.ds);
    const label=serviceLabel(r.s);
    if(isMorning(r))z.mattino.push(label);
    else if(isAfternoon(r))z.pomeriggio.push(label);
    else if(isNight(r))z.pomeriggio.push(label);
    else z.mattino.push(label);
  }

  const daysInMonth=new Date(Number(y),Number(mo),0).getDate();
  const workBody=Array.from({length:daysInMonth},(_,i)=>{
    const day=i+1,ds=month+'-'+String(day).padStart(2,'0'),d=new Date(ds+'T12:00:00');
    const dateLabel=names[d.getDay()]+' '+ds.split('-').reverse().join('/');
    const weekend=d.getDay()===0||d.getDay()===6;
    const z=byDate.get(ds)||{mattino:[],pomeriggio:[]};
    const isLeave=leaveDates.has(ds);
    return `<tr class="${weekend?'weekendRow':''}${isLeave?' leaveRow':''}"><td>${dateLabel}</td><td>${isLeave?'FERIE':z.mattino.join('<br>')}</td><td>${z.pomeriggio.join('<br>')}</td></tr>`;
  }).join('');

  const availabilityBody=availabilityRows.length?availabilityRows.map(r=>{
    const d=new Date(r.ds+'T12:00:00'),dateLabel=names[d.getDay()]+' '+r.ds.split('-').reverse().join('/');
    const weekend=d.getDay()===0||d.getDay()===6;
    return `<tr class="${weekend?'weekendRow':''}"><td>${dateLabel}</td><td>${serviceLabel(r.s)}</td></tr>`;
  }).join(''):'<tr><td colspan="2">Nessuna disponibilità infrasettimanale.</td></tr>';

  const leaveList=[...leaveDates].sort();

  // Stesso criterio del "Conteggio mese":
  // guardia = 2 turni-equivalenti (12 h);
  // disponibilità lun–ven = 0;
  // disponibilità sab/dom = 1;
  // altri servizi = 1;
  // ferie = 1 da lunedì a sabato, 0 la domenica.
  const monthlyEquivalentFor=r=>{
    const d=new Date(r.ds+'T12:00:00'),wd=d.getDay();
    if(r.s==='guardia')return 2;
    if(['disp1','disp2'].includes(r.s))return(wd===0||wd===6)?1:0;
    return 1;
  };
  const serviceEquivalentTotal=rows.reduce((sum,r)=>sum+monthlyEquivalentFor(r),0);
  const leaveEquivalentTotal=leaveList.reduce((sum,ds)=>sum+(new Date(ds+'T12:00:00').getDay()===0?0:1),0);
  const monthlyEquivalentTotal=serviceEquivalentTotal+leaveEquivalentTotal;

  const leaveBody=leaveList.length?leaveList.map(ds=>{
    const d=new Date(ds+'T12:00:00'),dateLabel=names[d.getDay()]+' '+ds.split('-').reverse().join('/');
    const weekend=d.getDay()===0||d.getDay()===6;
    return `<tr class="${weekend?'weekendRow':''}"><td>${dateLabel}</td><td>FERIE / ASSENZA</td></tr>`;
  }).join(''):'<tr><td colspan="2">Nessun giorno di ferie/assenza.</td></tr>';

  const safeDoctor=doctor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'');
  const pdfName=(safeDoctor||'medico')+'-'+month+'.pdf';
  let w=window.open('','_blank','width=900,height=900');
  if(!w)return alert('Consenti i popup e riprova.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Turni ${doctor}</title><style>
    @page{size:A4 portrait;margin:5mm}
    *{box-sizing:border-box}
    body{font:11px Arial;margin:0;color:#111;background:#eef2f7;padding:10px}
    #page{width:200mm;min-height:287mm;margin:0 auto;background:#fff;padding:5mm;overflow:hidden}
    #content{transform-origin:top left}
    h1{font-size:18px;margin:0 0 2px}
    h2{font-size:13px;margin:0 0 8px}
    h3{font-size:12px;margin:10px 0 4px}
    table{border-collapse:collapse;width:100%;margin-bottom:4px;font-size:10px}
    th,td{border:1px solid #777;padding:4px 5px;vertical-align:top}
    th{background:#eaf1f8}
    .availability th{background:#fff3cd}
    .leave th{background:#fde68a}
    .leaveRow td{background:#fff7cc}
    .weekendRow td{background:#fee2e2!important}
    .weekendRow.leaveRow td{background:#fbd5d5!important}
    .summary{margin:2px 0 8px;font-size:10px}
    .actions{display:flex;gap:8px;justify-content:center;margin:8px 0}
    .actions button{padding:7px 14px;font-weight:700}
    #savePdf{background:#166534;color:#fff;border:1px solid #166534;border-radius:5px}
    .work td:first-child{width:24%;white-space:nowrap}
    .work td:nth-child(2),.work td:nth-child(3){width:38%}
    .availability td:first-child{width:32%;white-space:nowrap}
    @media print{body{background:#fff;padding:0}#page{margin:0;padding:5mm;width:200mm;min-height:287mm}.actions{display:none}h3{break-after:avoid}table{break-inside:avoid}tr{break-inside:avoid}}
  </style></head><body><div id="page"><div id="content">
    <h1>TURNI PERSONALI — ${doctor}</h1>
    <h2>${mo}/${y}</h2>

    <h3>TURNI / SERVIZI</h3>
    <table class="work"><tr><th>Data</th><th>Mattino</th><th>Pomeriggio / notte</th></tr>${workBody}</table>
    <div class="summary">Giornate con turni/servizi: <b>${byDate.size}</b> &nbsp;·&nbsp; Turni lavorati: <b>${workRows.reduce((tot,r)=>tot+(r.s==='guardia'?2:1),0)}</b> &nbsp;·&nbsp; Giorni ferie/assenza: <b>${leaveList.filter(ds=>new Date(ds+'T12:00:00').getDay()!==0).length}</b></div>

    <h3>DISPONIBILITÀ INFRASETTIMANALI</h3>
    <table class="availability"><tr><th>Data</th><th>Disponibilità</th></tr>${availabilityBody}</table>
    <div class="summary">Totale disponibilità infrasettimanali: <b>${availabilityRows.length}</b></div>

    </div><div class="actions"><button id="printPage">STAMPA</button><button id="savePdf">SALVA PDF</button></div></div>
  </body></html>`);
  w.document.close();
  w.focus();

  const fitOneA4=()=>{
    const page=w.document.getElementById('page'),content=w.document.getElementById('content');
    if(!page||!content)return;
    content.style.transform='';content.style.width='100%';
    const maxW=page.clientWidth-1,maxH=page.clientHeight-55;
    const scale=Math.min(1,maxW/content.scrollWidth,maxH/content.scrollHeight);
    content.style.transform='scale('+scale+')';
    content.style.width=(100/scale)+'%';
  };

  const pdfText=s=>String(s||'').replace(/–/g,'-').replace(/—/g,'-').replace(/ª/g,'a').replace(/°/g,'o')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\()]/g,m=>'\\'+m);

  const savePdf=()=>{
    fitOneA4();
    const btn=w.document.getElementById('savePdf');
    if(btn){btn.disabled=true;btn.textContent='SALVATAGGIO…'}
    try{
      const pageW=595,pageH=842,margin=24;
      const ops=[];
      const escPdf=s=>pdfText(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
      const text=(x,y,size,str,bold=false)=>ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+escPdf(str)+') Tj ET');
      const line=(x1,y1,x2,y2)=>ops.push(x1+' '+y1+' m '+x2+' '+y2+' l S');
      const fill=(x,y,wid,hei,r,g,b)=>ops.push(r+' '+g+' '+b+' rg '+x+' '+y+' '+wid+' '+hei+' re f 0 0 0 rg');
      const box=(x,y,wid,hei)=>ops.push(x+' '+y+' '+wid+' '+hei+' re S');
      const clip=s=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>42?s.slice(0,39)+'...':s};

      // Titolo
      text(margin,pageH-34,15,'TURNI PERSONALI - '+doctor,true);
      text(margin,pageH-50,10,'MESE '+mo+'/'+y,true);

      // Tabella principale
      const x0=margin,x1=140,x2=365,x3=pageW-margin;
      const headH=18,rowH=14;
      let top=pageH-70;
      fill(x0,top-headH,x3-x0,headH,0.90,0.94,0.98);
      box(x0,top-headH,x3-x0,headH);
      line(x1,top-headH,x1,top);line(x2,top-headH,x2,top);
      text(x0+5,top-13,8,'DATA',true);
      text(x1+5,top-13,8,'MATTINO',true);
      text(x2+5,top-13,8,'POMERIGGIO / NOTTE',true);
      let yy=top-headH;

      const mainRows=[...w.document.querySelectorAll('table.work tr')].slice(1);
      for(const tr of mainRows){
        yy-=rowH;
        const cells=[...tr.cells].map(td=>td.innerText.replace(/\n+/g,' / ').trim());
        if(tr.classList.contains('leaveRow'))fill(x0,yy,x3-x0,rowH,1.00,0.97,0.80);
        if(tr.classList.contains('weekendRow'))fill(x0,yy,x3-x0,rowH,1.00,0.89,0.89);
        box(x0,yy,x3-x0,rowH);
        line(x1,yy,x1,yy+rowH);line(x2,yy,x2,yy+rowH);
        text(x0+4,yy+4.2,7.2,clip(cells[0]||''));
        text(x1+4,yy+4.2,7.0,clip(cells[1]||''));
        text(x2+4,yy+4.2,7.0,clip(cells[2]||''));
      }

      const sums=[...w.document.querySelectorAll('.summary')];
      yy-=12;
      text(x0,yy,8,clip(sums[0]?.innerText||''),true);

      // Disponibilità infrasettimanali
      yy-=22;
      text(x0,yy,10,'DISPONIBILITA INFRASETTIMANALI',true);
      yy-=8;
      const ax0=x0,ax1=220,ax2=x3;
      fill(ax0,yy-headH,ax2-ax0,headH,1.00,0.95,0.78);
      box(ax0,yy-headH,ax2-ax0,headH);
      line(ax1,yy-headH,ax1,yy);
      text(ax0+5,yy-13,8,'DATA',true);
      text(ax1+5,yy-13,8,'DISPONIBILITA',true);
      yy-=headH;

      const avRows=[...w.document.querySelectorAll('table.availability tr')].slice(1);
      for(const tr of avRows){
        yy-=rowH;
        const cells=[...tr.cells].map(td=>td.innerText.replace(/\n+/g,' / ').trim());
        box(ax0,yy,ax2-ax0,rowH);
        line(ax1,yy,ax1,yy+rowH);
        text(ax0+4,yy+4.2,7.2,clip(cells[0]||''));
        text(ax1+4,yy+4.2,7.0,clip(cells[1]||''));
      }
      yy-=11;
      text(ax0,yy,8,clip(sums[1]?.innerText||''),true);

      const stream=ops.join('\n');
      const objs=[];
      objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
      objs[2]='<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
      objs[3]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>';
      objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
      objs[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
      objs[6]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';

      let pdf='%PDF-1.4\n',offs=[0];
      for(let i=1;i<=6;i++){offs[i]=pdf.length;pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n'}
      const xref=pdf.length;
      pdf+='xref\n0 7\n0000000000 65535 f \n';
      for(let i=1;i<=6;i++)pdf+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
      pdf+='trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';

      const bytes=new Uint8Array(pdf.length);
      for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
      const a=document.createElement('a');a.href=url;a.download=pdfName;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
    }catch(err){alert('Errore salvataggio PDF: '+err.message)}
    finally{if(btn){btn.disabled=false;btn.textContent='SALVA PDF'}}
  };

  const bindPersonalActions=()=>{
    if(!w||w.closed)return;
    const printBtn=w.document.getElementById('printPage');
    const saveBtn=w.document.getElementById('savePdf');
    if(printBtn&&!printBtn.dataset.bound){
      printBtn.dataset.bound='1';
      printBtn.addEventListener('click',ev=>{
        ev.preventDefault();
        fitOneA4();
        setTimeout(()=>{w.focus();w.print()},120);
      });
    }
    if(saveBtn&&!saveBtn.dataset.bound){
      saveBtn.dataset.bound='1';
      saveBtn.addEventListener('click',ev=>{
        ev.preventDefault();
        savePdf();
      });
    }
    fitOneA4();
  };
  bindPersonalActions();
  w.addEventListener('load',bindPersonalActions,{once:true});
  setTimeout(bindPersonalActions,100);
  setTimeout(bindPersonalActions,500);
  setTimeout(bindPersonalActions,1200);
}function ensureMyShiftsButton(){let p=$('printBtn');if(!p||$('myShiftsBtn'))return;let b=document.createElement('button');b.id='myShiftsBtn';b.type='button';b.textContent='I MIEI TURNI';b.onclick=printMyShifts;p.insertAdjacentElement('afterend',b)}
async function enhanceLeaveSlots(){if(leaveBusy)return;let cells=[...document.querySelectorAll('#schedule .leaveCell')];if(!cells.length)return;leaveBusy=true;try{let snap=await getDoc(root),x=snap.exists()?snap.data():{},sch=x.schedule||{};for(const cell of cells){let first=cell.querySelector('select[data-k*="|ferie|"]');if(!first)continue;let base=first.dataset.k.replace(/\|ferie\|\d+$/,'|ferie|');for(let i=2;i<4;i++){let k=base+i;if(cell.querySelector(`select[data-k="${k}"]`))continue;let s=document.createElement('select');s.dataset.k=k;s.innerHTML='<option></option>'+doctorNames.map(n=>`<option>${n}</option>`).join('');s.value=sch[k]||'';cell.appendChild(s)}}applyValueColors()}finally{leaveBusy=false}}
function installLeavePersistence(){/* Gestione assenze è l'unica fonte delle ferie: nessun salvataggio autonomo dalla griglia */}
function dayLeaves(ds){return new Set([...document.querySelectorAll(`#schedule select[data-k^="${ds}|ferie|"]`)].map(s=>s.value).filter(v=>v&&v!=='NESSUNO'))}
function weekKey(ds){let d=new Date(ds+'T12:00:00'),w=d.getDay()||7;d.setDate(d.getDate()-w+1);return d.toISOString().slice(0,10)}
function preassignContract(name,days,services){let month=$('month')?.value;if(!month)return;let rows=[...document.querySelectorAll('#schedule tbody tr')],weeks={};for(const row of rows){let any=row.querySelector('select[data-k]');if(!any)continue;let ds=any.dataset.k.split('|')[0];if(!ds.startsWith(month+'-'))continue;let dt=new Date(ds+'T12:00:00'),wd=dt.getDay();if(!days.includes(wd))continue;let wk=weekKey(ds);weeks[wk]??=[];weeks[wk].push({ds,wd})}for(const list of Object.values(weeks)){let all=[...document.querySelectorAll('#schedule select[data-k]')],wk=weekKey(list[0].ds),count=all.filter(s=>s.value===name&&weekKey(s.dataset.k.split('|')[0])===wk&&!s.dataset.k.includes('|ferie|')).length;for(const {ds} of list){if(count>=3)break;if(dayLeaves(ds).has(name))continue;if(all.some(s=>s.value===name&&s.dataset.k.startsWith(ds+'|')&&!s.dataset.k.includes('|ferie|')))continue;let target=null;for(const svc of services){target=[...document.querySelectorAll(`#schedule select[data-k^="${ds}|${svc}|"]`)].find(s=>!s.value||s.value==='NESSUNO');if(target)break}if(target){target.value=name;target.dispatchEvent(new Event('change',{bubbles:true}));count++}}}}
function wrapGenerator(){let b=$('generate');if(!b||b.dataset.contractPriority)return;let old=b.onclick;if(typeof old!=='function')return;b.dataset.contractPriority='1';b.onclick=()=>{preassignContract('RIVA',[1,2,3],['gessi','amb']);preassignContract('FREGUIA',[3,4,5],['amb']);old()}}
async function exportExcel(){let month=$('month')?.value;if(!month)return alert('Seleziona un mese.');if(!window.XLSX)return alert('Modulo Excel non disponibile. Ricarica la pagina e riprova.');let snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule=x.schedule||{},extra=new Set(x.extraKeys||[]),[y,mo]=month.split('-').map(Number),days=new Date(y,mo,0).getDate(),names=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'],monthNames=['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'],svcs=[['guardia','GUARDIA NOTT.'],['giorno','GIORNO'],['disp1','1ª DISP.'],['disp2','2ª DISP.'],['gessi','GESSI MAT'],['gessirep','GESSI+REP POM'],['reparto','REPARTO'],['amb','AMBULATORIO'],['esami','AMB ESAMI'],['op1','OP1 MAT'],['op2','OP2 MAT'],['oppom','OP POM'],['ferie','FERIE-VARIE']];let rows=[['TURNI ORTOPEDIA — '+monthNames[mo-1]+' '+y,...Array(svcs.length+1).fill('')],['DATA','GIORNO',...svcs.map(z=>z[1])]],extraCells=[],weekendRows=[];for(let d=1;d<=days;d++){let ds=month+'-'+String(d).padStart(2,'0'),dt=new Date(ds+'T12:00:00'),row=[String(d).padStart(2,'0'),names[dt.getDay()]];if(dt.getDay()===0||dt.getDay()===6)weekendRows.push(rows.length);for(let ci=0;ci<svcs.length;ci++){let s=svcs[ci][0],vals=[];for(let i=0;i<4;i++){let k=ds+'|'+s+'|'+i,v=schedule[k];if(v&&v!=='NESSUNO')vals.push(v);if(extra.has(k))extraCells.push({r:rows.length,c:ci+2})}row.push(vals.join(s==='ferie'?'\n':'  •  '))}rows.push(row)}let ws=XLSX.utils.aoa_to_sheet(rows),lastCol=rows[1].length-1,range=XLSX.utils.decode_range(ws['!ref']);ws['!merges']=[XLSX.utils.decode_range('A1:'+XLSX.utils.encode_col(lastCol)+'1')];ws['!cols']=[{wch:6},{wch:7},...svcs.map(z=>({wch:z[0]==='ferie'?30:16}))];ws['!rows']=rows.map((_,i)=>({hpt:i===0?28:i===1?30:36}));let border={top:{style:'thin',color:{rgb:'B7C5D3'}},bottom:{style:'thin',color:{rgb:'B7C5D3'}},left:{style:'thin',color:{rgb:'B7C5D3'}},right:{style:'thin',color:{rgb:'B7C5D3'}}};for(let R=range.s.r;R<=range.e.r;R++){for(let C=range.s.c;C<=range.e.c;C++){let a=XLSX.utils.encode_cell({r:R,c:C}),cell=ws[a]||(ws[a]={t:'s',v:''}),isTitle=R===0,isHeader=R===1,isWeekend=weekendRows.includes(R);cell.s={font:{name:'Aptos',sz:isTitle?14:isHeader?10:9,bold:isTitle||isHeader||C<2,color:{rgb:isTitle||isHeader?'FFFFFF':'172033'}},fill:{patternType:'solid',fgColor:{rgb:isTitle?'123A67':isHeader?'1D5B93':isWeekend?'FCE8D5':R%2===0?'F7FAFC':'FFFFFF'}},alignment:{vertical:'center',horizontal:'center',wrapText:true},border:isTitle?undefined:border};}}for(let R=2;R<=range.e.r;R++){let a=XLSX.utils.encode_cell({r:R,c:lastCol}),cell=ws[a]||(ws[a]={t:'s',v:''});if(cell.v){cell.s={...cell.s,fill:{patternType:'solid',fgColor:{rgb:'FFF2B3'}},font:{...(cell.s.font||{}),bold:true,color:{rgb:'7A4B00'}},alignment:{vertical:'center',horizontal:'center',wrapText:true}}}}
for(const q of extraCells){let a=XLSX.utils.encode_cell(q),cell=ws[a];if(cell){cell.s={...cell.s,fill:{patternType:'solid',fgColor:{rgb:'FADBD8'}},font:{...(cell.s.font||{}),bold:true,color:{rgb:'9C1C1C'}}}}}ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:1,c:0},e:{r:days+1,c:lastCol}})};ws['!freeze']={xSplit:2,ySplit:2,topLeftCell:'C3',activePane:'bottomRight',state:'frozen'};let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Turni '+month);XLSX.writeFile(wb,'Turni_Ortopedia_'+month+'.xlsx',{cellStyles:true})}
function ensureExcelButton(){let b=$('exportExcelBtn');if(!b||b.dataset.ready)return;b.dataset.ready='1';b.onclick=()=>exportExcel().catch(err=>alert('Errore esportazione Excel: '+err.message))}
function fixFullPrint(){
  const old=$('printBtn');
  if(!old)return;
  const fresh=old.cloneNode(true);
  old.replaceWith(fresh);
  fresh.dataset.fixedPrint='1';

  fresh.addEventListener('click',async e=>{
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const m=$('month')?.value||'';
    if(!m)return alert('Seleziona un mese.');

    const [y,mo]=m.split('-').map(Number);
    const days=new Date(y,mo,0).getDate();
    const monthName=['','gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'][mo]||m;
    const services=[
      ['guardia','GUARDIA NOTT.','20–08',1],
      ['giorno','INTERD','14–20',1],
      ['disp1','1ª DISP.','20–08',1],
      ['disp2','2ª DISP.','20–08',1],
      ['gessi','GESSI MAT','08–14',2],
      ['gessirep','GESSI+REP POM','14–20',1],
      ['reparto','REPARTO','08–14',2],
      ['amb','AMBULATORIO','08–14',2],
      ['esami','AMB ESAMI','08–14',1],
      ['op1','OP1 MAT','08–14',2],
      ['op2','OP2 MAT','08–14',2],
      ['oppom','OP POM','14–20',2],
      ['ferie','FERIE-VARIE','',4]
    ];
    const weekdays=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const visible={};
    document.querySelectorAll('#schedule select[data-k]').forEach(sel=>{
      const k=sel.dataset.k;
      if(k?.startsWith(m+'-'))visible[k]=sel.value||'';
    });

    const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const cellText=(ds,svc,count)=>{
      const vals=[];
      for(let i=0;i<count;i++){
        const v=visible[ds+'|'+svc+'|'+i]||'';
        if(v&&v!=='NESSUNO'&&!vals.includes(v))vals.push(v);
      }
      return vals.map(esc).join('<br>');
    };
    const allowedPrint=(svc,w)=>![0,6].includes(w)||['guardia','giorno','disp1','disp2','ferie'].includes(svc);

    let head='<tr><th>DATA</th><th>GIORNO</th>'+services.map(s=>'<th>'+esc(s[1])+(s[2]?'<br><small>'+esc(s[2])+'</small>':'')+'</th>').join('')+'</tr>';
    let body='';
    for(let d=1;d<=days;d++){
      const dt=new Date(y,mo-1,d,12),w=dt.getDay(),ds=m+'-'+String(d).padStart(2,'0');
      body+='<tr class="'+([0,6].includes(w)?'weekend':'')+'"><td>'+String(d).padStart(2,'0')+'</td><td>'+weekdays[w]+'</td>';
      for(const [svc,label,hrs,count] of services){
        if(!allowedPrint(svc,w)){body+='<td class="off">—</td>';continue}
        body+='<td'+(['gessirep','oppom'].includes(svc)?' class="pmCol"':'')+'>'+cellText(ds,svc,count)+'</td>';
      }
      body+='</tr>';
    }

    const w=window.open('','_blank','width=1500,height=950');
    if(!w)return alert('Il browser ha bloccato la finestra di stampa. Consenti i popup per questo sito e riprova.');
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Turni mensili ${monthName} ${y}</title><style>
      @page{size:A4 landscape;margin:4mm}
      *{box-sizing:border-box}
      body{font-family:Arial,sans-serif;margin:0;padding:4mm;background:#fff;color:#111}
      h1{text-align:center;font-size:14px;margin:0 0 3mm}
      .actions{text-align:center;margin:0 0 3mm}
      .actions button{padding:7px 18px;font-weight:700}
      table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:5.7pt}
      th,td{border:.25mm solid #555;padding:.45mm .3mm;text-align:center;vertical-align:middle;line-height:1.05;overflow-wrap:anywhere}
      th{background:#d9e2f3;font-size:5.8pt;font-weight:700}
      th:first-child,td:first-child{width:6mm}
      th:nth-child(2),td:nth-child(2){width:7mm}
      .weekend td{background:#fce8e8}
      .off{background:#eee!important;color:#888}
      .pmCol{background:#fff8cc}
      tr{break-inside:avoid}
      @media print{.actions{display:none}body{padding:0}table{font-size:5.5pt}th{font-size:5.6pt}}
    </style></head><body><h1>TURNI MENSILI — ${monthName.toUpperCase()} ${y}</h1><div class="actions"><button id="doPrint">STAMPA</button></div><table><thead>${head}</thead><tbody>${body}</tbody></table><script>document.getElementById('doPrint').onclick=()=>window.print();<\/script></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(()=>{try{w.print()}catch{}},900);
  },true);
}
function isStructuralNessunoKey(k){
  const [ds,s,iRaw]=(k||'').split('|'),i=Number(iRaw||0),m=ds?.slice(0,7);
  if(!ds||!m||m<'2026-11')return false;
  const w=new Date(ds+'T12:00:00').getDay();
  if(s==='ferie'||s==='guardia'||s==='giorno'||s==='esami')return true;
  if(s==='gessi'||s==='amb')return i===1;
  if(s==='op2')return w===2;
  if(s==='oppom'){
    if(w===3)return i===1;
    if([1,2,4].includes(w))return false;
    return true;
  }
  return false;
}
async function persistManualKey(k){if(!k||k.includes('|ferie|'))return;let sel=document.querySelector(`#schedule select[data-k="${CSS.escape(k)}"]`),v=sel?.value||'';let snap=await getDoc(root),x=snap.exists()?snap.data():{},mk=new Set(x.manualKeys||[]),g=new Set(x.generatedKeys||[]),ex=new Set(x.extraKeys||[]),opened=new Set(x.openedStructuralKeys||[]);if(!v){manualKeys.delete(k);mk.delete(k);g.delete(k);ex.delete(k);if(isStructuralNessunoKey(k))opened.add(k);else opened.delete(k)}else{manualKeys.add(k);mk.add(k);g.delete(k);ex.delete(k);opened.delete(k)}await setDoc(root,{manualKeys:[...mk],generatedKeys:[...g],extraKeys:[...ex],openedStructuralKeys:[...opened],updatedAt:new Date().toISOString()},{merge:true});applyValueColors().catch(()=>{})}
function trackManualChanges(){let schedule=$('schedule');if(!schedule||schedule.dataset.manualTracking)return;schedule.dataset.manualTracking='1';schedule.addEventListener('change',e=>{let s=e.target;if(s instanceof HTMLSelectElement&&s.dataset.k&&!s.dataset.k.includes('|ferie|')){applyValueColors();persistManualKey(s.dataset.k).catch(()=>{})}},true)}
async function clearGeneratedSafe(e){e.preventDefault();e.stopImmediatePropagation();let m=$('month')?.value;if(!m)return;if(!confirm(`Ripristinare lo stato manuale salvato di ${m}? Verranno eliminati soltanto i turni aggiunti dalla bozza automatica.`))return;let snap=await getDoc(root),x=snap.exists()?snap.data():{},baseline=x.savedStates?.[m],absenceBaseline=x.savedAbsenceStates?.[m];if(!baseline){alert('Nessuno stato manuale salvato per '+m+'. Per sicurezza non è stato cancellato nulla.');return}let schedule={...(x.schedule||{})};for(const k of Object.keys(schedule))if(k.startsWith(m+'-'))delete schedule[k];for(const[k,v]of Object.entries(baseline))if(k.startsWith(m+'-'))schedule[k]=v;let generated=new Set(x.generatedKeys||[]),extra=new Set(x.extraKeys||[]),unresolved=new Set(x.unresolvedKeys||[]),manual=new Set(x.manualKeys||[]),opened=new Set(x.openedStructuralKeys||[]),savedOpened=x.savedOpenedStates?.[m];if(Array.isArray(savedOpened)){for(const k of [...opened])if(k.startsWith(m+'-'))opened.delete(k);for(const k of savedOpened)if(k.startsWith(m+'-'))opened.add(k)}for(const k of opened)if(k.startsWith(m+'-')){delete schedule[k];manual.delete(k)};for(const set of[generated,extra,unresolved])for(const k of[...set])if(k.startsWith(m+'-'))set.delete(k);for(const k of Object.keys(baseline))manual.add(k);let sync=$('sync');try{if(sync)sync.textContent='Ripristino stato manuale…';let absenceManagement=absenceBaseline!==undefined?structuredClone(absenceBaseline):(x.absenceManagement||{});await setDoc(root,{schedule,absenceManagement,generatedKeys:[...generated],extraKeys:[...extra],unresolvedKeys:[...unresolved],manualKeys:[...manual],openedStructuralKeys:[...opened],updatedAt:new Date().toISOString()},{merge:true});if(sync){sync.textContent='● Stato manuale ripristinato';sync.className='status online'}alert('Bozza '+m+' cancellata. Ripristinato esattamente lo stato salvato con SALVA STATO.');location.reload()}catch(err){if(sync)sync.textContent='Errore ripristino';alert('Errore durante il ripristino: '+err.message)}}

let mobileViewExplicit=null,mobileDoctor='';
const MOBILE_SERVICE_ORDER=['guardia','giorno','disp1','disp2','gessi','gessirep','reparto','amb','esami','op1','op2','oppom'];
function escHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function mobileEaster(y){let a=y%19,b=Math.floor(y/100),cc=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(cc/4),k=cc%4,l=(32+2*e+2*i-h-k)%7,n=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*n+114)/31),da=(h+l-7*n+114)%31+1;return new Date(y,mo-1,da,12)}
function mobileIsHoliday(d){if([0,6].includes(d.getDay()))return true;const md=`${d.getMonth()+1}-${d.getDate()}`;if(new Set(['1-1','1-6','4-25','5-1','6-2','8-15','8-16','11-1','12-8','12-25','12-26']).has(md))return true;const p=mobileEaster(d.getFullYear());p.setDate(p.getDate()+1);return p.toDateString()===d.toDateString()}
function mobileShouldBeOn(){return mobileViewExplicit===null?window.matchMedia('(max-width:760px)').matches:mobileViewExplicit}
async function renderMobileShiftView(){
  const panel=$('mobileShiftPanel'),sel=$('mobileDoctorSelect'),month=$('month')?.value;
  if(!panel||!sel||!month)return;
  let snap=await getDoc(root),x=snap.exists()?snap.data():{},schedule=x.schedule||{},docs=(x.doctors||[]).filter(d=>d.active).map(d=>d.name).filter(Boolean);
  doctorNames=docs;
  const previous=mobileDoctor||sel.value||'';
  sel.innerHTML='<option value="">Tutti i medici</option>'+docs.map(n=>`<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
  mobileDoctor=docs.includes(previous)?previous:'';
  sel.value=mobileDoctor;

  const byDate={};
  for(const [k,name] of Object.entries(schedule)){
    if(!k.startsWith(month+'-')||!name||name==='NESSUNO')continue;
    const [ds,svc]=k.split('|');
    if(svc==='ferie')continue;
    if(mobileDoctor&&name!==mobileDoctor)continue;
    byDate[ds]??={};
    byDate[ds][svc]??=[];
    if(!byDate[ds][svc].includes(name))byDate[ds][svc].push(name);
  }
  let dates=Object.keys(byDate).sort();
  const list=$('mobileShiftList');
  if(mobileDoctor){const [yy,mm]=month.split('-').map(Number),daysInMonth=new Date(yy,mm,0).getDate();dates=Array.from({length:daysInMonth},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));}
  if(!dates.length){list.innerHTML='<div class="mobileShiftEmpty">Nessun turno assegnato nel mese selezionato.</div>';return}
  const weekdays=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  list.innerHTML=dates.map(ds=>{
    const d=new Date(ds+'T12:00:00'),groups=byDate[ds]||{};
    const services=MOBILE_SERVICE_ORDER.filter(s=>groups[s]?.length),isHome=!!mobileDoctor&&!services.length,isAvailability=!!mobileDoctor&&services.length>0&&services.every(s=>s==='disp1'||s==='disp2'),isHoliday=mobileIsHoliday(d);
    const rows=isHome?'<div class="mobileHomeLabel">CASA</div>':services.map(s=>{
      const who=mobileDoctor?'':groups[s].join(' / ');
      return `<div class="mobileShiftRow${mobileDoctor&&(s==='disp1'||s==='disp2')?' mobileAvailabilityRow':''}"><div class="mobileShiftSvc">${escHtml(serviceLabel(s))}</div><div class="mobileShiftWho">${escHtml(who||mobileDoctor)}</div></div>`;
    }).join('');
    const stateClass=isHome?' mobileHome':isHoliday?' mobileHoliday':isAvailability?' mobileAvailability':'';
    return `<div class="mobileDayCard${stateClass}"><div class="mobileDayHead"><b>${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}</b><span>${ds.split('-').reverse().join('/')}</span></div>${rows}</div>`;
  }).join('');
}
function applyMobileShiftMode(){
  const on=mobileShouldBeOn(),turni=$('turni'),btn=$('mobileViewBtn');
  turni?.classList.toggle('mobileShiftsView',on);
  if(btn)btn.textContent=on?'VISTA COMPLETA':'VISTA MOBILE';
  if(on)renderMobileShiftView().catch(()=>{});
}
function ensureMobileShiftView(){
  const turni=$('turni'),toolbar=turni?.querySelector('.toolbar');
  if(!turni||!toolbar)return;
  let btn=$('mobileViewBtn');
  if(!btn){
    btn=document.createElement('button');btn.id='mobileViewBtn';btn.type='button';btn.className='mobileViewToggle';btn.textContent='VISTA MOBILE';
    btn.onclick=()=>{const next=!mobileShouldBeOn();mobileViewExplicit=next;if(next)mobileDoctor='';applyMobileShiftMode()};
    toolbar.appendChild(btn);
  }
  let panel=$('mobileShiftPanel');
  if(!panel){
    panel=document.createElement('div');panel.id='mobileShiftPanel';panel.className='mobileShiftPanel';
    panel.innerHTML='<div class="mobileShiftControls"><label for="mobileDoctorSelect">Medico</label><select id="mobileDoctorSelect"><option value="">Tutti i medici</option></select></div><div id="mobileShiftList" class="mobileShiftList"></div>';
    const notice=turni.querySelector('.notice'),grid=$('gridwrap');
    (notice||grid)?.insertAdjacentElement('afterend',panel);
    $('mobileDoctorSelect')?.addEventListener('change',e=>{mobileDoctor=e.target.value||'';renderMobileShiftView().catch(()=>{})});
  }
  applyMobileShiftMode();
}
function installSafeClear(){let b=$('clearDraft');if(!b||b.dataset.safeClear)return;b.dataset.safeClear='1';b.addEventListener('click',clearGeneratedSafe,true)}
function refreshEnhancements(){mergeWeekendServiceCells();ensureMyShiftsButton();ensureExcelButton();wrapGenerator();fixFullPrint();applyDoctorHighlight();applyValueColors();enhanceLeaveSlots();installLeavePersistence();trackManualChanges();installSafeClear();ensureMobileShiftView()}
function start(){buildDoctorFilter();refreshEnhancements();let schedule=$('schedule');if(schedule)new MutationObserver(()=>{mergeWeekendServiceCells();applyDoctorHighlight();applyValueColors();enhanceLeaveSlots();wrapGenerator();fixFullPrint();ensureExcelButton();installLeavePersistence();trackManualChanges();installSafeClear()}).observe(schedule,{childList:true,subtree:true});$('month')?.addEventListener('change',()=>setTimeout(()=>{buildDoctorFilter();refreshEnhancements();renderMobileShiftView().catch(()=>{})},80));for(const id of ['prev','next'])$(id)?.addEventListener('click',()=>setTimeout(()=>{if(mobileShouldBeOn())renderMobileShiftView().catch(()=>{})},100));let app=$('app');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden')){buildDoctorFilter();refreshEnhancements()}}).observe(app,{attributes:true,attributeFilter:['class']})}
window.matchMedia('(max-width:760px)').addEventListener?.('change',()=>{if(mobileViewExplicit===null)applyMobileShiftMode()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();setTimeout(()=>{buildDoctorFilter();refreshEnhancements()},300);setTimeout(()=>{buildDoctorFilter();refreshEnhancements()},1200);