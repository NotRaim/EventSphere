document.addEventListener('DOMContentLoaded', async () => {
  const user = ES.guard();
  if (!user) return;
  if (!['organizer', 'admin'].includes(user.role)) {
    ES.toast('Organizer or admin access required', 'error');
    location.href = 'dashboard.html';
    return;
  }

  const select = document.querySelector('#analytics-event');
  const chart = document.querySelector('#capacity-chart');

  try {
    const data = await ES.api('/events/manage/analytics');
    const events = data.events || [];

    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = event.title;
      select.appendChild(option);
    });

    const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

    function draw() {
      const rows = events.filter(e => select.value === 'all' || String(e.id) === String(select.value));
      const totals = rows.reduce((a, e) => ({
        views: a.views + Number(e.views || 0),
        sold: a.sold + Number(e.sold || 0),
        revenue: a.revenue + Number(e.revenue || 0),
        checked: a.checked + Number(e.checked || 0),
        capacity: a.capacity + Number(e.capacity || 0)
      }), { views: 0, sold: 0, revenue: 0, checked: 0, capacity: 0 });

      document.querySelector('#a-views').textContent = totals.views.toLocaleString('en-IN');
      document.querySelector('#a-reg').textContent = totals.sold.toLocaleString('en-IN');
      document.querySelector('#a-revenue').textContent = money(totals.revenue);
      document.querySelector('#a-checkins').textContent = totals.checked.toLocaleString('en-IN');

      const utilization = totals.capacity ? Math.min(100, Math.round(totals.sold / totals.capacity * 100)) : 0;
      document.querySelector('#a-capacity-total').textContent = `${utilization}% capacity used`;

      chart.innerHTML = rows.length ? rows.map(e => {
        const pct = e.capacity ? Math.min(100, Math.round(Number(e.sold || 0) / e.capacity * 100)) : 0;
        return `<div class="list-item">
          <div style="flex:1;min-width:0">
            <strong>${ES.esc(e.title)}</strong>
            <small class="muted">${Number(e.sold || 0)} sold · ${Number(e.checked || 0)} checked in · ${money(e.revenue)}</small>
            <div class="progress" style="margin-top:9px"><span style="width:${pct}%"></span></div>
          </div>
          <strong>${pct}%</strong>
        </div>`;
      }).join('') : '<div class="empty">No events found.</div>';
    }

    select.onchange = draw;
    draw();
  } catch (err) {
    ES.toast(err.message || 'Could not load analytics', 'error');
  }
});
