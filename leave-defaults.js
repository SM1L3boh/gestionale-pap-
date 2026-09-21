// FERIE-VARIE: tutte le caselle vuote mostrano NESSUNO di default.
function applyLeaveDefaults(){
  document.querySelectorAll('#schedule select[data-k*="|ferie|"]').forEach(s=>{
    if(![...s.options].some(o=>o.value==='NESSUNO')){
      const o=document.createElement('option');o.value='NESSUNO';o.textContent='NESSUNO';s.insertBefore(o,s.options[1]||null);
    }
    if(!s.value)s.value='NESSUNO';
  });
}
function startLeaveDefaults(){
  applyLeaveDefaults();
  const schedule=document.getElementById('schedule');
  if(schedule)new MutationObserver(applyLeaveDefaults).observe(schedule,{childList:true,subtree:true});
  document.getElementById('month')?.addEventListener('change',()=>setTimeout(applyLeaveDefaults,100));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLeaveDefaults);else startLeaveDefaults();
setTimeout(applyLeaveDefaults,400);setTimeout(applyLeaveDefaults,1200);
