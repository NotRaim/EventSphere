document.addEventListener('DOMContentLoaded',async()=>{
  const grid=document.querySelector('#for-you-events'); if(!grid)return;
  const all=await ES.events(); let chosen=(await ES.remotePrefs()).interests||[];
  if(!chosen.length) chosen=['Music','Food'];
  const buttons=[...document.querySelectorAll('[data-interest]')];
  buttons.forEach(b=>{b.classList.toggle('active',chosen.includes(b.dataset.interest));b.onclick=async()=>{const x=b.dataset.interest;chosen=chosen.includes(x)?chosen.filter(i=>i!==x):[...chosen,x];if(!chosen.length)chosen=[x];await ES.remoteSavePrefs({...await ES.remotePrefs(),interests:chosen});buttons.forEach(y=>y.classList.toggle('active',chosen.includes(y.dataset.interest)));draw()}});
  function draw(){
    let list=all.filter(e=>chosen.includes(e.category));
    if(list.length<4)list=[...list,...all.filter(e=>!chosen.includes(e.category))];
    grid.innerHTML=list.slice(0,4).map(renderEventCard).join('');activateCards(grid);requestAnimationFrame(()=>grid.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible')));
  }
  draw();
});
