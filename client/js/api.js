/* ==========================================================================
   EventSphere – core client library  (global object: ES)
   Everything shared by all pages: API calls, login session, toasts, modals,
   formatting helpers. Load this FIRST on every page.
   ========================================================================== */
const ES = (() => {
  // ---- Where is the backend? ----
  // Normally the Express server also serves this frontend, so '/api' just works.
  // If you open the pages with VS Code Live Server (port 5500) or file://, we talk to localhost:5000.
  const devPorts = ['5500', '5501', '8080'];
  const API_ORIGIN = (location.protocol === 'file:' || devPorts.includes(location.port))
    ? (window.ES_API_ORIGIN || 'http://localhost:5000') : '';
  const API = API_ORIGIN + '/api';

  const CATEGORIES = ['Technology', 'Cultural', 'Sports', 'Business', 'Education', 'Music', 'Workshop', 'Competition', 'Seminar'];
  const CAT = {
    Technology:  { icon: 'fa-microchip',        a: '#6C63FF', b: '#00D4FF' },
    Cultural:    { icon: 'fa-masks-theater',    a: '#FF6FB5', b: '#FFB86C' },
    Sports:      { icon: 'fa-futbol',           a: '#00B894', b: '#7BE495' },
    Business:    { icon: 'fa-briefcase',        a: '#4FACFE', b: '#6C63FF' },
    Education:   { icon: 'fa-graduation-cap',   a: '#27C58B', b: '#38D9D9' },
    Music:       { icon: 'fa-music',            a: '#F857A6', b: '#FF6A5C' },
    Workshop:    { icon: 'fa-screwdriver-wrench', a: '#F6B21B', b: '#F37335' },
    Competition: { icon: 'fa-trophy',           a: '#EE0979', b: '#FF8A00' },
    Seminar:     { icon: 'fa-microphone-lines', a: '#667EEA', b: '#9B5DE5' },
  };

  /* ---------------- Session (JWT) ---------------- */
  const store = {
    get: (k) => sessionStorage.getItem(k) || localStorage.getItem(k),
    set: (k, v, remember) => { (remember ? localStorage : sessionStorage).setItem(k, v); },
    clear: () => ['es_token', 'es_user'].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); }),
  };
  const getToken = () => store.get('es_token');
  const getUser = () => { try { return JSON.parse(store.get('es_user')); } catch { return null; } };
  const setSession = (token, user, remember) => { store.clear(); store.set('es_token', token, remember); store.set('es_user', JSON.stringify(user), remember); };
  const updateUser = (user) => {
    const inLocal = !!localStorage.getItem('es_user');
    store.set('es_user', JSON.stringify(user), inLocal);
  };
  const logout = () => { store.clear(); location.href = 'index.html'; };
  const dashboardPath = (role) => ({ admin: 'admin.html', organizer: 'organizer.html' }[role] || 'dashboard.html');

  /* Redirects away from pages the current visitor must not see. Returns the user. */
  function guard(roles) {
    const user = getUser();
    if (!getToken() || !user) {
      location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
      return null;
    }
    if (roles && !roles.includes(user.role)) { location.replace(dashboardPath(user.role)); return null; }
    return user;
  }

  /* ---------------- API wrapper ---------------- */
  async function api(path, { method = 'GET', body, form, auth = true, raw = false } = {}) {
    const headers = {};
    const token = getToken();
    if (token && auth) headers.Authorization = 'Bearer ' + token;
    let payload;
    if (form) payload = form;                       // FormData (event image upload)
    else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

    let res;
    try {
      res = await fetch(API + path, { method, headers, body: payload });
    } catch {
      throw Object.assign(new Error('Cannot reach the server. Make sure the backend is running.'), { status: 0 });
    }
    if (raw) return res;

    let data = {};
    try { data = await res.json(); } catch { /* non-JSON response */ }

    if (!res.ok) {
      if (res.status === 401 && token && document.body.dataset.protected) {
        store.clear();
        location.replace('login.html?expired=1');
      }
      throw Object.assign(new Error(data.message || 'Server error. Please try again'), { status: res.status });
    }
    return data;
  }

  /* ---------------- Helpers ---------------- */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (name = '?') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const fmtDate = (d, long) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' });
  const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
  const fmtTime = (t = '') => {
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h)) return t;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const eventStart = (ev) => new Date(`${isoDate(ev.date)}T${ev.time || '00:00'}:00`);
  const isPast = (ev) => eventStart(ev) < new Date();
  const seatsLeft = (ev) => Math.max(0, ev.capacity - (ev.registeredCount || 0));
  const deadlinePassed = (ev) => new Date(isoDate(ev.registrationDeadline) + 'T23:59:59') < new Date();
  const imgUrl = (u) => (u && u.startsWith('/uploads') ? API_ORIGIN + u : u);
  const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* Banner style for an event: uploaded image, or a category gradient + icon */
  function bannerStyle(ev) {
    const c = CAT[ev.category] || CAT.Technology;
    const grad = `linear-gradient(135deg, ${c.a}, ${c.b})`;
    return ev.image ? `background-image:url('${esc(imgUrl(ev.image))}'),${grad}` : `background:${grad}`;
  }
  const catIcon = (cat) => (CAT[cat] || CAT.Technology).icon;

  /* ---------------- Toasts ---------------- */
  function toast(message, type = 'info', ms = 4200) {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${esc(message)}</span><button class="x" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;
    box.appendChild(el);
    const remove = () => {
      if (window.gsap) gsap.to(el, { x: 40, opacity: 0, duration: .25, onComplete: () => el.remove() }); else el.remove();
    };
    el.querySelector('.x').onclick = remove;
    if (window.gsap && !ES.reduceMotion) gsap.from(el, { x: 60, opacity: 0, duration: .4, ease: 'power3.out' });
    setTimeout(remove, ms);
  }

  /* ---------------- Modal ---------------- */
  function modal({ title = '', html = '', size = '', onMount } = {}) {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-body">${html}</div></div>`;
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    const box = back.querySelector('.modal');
    if (window.gsap && !ES.reduceMotion) {
      gsap.from(back, { opacity: 0, duration: .25 });
      gsap.from(box, { y: 40, scale: .96, opacity: 0, duration: .4, ease: 'power3.out' });
    }
    const close = () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (window.gsap && !ES.reduceMotion) gsap.to(back, { opacity: 0, duration: .2, onComplete: () => back.remove() }); else back.remove();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    back.querySelector('[data-close]').onclick = close;
    const api = { el: back, body: back.querySelector('.modal-body'), close };
    if (onMount) onMount(api);
    return api;
  }

  /* Confirm dialog -> Promise<boolean> (replaces window.confirm) */
  function confirmBox(message, { confirmText = 'Confirm', danger = false, title = 'Are you sure?' } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal({
        title, size: 'sm',
        html: `<p class="muted">${esc(message)}</p><div class="row" style="justify-content:flex-end;margin-top:18px">
          <button class="btn btn-ghost" data-no>Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(confirmText)}</button></div>`,
        onMount: (mm) => {
          mm.el.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); mm.close(); };
          mm.el.querySelector('[data-no]').onclick = () => mm.close();
        },
      });
      const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) resolve(false); } });
      obs.observe(document.body, { childList: true });
    });
  }

  /* Button loading state */
  async function withLoading(btn, fn) {
    const html = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
  }

  /* ---------------- Theme ---------------- */
  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('es_theme', next); } catch { /* ignore */ }
    document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  }
  const themeColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  let _resolveLayout;
  const layoutReady = new Promise((r) => { _resolveLayout = r; });
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    API, API_ORIGIN, CATEGORIES, CAT, api, getToken, getUser, setSession, updateUser, logout, guard, dashboardPath,
    esc, initials, fmtDate, isoDate, fmtTime, eventStart, isPast, seatsLeft, deadlinePassed, imgUrl, debounce, $, $$,
    bannerStyle, catIcon, toast, modal, confirm: confirmBox, withLoading, toggleTheme, themeColor,
    layoutReady, _resolveLayout, reduceMotion,
  };
})();
