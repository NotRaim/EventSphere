/* Sidebar tabs shared by the three dashboards. Panels are <section id="panel-NAME">. */
ES.initTabs = (onShow) => {
  const buttons = ES.$$('.side-nav [data-tab]');
  const panels = ES.$$('.panel');
  const names = buttons.map((b) => b.dataset.tab);

  function show(tab, push = true) {
    if (!names.includes(tab)) tab = names[0];
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    panels.forEach((p) => { const on = p.id === 'panel-' + tab; p.classList.toggle('active', on); if (on) ES.anim.panelIn(p); });
    if (push) history.replaceState(null, '', '#' + tab);
    if (onShow) onShow(tab);
  }
  buttons.forEach((b) => { b.onclick = () => show(b.dataset.tab); });
  window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
  show(location.hash.slice(1) || names[0], false);
  return show;
};

/* Time like "5 min ago" for notifications */
ES.timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  const units = [[86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [sec, name] of units) if (s >= sec) { const n = Math.floor(s / sec); return `${n} ${name}${n > 1 ? 's' : ''} ago`; }
};
