// Runs in <head> before the page paints, so there is no dark/light flash.
(function () {
  var saved = null;
  try { saved = localStorage.getItem('es_theme'); } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved || 'dark');
  document.documentElement.classList.add('js');
})();
