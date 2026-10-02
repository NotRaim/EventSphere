/* ==========================================================================
   Layout: loads the shared navbar + footer (components/*.html), wires the
   theme toggle, mobile menu and login state, then removes the loading screen.
   ========================================================================== */
(async function () {
  // Loading screen (removed as soon as the navbar is ready)
  const loader = document.createElement('div');
  loader.className = 'page-loader';
  loader.innerHTML = '<div class="loader-orbit" role="status" aria-label="Loading"></div>';
  if (!sessionStorage.getItem('es_transition')) document.body.appendChild(loader);

  const load = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.text(); });
  const navHost = document.getElementById('app-nav');
  const footHost = document.getElementById('app-footer');

  try {
    const [nav, foot] = await Promise.all([navHost ? load('components/navbar.html') : '', footHost ? load('components/footer.html') : '']);
    if (navHost) navHost.innerHTML = nav;
    if (footHost) { footHost.innerHTML = foot; const y = footHost.querySelector('#year'); if (y) y.textContent = new Date().getFullYear(); }
  } catch (e) {
    console.error('Could not load shared components. Open the site through the Express server (http://localhost:5000).', e);
    if (navHost) navHost.innerHTML = '<header class="nav scrolled"><div class="container nav-inner"><a class="logo" href="index.html">EventSphere</a></div></header>';
  }

  const nav = document.getElementById('nav');
  const user = ES.getUser();
  const loggedIn = !!(user && ES.getToken());

  // login state
  ES.$$('[data-guest]').forEach((el) => { el.hidden = loggedIn; });
  ES.$$('[data-auth]').forEach((el) => { el.hidden = !loggedIn; });
  if (loggedIn) {
    const dash = document.getElementById('dashLink');
    if (dash) dash.href = ES.dashboardPath(user.role);
    const out = document.getElementById('logoutBtn');
    if (out) out.onclick = () => ES.logout();
    refreshBell();
  }

  // active link
  const page = document.body.dataset.page;
  ES.$$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === page));

  // theme toggle icon
  const themeBtn = document.getElementById('themeToggle');
  const syncIcon = () => { if (themeBtn) themeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>'; };
  syncIcon();
  if (themeBtn) themeBtn.onclick = () => { ES.toggleTheme(); syncIcon(); };

  // mobile menu
  const menuBtn = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  if (menuBtn && links) {
    menuBtn.onclick = () => {
      const open = links.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    };
    links.addEventListener('click', (e) => { if (e.target.closest('a')) links.classList.remove('open'); });
  }

  // navbar background after scrolling
  const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  loader.remove();
  ES._resolveLayout();
  document.dispatchEvent(new Event('layout:ready'));

  async function refreshBell() {
    try {
      const { unread } = await ES.api('/notifications');
      const dot = document.getElementById('bellCount');
      if (dot) { dot.textContent = unread > 9 ? '9+' : unread; dot.hidden = !unread; }
    } catch { /* bell is optional */ }
  }
  ES.refreshBell = refreshBell;
})();
