/* ==========================================================================
   GSAP animation helpers (global: ES.anim). Every helper falls back safely if
   GSAP failed to load or the visitor prefers reduced motion.
   ========================================================================== */
ES.anim = (() => {
  const ok = () => window.gsap && !ES.reduceMotion;

  /* Fade/slide elements in when they scroll into view. Mark elements with data-reveal. */
  let observer;
  function reveal(root = document) {
    const items = ES.$$('[data-reveal]:not(.revealed):not([data-seen])', root);
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('revealed')); return; }
    observer = observer || new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      visible.forEach((el) => observer.unobserve(el));
      if (!visible.length) return;
      if (ok()) {
        visible.forEach((el) => el.classList.add('revealed'));
        gsap.fromTo(visible, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .09, clearProps: 'transform' });
      } else visible.forEach((el) => el.classList.add('revealed'));
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => { el.setAttribute('data-seen', ''); observer.observe(el); });
  }

  /* Stagger a list of freshly rendered nodes (cards, rows) */
  function stagger(nodes, vars = {}) {
    const list = Array.from(nodes || []);
    if (!list.length) return;
    if (!ok()) return;
    gsap.fromTo(list, { y: 26, opacity: 0, scale: .97 }, { y: 0, opacity: 1, scale: 1, duration: .55, ease: 'power2.out', stagger: .06, clearProps: 'transform,opacity', ...vars });
  }

  /* Count up numbers: <span data-count="500" data-suffix="+"> */
  function counters(root = document) {
    ES.$$('[data-count]', root).forEach((el) => {
      const target = Number(el.dataset.count), suffix = el.dataset.suffix || '';
      const fmt = (n) => (target >= 1000 && el.dataset.short ? Math.round(n / 1000) + 'K' : Math.round(n).toLocaleString('en')) + suffix;
      if (!ok()) { el.textContent = fmt(target); return; }
      const obj = { v: 0 };
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        gsap.to(obj, { v: target, duration: 2, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(obj.v); } });
      }, { threshold: .4 });
      io.observe(el);
    });
  }

  /* Animate a number that changes (dashboard stats) */
  function countTo(el, value, suffix = '') {
    if (!el) return;
    if (!ok()) { el.textContent = value + suffix; return; }
    const obj = { v: 0 };
    gsap.to(obj, { v: Number(value) || 0, duration: 1.1, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; } });
  }

  /* Soft fade when switching dashboard tabs */
  function panelIn(panel) { if (ok()) gsap.fromTo(panel, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power2.out', clearProps: 'transform,opacity' }); }

  /* Page transition: a gradient curtain wipes across when navigating between pages */
  function pageTransitions() {
    const curtain = document.createElement('div');
    curtain.className = 'curtain';
    document.body.appendChild(curtain);

    if (window.gsap) gsap.set(curtain, { yPercent: 100 });
    if (sessionStorage.getItem('es_transition') && ok()) {
      sessionStorage.removeItem('es_transition');
      gsap.set(curtain, { yPercent: 0 });                                                      // arrive covered…
      gsap.to(curtain, { yPercent: -100, duration: .55, ease: 'power3.inOut', delay: .05 });  // …then slide away
    } else sessionStorage.removeItem('es_transition');

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || !ok() || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html?$/.test(url.pathname) && url.pathname !== '/') return;
      if (url.pathname === location.pathname && url.hash) return; // same-page anchor
      e.preventDefault();
      sessionStorage.setItem('es_transition', '1');
      gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { location.href = a.href; } });
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) { sessionStorage.removeItem('es_transition'); gsap.set(curtain, { yPercent: 100 }); } });
  }

  /* Subtle "magnetic" pull on key buttons */
  function magnetic(root = document) {
    if (!ok() || matchMedia('(pointer: coarse)').matches) return;
    ES.$$('.magnetic', root).forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .18, y: (e.clientY - r.top - r.height / 2) * .25, duration: .3 });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1,.4)' }));
    });
  }

  ES.layoutReady.then(() => { pageTransitions(); reveal(); counters(); magnetic(); });
  return { reveal, stagger, counters, countTo, panelIn, magnetic, ok };
})();
