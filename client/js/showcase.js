document.addEventListener('DOMContentLoaded',async()=>{
  const grid=document.querySelector('#for-you-events'); if(!grid)return;
  const all=(await ES.events()).filter(e=>!ES.registrationDeadlinePassed(e));
  const prefs=await ES.remotePrefs();
  let chosen=prefs.interests||[];
  if(!chosen.length) chosen=['Music','Food'];
  const buttons=[...document.querySelectorAll('[data-interest]')];
  buttons.forEach(b=>{b.classList.toggle('active',chosen.includes(b.dataset.interest));b.onclick=async()=>{const x=b.dataset.interest;chosen=chosen.includes(x)?chosen.filter(i=>i!==x):[...chosen,x];if(!chosen.length)chosen=[x];prefs.interests=chosen;await ES.remoteSavePrefs({...prefs,interests:chosen});buttons.forEach(y=>y.classList.toggle('active',chosen.includes(y.dataset.interest)));draw()}});
  function draw(){
    let list=all.filter(e=>chosen.includes(e.category));
    if(list.length<4)list=[...list,...all.filter(e=>!chosen.includes(e.category))];
    list=ES.recommendEvents(list,prefs);
    grid.innerHTML=list.slice(0,4).map(renderEventCard).join('');
    activateCards(grid);
    requestAnimationFrame(()=>grid.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible')));
  }
  draw();
});
