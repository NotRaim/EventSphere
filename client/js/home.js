
document.addEventListener('DOMContentLoaded',async()=>{
  const grid=document.querySelector('#featured-events'); if(!grid)return;
  const list=(await ES.events()).filter(e=>!ES.registrationDeadlinePassed(e)).slice(0,6);
  grid.innerHTML=list.map(renderEventCard).join('');
  grid.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));
  activateCards(grid);

  // Animated stat counters
  document.querySelectorAll('[data-count]').forEach(el=>{
    const target=Number(el.dataset.count), duration=1200, start=performance.now();
    const tick=t=>{const p=Math.min(1,(t-start)/duration);el.textContent=Math.round((1-Math.pow(1-p,3))*target).toLocaleString();if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)
  });
});
