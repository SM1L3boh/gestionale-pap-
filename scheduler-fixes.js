import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $=id=>document.getElementById(id),cfg=await(await fetch('/__/firebase/init.json')).json(),fb=getApps()[0]||initializeApp(cfg),db=getFirestore(fb),root=doc(db,'gestionale','dati'),K=(d,s,i)=>`${d}|${s}|${i}`;
const AM=['gessi','reparto','amb','esami','op1','op2'],PM=['gessirep','oppom'],DAY=[...AM,...PM],REQ=['op1','op2','oppom','gessi','gessirep','reparto','amb'],OR=['op1','op2','oppom'],OPFIRST=['oppom','op1','op2'],REST=['gessi','gessirep','reparto','amb'];
const RULES={
'PINI':{manual:true},
'VIALE':{freePm:[3]},
'CALZAVARA':{freePm:[2]},
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
function hrs(s,dt){if(s==='guardia')return 12;if(s==='ferie'||s==='giorno')return 6;if(['disp1','disp2'].includes(s))return[0,6].includes(dt.getDay())?6:0;return 6}
function leave(a,ds,n){return[0,1,2,3].some(i=>a[K(ds,'ferie',i)]===n)}
function wk(ds){let d=new Date(ds+'T12:00:00'),w=d.getDay()||7;d.setDate(d.getDate()-w+1);return d.toISOString().slice(0,10)}
function weekHours(a,n,ds){let q=0,W=wk(ds);for(const[k,v]of Object.entries(a))if(v===n){let[x,s]=k.split('|');if(wk(x)===W)q+=hrs(s,new Date(x+'T12:00:00'))}return q}
function monthEq(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')){let[ds,s]=k.split('|');q+=hrs(s,new Date(ds+'T12:00:00'))/6}return q}
function orCount(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&OR.includes(k.split('|')[1]))q++;return q}
function prevMonths(m){let[y,mo]=m.split('-').map(Number),out=[];for(let i=1;i<=2;i++){let d=new Date(y,mo-1-i,1,12);out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}return out}
function hasPrevHistory(a,m){let pm=prevMonths(m);return Object.keys(a).some(k=>pm.some(x=>k.startsWith(x+'-')))}
function triMonths(m){return[m,...prevMonths(m)]}
function triOpCount(a,n,m){if(!hasPrevHistory(a,m))return orCount(a,n,m);let ms=triMonths(m),q=0;for(const[k,v]of Object.entries(a))if(v===n&&ms.some(x=>k.startsWith(x+'-'))&&OR.includes(k.split('|')[1]))q++;return q}
function triEqCount(a,n,m){if(!hasPrevHistory(a,m))return monthEq(a,n,m);let ms=triMonths(m),q=0;for(const[k,v]of Object.entries(a))if(v===n&&ms.some(x=>k.startsWith(x+'-'))){let[ds,s]=k.split('|');q+=hrs(s,new Date(ds+'T12:00:00'))/6}return q}
function triPenalty(doctors,a,n,m,kind){if(!hasPrevHistory(a,m))return 0;let ss=doctors.filter(d=>d.cat==='Strutturato'&&!manualOnly(d)),vals=ss.map(d=>(kind==='op'?triOpCount:triEqCount)(a,d.name,m)),v=(kind==='op'?triOpCount:triEqCount)(a,n,m)+1,others=ss.filter(d=>d.name!==n).map(d=>(kind==='op'?triOpCount:triEqCount)(a,d.name,m));let all=[...others,v],spread=Math.max(...all)-Math.min(...all);return Math.max(0,spread-4)}
function opMatCount(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&['op1','op2'].includes(k.split('|')[1]))q++;return q}
function opPomCount(a,n,m){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&k.split('|')[1]==='oppom')q++;return q}
function shiftDay(ds,delta){let d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+delta);return d.toISOString().slice(0,10)}
function hasSameShift(a,n,s,ds){return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|'+s+'|'))}
function createsThreeConsecutive(a,n,s,ds){if(!REQ.includes(s))return false;let h=o=>hasSameShift(a,n,s,shiftDay(ds,o));return(h(-2)&&h(-1))||(h(-1)&&h(1))||(h(1)&&h(2))}
function hasBand(a,n,ds,band){let set=band==='am'?AM:PM;return Object.entries(a).some(([k,v])=>v===n&&k.startsWith(ds+'|')&&set.includes(k.split('|')[1]))}
function doubles(a,n,ds){let W=wk(ds),d={};for(const[k,v]of Object.entries(a))if(v===n){let[x,s]=k.split('|');if(wk(x)===W&&DAY.includes(s)){d[x]??={am:false,pm:false};if(AM.includes(s))d[x].am=true;if(PM.includes(s))d[x].pm=true}}return Object.values(d).filter(x=>x.am&&x.pm).length}
function guard(a,ds,n){return a[K(ds,'guardia',0)]===n}function prev(ds){return shiftDay(ds,-1)}
function freePm(d,w){return(d?.constraints?.freePm||RULES[d?.name]?.freePm||[]).includes(w)}
function eligible(d,s,dt,force=false){let n=d.name,w=dt.getDay(),r=rule(d);if(manualOnly(d))return false;if(r.days&&!r.days.includes(w))return false;if(r.services&&!r.services.includes(s))return false;if(!force&&PM.includes(s)&&freePm(d,w))return false;return d.cat==='Strutturato'||n==='CIPRIAN'}
function can(a,d,s,ds,m,extra=false,force=false){let dt=new Date(ds+'T12:00:00'),n=d.name;if(leave(a,ds,n)||guard(a,ds,n)||guard(a,prev(ds),n)||!eligible(d,s,dt,force)||(n!=='CIPRIAN'&&createsThreeConsecutive(a,n,s,ds)))return false;let weeklyCap=Math.min(Number(d.hours)||36,36);if(weekHours(a,n,ds)+hrs(s,dt)>weeklyCap)return false;if(AM.includes(s)){if(hasBand(a,n,ds,'am'))return false;if(hasBand(a,n,ds,'pm')&&doubles(a,n,ds)>=1)return false}if(PM.includes(s)){if(hasBand(a,n,ds,'pm'))return false;if(hasBand(a,n,ds,'am')&&doubles(a,n,ds)>=1)return false}return extra||n==='CIPRIAN'||monthEq(a,n,m)+hrs(s,dt)/6<=target(n,m)}
function assign(a,g,e,k,n,x=false){a[k]=n;g.add(k);x?e.add(k):e.delete(k)}
function clear(a,g,e,m,doctors,protectedKeys){let contracts=new Set(doctors.filter(manualOnly).map(d=>d.name));for(const k of [...g])if(k.startsWith(m+'-')){if(protectedKeys.has(k)||contracts.has(a[k])){g.delete(k);e.delete(k);continue}delete a[k];g.delete(k);e.delete(k)}}
function slots(s){return['gessi','amb','gessirep'].includes(s)?[0]:[0,1]}
function dispCount(a,n,m,s){let q=0;for(const[k,v]of Object.entries(a))if(v===n&&k.startsWith(m+'-')&&k.split('|')[1]===s)q++;return q}
function dispOK(a,d,ds,s){let n=d.name;if(d.cat!=='Strutturato'||manualOnly(d)||leave(a,ds,n)||guard(a,ds,n)||guard(a,prev(ds),n))return false;let other=s==='disp1'?'disp2':'disp1';return a[K(ds,other,0)]!==n}
function assignDisp(a,g,e,doctors,ds,m,s,protectedKeys){let k=K(ds,s,0);if(protectedKeys.has(k)||a[k]&&a[k]!=='NESSUNO')return;let c=doctors.filter(d=>dispOK(a,d,ds,s)).sort((x,y)=>dispCount(a,x.name,m,s)-dispCount(a,y.name,m,s)||monthEq(a,x.name,m)-monthEq(a,y.name,m));if(c[0])assign(a,g,e,k,c[0].name)}
function opWeeksInMonth(m){let[y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate(),weeks=new Set();for(let d=1;d<=days;d++){let dt=new Date(y,mo-1,d,12);if(dt.getDay()!==0&&dt.getDay()!==6&&!holiday(dt))weeks.add(wk(`${m}-${String(d).padStart(2,'0')}`))}return weeks.size}
function calzavaraOpPenalty(){return 0}
function cand(doctors,a,s,ds,m,x=false,force=false){let list=doctors.filter(d=>can(a,d,s,ds,m,x,force)),score=new Map(list.map(d=>[d.name,{cal:OR.includes(s)?calzavaraOpPenalty(doctors,a,d.name,m):0,calPomNeed:s==='oppom'&&d.name==='CALZAVARA'&&opPomCount(a,d.name,m)<1?-1000:0,opm:OR.includes(s)?orCount(a,d.name,m):0,mat:['op1','op2'].includes(s)?opMatCount(a,d.name,m):0,pom:s==='oppom'?opPomCount(a,d.name,m):0,op:OR.includes(s)?triOpCount(a,d.name,m):0,eq:triEqCount(a,d.name,m),mon:monthEq(a,d.name,m),wk:weekHours(a,d.name,ds)}]));return list.sort((p,q)=>{let P=score.get(p.name),Q=score.get(q.name);if(OR.includes(s))return P.calPomNeed-Q.calPomNeed||P.cal-Q.cal||P.opm-Q.opm||(s==='oppom'?P.pom-Q.pom:P.mat-Q.mat)||P.mon-Q.mon||P.op-Q.op||P.eq-Q.eq||P.wk-Q.wk;return P.mon-Q.mon||P.eq-Q.eq||P.wk-Q.wk})}
function monthDays(m,days,y,mo){let out=[];for(let day=1;day<=days;day++){let dt=new Date(y,mo-1,day,12),w=dt.getDay();if(w===0||w===6||holiday(dt))continue;out.push({dt,ds:`${m}-${String(day).padStart(2,'0')}`})}return out}
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
    return missing*100000+(calPom<1?20000:0)+spread(pomVals)*5000+spread(opVals)*2500+spread(monVals)*300+variance;
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
        let z=(s==='oppom'?pom*120:op*90)+op*55+mon*12+wkH*2+triOpCount(A,d.name,m)*3+rnd()*8;
        if(s==='oppom'&&d.name==='CALZAVARA'&&beforePom<1)z-=350;
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
  while(opSpread()>1&&guard++<800){
    const ordered=[...cohort].sort((p,q)=>op(p.name)-op(q.name)||tot(p.name)-tot(q.name));
    let changed=false;
    for(const low of ordered){
      for(const high of [...ordered].reverse()){
        if(op(high.name)-op(low.name)<=1)continue;
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
  while(spread()>1&&guard++<500){
    const ordered=[...cohort].sort((p,q)=>pom(p.name)-pom(q.name)||orCount(a,p.name,m)-orCount(a,q.name,m));
    let changed=false;
    for(const low of ordered){
      for(const high of [...ordered].reverse()){
        if(pom(high.name)-pom(low.name)<=1)continue;
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
              if(spread()<before && afterOpSpread<=1 && afterOpSpread<=beforeOpSpread && opPomCount(a,'CALZAVARA',m)>=1){
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
function normalizeExtras(a,g,e,doctors,m){for(const k of [...e])if(k.startsWith(m+'-'))e.delete(k);for(const d of doctors){if(manualOnly(d))continue;let over=Math.max(0,monthEq(a,d.name,m)-target(d.name,m));if(!over)continue;let keys=[...g].filter(k=>k.startsWith(m+'-')&&a[k]===d.name&&REQ.includes(k.split('|')[1])).sort().reverse();for(const k of keys){if(over<=0)break;e.add(k);over-=1}}}
function unresolved(a,m,days,y,mo,protectedKeys){let u=[];for(let day=1;day<=days;day++){let dt=new Date(y,mo-1,day,12),w=dt.getDay(),ds=`${m}-${String(day).padStart(2,'0')}`;if(w===0||w===6||holiday(dt))continue;for(const s of REQ)for(const i of slots(s)){let k=K(ds,s,i);if(protectedKeys.has(k))continue;if(!a[k]||a[k]==='NESSUNO')u.push(k)}}return u}
async function generateV2(){let m=$('month')?.value;if(!m)return;localStorage.setItem('turniLastMonth',m);let b=$('generate');if(b){b.disabled=true;b.textContent='GENERAZIONE…'}try{await new Promise(r=>setTimeout(r,50));let x=await cloud(),doctors=(x.doctors||[]).filter(d=>d.active&&d.cat!=='Contratto'&&d.name!=='PINI'&&d.name!=='ARMATO'&&d.name!=='LONDEI'),fullSchedule={...(x.schedule||{})},keepMonths=new Set(triMonths(m)),a=Object.fromEntries(Object.entries(fullSchedule).filter(([k])=>keepMonths.has(k.slice(0,7)))),g=new Set(x.generatedKeys||[]),e=new Set(x.extraKeys||[]),baseline={...(x.savedStates?.[m]||{})};for(const[k]of Object.entries(baseline))if(k.includes('|ferie|'))delete baseline[k];let protectedKeys=new Set(Object.keys(baseline)),[y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate(),dates=monthDays(m,days,y,mo);clear(a,g,e,m,doctors,protectedKeys);for(const k of Object.keys(a))if(k.startsWith(m+'-')&&k.includes('|ferie|'))delete a[k];for(const[k,v]of Object.entries(baseline))if(k.startsWith(m+'-'))a[k]=v;let absence=x.absenceManagement||{},byDate={};for(const[n,ds]of Object.entries(absence))for(const date of ds||[])if(date.startsWith(m+'-')){byDate[date]??=[];if(!byDate[date].includes(n))byDate[date].push(n)}for(const[date,names]of Object.entries(byDate))names.slice(0,4).forEach((n,i)=>a[K(date,'ferie',i)]=n);for(const{ds}of dates){let k=K(ds,'esami',0);if(!protectedKeys.has(k)&&!a[k])a[k]='NESSUNO'}await optimizeOperatingBlock(a,g,e,doctors,m,dates,protectedKeys);assignCiprian(a,g,e,m,days,y,mo,protectedKeys);for(const s of REST)assignServiceMonth(a,g,e,doctors,m,dates,s,protectedKeys);for(const{ds}of dates){assignDisp(a,g,e,doctors,ds,m,'disp1',protectedKeys);assignDisp(a,g,e,doctors,ds,m,'disp2',protectedKeys)}fillHoles(a,g,e,doctors,m,days,y,mo,protectedKeys);assignCiprian(a,g,e,m,days,y,mo,protectedKeys);backtrackFill(a,g,e,doctors,m,days,y,mo,protectedKeys);ensureCalzavaraPom(a,g,e,doctors,m,dates,protectedKeys);rebalanceStructuredTotals(a,g,e,doctors,m,protectedKeys);ensureCalzavaraPom(a,g,e,doctors,m,dates,protectedKeys);rebalanceOpTotals(a,g,e,doctors,m,protectedKeys);ensureCalzavaraPom(a,g,e,doctors,m,dates,protectedKeys);rebalanceOpPomTotals(a,g,e,doctors,m,protectedKeys);rebalanceStructuredTotals(a,g,e,doctors,m,protectedKeys);rebalanceOpTotals(a,g,e,doctors,m,protectedKeys);rebalanceOpPomTotals(a,g,e,doctors,m,protectedKeys);normalizeExtras(a,g,e,doctors,m);let u=unresolved(a,m,days,y,mo,protectedKeys),allU=new Set(x.unresolvedKeys||[]);for(const k of [...allU])if(k.startsWith(m+'-'))allU.delete(k);u.forEach(k=>allU.add(k));let finalSchedule={...fullSchedule};for(const k of Object.keys(finalSchedule))if(k.startsWith(m+'-'))delete finalSchedule[k];for(const[k,v]of Object.entries(a))if(k.startsWith(m+'-'))finalSchedule[k]=v;await setDoc(root,{schedule:finalSchedule,generatedKeys:[...g],extraKeys:[...e],unresolvedKeys:[...allU],updatedAt:new Date().toISOString()},{merge:true});location.reload()}finally{if(b){b.disabled=false;b.textContent='GENERA BOZZA'}}}
function ensureStyle(){if(document.getElementById('unresolvedStyle'))return;let s=document.createElement('style');s.id='unresolvedStyle';s.textContent='select.unresolvedShift{background:#fff3cd!important;border:3px solid #f59e0b!important;box-shadow:0 0 0 1px #b45309!important}';document.head.appendChild(s)}
async function paintUnresolved(){ensureStyle();let x=await cloud(),u=new Set(x.unresolvedKeys||[]),m=$('month')?.value||'';document.querySelectorAll('#schedule select[data-k]').forEach(s=>s.classList.toggle('unresolvedShift',!!m&&u.has(s.dataset.k)))}
function restoreMonth(){let el=$('month'),m=localStorage.getItem('turniLastMonth');if(el&&m&&/^\d{4}-\d{2}$/.test(m))el.value=m}
function install(){if(document.documentElement.dataset.schedulerV11)return;document.documentElement.dataset.schedulerV11='1';document.addEventListener('click',q=>{let b=q.target.closest?.('#generate');if(!b)return;q.preventDefault();q.stopImmediatePropagation();generateV2().catch(err=>alert('Errore generazione: '+err.message))},true);document.addEventListener('change',e=>{let s=e.target;if(s?.matches?.('#schedule select.unresolvedShift'))s.classList.remove('unresolvedShift')},true)}
function start(){restoreMonth();install();paintUnresolved();new MutationObserver(()=>{install();paintUnresolved()}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();