import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati'),K=(d,s,i)=>`${d}|${s}|${i}`;
const DATA_START_MONTH='2026-09';
const AM=['gessi','reparto','amb','esami','op1','op2'],PM=['gessirep','oppom'],DAY=[...AM,...PM],REQ=['op1','op2','oppom','gessi','gessirep','reparto','amb','esami'],OR=['op1','op2','oppom'],OPFIRST=['oppom','op1','op2'],REST=['gessi','gessirep','reparto','amb'];
const RULES={
'PINI':{manual:true},
'VIALE':{freePm:[3]},
'CALZAVARA':{freePm:[2],preferFreePm:[5]},
'COMELATO':{freePm:[1,4]},
'FRANCO':{freePm:[3]},
'CIPRIAN':{days:[1,2,3,4,5],services:['reparto']},
'RIVA':{days:[1,2,3],services:['gessi','amb']},
'FREGUIA':{days:[3,4,5],services:['amb']},
'LONDEI':{manual:true},
'ARMATO':{manual:true}
};
const rule=d=>RULES[d?.name]||{},manualOnly=d=>d?.cat==='Contratto'||!!rule(d).manual;
async function cloud(){let s=await getDoc(root);return s.exists()?s.data():{}}
function easter(y){let a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=(h+l-7*m+114)%31+1;return new Date(y,mo-1,da,12)}
function holiday(dt){let md=`${dt.getMonth()+1}-${dt.getDate()}`,f=new Set(['1-1','1-6','4-25','5-1','6-2','8-15','8-16','11-1','12-8','12-25','12-26']);if(f.has(md))return true;let p=easter(dt.getFullYear());p.setDate(p.getDate()+1);return p.toDateString()===dt.toDateString()}
function workTarget(m){let[y,mo]=m.split('-').map(Number),n=0,z=new Date(y,mo,0).getDate();for(let d=1;d<=z;d++){let x=new Date(y,mo-1,d,12);if(x.getDay()!==0&&!holiday(x))n++}return n}
function target(n,m){if(n==='CIPRIAN'){let[y,mo]=m.split('-').map(Number),z=new Date(y,mo,0).getDate(),q=0;for(let d=1;d<=z;d++){let x=new Date(y,mo-1,d,12);if(x.getDay()>=1&&x.getDay()<=5&&!holiday(x))q++}return q}return workTarget(m)}
function hrs(s,dt){if(s==='guardia')return 12;if(s==='ferie')return dt.getDay()===0?0:6;if(s==='giorno')return 6;if(['disp1','disp2'].includes(s))return[0,6].includes(dt.getDay())?6:0;return 6}
function workedHrs(s,dt){if(s==='ferie')return 0;return hrs(s,dt)}
function leave(a,ds,n){return[0,1,2,3].some(i=>a[K(ds,'ferie',i)]===n)}
function wk(ds){let d=new Date(ds+'T12:00:00'),offset=(d.getDay()+1)%7;d.setDate(d.getDate()-offset);return d.toISOString().slice(0,10)}
function weekHours(a,n,ds){let q=0,W=wk(ds);for(const[k,v]of Object.entries(a))if(v===n){let[x,s]=k.split('|');if(wk(x)===W)q+=workedHrs(s,new Date(x+'T12:00:00'))}return q}
function monthEq(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')){let[ds,s]=k.split('|');q+=hrs(s,new Date(ds+'T12:00:00'))/6}return q}
function orCount(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&OR.includes(k.split('|')[1]))q++;return q}
function prevMonths(m){let[y,mo]=m.split('-').map(Number),out=[];for(let i=1;i<=2;i++){let d=new Date(y,mo-1-i,1,12),mm=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if(mm>=DATA_START_MONTH)out.push(mm)}return out}
function hasPrevHistory(a,m){let pm=prevMonths(m);return Object.keys(a).some(k=>pm.some(x=>k.startsWith(x+'-')))}
function triMonths(m){return[m,...prevMonths(m)]}
function triOpCount(a,n,m){if(!hasPrevHistory(a,m))return orCount(a,n,m);let ms=triMonths(m),q=0;for(const[k,v]of Object.entries(a))if(v===n&&ms.some(x=>k.startsWith(x+'-'))&&OR.includes(k.split('|')[1]))q++;return q}
function triEqCount(a,n,m){if(!hasPrevHistory(a,m))return monthEq(a,n,m);let ms=triMonths(m),q=0;for(const[k,v]of Object.entries(a))if(v===n&&ms.some(x=>k.startsWith(x+'-'))){let[ds,s]=k.split('|');q+=hrs(s,new Date(ds+'T12:00:00'))/6}return q}
function triPenalty(doctors,a,n,m,kind){if(!hasPrevHistory(a,m))return 0;let ss=doctors.filter(d=>d.cat==='Strutturato'&&!manualOnly(d)),vals=ss.map(d=>(kind==='op'?triOpCount:triEqCount)(a,d.name,m)),v=(kind==='op'?triOpCount:triEqCount)(a,n,m)+1,others=ss.filter(d=>d.name!==n).map(d=>(kind==='op'?triOpCount:triEqCount)(a,d.name,m));let all=[...others,v],spread=Math.max(...all)-Math.min(...all);return Math.max(0,spread-4)}
function opMatCount(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&['op1','op2'].includes(k.split('|')[1]))q++;return q}
function opPomCount(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&k.split('|')[1]==='oppom')q++;return q}
function serviceGroup(s){return['op1','op2'].includes(s)?'opmat':s}
function serviceMatches(s,g){return g==='opmat'?['op1','op2'].includes(s):s===g}
function triServiceCount(a,n,m,s){let ms=triMonths(m),g=serviceGroup(s),q=0;for(const[k,v]of Object.entries(a))if(v===n&&ms.some(x=>k.startsWith(x+'-'))&&serviceMatches(k.split('|')[1],g))q++;return q}
function triAvailableDays(a,n,m){let q=0;for(const mm of triMonths(m)){q+=workTarget(mm);let leaveDays=new Set();for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(mm+'-')&&k.split('|')[1]==='ferie')leaveDays.add(k.split('|')[0]);q-=leaveDays.size}return Math.max(1,q)}
function triServiceRate(a,n,m,s){return triServiceCount(a,n,m,s)/triAvailableDays(a,n,m)}

