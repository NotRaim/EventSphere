
const ES = (() => {
  const API = (location.protocol === 'file:' || ['5500','5501','8080'].includes(location.port))
    ? 'http://localhost:5000/api' : '/api';

  const demo = [
    {id:'demo-1',title:'Neon Garden Sessions',category:'Music',date:'2026-10-17',time:'19:30',venue:'Riverfront Warehouse',city:'Ahmedabad',price:799,capacity:250,registeredCount:178,description:'An intimate live-music evening with immersive lighting, independent artists and late-night food.',image:'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85'},
    {id:'demo-2',title:'Sunday Food Stories',category:'Food',date:'2026-10-19',time:'11:00',venue:'The Courtyard',city:'Ahmedabad',price:499,capacity:120,registeredCount:74,description:'Local chefs, small plates and conversations about the food that shapes our city.',image:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85'},
    {id:'demo-3',title:'The Design Room',category:'Design',date:'2026-10-24',time:'16:00',venue:'Studio 47',city:'Ahmedabad',price:299,capacity:80,registeredCount:51,description:'A practical evening of visual storytelling, brand thinking and portfolio critique.',image:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85'},
    {id:'demo-4',title:'Open Air Cinema Club',category:'Film',date:'2026-10-25',time:'20:00',venue:'Riverfront Lawn',city:'Ahmedabad',price:199,capacity:300,registeredCount:215,description:'A curated film screening under the open sky with snacks and post-screening discussion.',image:'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85'},
    {id:'demo-5',title:'Morning Run Social',category:'Sports',date:'2026-11-01',time:'06:30',venue:'Riverfront East',city:'Ahmedabad',price:0,capacity:180,registeredCount:122,description:'A relaxed community run followed by coffee, stretching and new introductions.',image:'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85'},
    {id:'demo-6',title:'Mindful Sunday',category:'Wellness',date:'2026-11-02',time:'08:00',venue:'The Green House',city:'Ahmedabad',price:399,capacity:70,registeredCount:39,description:'Breathwork, gentle movement and a quiet morning designed to reset your week.',image:'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85'}
  ];

  const session = {
    getToken(){return sessionStorage.getItem('es_token')||localStorage.getItem('es_token')||localStorage.getItem('token')},
    getUser(){try{return JSON.parse(sessionStorage.getItem('es_user')||localStorage.getItem('es_user')||'null')}catch{return null}},
    set(token,user,remember=true){(remember?localStorage:sessionStorage).setItem('es_token',token);(remember?localStorage:sessionStorage).setItem('es_user',JSON.stringify(user))},
    clear(){['es_token','es_user','token'].forEach(k=>{localStorage.removeItem(k);sessionStorage.removeItem(k)})}
  };

  async function api(path, opts={}){
    const headers={...(opts.headers||{})};
    const token=session.getToken();
    if(token && opts.auth!==false) headers.Authorization='Bearer '+token;
    let body=opts.body;
    if(body && !(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body)}
    const res=await fetch(API+path,{method:opts.method||'GET',headers,body});
    let data={};try{data=await res.json()}catch{}
    if(!res.ok) throw new Error(data.message||'Request failed');
    return data;
  }

  async function events(){
    // Never leave the UI waiting for the backend. Demo events render immediately,
    // then the API can replace them when it responds.
    const fallback = demo.slice();
    try{
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(API + '/events', {
        method:'GET',
        headers:{'Accept':'application/json'},
        signal:controller.signal
      });
      clearTimeout(timeout);
      let data = {};
      try{ data = await res.json(); }catch{}
      if(!res.ok) return fallback;
      const list = Array.isArray(data) ? data : (data.events || data.data || []);
      return Array.isArray(list) && list.length ? list : fallback;
    }catch{
      return fallback;
    }
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function date(v){return new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
  function time(v=''){const [h,m]=v.split(':').map(Number);if(Number.isNaN(h))return v;return `${((h+11)%12)+1}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}
  function img(v){return v||'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'}
  function seats(e){return Math.max(0,(e.capacity||0)-(e.registeredCount||0))}
  function toast(message,type='info'){
    let wrap=document.querySelector('.toast-wrap');if(!wrap){wrap=document.createElement('div');wrap.className='toast-wrap';document.body.append(wrap)}
    const el=document.createElement('div');el.className='toast '+type;el.textContent=message;wrap.append(el);setTimeout(()=>el.remove(),3600)
  }
  function logout(){session.clear();location.href='index.html'}
  function guard(role){
    const u=session.getUser();if(!session.getToken()||!u){location.href='login.html?next='+encodeURIComponent(location.href);return null}
    if(role&&u.role!==role){location.href=u.role==='admin'?'admin.html':u.role==='organizer'?'organizer.html':'dashboard.html';return null}
    return u;
  }

  function savedEvents(){
    try{return JSON.parse(localStorage.getItem('es_favorites')||'[]')}catch{return []}
  }
  function toggleSaved(id){
    let ids=savedEvents(); id=String(id);
    if(ids.includes(id)){ids=ids.filter(x=>x!==id);toast('Removed from saved events');}
    else{ids.push(id);toast('Saved to your plans','success');}
    localStorage.setItem('es_favorites',JSON.stringify(ids));
    return ids.includes(id);
  }
  function tickets(){
    try{return JSON.parse(localStorage.getItem('es_tickets')||'[]')}catch{return []}
  }
  function addTicket(ticket){
    const all=tickets(); all.unshift(ticket); localStorage.setItem('es_tickets',JSON.stringify(all)); return ticket;
  }
  function notifications(){
    try{return JSON.parse(localStorage.getItem('es_notifications')||'[]')}catch{return []}
  }
  function pushNotification(title,message){
    const all=notifications();
    all.unshift({id:Date.now(),title,message,read:false,createdAt:new Date().toISOString()});
    localStorage.setItem('es_notifications',JSON.stringify(all.slice(0,30)));
  }
  function markNotificationsRead(){
    const all=notifications().map(n=>({...n,read:true}));
    localStorage.setItem('es_notifications',JSON.stringify(all));
  }
  function profilePrefs(){try{return JSON.parse(localStorage.getItem('es_preferences')||'{}')}catch{return {}}}
  function saveProfilePrefs(prefs){localStorage.setItem('es_preferences',JSON.stringify(prefs||{}));}
  function interests(){return profilePrefs().interests||[]}
  function setInterests(items){saveProfilePrefs({...profilePrefs(),interests:[...new Set(items)]})}
  function recentViews(){try{return JSON.parse(localStorage.getItem('es_recent_views')||'[]')}catch{return []}}
  function trackView(id){let a=recentViews().filter(x=>String(x)!==String(id));a.unshift(String(id));localStorage.setItem('es_recent_views',JSON.stringify(a.slice(0,10)))}
  function ratingKey(id){return 'es_rating_'+id}
  function getRating(id){return Number(localStorage.getItem(ratingKey(id))||0)}
  function setRating(id,value){localStorage.setItem(ratingKey(id),String(value));toast('Thanks for rating this event','success')}
  function addToCalendar(event){
    const start=new Date(`${new Date(event.date).toISOString().slice(0,10)}T${event.time||'09:00'}:00`);
    const end=new Date(start.getTime()+2*60*60*1000);
    const fmt=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const ics=[
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//EventSphere//EN','BEGIN:VEVENT',
      `UID:eventsphere-${event.id}@eventsphere`,`DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,
      `SUMMARY:${String(event.title||'EventSphere Event').replace(/[,;]/g,' ')}`,
      `LOCATION:${String(event.venue||event.location||'').replace(/[,;]/g,' ')}`,
      `DESCRIPTION:${String(event.description||'').replace(/\n/g,' ').replace(/[,;]/g,' ')}`,
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');
    const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='eventsphere-event.ics';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('Calendar file downloaded','success');
  }

  // Authentication-aware header.
  // Every page gets the same navigation state from the current session.
  function hydrateHeader(){
    const user=session.getUser();
    document.querySelectorAll('.site-nav').forEach(nav=>{
      const actions=nav.querySelector('.nav-actions');
      if(!actions) return;

      let authArea=actions.querySelector('[data-auth-area]');
      if(!authArea){
        authArea=document.createElement('div');
        authArea.dataset.authArea='true';
        authArea.className='auth-nav-area';
        actions.insertBefore(authArea, actions.querySelector('[data-menu]'));
      }

      if(user && session.getToken()){
        const role=user.role||'user';
        const destination=role==='admin'?'admin.html':role==='organizer'?'organizer.html':'dashboard.html';
        const label=role==='admin'?'Admin':role==='organizer'?'Organizer':'My plans';
        const manageLink=['organizer','admin'].includes(role)
          ? `<a class="btn btn-ghost desktop-action manage-nav-link" href="manage-events.html">Manage events</a>`
          : '';
        authArea.innerHTML=`
          ${manageLink}
          <a class="btn btn-ghost desktop-action auth-dashboard" href="${destination}">${label}</a>
          <a class="btn btn-ghost desktop-action profile-nav-link" href="profile.html">Profile</a>
          <a class="btn btn-ghost desktop-action contact-nav-link" href="contact-admin.html">Help</a>
          <button class="btn btn-cyan desktop-action auth-logout" type="button">Log out</button>
        `;
      }else{
        authArea.innerHTML=`
          <a class="btn btn-dark desktop-action" href="login.html">Log in</a>
          <a class="btn btn-cyan desktop-action" href="register.html" data-magnetic>Join</a>
        `;
      }

      const panel=document.querySelector('.mobile-panel');
      if(panel){
        panel.querySelectorAll('[data-auth-mobile]').forEach(x=>x.remove());
        const wrap=document.createElement('div');
        wrap.dataset.authMobile='true';
        if(user && session.getToken()){
          const role=user.role||'user';
          const destination=role==='admin'?'admin.html':role==='organizer'?'organizer.html':'dashboard.html';
          wrap.innerHTML=`<div class="mobile-user-card"><span class="mobile-user-avatar">${esc((user.name||user.email||'E').slice(0,1).toUpperCase())}</span><div><strong>${esc(user.name||'EventSphere member')}</strong><small>${esc(role)}</small></div></div>
          <div class="mobile-auth-links">
            ${['organizer','admin'].includes(role)?'<a href="manage-events.html"><span>Manage events</span><small>Events, check-in & QR</small></a>':''}
            <a href="${destination}"><span>${role==='admin'?'Admin control center':role==='organizer'?'Organizer studio':'My plans'}</span><small>Dashboard & activity</small></a>
            <a href="tickets.html"><span>My tickets</span><small>Passes & verification</small></a>
            <a href="saved.html"><span>Saved plans</span><small>Your shortlist</small></a>
            <a href="profile.html"><span>Profile</span><small>Edit your details</small></a>
            <a href="contact-admin.html"><span>Contact admin</span><small>Get help or report an issue</small></a>
          </div>
          <button class="mobile-logout" type="button">Log out</button>`;
        }else{
          wrap.innerHTML=`<a href="login.html">Log in</a><a href="register.html">Join EventSphere</a>`;
        }
        panel.appendChild(wrap);
      }

      authArea.querySelector('.auth-logout')?.addEventListener('click',()=>{
        session.clear();
        toast('You have been logged out','success');
        setTimeout(()=>location.href='index.html',220);
      });
      panel?.querySelector('.mobile-logout')?.addEventListener('click',()=>{
        session.clear();
        location.href='index.html';
      });
    });
  }


  async function remoteFavorites(){ if(!session.getToken()) return []; try{const r=await api('/me/favorites');return (r.events||[]).map(e=>String(e.id||e._id));}catch{return savedEvents()} }
  async function remoteToggleSaved(id){ const r=await api('/me/favorites/'+encodeURIComponent(id),{method:'POST'}); return !!r.saved; }
  async function remoteTickets(){ if(!session.getToken()) return []; try{return await api('/tickets/mine');}catch{return tickets()} }
  async function remotePrefs(){ if(!session.getToken()) return profilePrefs(); try{return await api('/me/preferences')}catch{return profilePrefs()} }
  async function remoteSavePrefs(prefs){ await api('/me/preferences',{method:'PUT',body:prefs}); saveProfilePrefs(prefs); return prefs; }
  async function remoteRate(eventId,value){ await api('/me/ratings/'+encodeURIComponent(eventId),{method:'POST',body:{value}}); setRating(eventId,value); }
  async function remoteNotifications(){ if(!session.getToken()) return notifications(); try{return await api('/me/notifications')}catch{return notifications()} }
  async function remoteReadAllNotifications(){ await api('/me/notifications/read-all',{method:'POST'}); markNotificationsRead(); }
  async function remoteProfile(data){ const r=await api('/me/profile',{method:'PUT',body:data}); const token=session.getToken(); if(token) session.set(token,r.user,true); return r.user; }
  function categoryClass(category){return 'ticket-'+String(category||'community').toLowerCase().replace(/[^a-z]/g,'')}

  return {API,demo,session,api,events,esc,date,time,img,seats,toast,logout,guard,hydrateHeader,remoteFavorites,remoteToggleSaved,remoteTickets,remotePrefs,remoteSavePrefs,remoteRate,remoteNotifications,remoteReadAllNotifications,remoteProfile,categoryClass,savedEvents,toggleSaved,tickets,addTicket,notifications,pushNotification,markNotificationsRead,profilePrefs,saveProfilePrefs,interests,setInterests,recentViews,trackView,getRating,setRating,addToCalendar};

})();

window.addEventListener('DOMContentLoaded',()=>{
  ES.hydrateHeader();
  // Compact header: hide on scroll down, reveal on scroll up.
  const nav=document.querySelector('.site-nav');
  if(nav){
    let last=window.scrollY, ticking=false;
    const update=()=>{
      const y=window.scrollY;
      nav.classList.toggle('scrolled',y>30);
      if(y>90 && y>last+6) nav.classList.add('nav-hidden');
      else if(y<last-5 || y<60) nav.classList.remove('nav-hidden');
      last=y;ticking=false;
    };
    window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(update);ticking=true}},{passive:true});
  }

  // Contextual back button on every inner page.
  document.querySelectorAll('[data-back]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(history.length>1 && document.referrer && new URL(document.referrer).origin===location.origin) history.back();
      else location.href='index.html';
    });
  });

  // Notification dropdowns
  document.querySelectorAll('[data-notifications]').forEach(btn=>{
    const box=btn.closest('.dropdown');btn.addEventListener('click',()=>box.classList.toggle('open'));
    document.addEventListener('click',e=>{if(!box.contains(e.target))box.classList.remove('open')});
  });

  // Mobile menu
  const toggle=document.querySelector('[data-menu]');
  const panel=document.querySelector('.mobile-panel');
  if(toggle&&panel) toggle.onclick=()=>panel.classList.toggle('open');

  // Reveal observer
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}})
  },{threshold:.12});
  document.querySelectorAll('.reveal').forEach(x=>observer.observe(x));

  // Cursor glow
  const glow=document.createElement('div');glow.className='cursor-glow';document.body.append(glow);
  let mx=-500,my=-500,tx=mx,ty=my;
  window.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY},{passive:true});
  const loop=()=>{tx+=(mx-tx)*.08;ty+=(my-ty)*.08;glow.style.left=tx+'px';glow.style.top=ty+'px';requestAnimationFrame(loop)};loop();

  // Buttons: ripple micro-interaction
  document.querySelectorAll('.btn').forEach(btn=>btn.addEventListener('click',e=>{
    const r=document.createElement('span');r.className='ripple';const rect=btn.getBoundingClientRect();
    r.style.width=r.style.height=Math.max(rect.width,rect.height)+'px';r.style.left=e.clientX-rect.left-rect.width/2+'px';r.style.top=e.clientY-rect.top-rect.height/2+'px';btn.append(r);setTimeout(()=>r.remove(),650)
  }));

  // Lightweight magnetic effect
  document.querySelectorAll('[data-magnetic]').forEach(el=>{
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.08}px)`});
    el.addEventListener('pointerleave',()=>el.style.transform='');
  });
});
