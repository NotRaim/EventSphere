document.addEventListener('DOMContentLoaded',async()=>{
  const user=ES.guard();if(!user)return;
  const list=await ES.events(),favs=await ES.remoteFavorites(),tickets=await ES.remoteTickets(),prefs=await ES.remotePrefs();
  document.querySelector('#saved-count').textContent=favs.length;
  document.querySelector('#ticket-count').textContent=tickets.length;
  document.querySelector('#interest-count').textContent=(prefs.interests||[]).length;
  const upcoming=tickets.filter(t=>new Date(t.date)>=new Date()).slice(0,3);document.querySelector('#upcoming-count').textContent=upcoming.length;
  const up=document.querySelector('#upcoming-events');
  up.innerHTML=upcoming.length?upcoming.map(t=>`<article class="upcoming-card glass-panel reveal"><div class="upcoming-date"><strong>${new Date(t.date).toLocaleDateString('en-IN',{day:'2-digit'})}</strong><span>${new Date(t.date).toLocaleDateString('en-IN',{month:'short'}).toUpperCase()}</span></div><div><div class="section-kicker">${ES.time(t.time||'')}</div><h3>${ES.esc(t.eventTitle)}</h3><p class="muted">⌖ ${ES.esc(t.venue||'Venue TBA')}</p></div><a class="btn btn-small btn-ghost" href="tickets.html">Ticket →</a></article>`).join(''):'<div class="glass-panel panel empty">Your next plan will appear here after you reserve an event.</div>';
  const saved=list.filter(e=>favs.includes(String(e.id))),root=document.querySelector('#saved-events');
  root.innerHTML=saved.length?saved.map(e=>`<div class="list-item"><div class="mini"><div class="thumb" style="background-image:url('${ES.img(e.image)}')"></div><div><strong>${ES.esc(e.title)}</strong><small class="muted">${ES.date(e.date)} · ${ES.esc(e.city||'')}</small></div></div><a class="btn btn-small btn-ghost" href="event-details.html?id=${e.id}">Open</a></div>`).join(''):'<div class="empty">Save an event from Discover and it will appear here.</div>';
  document.querySelector('#welcome').textContent=user.name||'there';
  const ns=await ES.remoteNotifications(),nr=document.querySelector('#notifications-list');
  if(nr)nr.innerHTML=ns.length?ns.slice(0,5).map(n=>`<div class="list-item notif ${n.read?'':'unread'}"><div><strong>${ES.esc(n.title)}</strong><div class="muted">${ES.esc(n.message)}</div></div><small class="muted">${new Date(n.createdAt).toLocaleDateString('en-IN')}</small></div>`).join(''):'<div class="empty">No notifications yet.</div>';
  document.querySelector('#mark-read')?.addEventListener('click',async()=>{await ES.remoteReadAllNotifications();location.reload()});
  requestAnimationFrame(()=>document.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible')));
});
