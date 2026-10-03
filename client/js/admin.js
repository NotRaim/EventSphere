document.addEventListener('DOMContentLoaded', async () => {
  const user = ES.guard('admin');
  if (!user) return;

  const grid = document.querySelector('#admin-events');
  const search = document.querySelector('#admin-search');
  const status = document.querySelector('#admin-status');
  const messagesGrid = document.querySelector('#admin-messages');
  const usersGrid = document.querySelector('#admin-users-list');
  const userSearch = document.querySelector('#admin-user-search');
  const reportsGrid = document.querySelector('#admin-reports');

  let events = [];
  let users = [];

  const fmt = value => Number(value || 0).toLocaleString('en-IN');

  async function load() {
    try {
      const [stats, allEvents, messages, reports, allUsers] = await Promise.all([
        ES.api('/admin/stats'),
        ES.api('/admin/events'),
        ES.api('/admin/messages'),
        ES.api('/event-reports/admin'),
        ES.api('/admin/users')
      ]);

      document.querySelector('#admin-users').textContent = fmt(stats.users);
      document.querySelector('#admin-organizers').textContent = fmt(stats.organizers);
      document.querySelector('#admin-published').textContent = fmt(stats.publishedEvents);
      document.querySelector('#admin-tickets').textContent = fmt(stats.tickets);

      events = Array.isArray(allEvents) ? allEvents : [];
      draw();
      drawMessages(messages);
      drawReports(reports);
      users=Array.isArray(allUsers)?allUsers:[];
      drawUsers();
    } catch (err) {
      ES.toast(err.message || 'Could not load admin data', 'error');
    }
  }


  function drawMessages(messages) {
    if (!messagesGrid) return;
    const list = Array.isArray(messages) ? messages : [];
    messagesGrid.innerHTML = list.length ? list.map(m => `
      <article class="list-item admin-message-row">
        <div>
          <strong>${ES.esc(m.subject || 'General help')}</strong>
          <small class="muted">${ES.esc(m.name)} · ${ES.esc(m.email)} · ${new Date(m.createdAt).toLocaleString('en-IN')}</small>
          <p>${ES.esc(m.message)}</p>
        </div>
        <span class="pill">${ES.esc(m.status || 'new')}</span>
      </article>`).join('') : '<div class="empty">No support messages yet.</div>';
  }

  function drawReports(reports) {
    if (!reportsGrid) return;
    const list=Array.isArray(reports)?reports:[];
    reportsGrid.innerHTML=list.length?list.map(r=>`<article class="list-item admin-report-row"><div><strong>${ES.esc(r.eventId?.title||'Event')}</strong><small class="muted">${ES.esc(r.userId?.name||'Member')} · ${ES.esc(r.userId?.email||'')} · ${new Date(r.createdAt).toLocaleString('en-IN')}</small><p><span class="pill">${ES.esc(r.reason)}</span> ${ES.esc(r.details||'No extra details')}</p></div><div class="toolbar"><span class="pill">${ES.esc(r.status)}</span>${r.status==='open'?`<button class="btn btn-small btn-cyan" data-report-action="reviewed" data-report-id="${ES.esc(r.id)}">Mark reviewed</button><button class="btn btn-small btn-ghost" data-report-action="dismissed" data-report-id="${ES.esc(r.id)}">Dismiss</button>`:''}</div></article>`).join(''):'<div class="empty">No community reports yet.</div>';
    reportsGrid.querySelectorAll('[data-report-action]').forEach(btn=>btn.onclick=async()=>{try{await ES.api('/event-reports/admin/'+encodeURIComponent(btn.dataset.reportId),{method:'PATCH',body:{status:btn.dataset.reportAction}});ES.toast('Report updated ✓','success');await load()}catch(err){ES.toast(err.message||'Could not update report','error')}});
  }

  function draw() {
    const q = String(search?.value || '').toLowerCase().trim();
    const st = status?.value || 'all';

    const rows = events.filter(e => {
      const hay = `${e.title || ''} ${e.category || ''} ${e.city || ''} ${e.organizerName || ''}`.toLowerCase();
      return (!q || hay.includes(q)) && (st === 'all' || String(e.status || '') === st);
    });

    grid.innerHTML = rows.length ? rows.map(e => `
      <article class="list-item event-manage-row">
        <div class="mini">
          <div class="thumb" style="background-image:url('${ES.img(e.image)}')"></div>
          <div>
            <strong>${ES.esc(e.title)}</strong>
            <small class="muted">${ES.esc(e.category || 'Event')} · ${ES.date(e.date)} · ${ES.esc(e.organizerName || 'Unknown organizer')} · ${ES.seats(e)} seats left</small>
          </div>
        </div>
        <div class="toolbar">
          <span class="pill">${ES.esc(e.status || 'published')}</span>
          <a class="btn btn-small btn-ghost" href="event-details.html?id=${encodeURIComponent(e.id)}">View</a>
          <button class="btn btn-small btn-cyan" data-publish="${ES.esc(e.id)}">Publish</button>
          <button class="btn btn-small btn-ghost" data-reject="${ES.esc(e.id)}">Reject</button>
        </div>
      </article>
    `).join('') : '<div class="empty">No events match your filters.</div>';

    grid.querySelectorAll('[data-publish]').forEach(btn => btn.onclick = () => setStatus(btn.dataset.publish, 'published'));
    grid.querySelectorAll('[data-reject]').forEach(btn => btn.onclick = () => setStatus(btn.dataset.reject, 'rejected'));
  }

  function drawUsers(){
    if(!usersGrid)return;
    const q=String(userSearch?.value||'').toLowerCase().trim();
    const rows=users.filter(u=>!q||`${u.name||''} ${u.email||''} ${u.role||''}`.toLowerCase().includes(q));
    usersGrid.innerHTML=rows.length?rows.map(u=>`<article class="list-item"><div><strong>${ES.esc(u.name||'Member')}</strong><small class="muted">${ES.esc(u.email||'')} · ${ES.esc(u.role||'user')}</small></div><div class="toolbar"><span class="pill">${ES.esc(u.status||'active')}</span>${u.role==='admin'?'':`<button class="btn btn-small ${u.status==='suspended'?'btn-cyan':'btn-danger'}" data-user-status="${ES.esc(u.id)}" data-next-status="${u.status==='suspended'?'active':'suspended'}">${u.status==='suspended'?'Restore':'Suspend'}</button>`}</div></article>`).join(''):'<div class="empty">No users match your search.</div>';
    usersGrid.querySelectorAll('[data-user-status]').forEach(btn=>btn.onclick=async()=>{try{const updated=await ES.api('/admin/users/'+encodeURIComponent(btn.dataset.userStatus)+'/status',{method:'PATCH',body:{status:btn.dataset.nextStatus}});const i=users.findIndex(x=>String(x.id)===String(updated.id));if(i>=0)users[i]=updated;drawUsers();ES.toast(`User ${updated.status==='suspended'?'suspended':'restored'} ✓`,'success')}catch(err){ES.toast(err.message,'error')}});
  }

  async function setStatus(id, nextStatus) {
    try {
      await ES.api('/admin/events/' + encodeURIComponent(id) + '/status', {
        method: 'PATCH',
        body: { status: nextStatus }
      });
      const event = events.find(x => String(x.id) === String(id));
      if (event) event.status = nextStatus;
      ES.toast(`Event ${nextStatus} ✓`, 'success');
      draw();
    } catch (err) {
      ES.toast(err.message || 'Could not update event', 'error');
    }
  }

  search?.addEventListener('input', draw);
  status?.addEventListener('change', draw);
  userSearch?.addEventListener('input', drawUsers);
  await load();
});
