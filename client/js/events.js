
document.addEventListener('DOMContentLoaded',async()=>{
  const grid=document.querySelector('#events-grid'),search=document.querySelector('#event-search');
  const all=(await ES.events()).filter(e=>!ES.registrationDeadlinePassed(e));let cat='All', sort='date';
  const loadRecommendations=async()=>{
    if(!ES.session.getToken())return;
    try{
      const recs=await ES.api('/recommendations');
      if(!Array.isArray(recs)||!recs.length)return;
      const section=document.querySelector('#recommendations-section');
      const rg=document.querySelector('#recommendations-grid');
      if(!section||!rg)return;
      section.hidden=false;
      rg.innerHTML=recs.slice(0,3).map(e=>renderEventCard(e)).join('');
      activateCards(rg);requestAnimationFrame(()=>rg.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible')));
    }catch{}
  };
  function draw(){
    const q=(search.value||'').trim().toLowerCase();
    const city=(document.querySelector('#city-filter')?.value||'').trim().toLowerCase();
    const maxPrice=document.querySelector('#price-filter')?.value;
    const dateFrom=document.querySelector('#date-filter')?.value;
    const availability=document.querySelector('#availability-filter')?.value||'all';
    let list=all.filter(e=>{
      const text=`${e.title} ${e.venue||''} ${e.city||''} ${e.category||''}`.toLowerCase();
      const okCity=!city||text.includes(city), okQ=!q||text.includes(q);
      const okPrice=!maxPrice||Number(e.price||0)<=Number(maxPrice);
      const okDate=!dateFrom||new Date(e.date)>=new Date(dateFrom);
      const okAvail=availability==='all'||(availability==='available'&&ES.seats(e)>0)||(availability==='free'&&Number(e.price||0)===0);
      return (cat==='All'||e.category===cat)&&okQ&&okCity&&okPrice&&okDate&&okAvail;
    });
    if(sort==='price')list.sort((a,b)=>(a.price||0)-(b.price||0));
    else if(sort==='popular')list.sort((a,b)=>(b.registeredCount||0)-(a.registeredCount||0));
    else list.sort((a,b)=>new Date(a.date)-new Date(b.date));
    document.querySelector('#result-count').textContent=`${list.length} event${list.length===1?'':'s'} found`;
    grid.innerHTML=list.length?list.map(renderEventCard).join(''):`<div class="glass-panel panel" style="grid-column:1/-1"><h3>No events found</h3><p class="muted">Try a different search or category.</p></div>`;
    activateCards(grid);requestAnimationFrame(()=>grid.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible')));
  }
  document.querySelector('#advanced-toggle')?.addEventListener('click',()=>document.querySelector('#advanced-filters').classList.toggle('open'));
  ['city-filter','price-filter','date-filter','availability-filter'].forEach(id=>document.querySelector('#'+id)?.addEventListener('input',draw));
  document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');cat=b.dataset.cat;draw()});
  search.addEventListener('input',draw);
  document.querySelector('#sort')?.addEventListener('change',e=>{sort=e.target.value;draw()});
  draw();
  loadRecommendations();
});
