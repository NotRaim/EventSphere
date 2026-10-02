/* ==========================================================================
   Reports (shared by Organizer + Admin dashboards).
   ES.loadReport(prefix) fetches /api/reports/summary and fills the elements
   whose ids start with the prefix, e.g. "rp-total", "rp-chart-monthly".
   ========================================================================== */
ES.loadReport = async (prefix = 'rp') => {
  const { report: r } = await ES.api('/reports/summary');
  const set = (id, v) => { const el = document.getElementById(`${prefix}-${id}`); if (el) el.textContent = v; };

  set('events', r.totalEvents);
  set('regs', r.totalRegistrations);
  set('rate', r.attendanceRate + '%');
  set('popular', r.mostPopular ? `${r.mostPopular.title} (${r.mostPopular.registrations})` : 'No registrations yet');

  const pal = ES.palette();
  ES.chart(`${prefix}-chart-category`, { type: 'doughnut', data: { labels: r.byCategory.map((c) => c.category), datasets: [{ data: r.byCategory.map((c) => c.count), backgroundColor: pal, borderWidth: 0 }] }, options: { cutout: '62%' } });
  ES.chart(`${prefix}-chart-monthly`, { type: 'line', data: { labels: r.monthlyRegistrations.map((m) => m.label), datasets: [{ label: 'Registrations', data: r.monthlyRegistrations.map((m) => m.count), borderColor: '#00D4FF', backgroundColor: 'rgba(0,212,255,.15)', fill: true, tension: .4, pointRadius: 4 }] } });

  const top = r.perEvent.slice().sort((a, b) => b.registrations - a.registrations).slice(0, 8);
  const short = (t) => (t.length > 18 ? t.slice(0, 17) + '…' : t);
  ES.chart(`${prefix}-chart-events`, { type: 'bar', data: { labels: top.map((e) => short(e.title)), datasets: [{ label: 'Registrations', data: top.map((e) => e.registrations), backgroundColor: '#6C63FF', borderRadius: 8 }, { label: 'Attended', data: top.map((e) => e.attended), backgroundColor: '#2ED47A', borderRadius: 8 }] }, options: { plugins: { legend: { display: true, position: 'bottom' } } } });

  const past = r.perEvent.filter((e) => e.isPast && e.registrations);
  const attended = past.reduce((s, e) => s + e.attended, 0), absent = past.reduce((s, e) => s + e.registrations - e.attended, 0);
  ES.chart(`${prefix}-chart-attendance`, { type: 'doughnut', data: { labels: ['Attended', 'Did not attend'], datasets: [{ data: [attended, absent], backgroundColor: ['#2ED47A', '#FF5C7A'], borderWidth: 0 }] }, options: { cutout: '68%' } });

  const body = document.getElementById(`${prefix}-table`);
  if (body) {
    body.innerHTML = r.perEvent.length ? r.perEvent.map((e) => `
      <tr><td><strong>${ES.esc(e.title)}</strong></td><td>${ES.esc(e.category)}</td><td>${ES.fmtDate(e.date)}</td>
      <td>${e.registrations} / ${e.capacity}</td><td>${e.attended}</td>
      <td>${e.registrations ? Math.round((e.attended / e.registrations) * 100) : 0}%</td></tr>`).join('')
      : '<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">No events yet</td></tr>';
  }
  return r;
};

/* CSV download (needs the Authorization header, so we fetch it as a blob) */
ES.downloadCsv = async () => {
  try {
    const res = await ES.api('/reports/export', { raw: true });
    if (!res.ok) throw new Error('Could not export the report');
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: 'eventsphere-report.csv' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    ES.toast('CSV report downloaded', 'success');
  } catch (e) { ES.toast(e.message, 'error'); }
};

/* PDF export: the print stylesheet hides everything except the report, so "Save as PDF" gives a clean file */
ES.printReport = (panelId) => {
  const panel = document.getElementById(panelId);
  document.querySelectorAll('.print-me').forEach((p) => p.classList.remove('print-me'));
  if (panel) panel.classList.add('print-me');
  window.print();
};

/* Shared HTML for the report panel body (so organizer + admin stay identical) */
ES.reportMarkup = (prefix = 'rp') => `
  <div class="stat-cards">
    <div class="card stat-card"><div class="ico"><i class="fa-solid fa-calendar-days"></i></div><div><div class="val" id="${prefix}-events">0</div><div class="lbl">Total events</div></div></div>
    <div class="card stat-card"><div class="ico"><i class="fa-solid fa-ticket"></i></div><div><div class="val" id="${prefix}-regs">0</div><div class="lbl">Total registrations</div></div></div>
    <div class="card stat-card"><div class="ico"><i class="fa-solid fa-user-check"></i></div><div><div class="val" id="${prefix}-rate">0%</div><div class="lbl">Attendance rate</div></div></div>
  </div>
  <div class="card" style="margin-bottom:24px"><span class="muted">Most popular event: </span><strong id="${prefix}-popular">–</strong></div>
  <div class="grid grid-2" style="margin-bottom:24px">
    <div class="card chart-card"><h3>Monthly registrations</h3><div class="chart-box"><canvas id="${prefix}-chart-monthly"></canvas></div></div>
    <div class="card chart-card"><h3>Events by category</h3><div class="chart-box"><canvas id="${prefix}-chart-category"></canvas></div></div>
    <div class="card chart-card"><h3>Registrations vs attendance (top events)</h3><div class="chart-box"><canvas id="${prefix}-chart-events"></canvas></div></div>
    <div class="card chart-card"><h3>Attendance (completed events)</h3><div class="chart-box"><canvas id="${prefix}-chart-attendance"></canvas></div></div>
  </div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>Category</th><th>Date</th><th>Registered</th><th>Attended</th><th>Rate</th></tr></thead><tbody id="${prefix}-table"></tbody></table></div>`;
