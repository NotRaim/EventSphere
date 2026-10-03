
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
      const clean=list.filter(e=>e&&String(e.status||'published')==='published'&&String(e.visibility||'public')!=='private');
      return clean.length ? clean : fallback;
    }catch{
      return fallback;
    }
  }

  async function uploadImage(file){
    if(!file) return '';
    if(!/^image\//i.test(file.type)) throw new Error('Please choose an image file');
    if(file.size>5*1024*1024) throw new Error('Each image must be 5 MB or smaller');
    const compressed=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Could not read image'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Could not process image'));
        img.onload=()=>{
          const max=1800,scale=Math.min(1,max/Math.max(img.width,img.height));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.width*scale));
          canvas.height=Math.max(1,Math.round(img.height*scale));
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not compress image')),'image/webp',.82);
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
    const fd=new FormData();
    fd.append('image',compressed,`${String(file.name||'image').replace(/\.[^.]+$/,'')}.webp`);
    const result=await api('/uploads/image',{method:'POST',body:fd});
    return result.url||'';
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
  function notificationTime(value){
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    const mins=Math.floor((Date.now()-d.getTime())/60000);
    if(mins<1)return 'Just now';
    if(mins<60)return `${mins} min ago`;
    const hours=Math.floor(mins/60);
    if(hours<24)return `${hours}h ago`;
    const days=Math.floor(hours/24);
    if(days<7)return `${days}d ago`;
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
  }
  function recommendationScore(event,prefs={}){
    const interests=prefs.interests||[];
    const city=String(prefs.city||'').trim().toLowerCase();
    const mode=prefs.mode||'balanced';
    let score=0;
    if(interests.includes(event.category))score+=mode==='saved'?6:5;
    if(city && String(event.city||'').toLowerCase()===city)score+=mode==='nearby'?6:3;
    if(savedEvents().includes(String(event.id)))score+=2;
    if(recentViews().includes(String(event.id)))score+=1;
    const days=Math.max(0,Math.ceil((new Date(`${String(event.date).slice(0,10)}T${event.time||'23:59'}:00`)-new Date())/86400000));
    if(days<=14)score+=2;
    return score;
  }
  function recommendEvents(list,prefs={}){
    return [...list].sort((a,b)=>recommendationScore(b,prefs)-recommendationScore(a,prefs)||new Date(a.date)-new Date(b.date));
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
  // Authentication-aware header.
  // The static nav already contains Home / Discover / My plans.
  // We only change the role-sensitive links here so users never see
  // organizer-only navigation by accident and My plans is not duplicated.
  function hydrateHeader(){
    const user=session.getUser();
    const loggedIn=!!(user && session.getToken());

    document.querySelectorAll('.site-nav').forEach(nav=>{
      const links=nav.querySelector('.nav-links');
      const actions=nav.querySelector('.nav-actions');
      if(!actions) return;

      // ------------------------------------------------------
      // ROLE-BASED MAIN NAVIGATION
      // ------------------------------------------------------
      if(links){
        const createLinks=[
          ...links.querySelectorAll('a[href="organizer.html"]')
        ];
        const myPlanLinks=[
          ...links.querySelectorAll('a[href="dashboard.html"]')
        ];

        // Only organizers/admins should see Create event.
        const canCreate=loggedIn && ['organizer','admin'].includes(user.role);
        createLinks.forEach(a=>{
          a.hidden=!canCreate;
          a.setAttribute('aria-hidden',String(!canCreate));
        });

        // Keep exactly one My plans link in the main nav.
        if(myPlanLinks.length){
          const role=user?.role||'user';
          const destination=role==='admin'
            ? 'admin.html'
            : role==='organizer'
              ? 'organizer.html'
              : 'dashboard.html';

          const first=myPlanLinks[0];
          first.href=destination;
          first.textContent=role==='admin'
            ? 'Admin'
            : role==='organizer'
              ? 'Organizer'
              : 'My plans';

          myPlanLinks.slice(1).forEach(a=>a.remove());
        }
      }

      // ------------------------------------------------------
      // RIGHT-SIDE ACTIONS
      // ------------------------------------------------------
      let authArea=actions.querySelector('[data-auth-area]');
      if(!authArea){
        authArea=document.createElement('div');
        authArea.dataset.authArea='true';
        authArea.className='auth-nav-area';
        actions.insertBefore(authArea, actions.querySelector('[data-menu]'));
      }

      if(loggedIn){
        const role=user.role||'user';
        const manageLink=['organizer','admin'].includes(role)
          ? `<a class="btn btn-ghost desktop-action manage-nav-link" href="manage-events.html">Manage events</a>`
          : '';

        // Do NOT add another My plans button here — it already exists
        // in the main navigation.
        authArea.innerHTML=`
          ${manageLink}
          <div class="dropdown notification-dropdown">
            <button class="btn btn-ghost desktop-action notification-trigger" type="button" aria-label="Notifications" aria-expanded="false">
              <span aria-hidden="true">🔔</span>
              <span class="notification-dot" data-notification-count hidden>0</span>
            </button>
            <div class="dropdown-panel notification-panel" role="dialog" aria-label="Notifications">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
                <strong>Notifications</strong>
                <button class="btn btn-small btn-ghost" type="button" data-mark-notifications>Mark all read</button>
              </div>
              <div data-notification-list><div class="empty">Loading notifications…</div></div>
            </div>
          </div>
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

      // ------------------------------------------------------
      // MOBILE NAVIGATION
      // ------------------------------------------------------
      const panel=document.querySelector('.mobile-panel');
      if(panel){
        panel.querySelectorAll('[data-auth-mobile]').forEach(x=>x.remove());

        // Hide organizer-only mobile links for guests/normal users.
        panel.querySelectorAll('a[href="organizer.html"]').forEach(a=>{
          a.hidden=!(loggedIn && ['organizer','admin'].includes(user.role));
        });

        // Prevent duplicate My plans links in the mobile panel.
        const mobilePlans=[...panel.querySelectorAll('a[href="dashboard.html"]')];
        if(mobilePlans.length){
          const role=user?.role||'user';
          const destination=role==='admin'
            ? 'admin.html'
            : role==='organizer'
              ? 'organizer.html'
              : 'dashboard.html';
          mobilePlans[0].href=destination;
          mobilePlans[0].textContent=role==='admin'
            ? 'Admin'
            : role==='organizer'
              ? 'Organizer'
              : 'My plans';
          mobilePlans.slice(1).forEach(a=>a.remove());
        }

        const wrap=document.createElement('div');
        wrap.dataset.authMobile='true';

        if(loggedIn){
          const role=user.role||'user';
          const destination=role==='admin'
            ? 'admin.html'
            : role==='organizer'
              ? 'organizer.html'
              : 'dashboard.html';

          wrap.innerHTML=`
            <div class="mobile-user-card">
              <span class="mobile-user-avatar">${esc((user.name||user.email||'E').slice(0,1).toUpperCase())}</span>
              <div>
                <strong>${esc(user.name||'EventSphere member')}</strong>
                <small>${esc(role)}</small>
              </div>
            </div>
            <div class="mobile-auth-links">
              ${['organizer','admin'].includes(role)
                ? '<a href="manage-events.html"><span>Manage events</span><small>Events, check-in & QR</small></a>'
                : ''}
              <button class="mobile-notification-toggle" type="button" data-mobile-notifications>
                <span><span>Notifications</span><small>Updates & booking alerts</small></span>
                <span class="mobile-notification-count" data-mobile-notification-count hidden>0</span>
              </button>
              <div class="mobile-notification-panel" data-mobile-notification-panel hidden>
                <div class="mobile-notification-head">
                  <strong>Notifications</strong>
                  <button type="button" data-mobile-mark-notifications>Mark all read</button>
                </div>
                <div data-mobile-notification-list></div>
              </div>
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

      const mobileNotifyToggle=panel?.querySelector('[data-mobile-notifications]');
      const mobileNotifyPanel=panel?.querySelector('[data-mobile-notification-panel]');
      const mobileNotifyList=panel?.querySelector('[data-mobile-notification-list]');
      const mobileNotifyCount=panel?.querySelector('[data-mobile-notification-count]');
      const mobileMarkAll=panel?.querySelector('[data-mobile-mark-notifications]');

      const drawMobileNotifications=(items=[])=>{
        const unread=items.filter(n=>!n.read).length;
        if(mobileNotifyCount){
          mobileNotifyCount.textContent=unread>9?'9+':String(unread);
          mobileNotifyCount.hidden=!unread;
        }
        if(!mobileNotifyList)return;
        mobileNotifyList.innerHTML=items.length
          ? items.map(n=>`<button type="button" class="mobile-notif ${n.read?'':'unread'}" data-mobile-notification-id="${esc(n.id||n._id||'')}"><strong>${esc(n.title||'EventSphere update')}</strong><span>${esc(n.message||'')}</span><small>${notificationTime(n.createdAt)}</small></button>`).join('')
          : '<div class="notification-empty"><span>✓</span><strong>You’re all caught up</strong><small>No new EventSphere updates.</small></div>';
      };

      const refreshMobileNotifications=async()=>{
        if(!loggedIn)return;
        try{
          const result=await remoteNotifications();
          drawMobileNotifications(Array.isArray(result)?result:[]);
        }catch{drawMobileNotifications(notifications())}
      };

      mobileNotifyToggle?.addEventListener('click',async ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        const opening=mobileNotifyPanel?.hidden!==false;
        if(mobileNotifyPanel)mobileNotifyPanel.hidden=!opening;
        if(opening)await refreshMobileNotifications();
      });

      mobileMarkAll?.addEventListener('click',async()=>{
        try{await remoteReadAllNotifications();}catch{}
        await refreshMobileNotifications();
        toast('All notifications marked as read','success');
      });

      mobileNotifyPanel?.addEventListener('click',async ev=>{
        const item=ev.target.closest('[data-mobile-notification-id]');
        if(!item)return;
        const id=item.dataset.mobileNotificationId;
        try{await api('/me/notifications/'+encodeURIComponent(id)+'/read',{method:'POST'});}catch{}
        await refreshMobileNotifications();
      });

      refreshMobileNotifications();
    });
  }

  async function mountNotificationCenter(){
    const dropdown=document.querySelector('.notification-dropdown');
    if(!dropdown || !session.getToken()) return;

    const trigger=dropdown.querySelector('.notification-trigger');
    const list=dropdown.querySelector('[data-notification-list]');
    const count=dropdown.querySelector('[data-notification-count]');
    const mark=dropdown.querySelector('[data-mark-notifications]');
    let items=[];

    const unreadCount=()=>items.filter(n=>!n.read).length;

    const updateBadge=()=>{
      const unread=unreadCount();
      if(count){
        count.textContent=unread>9?'9+':String(unread);
        count.hidden=!unread;
      }
    };

    const draw=()=>{
      updateBadge();
      if(!list)return;

      list.innerHTML=items.length
        ? items.map(n=>{
            const id=esc(n.id||n._id||'');
            const title=esc(n.title||'EventSphere update');
            const message=esc(n.message||'');
            const when=notificationTime(n.createdAt);
            return `
              <button type="button"
                class="notif ${n.read?'':'unread'}"
                data-notification-id="${id}"
                aria-label="${title}">
                <span class="notif-icon" aria-hidden="true">${n.read?'•':'●'}</span>
                <span class="notif-copy">
                  <strong>${title}</strong>
                  <span>${message}</span>
                  <small>${when}</small>
                </span>
                ${n.read?'':'<span class="notif-new">NEW</span>'}
              </button>`;
          }).join('')
        : '<div class="notification-empty"><span>✓</span><strong>You’re all caught up</strong><small>No new EventSphere updates.</small></div>';
    };

    const load=async()=>{
      try{
        const result=await remoteNotifications();
        items=Array.isArray(result)?result:[];
      }catch{
        items=notifications();
      }
      draw();
    };

    await load();

    trigger?.addEventListener('click',async ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      const opening=!dropdown.classList.contains('open');
      document.querySelectorAll('.notification-dropdown.open').forEach(x=>{
        if(x!==dropdown){
          x.classList.remove('open');
          x.querySelector('.notification-trigger')?.setAttribute('aria-expanded','false');
        }
      });
      dropdown.classList.toggle('open',opening);
      trigger.setAttribute('aria-expanded',opening?'true':'false');
      if(opening) await load();
    });

    dropdown.addEventListener('click',async ev=>{
      const item=ev.target.closest('[data-notification-id]');
      if(!item)return;

      const id=item.dataset.notificationId;
      const found=items.find(n=>String(n.id||n._id)===String(id));
      if(!found || found.read)return;

      try{
        await api('/me/notifications/'+encodeURIComponent(id)+'/read',{method:'POST'});
      }catch{}

      found.read=true;
      draw();
    });

    mark?.addEventListener('click',async ev=>{
      ev.preventDefault();
      ev.stopPropagation();

      if(!unreadCount())return;

      try{await remoteReadAllNotifications();}catch{}
      items=items.map(n=>({...n,read:true}));
      draw();
      toast('All notifications marked as read','success');
    });

    // Keep the badge useful without requiring a page refresh.
    setInterval(load,30000);
  }

  // ----------------------------------------------------------
  // EVENT AVAILABILITY / TICKET SALES DEADLINE
  // ----------------------------------------------------------

  // Registration deadline is inclusive through 11:59:59 PM.
  // If no registration deadline exists, the event remains bookable
  // until the event starts.
  function registrationDeadlinePassed(event){
    if(!event) return true;

    const deadline=String(event.registrationDeadline||'').trim();
    const cutoff=deadline
      ? new Date(`${deadline.slice(0,10)}T23:59:59`)
      : new Date(`${String(event.date).slice(0,10)}T${event.time||'00:00'}:00`);

    return Number.isNaN(cutoff.getTime()) || cutoff < new Date();
  }

  function isEventBookable(event){
    return !registrationDeadlinePassed(event) && seats(event)>0;
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

  return {API,demo,session,api,events,esc,date,time,img,seats,registrationDeadlinePassed,isEventBookable,toast,logout,guard,hydrateHeader,mountNotificationCenter,recommendEvents,recommendationScore,notificationTime,remoteFavorites,remoteToggleSaved,remoteTickets,remotePrefs,remoteSavePrefs,remoteRate,remoteNotifications,remoteReadAllNotifications,remoteProfile,categoryClass,savedEvents,toggleSaved,tickets,addTicket,notifications,pushNotification,markNotificationsRead,profilePrefs,saveProfilePrefs,interests,setInterests,recentViews,trackView,getRating,setRating,addToCalendar,uploadImage};

})();

window.addEventListener('DOMContentLoaded',()=>{
  ES.hydrateHeader();
  ES.mountNotificationCenter?.();
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

  // Close notification popovers only when the click is outside them.
  document.addEventListener('click',e=>{
    document.querySelectorAll('.notification-dropdown.open').forEach(box=>{
      if(!box.contains(e.target)){
        box.classList.remove('open');
        box.querySelector('.notification-trigger')?.setAttribute('aria-expanded','false');
      }
    });
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
