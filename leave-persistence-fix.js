// FERIE-VARIE: evita il secondo gestore di salvataggio di enhancements.js.
// Le 4 caselle sono gia' create e salvate da app.js; NESSUNO viene salvato
// come valore esplicito, cosi' la modifica resta persistente dopo il reload.
function useNativeLeavePersistence(){
  const schedule=document.getElementById('schedule');
  if(!schedule)return;
  schedule.dataset.leavePersistence='1';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',useNativeLeavePersistence);else useNativeLeavePersistence();
