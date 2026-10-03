document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const root = document.querySelector('#detail');
  if (!root) return;

  let list = [];
  let e = null;

  // Prefer the exact database event when an id is supplied.
  // This prevents the fallback demo catalog from being used for a real booking page.
  if (id && !String(id).startsWith('demo-')) {
    try {
      e = await ES.api('/events/' + encodeURIComponent(id), { auth: false });
      if (e && e.id) e = { ...e, id: String(e.id) };
    } catch (_) {
      // Fall back to the public event list below.
    }
  }

  list = await ES.events();
  if (!e) e = list.find(x => String(x.id) === String(id)) || list[0];

  const remoteFavs = ES.session.getToken() ? await ES.remoteFavorites() : [];

  if (!e) {
    root.innerHTML = '<div class="glass-panel panel"><strong>Event not found.</strong><p class="muted">The event may have been removed or is no longer published.</p></div>';
    return;
  }

  const isDatabaseEvent = /^[a-f0-9]{24}$/i.test(String(e.id));
  const salesClosed = ES.registrationDeadlinePassed(e);
  const soldOut = ES.seats(e) <= 0;
  const ticketTypes = (Array.isArray(e.ticketTypes) && e.ticketTypes.length ? e.ticketTypes : [{name:'General Admission',price:Number(e.price||0),capacity:Number(e.capacity||1),sold:0,benefits:[]}]);
  const agenda = [
    ['18:30', 'Doors open & check-in'],
    ['19:00', 'Welcome + community introductions'],
    ['19:30', 'Main event experience'],
    ['21:00', 'Open social / after-hours']
  ];

  ES.trackView(e.id);

  root.innerHTML = `<section class="detail-cover reveal" style="background-image:url('${ES.img(e.image)}')">
    <div class="detail-overlay">
      <div class="event-date">${ES.date(e.date)} · ${ES.time(e.time || '')}</div>
      <h1>${ES.esc(e.title)}</h1>
      <div class="event-meta">⌖ ${ES.esc(e.venue || e.location || 'Venue TBA')} · ${ES.esc(e.city || '')}</div>
    </div>
  </section>
  <div class="detail-layout">
    <section class="glass-panel detail-copy reveal">
      <div class="tabs">
        <button class="tab active" data-tab="about">About</button>
        <button class="tab" data-tab="agenda">Agenda</button>
        <button class="tab" data-tab="venue">Venue</button>
      </div>
      <div id="tab-about">
        <div class="section-kicker">About the event</div>
        <h2 class="section-title" style="font-size:42px">Come for the event.<br>Stay for the memory.</h2>
        <p class="section-copy">${ES.esc(e.description || e.desc || 'A thoughtfully curated EventSphere experience.')}</p>
        <div class="detail-list">
          <div class="detail-row"><span class="muted">When</span><strong>${ES.date(e.date)} · ${ES.time(e.time || '')}</strong></div>
          <div class="detail-row"><span class="muted">Where</span><strong>${ES.esc(e.venue || e.location || 'TBA')}</strong></div>
          <div class="detail-row"><span class="muted">Capacity</span><strong>${e.capacity || '—'} guests</strong></div>
          <div class="detail-row"><span class="muted">Available</span><strong>${ES.seats(e)} places</strong></div>
        </div>
      </div>
      <div id="tab-agenda" hidden>
        <div class="section-kicker">The evening</div>
        <h2 class="section-title" style="font-size:42px">Simple schedule.</h2>
        <div class="timeline">${agenda.map(a => `<div class="timeline-item"><div class="timeline-time">${a[0]}</div><div><strong>${a[1]}</strong><p class="muted">A short, useful moment in the experience.</p></div></div>`).join('')}</div>
      </div>
      <div class="event-community glass-panel">
        <div><div class="section-kicker">Community pulse</div><h3>Rate this event</h3><p class="muted">Your rating helps shape EventSphere recommendations.</p></div>
        <div class="rating-row" id="rating-row">${[1, 2, 3, 4, 5].map(n => `<button data-rate="${n}">${n <= ES.getRating(e.id) ? '★' : '☆'}</button>`).join('')}</div>
      </div>
      <section class="reviews-section glass-panel panel" id="reviews-section">
        <div class="section-head"><div><div class="section-kicker">Reviews</div><h3>Real guest feedback</h3></div><span class="pill" id="review-summary">Loading…</span></div>
        <div id="reviews-list" class="reviews-list"><div class="muted">Loading reviews…</div></div>
        <div class="review-form" id="review-form" hidden>
          <div class="section-kicker">Share your experience</div>
          <div class="review-stars" id="review-stars">${[1,2,3,4,5].map(n=>`<button type="button" data-review-star="${n}">☆</button>`).join('')}</div>
          <textarea id="review-comment" rows="4" maxlength="1000" placeholder="What did you enjoy or what should future guests know?"></textarea>
          <button class="btn btn-cyan" id="submit-review" type="button">Publish review →</button>
        </div>
      </section>
      <div class="organizer-strip">
        <div class="avatar">${String(e.organizerName || 'E').slice(0, 1).toUpperCase()}</div>
        <div><div class="section-kicker">Hosted by</div><strong>${ES.esc(e.organizerName || 'EventSphere Organizer')}</strong><p class="muted">Independent host · ${ES.esc(e.city || 'Ahmedabad')}</p></div>
        <button class="btn btn-ghost btn-small" id="follow-organizer">Follow</button>
      </div>
      <div id="tab-venue" hidden>
        <div class="section-kicker">Getting there</div>
        <h2 class="section-title" style="font-size:42px">${ES.esc(e.venue || 'Event venue')}</h2>
        <p class="section-copy">${ES.esc(e.city || 'Ahmedabad')} · Add this event to your calendar to keep the address handy.</p>
        <div class="glass-panel panel" style="margin-top:20px;min-height:190px;display:grid;place-items:center;color:#6f7e7e">Map preview · venue location</div>
      </div>
    </section>
    <aside class="glass-panel booking reveal">
      <div class="section-kicker">Your place</div>
      <div class="booking-price" id="selected-price">${Number(ticketTypes[0].price || 0) === 0 ? 'Free' : '₹' + Number(ticketTypes[0].price).toLocaleString('en-IN')}</div>
      <p class="muted">${ES.seats(e)} places currently available.</p>
      <div class="ticket-type-options" id="ticket-type-options">${ticketTypes.map((t,i)=>`<button type="button" class="ticket-type-option ${i===0?'active':''}" data-ticket-type="${ES.esc(t._id||String(i))}"><span><strong>${ES.esc(t.name||'General Admission')}</strong><small>${Number(t.price||0)===0?'Free':'₹'+Number(t.price).toLocaleString('en-IN')} · ${Math.max(0,Number(t.capacity||0)-Number(t.sold||0))} left</small>${(t.benefits||[]).length?`<em>${ES.esc((t.benefits||[]).slice(0,3).join(' · '))}</em>`:''}</span><b>${i===0?'✓':''}</b></button>`).join('')}</div>
      ${salesClosed ? '<div class="glass-panel panel" style="margin:14px 0;padding:14px;border-color:rgba(255,110,134,.35)"><strong style="color:#ff6e86">Ticket sales closed</strong><p class="muted" style="margin:5px 0 0">The buying deadline for this event has passed.</p></div>' : ''}
      ${!salesClosed && soldOut ? '<div class="glass-panel panel" style="margin:14px 0;padding:14px"><strong>Sold out</strong><p class="muted" style="margin:5px 0 0">No tickets are currently available.</p></div>' : ''}
      <div class="countdown" id="countdown"><div><strong>--</strong><span>Days</span></div><div><strong>--</strong><span>Hours</span></div><div><strong>--</strong><span>Min</span></div></div>
      <button class="btn ${salesClosed || soldOut ? 'btn-ghost' : 'btn-cyan'}" style="width:100%" id="reserve" data-magnetic type="button" ${salesClosed || soldOut ? 'disabled' : ''}>${salesClosed ? 'Ticket sales closed' : soldOut ? 'Sold out' : 'Reserve my place'}</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <button class="btn btn-ghost" id="save" type="button">${remoteFavs.includes(String(e.id)) ? '♥ Saved' : '♡ Save'}</button>
        <button class="btn btn-ghost" id="share" type="button">Share</button>
      </div>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px" id="calendar" type="button">＋ Add to calendar</button>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px" id="report-event" type="button">⚑ Report this event</button>
      ${!isDatabaseEvent ? '<p class="muted" style="font-size:11px;margin-top:12px">Preview event: booking becomes available when this event exists in the EventSphere database.</p>' : ''}
    </aside>
  </div>`;

  document.querySelectorAll('[data-tab]').forEach(tab => tab.onclick = () => {
    document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    ['about', 'agenda', 'venue'].forEach(x => {
      const section = document.querySelector('#tab-' + x);
      if (section) section.hidden = x !== tab.dataset.tab;
    });
  });

  requestAnimationFrame(() => document.querySelectorAll('.reveal').forEach(x => x.classList.add('visible')));

  const target = new Date(`${new Date(e.date).toISOString().slice(0, 10)}T${e.time || '00:00'}:00`);
  const countdown = document.querySelector('#countdown');
  const updateCountdown = () => {
    const d = Math.max(0, target - new Date());
    const vals = [Math.floor(d / 86400000), Math.floor(d / 3600000) % 24, Math.floor(d / 60000) % 60];
    countdown?.querySelectorAll('strong').forEach((x, i) => x.textContent = String(vals[i]).padStart(2, '0'));
  };
  updateCountdown();
  const timer = setInterval(updateCountdown, 1000);

  document.querySelectorAll('[data-rate]').forEach(b => b.onclick = async () => {
    if (!ES.session.getToken()) {
      location.href = 'login.html?next=' + encodeURIComponent(location.href);
      return;
    }
    try {
      await ES.remoteRate(e.id, Number(b.dataset.rate));
      document.querySelectorAll('[data-rate]').forEach(x => x.textContent = Number(x.dataset.rate) <= Number(b.dataset.rate) ? '★' : '☆');
    } catch (err) {
      ES.toast(err.message, 'error');
    }
  });

  document.querySelector('#follow-organizer').onclick = ev => {
    ev.currentTarget.textContent = ev.currentTarget.textContent === 'Follow' ? 'Following ✓' : 'Follow';
    ES.toast(ev.currentTarget.textContent === 'Following ✓' ? 'Organizer followed' : 'Organizer unfollowed', 'success');
  };

  document.querySelector('#save').onclick = async () => {
    if (!ES.session.getToken()) {
      location.href = 'login.html?next=' + encodeURIComponent(location.href);
      return;
    }
    try {
      const active = await ES.remoteToggleSaved(e.id);
      document.querySelector('#save').textContent = active ? '♥ Saved' : '♡ Save';
      ES.toast(active ? 'Saved to your plans' : 'Removed from your plans', 'success');
    } catch (err) {
      ES.toast(err.message, 'error');
    }
  };

  document.querySelector('#share').onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      ES.toast('Event link copied', 'success');
    } catch {
      ES.toast('Copy this page URL to share');
    }
  };

  document.querySelector('#calendar').onclick = () => ES.addToCalendar(e);

  let selectedType=ticketTypes[0];
  const selectedTypeId=()=>String(selectedType?._id||ticketTypes.indexOf(selectedType));
  const refreshTypeUi=()=>{
    document.querySelectorAll('[data-ticket-type]').forEach(btn=>{
      const active=String(btn.dataset.ticketType)===selectedTypeId();
      btn.classList.toggle('active',active);
      const mark=btn.querySelector('b'); if(mark)mark.textContent=active?'✓':'';
    });
    const price=document.querySelector('#selected-price');
    if(price)price.textContent=Number(selectedType?.price||0)===0?'Free':'₹'+Number(selectedType.price).toLocaleString('en-IN');
  };
  document.querySelectorAll('[data-ticket-type]').forEach(btn=>btn.onclick=()=>{
    const index=ticketTypes.findIndex((t,i)=>String(t._id||i)===String(btn.dataset.ticketType));
    if(index>=0){selectedType=ticketTypes[index];refreshTypeUi();}
  });

  document.querySelector('#report-event').onclick=async()=>{
    if(!ES.session.getToken()){location.href='login.html?next='+encodeURIComponent(location.href);return;}
    const backdrop=document.createElement('div');backdrop.className='modal-backdrop';backdrop.innerHTML=`<div class="modal report-modal"><div class="section-kicker">Community safety</div><h2 class="serif" style="font-size:34px;margin:6px 0">Report this event.</h2><p class="muted">Tell the EventSphere team what needs attention. Reports are reviewed by admins.</p><div class="field"><label>Reason</label><select id="report-reason"><option value="misleading">Misleading information</option><option value="inappropriate">Inappropriate content</option><option value="spam">Spam or promotion</option><option value="safety">Safety concern</option><option value="duplicate">Duplicate event</option><option value="other">Other</option></select></div><div class="field"><label>Details</label><textarea id="report-details" rows="5" maxlength="1000" placeholder="Optional details"></textarea></div><button class="btn btn-cyan" id="submit-report" type="button">Submit report</button><button class="btn btn-ghost" id="cancel-report" type="button" style="width:100%;margin-top:8px">Cancel</button></div>`;document.body.append(backdrop);backdrop.querySelector('#cancel-report').onclick=()=>backdrop.remove();backdrop.addEventListener('click',ev=>{if(ev.target===backdrop)backdrop.remove()});backdrop.querySelector('#submit-report').onclick=async()=>{const b=backdrop.querySelector('#submit-report');b.disabled=true;b.textContent='Submitting…';try{await ES.api('/event-reports',{method:'POST',body:{eventId:e.id,reason:backdrop.querySelector('#report-reason').value,details:backdrop.querySelector('#report-details').value}});backdrop.remove();ES.toast('Report submitted to EventSphere admin','success')}catch(err){ES.toast(err.message||'Could not submit report','error');b.disabled=false;b.textContent='Submit report'}};
  };

  // Complete booking workflow.
  document.querySelector('#reserve').onclick = async () => {
    if (!ES.session.getToken()) {
      location.href = 'login.html?next=' + encodeURIComponent(location.href);
      return;
    }

    if (!isDatabaseEvent) {
      ES.toast('This preview event is not bookable. Open a published database event.', 'error');
      return;
    }

    if (ES.registrationDeadlinePassed(e)) {
      ES.toast('Ticket buying deadline is over for this event.', 'error');
      return;
    }

    if (ES.seats(e) <= 0) {
      ES.toast('This event is sold out.', 'error');
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ticket-modal';
    backdrop.innerHTML = `<div class="modal demo-payment-modal">
      <div class="section-kicker">EventSphere Checkout</div>
      <h2 class="serif" style="font-size:38px;margin:6px 0">Choose your ticket.</h2>
      <p class="muted">${ES.esc(e.title)}</p>
      <div class="checkout-ticket-card"><strong id="checkout-type-name">${ES.esc(selectedType.name||'General Admission')}</strong><div class="muted" id="checkout-benefits">${ES.esc((selectedType.benefits||[]).join(' · ')||'Standard event entry')}</div></div>
      <div class="ticket-row"><div><strong>Quantity</strong><div class="muted" id="checkout-type-price">${Number(selectedType.price||0)===0?'Free reservation':'₹'+Number(selectedType.price).toLocaleString('en-IN')+' each'}</div></div><div class="qty"><button type="button" data-minus>−</button><strong id="qty">1</strong><button type="button" data-plus>+</button></div></div>
      <div class="ticket-total"><span>Total</span><strong id="total">${Number(selectedType.price||0)===0?'Free':'₹'+Number(selectedType.price||0).toLocaleString('en-IN')}</strong></div>
      ${Number(selectedType.price || 0) > 0 ? `<div class="demo-methods"><button type="button" class="demo-method active" data-method="upi">UPI</button><button type="button" class="demo-method" data-method="card">Card</button><button type="button" class="demo-method" data-method="netbanking">Net Banking</button></div><div class="demo-payment-box"><div class="demo-payment-icon">✓</div><div><strong>Demo payment</strong><p class="muted">No real money is charged. Do not enter real card or bank details.</p></div></div>` : ''}
      <button class="btn btn-cyan" style="width:100%" id="confirm" type="button">${Number(selectedType.price || 0) === 0 ? 'Confirm reservation →' : 'Complete demo payment →'}</button>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px" id="cancel" type="button">Cancel</button>
      <small class="muted checkout-note">Your order and ticket are stored in MongoDB. You can download or email the ticket after checkout.</small>
    </div>`;
    document.body.append(backdrop);

    let qty = 1;
    let method = 'upi';
    const price = Number(selectedType.price || 0);
    const typeRemaining = Math.max(0, Number(selectedType.capacity || ES.seats(e)) - Number(selectedType.sold || 0));
    const maxQty = Math.max(1, Math.min(10, ES.seats(e), typeRemaining || ES.seats(e)));
    const update = () => {
      backdrop.querySelector('#qty').textContent = qty;
      backdrop.querySelector('#total').textContent = price === 0 ? 'Free' : '₹' + (price * qty).toLocaleString('en-IN');
    };
    backdrop.querySelector('[data-plus]').onclick = () => { if (qty < maxQty) { qty += 1; update(); } };
    backdrop.querySelector('[data-minus]').onclick = () => { qty = Math.max(1, qty - 1); update(); };
    backdrop.querySelector('#cancel').onclick = () => backdrop.remove();
    backdrop.addEventListener('click', ev => { if (ev.target === backdrop) backdrop.remove(); });
    backdrop.querySelectorAll('.demo-method').forEach(btn => btn.onclick = () => { method = btn.dataset.method; backdrop.querySelectorAll('.demo-method').forEach(x => x.classList.remove('active')); btn.classList.add('active'); });
    backdrop.querySelector('#confirm').onclick = async () => {
      const btn = backdrop.querySelector('#confirm'); btn.disabled = true; btn.textContent = price === 0 ? 'Creating reservation…' : 'Processing demo payment…';
      try {
        const order = await ES.api('/payments/order', { method:'POST', body:{eventId:e.id,quantity:qty,ticketTypeId:selectedType._id||undefined} });
        if(order.mode==='free'){ES.toast('Reservation confirmed · ticket issued ✓','success');backdrop.remove();location.href='tickets.html';return;}
        const result=await ES.api('/payments/demo-pay',{method:'POST',body:{orderDbId:order.orderDbId,paymentMethod:method}});
        if(!result.ok)throw new Error('Demo payment could not be completed');
        ES.pushNotification('Booking confirmed',`Your ${selectedType.name} ticket for ${e.title} is ready.`);ES.toast('Payment successful · ticket issued ✓','success');backdrop.remove();location.href='tickets.html';
      }catch(err){ES.toast(err.message||'Checkout failed','error');btn.disabled=false;btn.textContent=price===0?'Confirm reservation →':'Complete demo payment →';}
    };
  };


  async function loadReviews(){
    try{
      const data=await ES.api('/events/'+encodeURIComponent(e.id)+'/reviews',{auth:false});
      const summary=document.querySelector('#review-summary');
      if(summary)summary.textContent=`${Number(data.average||0).toFixed(1)} ★ · ${data.count||0} review${Number(data.count||0)===1?'':'s'}`;
      const listEl=document.querySelector('#reviews-list');
      if(listEl)listEl.innerHTML=(data.reviews||[]).length?(data.reviews||[]).map(r=>`<article class="review-card"><div class="review-card-head"><strong>${ES.esc(r.userName)}</strong><span>${'★'.repeat(Number(r.rating||0))}${'☆'.repeat(5-Number(r.rating||0))}</span></div><p>${ES.esc(r.comment||'No written comment.')}</p><small class="muted">${new Date(r.createdAt).toLocaleDateString('en-IN')}</small></article>`).join(''):'<div class="empty">No reviews yet. Be the first guest to share an experience.</div>';
      if(ES.session.getToken()){
        const mine=await ES.api('/me/reviews/'+encodeURIComponent(e.id)+'/mine').catch(()=>null);
        const form=document.querySelector('#review-form');
        if(form)form.hidden=false;
        if(mine){document.querySelectorAll('[data-review-star]').forEach(b=>b.textContent=Number(b.dataset.reviewStar)<=Number(mine.rating)?'★':'☆');document.querySelector('#review-comment').value=mine.comment||'';}
      }
    }catch{const el=document.querySelector('#reviews-list');if(el)el.innerHTML='<div class="muted">Reviews are temporarily unavailable.</div>';}
  }
  let reviewRating=ES.getRating(e.id)||0;
  document.querySelectorAll('[data-review-star]').forEach(b=>b.onclick=()=>{reviewRating=Number(b.dataset.reviewStar);document.querySelectorAll('[data-review-star]').forEach(x=>x.textContent=Number(x.dataset.reviewStar)<=reviewRating?'★':'☆')});
  document.querySelector('#submit-review')?.addEventListener('click',async()=>{if(!ES.session.getToken()){location.href='login.html?next='+encodeURIComponent(location.href);return;}if(!reviewRating){ES.toast('Choose a rating first','error');return;}const btn=document.querySelector('#submit-review');btn.disabled=true;try{await ES.api('/me/reviews/'+encodeURIComponent(e.id),{method:'POST',body:{rating:reviewRating,comment:document.querySelector('#review-comment').value}});ES.setRating(e.id,reviewRating);ES.toast('Review saved ✓','success');await loadReviews()}catch(err){ES.toast(err.message,'error')}finally{btn.disabled=false}});
  loadReviews();

  const similar = document.createElement('section');
  similar.className = 'section';
  similar.innerHTML = `<div class="section-head"><div><div class="section-kicker">You may also like</div><h2 class="section-title" style="font-size:42px">More plans like this.</h2></div></div><div class="event-grid" id="similar-events"></div>`;
  root.append(similar);
  const sg = similar.querySelector('#similar-events');
  sg.innerHTML = list.filter(x => String(x.id) !== String(e.id) && x.category === e.category).slice(0, 3).map(renderEventCard).join('');
  activateCards(sg);
  requestAnimationFrame(() => sg.querySelectorAll('.reveal').forEach(x => x.classList.add('visible')));

  window.addEventListener('beforeunload', () => clearInterval(timer));
});
