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
        <div><div class="section-kicker">Community pulse</div><h3>What guests say</h3><p class="muted">A lightweight rating system for your event history.</p></div>
        <div class="rating-row" id="rating-row">${[1, 2, 3, 4, 5].map(n => `<button data-rate="${n}">${n <= ES.getRating(e.id) ? '★' : '☆'}</button>`).join('')}</div>
      </div>
      <div class="organizer-strip">
        <div class="avatar">${String(e.organizerName || 'E').slice(0, 1).toUpperCase()}</div>
        <div><div class="section-kicker">Hosted by</div><strong>${ES.esc(e.organizerName || 'EventSphere Organizer')}</strong><p class="muted">Independent host · ${ES.esc(e.city || 'Ahmedabad')}</p></div>
        <button class="btn btn-ghost btn-small" id="follow-organizer">Follow</button>
      </div>
      <div id="tab-venue" hidden>
        <div class="section-kicker">Getting there</div>
        <h2 class="section-title" style="font-size:42px">${ES.esc(e.venue || 'Event venue')}</h2>
        <p class="section-copy">${ES.esc(e.address || e.city || 'Ahmedabad')}</p>
        ${e.mapUrl ? `<a class="btn btn-cyan" href="${ES.esc(e.mapUrl)}" target="_blank" rel="noopener">Open map ↗</a>` : '<div class="glass-panel panel" style="margin-top:20px;min-height:140px;display:grid;place-items:center;color:#6f7e7e">Map link not provided by organizer.</div>'}
      </div>
      ${Array.isArray(e.gallery) && e.gallery.length ? `<section class="glass-panel panel reveal" style="margin-top:18px"><div class="section-kicker">Event gallery</div><h3 style="margin:4px 0 14px">A closer look.</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">${e.gallery.map(src=>`<img src="${ES.esc(src)}" alt="${ES.esc(e.title)}" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:16px;border:1px solid var(--line)" onerror="this.style.display='none'">`).join('')}</div></section>` : ''}
    </section>
    <aside class="glass-panel booking reveal">
      <div class="section-kicker">Your place</div>
      <div class="booking-price">${Number(e.price || 0) === 0 ? 'Free' : '₹' + Number(e.price).toLocaleString('en-IN')}</div>
      <p class="muted">${ES.seats(e)} places currently available.</p>
      ${salesClosed ? '<div class="glass-panel panel" style="margin:14px 0;padding:14px;border-color:rgba(255,110,134,.35)"><strong style="color:#ff6e86">Ticket sales closed</strong><p class="muted" style="margin:5px 0 0">The buying deadline for this event has passed.</p></div>' : ''}
      ${!salesClosed && soldOut ? '<div class="glass-panel panel" style="margin:14px 0;padding:14px"><strong>Sold out</strong><p class="muted" style="margin:5px 0 0">No tickets are currently available.</p></div>' : ''}
      <div class="countdown" id="countdown"><div><strong>--</strong><span>Days</span></div><div><strong>--</strong><span>Hours</span></div><div><strong>--</strong><span>Min</span></div></div>
      <button class="btn ${salesClosed || soldOut ? 'btn-ghost' : 'btn-cyan'}" style="width:100%" id="reserve" data-magnetic type="button" ${salesClosed || soldOut ? 'disabled' : ''}>${salesClosed ? 'Ticket sales closed' : soldOut ? 'Sold out' : 'Reserve my place'}</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <button class="btn btn-ghost" id="save" type="button">${remoteFavs.includes(String(e.id)) ? '♥ Saved' : '♡ Save'}</button>
        <button class="btn btn-ghost" id="share" type="button">Share</button>
      </div>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px" id="calendar" type="button">＋ Add to calendar</button>
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
    const label=countdown?.previousElementSibling;
    if(label && label.classList.contains('section-kicker')) label.textContent=d<=0?'Event time':'Event starts in';
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
      <h2 class="serif" style="font-size:38px;margin:6px 0">Reserve your place.</h2>
      <p class="muted">${ES.esc(e.title)}</p>
      <div class="ticket-row"><div><strong>General admission</strong><div class="muted">${Number(e.price || 0) === 0 ? 'Free reservation' : 'Demo payment · no real money'}</div></div><div class="qty"><button type="button" data-minus>−</button><strong id="qty">1</strong><button type="button" data-plus>+</button></div></div>
      <div class="ticket-total"><span>Total</span><strong id="total">${Number(e.price || 0) === 0 ? 'Free' : '₹' + Number(e.price || 0).toLocaleString('en-IN')}</strong></div>
      ${Number(e.price || 0) > 0 ? `<div class="demo-methods"><button type="button" class="demo-method active" data-method="upi">UPI</button><button type="button" class="demo-method" data-method="card">Card</button><button type="button" class="demo-method" data-method="netbanking">Net Banking</button></div><div class="demo-payment-box"><div class="demo-payment-icon">✓</div><div><strong>Demo payment</strong><p class="muted">No real money is charged. Do not enter real card or bank details.</p></div></div>` : ''}
      <button class="btn btn-cyan" style="width:100%" id="confirm" type="button">${Number(e.price || 0) === 0 ? 'Confirm reservation →' : 'Complete demo payment →'}</button>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px" id="cancel" type="button">Cancel</button>
      <small class="muted checkout-note">Your order and ticket are stored in MongoDB. The QR ticket can later be verified and checked in.</small>
    </div>`;
    document.body.append(backdrop);

    let qty = 1;
    let method = 'upi';
    const price = Number(e.price || 0);
    const update = () => {
      backdrop.querySelector('#qty').textContent = qty;
      backdrop.querySelector('#total').textContent = price === 0 ? 'Free' : '₹' + (price * qty).toLocaleString('en-IN');
    };

    backdrop.querySelector('[data-plus]').onclick = () => {
      if (qty < Math.min(10, ES.seats(e))) {
        qty += 1;
        update();
      }
    };
    backdrop.querySelector('[data-minus]').onclick = () => {
      qty = Math.max(1, qty - 1);
      update();
    };
    backdrop.querySelector('#cancel').onclick = () => backdrop.remove();
    backdrop.addEventListener('click', ev => {
      if (ev.target === backdrop) backdrop.remove();
    });
    backdrop.querySelectorAll('.demo-method').forEach(btn => btn.onclick = () => {
      method = btn.dataset.method;
      backdrop.querySelectorAll('.demo-method').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });

    backdrop.querySelector('#confirm').onclick = async () => {
      const btn = backdrop.querySelector('#confirm');
      btn.disabled = true;
      btn.textContent = price === 0 ? 'Creating reservation…' : 'Processing demo payment…';

      try {
        const order = await ES.api('/payments/order', {
          method: 'POST',
          body: { eventId: e.id, quantity: qty }
        });

        if (order.mode === 'free') {
          ES.toast('Reservation confirmed · ticket issued ✓', 'success');
          backdrop.remove();
          location.href = 'tickets.html';
          return;
        }

        const result = await ES.api('/payments/demo-pay', {
          method: 'POST',
          body: { orderDbId: order.orderDbId, paymentMethod: method }
        });

        if (!result.ok) throw new Error('Demo payment could not be completed');

        ES.pushNotification('Booking confirmed', `Your ticket for ${e.title} is ready.`);
        ES.toast('Payment successful · ticket issued ✓', 'success');
        backdrop.remove();
        location.href = 'tickets.html';
      } catch (err) {
        ES.toast(err.message || 'Checkout failed', 'error');
        btn.disabled = false;
        btn.textContent = price === 0 ? 'Confirm reservation →' : 'Complete demo payment →';
      }
    };
  };

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
