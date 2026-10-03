document.addEventListener('DOMContentLoaded',async()=>{
  const user=ES.guard();
  if(!user)return;
  if(!['organizer','admin'].includes(user.role)){location.href='dashboard.html';return;}
  const listEl=document.querySelector('#manage-list');
  const search=document.querySelector('#manage-search');
  const status=document.querySelector('#manage-status');
  let events=[];

  async function load(){
    try{
      events=(await ES.api('/events/manage/list')).filter(e=>String(e.status||'')!=='cancelled');
      draw();
    }catch(err){ES.toast(err.message||'Could not load events','error');}
  }

  function draw(){
    const q=String(search?.value||'').toLowerCase().trim();
    const st=status?.value||'all';
    const rows=events.filter(e=>{
      const hay=`${e.title||''} ${e.category||''} ${e.city||''} ${e.venue||''}`.toLowerCase();
      return (!q||hay.includes(q))&&(st==='all'||String(e.status||'')===st);
    });
    listEl.innerHTML=rows.length?rows.map(e=>`<article class="list-item event-manage-row"><div class="mini"><div class="thumb" style="background-image:url('${ES.img(e.image)}')"></div><div><strong>${ES.esc(e.title)}</strong><small class="muted">${ES.esc(e.city||'')} · ${ES.esc(e.venue||'')} · ${ES.date(e.date)} · ${ES.time(e.time||'')} · ${ES.seats(e)} seats left · ${Number(e.registeredCount||0)} registered</small></div></div><div class="toolbar"><span class="pill">${ES.esc(e.status||'published')}</span><a class="btn btn-small btn-ghost" href="event-details.html?id=${encodeURIComponent(e.id)}">View</a><button class="btn btn-small btn-ghost" data-cancel="${ES.esc(e.id)}">Cancel event</button><button class="btn btn-small btn-danger" data-remove="${ES.esc(e.id)}">Remove</button></div></article>`).join(''):'<div class="empty">No active events match your filters.</div>';
    listEl.querySelectorAll('[data-cancel]').forEach(btn=>btn.onclick=()=>cancel(btn.dataset.cancel));
    listEl.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>remove(btn.dataset.remove));
  }

  async function cancel(id){
    if(!confirm('Cancel this event? It will disappear from public listings and active tickets will be cancelled.'))return;
    try{await ES.api('/events/'+encodeURIComponent(id),{method:'PATCH',body:{status:'cancelled'}});events=events.filter(e=>String(e.id)!==String(id));ES.toast('Event cancelled and removed from this list','success');draw();}catch(err){ES.toast(err.message||'Could not cancel event','error')}
  }

  async function remove(id){
    if(!confirm('Permanently remove this event? This cannot be undone.'))return;
    try{await ES.api('/events/'+encodeURIComponent(id),{method:'DELETE'});events=events.filter(e=>String(e.id)!==String(id));ES.toast('Event removed from EventSphere','success');draw();}catch(err){ES.toast(err.message||'Could not remove event','error')}
  }

  search?.addEventListener('input',draw);
  status?.addEventListener('change',draw);
  await load();
});
