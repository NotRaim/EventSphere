window.renderEventCard=function(e,i=0){
  const fav=ES.savedEvents().includes(String(e.id));
  const left=ES.seats(e);
  const urgency=left>0&&left<=20;
  const prices=(e.ticketTypes||[]).map(t=>Number(t.price||0));
  const cardPrice=prices.length?Math.min(...prices):Number(e.price||0);
  return `<article class="event-card tilt reveal" data-id="${ES.esc(e.id)}" style="transition-delay:${i*60}ms">
    <div class="event-media" style="background-image:url('${ES.img(e.image)}')">
      <span class="event-badge">${ES.esc(e.category||'Event')}</span>
      ${urgency?'<span class="event-urgency">Almost full</span>':''}
      <button class="event-fav ${fav?'active':''}" data-fav="${ES.esc(e.id)}" aria-label="Save event">${fav?'♥':'♡'}</button>
      <div class="media-gradient"></div>
      <span class="event-view">View event →</span>
    </div>
    <div class="event-body">
      <div class="event-date">${ES.date(e.date)} · ${ES.time(e.time||'')}</div>
      <h3 class="event-title">${ES.esc(e.title)}</h3>
      <div class="event-meta"><span>⌖ ${ES.esc(e.venue||e.location||'Venue TBA')}</span><span>· ${ES.esc(e.city||'Ahmedabad')}</span></div>
      <div class="event-bottom"><span class="price">${cardPrice===0?'Free':'From ₹'+cardPrice.toLocaleString('en-IN')}</span><span class="seats">${left} spots left</span></div>
    </div>
  </article>`;
};
window.activateCards=function(root=document){
  root.querySelectorAll('.tilt').forEach(card=>{
    card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-4}deg) rotateY(${x*5}deg) translateY(-5px)`});
    card.addEventListener('pointerleave',()=>card.style.transform='');
    card.querySelector('[data-fav]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const active=ES.toggleSaved(e.currentTarget.dataset.fav);e.currentTarget.classList.toggle('active',active);e.currentTarget.textContent=active?'♥':'♡'});
    card.addEventListener('click',e=>{if(!e.target.closest('[data-fav]')){ES.trackView(card.dataset.id);location.href='event-details.html?id='+encodeURIComponent(card.dataset.id)}});
  });
};
