/* ==========================================================================
   Chart.js helpers: consistent colours + automatic light/dark re-theming.
   ES.chart(canvasId, config) replaces any previous chart on that canvas.
   ========================================================================== */
ES.charts = {};
ES.palette = () => ['#6C63FF', '#00D4FF', '#FF6FB5', '#2ED47A', '#FFB020', '#F857A6', '#4FACFE', '#9B5DE5', '#FF8A00'];

ES.chart = (id, config) => {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return null;
  if (ES.charts[id]) ES.charts[id].destroy();

  const text = ES.themeColor('--muted') || '#9AA3C0';
  const grid = ES.themeColor('--border') || 'rgba(255,255,255,.1)';
  Chart.defaults.color = text;
  Chart.defaults.font.family = "'Manrope', system-ui, sans-serif";

  config.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: ES.reduceMotion ? 0 : 900 } }, config.options || {});
  const type = config.type;
  if (type !== 'doughnut' && type !== 'pie') {
    config.options.scales = Object.assign({
      x: { grid: { display: false }, ticks: { color: text } },
      y: { beginAtZero: true, grid: { color: grid }, ticks: { color: text, precision: 0 } },
    }, config.options.scales || {});
  }
  config.options.plugins = Object.assign({ legend: { display: type === 'doughnut' || type === 'pie', position: 'bottom', labels: { color: text, boxWidth: 12, usePointStyle: true } } }, config.options.plugins || {});

  ES.charts[id] = new Chart(canvas, config);
  return ES.charts[id];
};

document.addEventListener('themechange', () => {
  // re-render charts with the new theme colours
  Object.keys(ES.charts).forEach((id) => {
    const c = ES.charts[id];
    const text = ES.themeColor('--muted'), grid = ES.themeColor('--border');
    if (c.options.scales) Object.values(c.options.scales).forEach((s) => { if (s.ticks) s.ticks.color = text; if (s.grid && s.grid.color) s.grid.color = grid; });
    if (c.options.plugins.legend && c.options.plugins.legend.labels) c.options.plugins.legend.labels.color = text;
    c.update();
  });
});