function shiftDay(ds,delta){let d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+delta);return d.toISOString().slice(0,10)}
function hasSameShift(a,n,s,ds){return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|'+s+'|'))}
function hasGroupOnDay(a,n,ds,pred){return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|')&&pred(k.split('|')[1]))}
function wouldCreateConsecutive(a,n,ds,pred,limit){
  let run=1;
  for(let o=-1;o>=-limit;o--){if(hasGroupOnDay(a,n,shiftDay(ds,o),pred))run++;else break}
  for(let o=1;o<=limit;o++){if(hasGroupOnDay(a,n,shiftDay(ds,o),pred))run++;else break}
  return run>limit;
}
function consecutiveRuleBlocked(a,d,s,ds){
  if(d?.cat!=='Strutturato'||d?.name==='PINI')return false;
  if(s==='reparto')return false;
  if(OR.includes(s))return wouldCreateConsecutive(a,d.name,ds,x=>OR.includes(x),4);
  if(AM.includes(s))return wouldCreateConsecutive(a,d.name,ds,x=>x===s,3);
  return false;
}
function hasBand(a,n,ds,band){let set=band==='am'?AM:PM;return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|')&&set.includes(k.split('|')[1]))}
function doubles(a,n,ds){let W=wk(ds),d={};for(const[k,v]of Object.entries(a))if(v===n){let[x,s]=k.split('|');if(wk(x)===W&&DAY.includes(s)){d[x]??={am:false,pm:false};if(AM.includes(s))d[x].am=true;if(PM.includes(s))d[x].pm=true}}return Object.values(d).filter(x=>x.am&&x.pm).length}
function guard(a,ds,n){return a[K(ds,'guardia',0)]===n}function prev(ds){return shiftDay(ds,-1)}
function weekendContinuityRest(a,n,ds){let w=new Date(ds+'T12:00:00').getDay();if(w===1)return a[K(shiftDay(ds,-2),'disp1',0)]===n;if(w===5)return a[K(shiftDay(ds,-6),'disp2',0)]===n;return false}
function freePm(d,w){return(d?.constraints?.freePm||RULES[d?.name]?.freePm||[]).includes(w)}
function preferFreePm(d,w){return(d?.constraints?.preferFreePm||RULES[d?.name]?.preferFreePm||[]).includes(w)}
function eligible(d,s,dt,force=false){let n=d.name,w=dt.getDay(),r=rule(d);if(manualOnly(d))return false;if(r.days&&!r.days.includes(w))return false;if(r.services&&!r.services.includes(s))return false;if(!force&&PM.includes(s)&&freePm(d,w))return false;return d.cat==='Strutturato'||n==='CIPRIAN'}
function can(a,d,s,ds,m,extra=false,force=false){let dt=new Date(ds+'T12:00:00'),n=d.name;if(leave(a,ds,n)||guard(a,ds,n)||guard(a,prev(ds),n)||weekendContinuityRest(a,n,ds)||!eligible(d,s,dt,force)||consecutiveRuleBlocked(a,d,s,ds))return false;let weeklyCap=Math.min(Number(d.hours)||36,36);if(weekHours(a,n,ds)+hrs(s,dt)>weeklyCap)return false;if(AM.includes(s)){if(hasBand(a,n,ds,'am'))return false;if(hasBand(a,n,ds,'pm')&&doubles(a,n,ds)>=1)return false}if(PM.includes(s)){if(hasBand(a,n,ds,'pm'))return false;if(hasBand(a,n,ds,'am')&&doubles(a,n,ds)>=1)return false}return true}
function assign(a,g,e,k,n,x=false){a[k]=n;g.add(k);x?e.add(k):e.delete(k)}
function clear(a,g,e,m,doctors,protectedKeys){let contracts=new Set(doctors.filter(manualOnly).map(d=>d.name));for(const k of [...g])if(k.startsWith(m+'-')){if(protectedKeys.has(k)||contracts.has(a[k])){g.delete(k);e.delete(k);continue}delete a[k];g.delete(k);e.delete(k)}}
function slots(s){return['gessi','amb','gessirep'].includes(s)?[0]:[0,1]}
function dispCount(a,n,m,s){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&k.split('|')[1]===s)q++;return q}
function dispOK(a,d,ds,s){let n=d.name,dt=new Date(ds+'T12:00:00');if(d.cat!=='Strutturato'||manualOnly(d)||leave(a,ds,n)||guard(a,ds,n)||guard(a,prev(ds),n)||weekendContinuityRest(a,n,ds))return false;let other=s==='disp1'?'disp2':'disp1';if(a[K(ds,other,0)]===n)return false;const add=hrs(s,dt),weeklyCap=Math.min(Number(d.hours)||36,36);if(weekHours(a,n,ds)+add>weeklyCap)return false;if(s==='disp1'){
  const h=o=>a[K(shiftDay(ds,o),'disp1',0)]===n;
  if((h(-2)&&h(-1))||(h(-1)&&h(1))||(h(1)&&h(2)))return false;
}return true}
function assignDisp(a,g,e,doctors,ds,m,s,protectedKeys){let k=K(ds,s,0);if(protectedKeys.has(k)||a[k]&&a[k]!=='NESSUNO')return;let c=doctors.filter(d=>dispOK(a,d,ds,s)).sort((x,y)=>dispCount(a,x.name,m,s)-dispCount(a,y.name,m,s)||monthEq(a,x.name,m)-monthEq(a,y.name,m));if(c[0])assign(a,g,e,k,c[0].name)}
function opWeeksInMonth(m){let[y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate(),weeks=new Set();for(let d=1;d<=days;d++){let dt=new Date(y,mo-1,d,12);if(dt.getDay()!==0&&dt.getDay()!==6&&!holiday(dt))weeks.add(wk(`${m}-${String(d).padStart(2,'0')}`))}return weeks.size}
function calzavaraOpPenalty(doctors,a,n,m){if(n!=='CALZAVARA')return 0;const q=orCount(a,n,m);return q<8?(q-8)*700:(q-8)*1100}
function cand(doctors,a,s,ds,m,x=false,force=false){let dt=new Date(ds+'T12:00:00'),list=doctors.filter(d=>can(a,d,s,ds,m,x,force)),score=new Map(list.map(d=>[d.name,{softPm:PM.includes(s)&&preferFreePm(d,dt.getDay())?5000:0,cal:OR.includes(s)?calzavaraOpPenalty(doctors,a,d.name,m):0,calPomNeed:s==='oppom'&&d.name==='CALZAVARA'&&opPomCount(a,d.name,m)<1?-1000:0,opm:OR.includes(s)?orCount(a,d.name,m):0,mat:['op1','op2'].includes(s)?opMatCount(a,d.name,m):0,pom:s==='oppom'?opPomCount(a,d.name,m):0,svc:triServiceRate(a,d.name,m,s),op:OR.includes(s)?triOpCount(a,d.name,m):0,eq:triEqCount(a,d.name,m),mon:monthEq(a,d.name,m),wk:weekHours(a,d.name,ds)}]));return list.sort((p,q)=>{let P=score.get(p.name),Q=score.get(q.name);if(OR.includes(s))return P.softPm-Q.softPm||P.calPomNeed-Q.calPomNeed||P.cal-Q.cal||P.opm-Q.opm||(s==='oppom'?P.pom-Q.pom:P.mat-Q.mat)||P.mon-Q.mon||P.svc-Q.svc||P.op-Q.op||P.eq-Q.eq||P.wk-Q.wk;return P.softPm-Q.softPm||P.mon-Q.mon||P.svc-Q.svc||P.eq-Q.eq||P.wk-Q.wk})}
function structuralDefault(m,ds,s,i){
  if(m<'2026-11')return null;
  const w=new Date(ds+'T12:00:00').getDay();
  if(s==='ferie')return'NESSUNO';
  if(s==='guardia'||s==='giorno'||s==='esami')return'NESSUNO';
  if(s==='disp1'||s==='disp2')return null;
  if(s==='gessi')return i===1?'NESSUNO':null;
  if(s==='gessirep'||s==='reparto'||s==='op1')return null;
  if(s==='amb')return i===1?'NESSUNO':null;
  if(s==='op2')return w===2?'NESSUNO':null;
  if(s==='oppom'){
    if(w===3)return i===1?'NESSUNO':null;
    if([1,2,4].includes(w))return null;
    return'NESSUNO';
  }
  return null;
}
function applyStructuralDefaults(a,m,days,y,mo,protectedKeys){
  for(let day=1;day<=days;day++){
    const dt=new Date(y,mo-1,day,12),w=dt.getDay(),ds=`${m}-${String(day).padStart(2,'0')}`;
    if(w===0||w===6)continue;
    for(const svc of ['guardia','giorno','disp1','disp2','gessi','gessirep','reparto','amb','esami','op1','op2','oppom','ferie']){
      const count=svc==='gessi'||svc==='reparto'||svc==='amb'||svc==='op1'||svc==='op2'||svc==='oppom'?2:svc==='ferie'?4:1;
      for(let i=0;i<count;i++){
        const v=structuralDefault(m,ds,svc,i);
        if(v!=='NESSUNO')continue;
        const k=K(ds,svc,i);
        if(!a[k])a[k]='NESSUNO';
        if(a[k]==='NESSUNO')protectedKeys.add(k);
      }
    }
  }
}
function monthDays(m,days,y,mo){let out=[];for(let day=1;day<=days;day++){let dt=new Date(y,mo-1,day,12),w=dt.getDay();if(w===0||w===6||holiday(dt))continue;out.push({dt,ds:`${m}-${String(day).padStart(2,'0')}`})}return out}
function doctorBusyAnyService(a,n,ds){return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|')&&k.split('|')[1]!=='ferie'&&v!=='NESSUNO')}
function ensureRepartoForContinuity(a,g,e,doctors,m,ds,n,protectedKeys){
  if(!n||n==='NESSUNO'||!ds.startsWith(m+'-')||leave(a,ds,n))return false;
  const d=doctors.find(x=>x.name===n);if(!d)return false;
  const k0=K(ds,'reparto',0),k1=K(ds,'reparto',1);
  if(a[k0]===n){protectedKeys.add(k0);return true}
  if(a[k1]===n){protectedKeys.add(k1);return true}
  if(doctorBusyAnyService(a,n,ds))return false;
  const free=[k0,k1].find(k=>!protectedKeys.has(k)&&(!a[k]||a[k]==='NESSUNO'));
  if(!free)return false;
  assign(a,g,e,free,n,false);protectedKeys.add(free);return true
}
function applySaturdayContinuity(a,g,e,doctors,m,protectedKeys){
  const [y,mo]=m.split('-').map(Number);
  const monthStart=new Date(y,mo-1,1,12),monthEnd=new Date(y,mo,0,12);
  const scanStart=new Date(monthStart);scanStart.setDate(scanStart.getDate()-7);
  for(let dt=new Date(scanStart);dt<=monthEnd;dt.setDate(dt.getDate()+1)){
    if(dt.getDay()!==6)continue;
    const sat=dt.toISOString().slice(0,10);
    const first=a[K(sat,'disp1',0)],second=a[K(sat,'disp2',0)];
    if(first&&first!=='NESSUNO'){
      for(const off of[-3,-2,-1])ensureRepartoForContinuity(a,g,e,doctors,m,shiftDay(sat,off),first,protectedKeys);
    }
    if(second&&second!=='NESSUNO'){
      for(const off of[2,3])ensureRepartoForContinuity(a,g,e,doctors,m,shiftDay(sat,off),second,protectedKeys);
    }
  }
}
async function optimizeOperatingBlock(a,g,e,doctors,m,dates,protectedKeys){
  const cohort=doctors.filter(d=>d.cat==='Strutturato'&&!manualOnly(d));
  const opKeys=[];
  for(const {ds} of dates)for(const s of ['oppom','op1','op2'])for(const i of slots(s)){
    const k=K(ds,s,i);
    if(!protectedKeys.has(k)&&(!a[k]||a[k]==='NESSUNO'))opKeys.push(k);
  }
  const baseA={...a},baseG=new Set(g),baseE=new Set(e);
  const rng=seed=>{let x=(seed+1)*2654435761>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}};
  const spread=(arr)=>arr.length?Math.max(...arr)-Math.min(...arr):0;
  const scoreState=A=>{
    const pomVals=cohort.map(d=>opPomCount(A,d.name,m));
    const opVals=cohort.map(d=>orCount(A,d.name,m));
    const monVals=cohort.map(d=>monthEq(A,d.name,m));
    const missing=opKeys.filter(k=>!A[k]||A[k]==='NESSUNO').length;
    const calPom=opPomCount(A,'CALZAVARA',m);
    const pomMean=pomVals.reduce((x,y)=>x+y,0)/(pomVals.length||1);
    const opMean=opVals.reduce((x,y)=>x+y,0)/(opVals.length||1);
    const variance=pomVals.reduce((q,v)=>q+(v-pomMean)*(v-pomMean),0)+opVals.reduce((q,v)=>q+(v-opMean)*(v-opMean),0);
    const calOp=orCount(A,'CALZAVARA',m);return missing*100000+(calPom<1?20000:0)+Math.abs(calOp-8)*2500+spread(pomVals)*5000+spread(opVals)*2500+spread(monVals)*300+variance;
  };
  let best=null,bestScore=Infinity;
  const started=performance.now(),MAX_MS=1800,MAX_TRIALS=48;
  for(let trial=0;trial<MAX_TRIALS;trial++){
    if(performance.now()-started>MAX_MS)break;
    if(trial&&trial%6===0)await new Promise(r=>setTimeout(r,0));
    const A={...baseA},G=new Set(baseG),E=new Set(baseE),rnd=rng(trial+17);
    let order=[...opKeys];
    order.sort((ka,kb)=>{
      const sa=ka.split('|')[1],sb=kb.split('|')[1];
      const pa=sa==='oppom'?0:1,pb=sb==='oppom'?0:1;
      if(pa!==pb)return pa-pb;
      const da=ka.split('|')[0],db=kb.split('|')[0];
      if(da!==db)return trial%2?db.localeCompare(da):da.localeCompare(db);
      return rnd()-.5;
    });
    for(const k of order){
      if(A[k]&&A[k]!=='NESSUNO')continue;
      const [ds,s]=k.split('|');
      let list=cohort.filter(d=>can(A,d,s,ds,m,false,false));
      if(!list.length)list=cohort.filter(d=>can(A,d,s,ds,m,true,false));
      if(!list.length)continue;
      const beforePom=opPomCount(A,'CALZAVARA',m);
      list=list.map(d=>{
        const pom=opPomCount(A,d.name,m)+(s==='oppom'?1:0);
        const op=orCount(A,d.name,m)+1;
        const mon=monthEq(A,d.name,m)+1;
        const wkH=weekHours(A,d.name,ds)+6;
        let z=(s==='oppom'?pom*120:op*90)+op*55+mon*12+wkH*2+triOpCount(A,d.name,m)*3+triServiceRate(A,d.name,m,s)*180+rnd()*8;if(d.name==='CALZAVARA')z+=op<8?(op-8)*650:(op-8)*1000;
        if(s==='oppom'&&preferFreePm(d,new Date(ds+'T12:00:00').getDay()))z+=5000;if(s==='oppom'&&d.name==='CALZAVARA'&&beforePom<1)z-=350;
        return{d,z};
      }).sort((p,q)=>p.z-q.z);
      assign(A,G,E,k,list[0].d.name,false);
    }
    const sc=scoreState(A);
    if(sc<bestScore){bestScore=sc;best={A,G,E};if(sc<1500)break}
  }
  if(!best)return;
  for(const k of Object.keys(a))if(k.startsWith(m+'-')&&OR.includes(k.split('|')[1])&&!protectedKeys.has(k))delete a[k];
  for(const k of [...g])if(k.startsWith(m+'-')&&OR.includes(k.split('|')[1])&&!protectedKeys.has(k))g.delete(k);
  for(const k of [...e])if(k.startsWith(m+'-')&&OR.includes(k.split('|')[1])&&!protectedKeys.has(k))e.delete(k);
  for(const [k,v] of Object.entries(best.A))if(k.startsWith(m+'-')&&OR.includes(k.split('|')[1])&&!protectedKeys.has(k)&&v)a[k]=v;
  for(const k of best.G)if(k.startsWith(m+'-')&&OR.includes(k.split('|')[1])&&!protectedKeys.has(k))g.add(k);
  for(const k of best.E)if(k.startsWith(m+'-')&&OR.includes(k.split('|')[1])&&!protectedKeys.has(k))e.add(k);
}
function fillManuallyOpenedCells(a,g,e,doctors,m,openedKeys){
  let filled=0;
  for(const k of openedKeys){
    const [ds,s]=k.split('|');
    if(!REQ.includes(s)||a[k]&&a[k]!=='NESSUNO')continue;
    let list=cand(doctors,a,s,ds,m,false,false);
    if(!list.length)list=doctors.filter(d=>canEmergencyCoverage(a,d,s,ds,m));
    if(list[0]){assign(a,g,e,k,list[0].name,!can(a,list[0],s,ds,m,false,false));filled++}
  }
  return filled;
}
function assignUnifiedRequired(a,g,e,doctors,m,dates,protectedKeys){
  const order=['oppom','op1','op2','reparto','gessi','gessirep','amb','esami'];
  const pending=[];
  for(const {ds} of dates)for(const s of order)for(const i of slots(s)){
    const k=K(ds,s,i);
    if(!protectedKeys.has(k)&&!a[k])pending.push(k);
  }

  // Calcola la difficoltà UNA SOLA VOLTA. Prima, per ogni assegnazione,
  // ricalcolava tutti i candidati di tutte le celle residue: era il collo di bottiglia.
  const ranked=pending.map(k=>{
    const [ds,s]=k.split('|');
    const count=doctors.reduce((q,d)=>q+(can(a,d,s,ds,m,false,false)?1:0),0);
    const pri=s==='oppom'?0:(s==='op1'||s==='op2'?1:2);
    return{k,count,pri};
  }).sort((x,y)=>x.count-y.count||x.pri-y.pri||x.k.localeCompare(y.k));

  // Ogni cella ricalcola i candidati soltanto quando viene effettivamente trattata.
  // Se nel frattempo non è più assegnabile, la lasciano ai fallback finali.
  for(const item of ranked){
    const k=item.k;
    if(protectedKeys.has(k)||a[k]&&a[k]!=='NESSUNO')continue;
    const [ds,s]=k.split('|');
    const list=cand(doctors,a,s,ds,m,false,false);
    if(list[0])assign(a,g,e,k,list[0].name,false);
  }
}
function finalHoleRepair(a,g,e,doctors,m,days,y,mo,protectedKeys){
  const docMap=new Map(doctors.map(d=>[d.name,d])),MAX_NODES=1800,MAX_DEPTH=2;
  const autoDoc=d=>!!d&&!manualOnly(d)&&(d.cat==='Strutturato'||d.name==='CIPRIAN');
  const isOpen=k=>!a[k]||a[k]==='NESSUNO';
  const restore=(k,val,wasGen,wasExtra)=>{if(val===undefined)delete a[k];else a[k]=val;wasGen?g.add(k):g.delete(k);wasExtra?e.add(k):e.delete(k)};
  const movable=k=>{
    if(!g.has(k)||protectedKeys.has(k)||!k.startsWith(m+'-'))return false;
    const d=docMap.get(a[k]),s=k.split('|')[1];
    return autoDoc(d)&&REQ.includes(s);
  };
  function trySlot(k,depth,ctx,stack){
    if(!isOpen(k))return true;
    if(protectedKeys.has(k)||ctx.nodes>=MAX_NODES)return false;
    const [ds,s]=k.split('|');
    const direct=doctors.filter(d=>autoDoc(d)&&canEmergencyCoverage(a,d,s,ds,m))
      .sort((p,q)=>monthEq(a,p.name,m)-monthEq(a,q.name,m)||weekHours(a,p.name,ds)-weekHours(a,q.name,ds));
    if(direct[0]){assign(a,g,e,k,direct[0].name,true);return true}
    if(depth<=0)return false;
    let moves=[...g].filter(mk=>movable(mk)&&!stack.has(mk))
      .sort((p,q)=>{const [pds,ps]=p.split('|'),[qds,qs]=q.split('|');return (wk(pds)===wk(ds)?0:1)-(wk(qds)===wk(ds)?0:1)||(ps===s?0:1)-(qs===s?0:1)});
    for(const mk of moves){
      if(ctx.nodes++>=MAX_NODES)break;
      const moved=a[mk],d=docMap.get(moved);
      if(!autoDoc(d))continue;
      const oldMove=a[mk],mg=g.has(mk),me=e.has(mk);
      const oldTarget=a[k],tg=g.has(k),te=e.has(k);
      delete a[mk];g.delete(mk);e.delete(mk);
      if(oldTarget==='NESSUNO')delete a[k];
      if(canEmergencyCoverage(a,d,s,ds,m)){
        assign(a,g,e,k,moved,true);
        const ns=new Set(stack);ns.add(k);ns.add(mk);
        if(trySlot(mk,depth-1,ctx,ns))return true;
      }
      restore(k,oldTarget,tg,te);restore(mk,oldMove,mg,me);
    }
    return false;
  }
  const holes=unresolved(a,m,days,y,mo,protectedKeys).sort((ka,kb)=>{
    const sa=ka.split('|')[1],sb=kb.split('|')[1];
    const rank=s=>s==='oppom'?0:(s==='op1'||s==='op2'?1:2);
    return rank(sa)-rank(sb)||ka.localeCompare(kb);
  });
  const ctx={nodes:0};let fixed=0;
  for(const k of holes)if(isOpen(k)&&trySlot(k,MAX_DEPTH,ctx,new Set([k])))fixed++;
  return{fixed,nodes:ctx.nodes,remaining:unresolved(a,m,days,y,mo,protectedKeys).length};
}
function assignServiceMonth(a,g,e,doctors,m,dates,s,protectedKeys){for(const{ds}of dates)for(const i of slots(s)){let k=K(ds,s,i);if(protectedKeys.has(k)||a[k]&&a[k]!=='NESSUNO')continue;let c=cand(doctors,a,s,ds,m,false,false);if(c[0])assign(a,g,e,k,c[0].name)}}
function fillHoles(a,g,e,doctors,m,days,y,mo,protectedKeys){for(let pass=0;pass<6;pass++){let changed=false;for(let day=1;day<=days;day++){let dt=new Date(y,mo-1,day,12),w=dt.getDay(),ds=`${m}-${String(day).padStart(2,'0')}`;if(w===0||w===6||holiday(dt))continue;for(const s of REQ)for(const i of slots(s)){let k=K(ds,s,i);if(protectedKeys.has(k)||a[k]&&a[k]!=='NESSUNO')continue;let c=cand(doctors,a,s,ds,m,true,false).filter(d=>d.cat==='Strutturato'&&!manualOnly(d));if(c[0]){assign(a,g,e,k,c[0].name,true);changed=true}}}if(!changed)break}}
function backtrackFill(a,g,e,doctors,m,days,y,mo,protectedKeys){
  const docMap=new Map(doctors.map(d=>[d.name,d])),MAX_NODES=1200,MAX_DEPTH=3;
  const isOpen=k=>!a[k]||a[k]==='NESSUNO';
  const restore=(k,val,wasGen,wasExtra)=>{if(val===undefined)delete a[k];else a[k]=val;wasGen?g.add(k):g.delete(k);wasExtra?e.add(k):e.delete(k)};
  const movable=k=>{if(!g.has(k)||protectedKeys.has(k))return false;let v=a[k],s=k.split('|')[1];return !!v&&v!=='NESSUNO'&&REQ.includes(s)&&docMap.has(v)&&!manualOnly(docMap.get(v))};
  function trySlot(k,depth,ctx,stack){
    if(!isOpen(k))return true;
    if(protectedKeys.has(k)||ctx.nodes>=MAX_NODES)return false;
    let [ds,s]=k.split('|'),direct=cand(doctors,a,s,ds,m,true,false).filter(d=>d.cat==='Strutturato'&&!manualOnly(d));
    if(direct[0]){assign(a,g,e,k,direct[0].name,true);return true}
    if(depth<=0)return false;
    const W=wk(ds);
    let moves=[...g].filter(mk=>movable(mk)&&!stack.has(mk)&&wk(mk.split('|')[0])===W);
    moves.sort((p,q)=>{
      const pd=p.split('|')[0]===ds?0:1,qd=q.split('|')[0]===ds?0:1;
      const ps=OR.includes(p.split('|')[1])?0:1,qs=OR.includes(q.split('|')[1])?0:1;
      return pd-qd||ps-qs;
    });
    for(const mk of moves){
      if(ctx.nodes++>=MAX_NODES)break;
      const moved=a[mk],d=docMap.get(moved);if(!d)continue;
      const oldMove=a[mk],mg=g.has(mk),me=e.has(mk);
      const oldTarget=a[k],tg=g.has(k),te=e.has(k);
      delete a[mk];g.delete(mk);e.delete(mk);
      if(oldTarget==='NESSUNO')delete a[k];
      if(can(a,d,s,ds,m,true,false)){
        assign(a,g,e,k,moved,true);
        const nextStack=new Set(stack);nextStack.add(k);nextStack.add(mk);
        if(trySlot(mk,depth-1,ctx,nextStack))return true;
      }
      restore(k,oldTarget,tg,te);
      restore(mk,oldMove,mg,me);
    }
    return false;
  }
  let before=unresolved(a,m,days,y,mo,protectedKeys),ctx={nodes:0},fixed=0;
  for(const k of before){
    if(!isOpen(k))continue;
    if(trySlot(k,MAX_DEPTH,ctx,new Set([k])))fixed++;
  }
  return{fixed,nodes:ctx.nodes,remaining:unresolved(a,m,days,y,mo,protectedKeys).length};
}
function globalHoleOptimize(a,g,e,doctors,m,days,y,mo,protectedKeys){
  const docMap=new Map(doctors.map(d=>[d.name,d])),MAX_NODES=9000,MAX_DEPTH=5;
  const isOpen=k=>!a[k]||a[k]==='NESSUNO';
  const restore=(k,val,wasGen,wasExtra)=>{if(val===undefined)delete a[k];else a[k]=val;wasGen?g.add(k):g.delete(k);wasExtra?e.add(k):e.delete(k)};
  const movable=k=>{
    if(!g.has(k)||protectedKeys.has(k)||!k.startsWith(m+'-'))return false;
    const v=a[k],s=k.split('|')[1],d=docMap.get(v);
    return !!v&&v!=='NESSUNO'&&REQ.includes(s)&&!!d&&!manualOnly(d);
  };
  const rankMove=(mk,targetDs,targetS)=>{
    const [mds,ms]=mk.split('|');
    let r=0;
    if(wk(mds)===wk(targetDs))r-=30;
    if(ms===targetS)r-=20;
    if(OR.includes(ms)!==OR.includes(targetS))r+=8;
    if(mds===targetDs)r-=5;
    return r;
  };
  function trySlot(k,depth,ctx,stack){
    if(!isOpen(k))return true;
    if(protectedKeys.has(k)||ctx.nodes>=MAX_NODES)return false;
    const [ds,s]=k.split('|');

    let direct=cand(doctors,a,s,ds,m,true,false)
      .filter(d=>d.cat==='Strutturato'&&!manualOnly(d))
      .sort((p,q)=>monthEq(a,p.name,m)-monthEq(a,q.name,m)||weekHours(a,p.name,ds)-weekHours(a,q.name,ds));
    if(direct[0]){assign(a,g,e,k,direct[0].name,true);return true}
    if(depth<=0)return false;

    let moves=[...g].filter(mk=>movable(mk)&&!stack.has(mk));
    moves.sort((p,q)=>rankMove(p,ds,s)-rankMove(q,ds,s));
    for(const mk of moves){
      if(ctx.nodes++>=MAX_NODES)break;
      const moved=a[mk],d=docMap.get(moved);
      if(!d)continue;

      const oldMove=a[mk],mg=g.has(mk),me=e.has(mk);
      const oldTarget=a[k],tg=g.has(k),te=e.has(k);
      delete a[mk];g.delete(mk);e.delete(mk);
      if(oldTarget==='NESSUNO')delete a[k];

      if(can(a,d,s,ds,m,true,false)){
        assign(a,g,e,k,moved,true);
        const nextStack=new Set(stack);nextStack.add(k);nextStack.add(mk);
        if(trySlot(mk,depth-1,ctx,nextStack))return true;
      }

      restore(k,oldTarget,tg,te);
      restore(mk,oldMove,mg,me);
    }
    return false;
  }

  const holes=unresolved(a,m,days,y,mo,protectedKeys).sort((ka,kb)=>{
    const sa=ka.split('|')[1],sb=kb.split('|')[1];
    const pa=OR.includes(sa)?0:sa==='reparto'?1:2;
    const pb=OR.includes(sb)?0:sb==='reparto'?1:2;
    return pa-pb||ka.localeCompare(kb);
  });
  const ctx={nodes:0};let fixed=0;
  for(const k of holes){
    if(ctx.nodes>=MAX_NODES)break;
    if(isOpen(k)&&trySlot(k,MAX_DEPTH,ctx,new Set([k])))fixed++;
  }
  return{fixed,nodes:ctx.nodes,remaining:unresolved(a,m,days,y,mo,protectedKeys).length};
}
function assignCiprian(a,g,e,m,days,y,mo,protectedKeys){for(let day=1;day<=days;day++){let dt=new Date(y,mo-1,day,12),w=dt.getDay(),ds=`${m}-${String(day).padStart(2,'0')}`;if(w<1||w>5||holiday(dt)||leave(a,ds,'CIPRIAN'))continue;let k0=K(ds,'reparto',0),k1=K(ds,'reparto',1);if(a[k0]==='CIPRIAN'||a[k1]==='CIPRIAN')continue;let opts=[k0,k1].filter(k=>!protectedKeys.has(k)&&(!a[k]||a[k]==='NESSUNO'));if(opts[0])assign(a,g,e,opts[0],'CIPRIAN')}}
function ensureCalzavaraPom(a,g,e,doctors,m,dates,protectedKeys){
  if(opPomCount(a,'CALZAVARA',m)>=1)return true;
  const cal=doctors.find(d=>d.name==='CALZAVARA');
  if(!cal)return false;
  for(const {ds} of dates){
    const k=K(ds,'oppom',0);
    const cur=a[k];
    if(protectedKeys.has(k)||!cur||cur==='NESSUNO'||cur==='CALZAVARA')continue;
    if(!g.has(k))continue;
    const curDoc=doctors.find(d=>d.name===cur);
    if(!curDoc||manualOnly(curDoc))continue;
    const wasExtra=e.has(k),wasGen=g.has(k);
    delete a[k];g.delete(k);e.delete(k);
    if(can(a,cal,'oppom',ds,m,true,false)){
      assign(a,g,e,k,'CALZAVARA',true);
      return true;
    }
    a[k]=cur;if(wasGen)g.add(k);if(wasExtra)e.add(k);
  }
  return false;
}
function rebalanceStructuredTotals(a,g,e,doctors,m,protectedKeys){
  const cohort=doctors.filter(d=>d.cat==='Strutturato'&&!manualOnly(d));
  const byName=new Map(cohort.map(d=>[d.name,d]));
  const total=n=>monthEq(a,n,m);
  const spread=()=>{const v=cohort.map(d=>total(d.name));return v.length?Math.max(...v)-Math.min(...v):0};
  const movable=k=>{
    if(!g.has(k)||protectedKeys.has(k))return false;
    const [ds,s]=k.split('|'),n=a[k],d=byName.get(n);
    if(!d||!REQ.includes(s)||hrs(s,new Date(ds+'T12:00:00'))<=0)return false;
    if(n==='CALZAVARA'&&s==='oppom'&&opPomCount(a,'CALZAVARA',m)<=1)return false;
    return true;
  };
  let guard=0;
  while(spread()>1&&guard++<600){
    const ordered=[...cohort].sort((p,q)=>total(p.name)-total(q.name));
    let changed=false;
    for(const low of ordered){
      for(const high of [...ordered].reverse()){
        if(total(high.name)-total(low.name)<=1)continue;
        const keys=[...g].filter(k=>k.startsWith(m+'-')&&a[k]===high.name&&movable(k)).sort((ka,kb)=>{
          const sa=ka.split('|')[1],sb=kb.split('|')[1];
          const oa=OR.includes(sa)?1:0,ob=OR.includes(sb)?1:0;
          return oa-ob;
        });
        for(const k of keys){
          const [ds,s]=k.split('|');
          const beforeSpread=spread(),old=a[k],wasExtra=e.has(k);
          delete a[k];g.delete(k);e.delete(k);
          if(can(a,low,s,ds,m,true,false)){
            assign(a,g,e,k,low.name,wasExtra);
            if(spread()<beforeSpread){changed=true;break}
            delete a[k];g.delete(k);e.delete(k);
          }
          a[k]=old;g.add(k);if(wasExtra)e.add(k);
        }
        if(changed)break;
      }
      if(changed)break;
    }
    if(!changed)break;
  }
  return spread();
}
function rebalanceOpTotals(a,g,e,doctors,m,protectedKeys){
  const cohort=doctors.filter(d=>d.cat==='Strutturato'&&!manualOnly(d));
  const byName=new Map(cohort.map(d=>[d.name,d]));
  const op=n=>orCount(a,n,m),tot=n=>monthEq(a,n,m);
  const opSpread=()=>{const v=cohort.map(d=>op(d.name));return v.length?Math.max(...v)-Math.min(...v):0};
  const totalSpread=()=>{const v=cohort.map(d=>tot(d.name));return v.length?Math.max(...v)-Math.min(...v):0};
  const opMovable=(k,n)=>{
    if(!g.has(k)||protectedKeys.has(k)||a[k]!==n)return false;
    const s=k.split('|')[1];
    if(!OR.includes(s))return false;
    if(n==='CALZAVARA'&&s==='oppom'&&opPomCount(a,'CALZAVARA',m)<=1)return false;
    return true;
  };
  const nonOpMovable=(k,n)=>{
    if(!g.has(k)||protectedKeys.has(k)||a[k]!==n)return false;
    const s=k.split('|')[1];
    return REQ.includes(s)&&!OR.includes(s);
  };
  const restore=(k,val,wasGen,wasExtra)=>{if(val===undefined)delete a[k];else a[k]=val;wasGen?g.add(k):g.delete(k);wasExtra?e.add(k):e.delete(k)};
  let guard=0;
  while(opSpread()>3&&guard++<800){
    const ordered=[...cohort].sort((p,q)=>op(p.name)-op(q.name)||tot(p.name)-tot(q.name));
    let changed=false;
    for(const low of ordered){
      for(const high of [...ordered].reverse()){
        if(op(high.name)-op(low.name)<=3)continue;
        const opKeys=[...g].filter(k=>k.startsWith(m+'-')&&opMovable(k,high.name));
        for(const ok of opKeys){
          const [ods,os]=ok.split('|'),oval=a[ok],og=g.has(ok),oe=e.has(ok),before=opSpread();
          delete a[ok];g.delete(ok);e.delete(ok);
          if(can(a,low,os,ods,m,true,false)){
            assign(a,g,e,ok,low.name,oe);
            if(opSpread()<before&&totalSpread()<=1){changed=true;break}
            delete a[ok];g.delete(ok);e.delete(ok);
          }
          restore(ok,oval,og,oe);

          const lowNonOp=[...g].filter(k=>k.startsWith(m+'-')&&nonOpMovable(k,low.name));
          for(const nk of lowNonOp){
            const [nds,ns]=nk.split('|'),nval=a[nk],ng=g.has(nk),ne=e.has(nk);
            const oval2=a[ok],og2=g.has(ok),oe2=e.has(ok);
            delete a[ok];g.delete(ok);e.delete(ok);
            delete a[nk];g.delete(nk);e.delete(nk);
            if(can(a,low,os,ods,m,true,false)&&can(a,high,ns,nds,m,true,false)){
              assign(a,g,e,ok,low.name,oe2);
              assign(a,g,e,nk,high.name,ne);
              if(opSpread()<before&&totalSpread()<=1){
                if(opPomCount(a,'CALZAVARA',m)>=1){changed=true;break}
              }
              delete a[ok];g.delete(ok);e.delete(ok);
              delete a[nk];g.delete(nk);e.delete(nk);
            }
            restore(ok,oval2,og2,oe2);
            restore(nk,nval,ng,ne);
          }
          if(changed)break;
        }
        if(changed)break;
      }
      if(changed)break;
    }
    if(!changed)break;
  }
  return{opSpread:opSpread(),totalSpread:totalSpread()};
}
function rebalanceOpPomTotals(a,g,e,doctors,m,protectedKeys){
  const cohort=doctors.filter(d=>d.cat==='Strutturato'&&!manualOnly(d));
  const byName=new Map(cohort.map(d=>[d.name,d]));
  const pom=n=>opPomCount(a,n,m);
  const spread=()=>{const v=cohort.map(d=>pom(d.name));return v.length?Math.max(...v)-Math.min(...v):0};
  const restore=(k,val,wasGen,wasExtra)=>{if(val===undefined)delete a[k];else a[k]=val;wasGen?g.add(k):g.delete(k);wasExtra?e.add(k):e.delete(k)};
  const movable=(k,n,services)=>{
    if(!g.has(k)||protectedKeys.has(k)||a[k]!==n)return false;
    return services.includes(k.split('|')[1]);
  };
  let guard=0;
  while(spread()>3&&guard++<500){
    const ordered=[...cohort].sort((p,q)=>pom(p.name)-pom(q.name)||orCount(a,p.name,m)-orCount(a,q.name,m));
    let changed=false;
    for(const low of ordered){
      for(const high of [...ordered].reverse()){
        if(pom(high.name)-pom(low.name)<=3)continue;
        if(high.name==='CALZAVARA'&&pom(high.name)<=1)continue;
        const pomKeys=[...g].filter(k=>k.startsWith(m+'-')&&movable(k,high.name,['oppom']));
        const swapKeys=[...g].filter(k=>k.startsWith(m+'-')&&a[k]===low.name&&REQ.includes(k.split('|')[1])&&k.split('|')[1]!=='oppom'&&!protectedKeys.has(k));
        for(const pk of pomKeys){
          for(const mk of swapKeys){
            const [pds,ps]=pk.split('|'),[mds,ms]=mk.split('|');
            const before=spread(),beforeOpSpread=(()=>{const v=cohort.map(d=>orCount(a,d.name,m));return Math.max(...v)-Math.min(...v)})();
            const pval=a[pk],mval=a[mk],pg=g.has(pk),mg=g.has(mk),pe=e.has(pk),me=e.has(mk);
            delete a[pk];g.delete(pk);e.delete(pk);
            delete a[mk];g.delete(mk);e.delete(mk);
            const highDoc=byName.get(high.name),lowDoc=byName.get(low.name);
            const okLow=can(a,lowDoc,ps,pds,m,true,false);
            const okHigh=can(a,highDoc,ms,mds,m,true,false);
            if(okLow&&okHigh){
              assign(a,g,e,pk,low.name,pe);
              assign(a,g,e,mk,high.name,me);
              const opVals=cohort.map(d=>orCount(a,d.name,m)),afterOpSpread=Math.max(...opVals)-Math.min(...opVals);
              if(spread()<before && afterOpSpread<=3 && afterOpSpread<=beforeOpSpread && opPomCount(a,'CALZAVARA',m)>=1){
                changed=true;
                break;
              }
              delete a[pk];g.delete(pk);e.delete(pk);
              delete a[mk];g.delete(mk);e.delete(mk);
            }
            restore(pk,pval,pg,pe);
            restore(mk,mval,mg,me);
          }
          if(changed)break;
        }
        if(changed)break;
      }
      if(changed)break;
    }
    if(!changed)break;
  }
  return spread();
}
function canEmergencyCoverage(a,d,s,ds,m){
  const dt=new Date(ds+'T12:00:00'),n=d.name;
  if(leave(a,ds,n)||guard(a,ds,n)||guard(a,prev(ds),n)||weekendContinuityRest(a,n,ds)||!eligible(d,s,dt,false)||consecutiveRuleBlocked(a,d,s,ds))return false;
  if(AM.includes(s)){
    if(hasBand(a,n,ds,'am'))return false;
    if(hasBand(a,n,ds,'pm')&&doubles(a,n,ds)>=1)return false;
  }
  if(PM.includes(s)){
    if(hasBand(a,n,ds,'pm'))return false;
    if(hasBand(a,n,ds,'am')&&doubles(a,n,ds)>=1)return false;
  }
  return true;
}
function emergencyCoverageFill(a,g,e,doctors,m,days,y,mo,protectedKeys){
  const cohort=doctors.filter(d=>d.cat==='Strutturato'&&!manualOnly(d));
  const extraCount=n=>[...e].filter(k=>k.startsWith(m+'-')&&a[k]===n).length;
  const oppositeBusy=(n,ds,s)=>AM.includes(s)?hasBand(a,n,ds,'pm'):PM.includes(s)?hasBand(a,n,ds,'am'):false;
  let filled=0;
  for(const k of unresolved(a,m,days,y,mo,protectedKeys)){
    const [ds,s]=k.split('|');
    let cand=cohort.filter(d=>canEmergencyCoverage(a,d,s,ds,m));
    cand.sort((p,q)=>{
      const po=Math.max(0,monthEq(a,p.name,m)-target(p.name,m)),qo=Math.max(0,monthEq(a,q.name,m)-target(q.name,m));
      const pd=oppositeBusy(p.name,ds,s)?0:1,qd=oppositeBusy(q.name,ds,s)?0:1;
      return po-qo||extraCount(p.name)-extraCount(q.name)||pd-qd||monthEq(a,p.name,m)-monthEq(a,q.name,m);
    });
    if(cand[0]){assign(a,g,e,k,cand[0].name,true);filled++}
  }
  return{filled,remaining:unresolved(a,m,days,y,mo,protectedKeys).length};
}
function finalDirectCoverageFill(a,g,e,doctors,m,days,y,mo,protectedKeys){
  const cohort=doctors.filter(d=>!manualOnly(d)&&(d.cat==='Strutturato'||d.name==='CIPRIAN'));
  let filled=0;
  for(const k of unresolved(a,m,days,y,mo,protectedKeys)){
    const [ds,s]=k.split('|');
    const cand=cohort.filter(d=>canEmergencyCoverage(a,d,s,ds,m)).sort((p,q)=>{
      const pe=monthEq(a,p.name,m),qe=monthEq(a,q.name,m);
      const pw=weekHours(a,p.name,ds),qw=weekHours(a,q.name,ds);
      return pe-qe||pw-qw||p.name.localeCompare(q.name);
    });
    if(cand[0]){assign(a,g,e,k,cand[0].name,true);filled++}
  }
  return{filled,remaining:unresolved(a,m,days,y,mo,protectedKeys).length};
}
function normalizeExtras(a,g,e,doctors,m){for(const k of [...e])if(k.startsWith(m+'-'))e.delete(k);for(const d of doctors){if(manualOnly(d))continue;let over=Math.max(0,monthEq(a,d.name,m)-target(d.name,m));if(!over)continue;let keys=[...g].filter(k=>k.startsWith(m+'-')&&a[k]===d.name&&REQ.includes(k.split('|')[1])).sort().reverse();for(const k of keys){if(over<=0)break;e.add(k);over-=1}}}
function unresolved(a,m,days,y,mo,protectedKeys){let u=[];for(let day=1;day<=days;day++){let dt=new Date(y,mo-1,day,12),w=dt.getDay(),ds=`${m}-${String(day).padStart(2,'0')}`;if(w===0||w===6||holiday(dt))continue;for(const s of REQ)for(const i of slots(s)){let k=K(ds,s,i);if(protectedKeys.has(k))continue;if(!a[k]||a[k]==='NESSUNO')u.push(k)}}return u}

const COLUMN_GENERATORS=[
  ['guardia','GUARDIA NOTT.'],['disp1','1ª DISP.'],['disp2','2ª DISP.'],['gessi','GESSI MAT'],
  ['gessirep','GESSI+REP POM'],['reparto','REPARTO'],['amb','AMBULATORIO'],
  ['esami','AMB ESAMI'],['opall','SALE OPERATORIE · TUTTE'],['op1','OP1 MAT'],['op2','OP2 MAT'],['oppom','OP POM']
];
const columnSlotCount=s=>['gessi','reparto','amb','op1','op2','oppom'].includes(s)?2:1;
function domMonthSchedule(base,m){
  const a={...base};
  document.querySelectorAll('#schedule select[data-k]').forEach(sel=>{
    const k=sel.dataset.k;if(!k?.startsWith(m+'-'))return;
    const v=sel.value;
    if(v)a[k]=v;
    else delete a[k];
  });
  return a;
}
function columnCandidateKeys(m,s,a,opened){
  const [y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate(),out=[];
  for(let day=1;day<=days;day++){
    const dt=new Date(y,mo-1,day,12),w=dt.getDay(),ds=`${m}-${String(day).padStart(2,'0')}`;
    if(s!=='guardia'&&(w===0||w===6||holiday(dt)))continue;
    for(let i=0;i<columnSlotCount(s);i++){
      const k=K(ds,s,i);
      if(a[k]==='NESSUNO')continue;
      if(a[k])continue;
      const def=structuralDefault(m,ds,s,i);
      if(def==='NESSUNO'&&!opened.has(k))continue;
      out.push(k);
    }
  }
  return out;
}
function nextDayHasWork(a,n,ds){
  const nx=shiftDay(ds,1);
  return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(nx+'|')&&!['ferie','guardia'].includes(k.split('|')[1])&&v!=='NESSUNO');
}
function hasAvailability(a,n,ds){return ['disp1','disp2'].some(s=>a[K(ds,s,0)]===n)}
function canGuardiaColumn(a,d,ds,m,allowExtra=false){
  const dt=new Date(ds+'T12:00:00'),n=d.name;
  // Regola notti: mai due guardie consecutive e mai guardia insieme a disponibilità.
  if(d.cat!=='Strutturato'||manualOnly(d)||leave(a,ds,n)||guard(a,ds,n)||hasAvailability(a,n,ds)||guard(a,prev(ds),n)||guard(a,shiftDay(ds,1),n)||nextDayHasWork(a,n,ds)||!eligible(d,'guardia',dt,false))return false;
  if(!allowExtra){
    const weeklyCap=Math.min(Number(d.hours)||36,36);
    if(weekHours(a,n,ds)+12>weeklyCap)return false;
  }
  return true;
}
function serviceCountMonth(a,n,m,s){
  let q=0;
  for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&k.split('|')[1]===s)q++;
  return q;
}
function hasOpMorning(a,n,ds){return ['op1','op2'].some(s=>Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|'+s+'|')))}
function hasOpAfternoon(a,n,ds){return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|oppom|'))}
function canOperatingAll(a,d,s,ds,m){
  const n=d.name;
  if(s==='oppom'&&hasOpMorning(a,n,ds))return false;
  if((s==='op1'||s==='op2')&&hasOpAfternoon(a,n,ds))return false;
  return can(a,d,s,ds,m,false,false);
}
function opWeekCount(a,n,ds){
  const W=wk(ds);
  let q=0;
  for(const[k,v]of Object.entries(a))if(v===n){
    const[x,s]=k.split('|');
    if(wk(x)===W&&OR.includes(s))q++;
  }
  return q;
}
function operatingBalanceScore(a,d,s,ds,m){
  // Priorità principale: uniformità delle sale nella settimana sabato→venerdì.
  // Bilanciamento mensile/trimestrale solo come criterio secondario.
  const weekly=opWeekCount(a,d.name,ds);
  return (s==='oppom'&&preferFreePm(d,new Date(ds+'T12:00:00').getDay())?50000:0)+calzavaraOpPenalty(null,a,d.name,m)+weekly*10000+orCount(a,d.name,m)*500+(s==='oppom'?opPomCount(a,d.name,m):opMatCount(a,d.name,m))*150+triOpCount(a,d.name,m)*10+monthEq(a,d.name,m)*3+weekHours(a,d.name,ds)/6;
}
function balancedOperatingCandidates(a,doctors,s,ds,m){
  const valid=doctors.filter(d=>canOperatingAll(a,d,s,ds,m));
  if(!valid.length)return valid;
  const minWeekly=Math.min(...valid.map(d=>opWeekCount(a,d.name,ds)));
  // Tolleranza operativa: privilegia chi è entro 1 sala dal minimo settimanale
  // tra i medici realmente eleggibili per quella cella.
  const balanced=valid.filter(d=>opWeekCount(a,d.name,ds)<=minWeekly+1);
  return (balanced.length?balanced:valid).sort((p,q)=>operatingBalanceScore(a,p,s,ds,m)-operatingBalanceScore(a,q,s,ds,m)||p.name.localeCompare(q.name));
}
function generateOperatingRoomsAll(a,g,e,doctors,m,opened){
  const keys=['oppom','op1','op2'].flatMap(s=>columnCandidateKeys(m,s,a,opened));
  const ranked=keys.map(k=>{
    const [ds,s]=k.split('|');
    return {k,count:doctors.reduce((q,d)=>q+(canOperatingAll(a,d,s,ds,m)?1:0),0),pri:s==='oppom'?0:1};
  }).sort((p,q)=>p.count-q.count||p.pri-q.pri||p.k.localeCompare(q.k));
  for(const {k} of ranked){
    if(a[k]&&a[k]!=='NESSUNO')continue;
    const [ds,s]=k.split('|');
    const list=balancedOperatingCandidates(a,doctors,s,ds,m);
    if(list[0])assign(a,g,e,k,list[0].name,false);
  }
}
async function generateColumnV1(){
  const m=$('month')?.value,s=$('generateColumnSelect')?.value,b=$('generateColumnBtn');
  if(!m||!s)return;
  localStorage.setItem('turniLastMonth',m);
  if(b){b.disabled=true;b.textContent='GENERAZIONE…'}
  try{
    await new Promise(r=>setTimeout(r,20));
    const x=await cloud(),
      doctors=(x.doctors||[]).filter(d=>d.active&&d.cat!=='Contratto'&&d.name!=='PINI'&&d.name!=='ARMATO'&&d.name!=='LONDEI'),
      fullSchedule={...(x.schedule||{})},
      keepMonths=new Set(triMonths(m)),
      hist=Object.fromEntries(Object.entries(fullSchedule).filter(([k])=>keepMonths.has(k.slice(0,7)))),
      a=domMonthSchedule(hist,m),
      g=new Set(x.generatedKeys||[]),
      e=new Set(x.extraKeys||[]),
      opened=new Set([...(x.openedStructuralKeys||[]),...((x.savedOpenedStates?.[m])||[])].filter(k=>k.startsWith(m+'-')));

    document.querySelectorAll('#schedule select[data-k]').forEach(sel=>{
      const k=sel.dataset.k;if(!k?.startsWith(m+'-')||sel.value)return;
      const [ds,svc,i]=k.split('|');
      if(structuralDefault(m,ds,svc,Number(i))==='NESSUNO')opened.add(k);
    });

    const absence=x.absenceManagement||{},byDate={};
    for(const[n,ds]of Object.entries(absence))for(const date of ds||[])if(date.startsWith(m+'-')){
      byDate[date]??=[];if(!byDate[date].includes(n))byDate[date].push(n)
    }
    for(const[date,names]of Object.entries(byDate))names.slice(0,4).forEach((n,i)=>a[K(date,'ferie',i)]=n);

    if(s==='reparto'){
      const protectedKeys=new Set();
      applySaturdayContinuity(a,g,e,doctors,m,protectedKeys);
      const [y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate();
      assignCiprian(a,g,e,m,days,y,mo,protectedKeys);
    }

    if(s==='opall'){
      generateOperatingRoomsAll(a,g,e,doctors,m,opened);
    }else{
    const keys=columnCandidateKeys(m,s,a,opened);
    if(s==='guardia'){
      const ranked=keys.map(k=>{
        const ds=k.split('|')[0];
        return {k,count:doctors.reduce((q,d)=>q+(canGuardiaColumn(a,d,ds,m,false)?1:0),0)};
      }).sort((p,q)=>p.count-q.count||p.k.localeCompare(q.k));
      for(const {k} of ranked){
        if(a[k]&&a[k]!=='NESSUNO')continue;
        const ds=k.split('|')[0];
        let list=doctors.filter(d=>canGuardiaColumn(a,d,ds,m,false))
          .sort((p,q)=>serviceCountMonth(a,p.name,m,'guardia')-serviceCountMonth(a,q.name,m,'guardia')||monthEq(a,p.name,m)-monthEq(a,q.name,m)||weekHours(a,p.name,ds)-weekHours(a,q.name,ds)||p.name.localeCompare(q.name));
        if(list[0])assign(a,g,e,k,list[0].name,false);
        // Nessun candidato valido: la cella resta vuota.
        // Il generatore a singola colonna non forza violazioni di sicurezza/vincoli.
      }
    }else if(s==='disp1'||s==='disp2'){
      for(const k of keys){
        const ds=k.split('|')[0];
        const list=doctors.filter(d=>dispOK(a,d,ds,s))
          .sort((p,q)=>dispCount(a,p.name,m,s)-dispCount(a,q.name,m,s)||monthEq(a,p.name,m)-monthEq(a,q.name,m));
        if(list[0])assign(a,g,e,k,list[0].name,false);
      }
    }else{
      const isOp=['op1','op2','oppom'].includes(s);
      const ranked=keys.map(k=>{
        const ds=k.split('|')[0];
        return {k,count:doctors.reduce((q,d)=>q+((isOp?canOperatingAll(a,d,s,ds,m):can(a,d,s,ds,m,false,false))?1:0),0)};
      }).sort((p,q)=>p.count-q.count||p.k.localeCompare(q.k));

      for(const {k} of ranked){
        if(a[k]&&a[k]!=='NESSUNO')continue;
        const ds=k.split('|')[0];
        const list=isOp
          ? balancedOperatingCandidates(a,doctors,s,ds,m)
          : cand(doctors,a,s,ds,m,false,false);
        if(list[0])assign(a,g,e,k,list[0].name,false);
        // Nessun candidato valido: non forzare sovrapposizioni, ferie, guardie,
        // post-guardia, tetto settimanale o altri vincoli; lasciare vuoto.
      }
    }
    }

    normalizeExtras(a,g,e,doctors,m);

    const finalSchedule={...fullSchedule};
    for(const k of Object.keys(finalSchedule))if(k.startsWith(m+'-'))delete finalSchedule[k];
    for(const[k,v]of Object.entries(a))if(k.startsWith(m+'-')&&v)finalSchedule[k]=v;

    await setDoc(root,{
      schedule:finalSchedule,
      generatedKeys:[...g],
      extraKeys:[...e],
      openedStructuralKeys:[...new Set([...(x.openedStructuralKeys||[]),...opened])],
      updatedAt:new Date().toISOString()
    },{merge:true});
    location.reload();
  }finally{
    if(b){b.disabled=false;b.textContent='GENERA COLONNA'}
  }
}
function ensureColumnGeneratorUI(){
  if($('generateColumnSelect')&&$('generateColumnBtn'))return;
  const wrap=document.querySelector('#turni .draftActions'),anchor=$('generate');
  if(!wrap||!anchor)return;
  const sel=document.createElement('select');
  sel.id='generateColumnSelect';
  sel.title='Seleziona la colonna da compilare';
  sel.style.cssText='min-width:155px;padding:7px 8px;border:1px solid #94a3b8;border-radius:6px;background:#fff';
  sel.innerHTML=COLUMN_GENERATORS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  const btn=document.createElement('button');
  btn.id='generateColumnBtn';btn.type='button';btn.textContent='GENERA COLONNA';
  btn.style.cssText='background:#0f766e!important;border-color:#0f766e!important;color:#fff!important;font-weight:800!important';
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();generateColumnV1().catch(err=>alert('Errore generazione colonna: '+err.message))});
  wrap.insertBefore(sel,anchor);
  wrap.insertBefore(btn,anchor);
}
async function generateV2(){let m=$('month')?.value;if(!m)return;localStorage.setItem('turniLastMonth',m);let b=$('generate');if(b){b.disabled=true;b.textContent='GENERAZIONE…'}try{
  const esamiOpenKeys=new Set([...document.querySelectorAll('#schedule select[data-k*="|esami|"]')].filter(sel=>sel.dataset.k?.startsWith(m+'-')&&!sel.value).map(sel=>sel.dataset.k));
  const openedStructuralKeys=new Set([...document.querySelectorAll('#schedule select[data-k]')].filter(sel=>{
    const k=sel.dataset.k;if(!k||!k.startsWith(m+'-')||sel.value)return false;
    const [ds,s,i]=k.split('|');
    return REQ.includes(s)&&structuralDefault(m,ds,s,Number(i))==='NESSUNO';
  }).map(sel=>sel.dataset.k));
  await new Promise(r=>setTimeout(r,30));
  let x=await cloud(),
      doctors=(x.doctors||[]).filter(d=>d.active&&d.cat!=='Contratto'&&d.name!=='PINI'&&d.name!=='ARMATO'&&d.name!=='LONDEI'),
      fullSchedule={...(x.schedule||{})},
      keepMonths=new Set(triMonths(m)),
      a=Object.fromEntries(Object.entries(fullSchedule).filter(([k])=>keepMonths.has(k.slice(0,7)))),
      g=new Set(x.generatedKeys||[]),
      e=new Set(x.extraKeys||[]),
      baseline={...(x.savedStates?.[m]||{})};

  for(const k of [...(x.openedStructuralKeys||[]),...((x.savedOpenedStates?.[m])||[])])if(k.startsWith(m+'-'))openedStructuralKeys.add(k);
  for(const[k]of Object.entries(baseline))if(k.includes('|ferie|'))delete baseline[k];
  for(const k of openedStructuralKeys)delete baseline[k];
  let protectedKeys=new Set(Object.keys(baseline)),
      [y,mo]=m.split('-').map(Number),
      days=new Date(y,mo,0).getDate(),
      dates=monthDays(m,days,y,mo);

  clear(a,g,e,m,doctors,protectedKeys);
  for(const k of Object.keys(a))if(k.startsWith(m+'-')&&k.includes('|ferie|'))delete a[k];
  for(const[k,v]of Object.entries(baseline))if(k.startsWith(m+'-'))a[k]=v;
  applyStructuralDefaults(a,m,days,y,mo,protectedKeys);
  for(const k of openedStructuralKeys){
    delete a[k];protectedKeys.delete(k);g.delete(k);e.delete(k)
  }
  // AMB ESAMI: solo le celle visibilmente VUOTE al click su GENERA BOZZA sono generabili.
  // Tutte le altre (NESSUNO o già compilate) vengono protette.
  for(const {ds} of dates){
    const k=K(ds,'esami',0);
    if(esamiOpenKeys.has(k)){
      delete a[k];
      protectedKeys.delete(k);
      g.delete(k);e.delete(k);
    }else{
      if(!a[k])a[k]='NESSUNO';
      protectedKeys.add(k);
      g.delete(k);e.delete(k);
    }
  }

  let absence=x.absenceManagement||{},byDate={};
  for(const[n,ds]of Object.entries(absence))for(const date of ds||[])if(date.startsWith(m+'-')){
    byDate[date]??=[];if(!byDate[date].includes(n))byDate[date].push(n)
  }
  for(const[date,names]of Object.entries(byDate))names.slice(0,4).forEach((n,i)=>a[K(date,'ferie',i)]=n);
  if(m<'2026-11')for(const{ds}of dates){let k=K(ds,'esami',0);if(!protectedKeys.has(k)&&!a[k])a[k]='NESSUNO'}

  // A. Regole fisse.
  applySaturdayContinuity(a,g,e,doctors,m,protectedKeys);
  assignCiprian(a,g,e,m,days,y,mo,protectedKeys);

  // B. Unica generazione di tutti i servizi richiesti.
  assignUnifiedRequired(a,g,e,doctors,m,dates,protectedKeys);

  // Celle strutturalmente NESSUNO che l'utente ha liberato manualmente:
  // diventano celle generabili per questa bozza, incluse le seconde celle opzionali.
  fillManuallyOpenedCells(a,g,e,doctors,m,openedStructuralKeys);

  // Disponibilità dopo i servizi.
  for(const{ds}of dates){
    assignDisp(a,g,e,doctors,ds,m,'disp1',protectedKeys);
    assignDisp(a,g,e,doctors,ds,m,'disp2',protectedKeys);
  }

  // C. Secondo passaggio: extra consentiti, target e 36h non bloccano.
  emergencyCoverageFill(a,g,e,doctors,m,days,y,mo,protectedKeys);
  finalDirectCoverageFill(a,g,e,doctors,m,days,y,mo,protectedKeys);

  // D. Backtracking piccolo solo sui buchi residui.
  if(unresolved(a,m,days,y,mo,protectedKeys).length){
    finalHoleRepair(a,g,e,doctors,m,days,y,mo,protectedKeys);
    finalDirectCoverageFill(a,g,e,doctors,m,days,y,mo,protectedKeys);
  }

  // E. Solo a copertura completata: riequilibrio leggero OP (tolleranza gestita dalla funzione corrente).
  if(!unresolved(a,m,days,y,mo,protectedKeys).length){
    ensureCalzavaraPom(a,g,e,doctors,m,dates,protectedKeys);
  }

  normalizeExtras(a,g,e,doctors,m);
  let u=unresolved(a,m,days,y,mo,protectedKeys),allU=new Set(x.unresolvedKeys||[]);
  for(const k of [...allU])if(k.startsWith(m+'-'))allU.delete(k);
  u.forEach(k=>allU.add(k));
  let finalSchedule={...fullSchedule};
  for(const k of Object.keys(finalSchedule))if(k.startsWith(m+'-'))delete finalSchedule[k];
  for(const[k,v]of Object.entries(a))if(k.startsWith(m+'-'))finalSchedule[k]=v;

  await setDoc(root,{schedule:finalSchedule,generatedKeys:[...g],extraKeys:[...e],unresolvedKeys:[...allU],updatedAt:new Date().toISOString()},{merge:true});
  location.reload();
}finally{if(b){b.disabled=false;b.textContent='GENERA BOZZA'}}}
function ensureStyle(){if(document.getElementById('unresolvedStyle'))return;let s=document.createElement('style');s.id='unresolvedStyle';s.textContent='select.unresolvedShift{background:#fff3cd!important;border:3px solid #f59e0b!important;box-shadow:0 0 0 1px #b45309!important}';document.head.appendChild(s)}
async function paintUnresolved(){ensureStyle();let x=await cloud(),u=new Set(x.unresolvedKeys||[]),m=$('month')?.value||'';document.querySelectorAll('#schedule select[data-k]').forEach(s=>s.classList.toggle('unresolvedShift',!!m&&u.has(s.dataset.k)))}
function restoreMonth(){let el=$('month'),m=localStorage.getItem('turniLastMonth');if(el&&m&&/^\d{4}-\d{2}$/.test(m))el.value=m}
function install(){ensureColumnGeneratorUI();if(document.documentElement.dataset.schedulerV11)return;document.documentElement.dataset.schedulerV11='1';document.addEventListener('click',q=>{let b=q.target.closest?.('#generate');if(!b)return;q.preventDefault();q.stopImmediatePropagation();generateV2().catch(err=>alert('Errore generazione: '+err.message))},true);document.addEventListener('change',e=>{let s=e.target;if(s?.matches?.('#schedule select.unresolvedShift'))s.classList.remove('unresolvedShift')},true)}
function start(){restoreMonth();ensureColumnGeneratorUI();install();paintUnresolved();new MutationObserver(()=>{ensureColumnGeneratorUI();install();paintUnresolved()}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();