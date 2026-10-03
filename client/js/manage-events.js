document.addEventListener('DOMContentLoaded',async()=>{
  const user=ES.guard();
  if(!user)return;
  if(!['organizer','admin'].includes(user.role)){ES.toast('Organizer or admin access required','error');location.href='dashboard.html';return;}

  const root=document.querySelector('#manage-list');
  const search=document.querySelector('#manage-search');
  const status=document.querySelector('#manage-status');
  const editModal=document.querySelector('#edit-modal');
  const opsModal=document.querySelector('#ops-modal');
  const editForm=document.querySelector('#edit-event-form');
  const opsList=document.querySelector('#ops-ticket-list');
  const opsCode=document.querySelector('#ops-ticket-code');
  const opsResult=document.querySelector('#ops-result');
  let all=[];
  let activeEvent=null;
  let activeTickets=[];
  let editImage='';
  let editGallery=[];

  const esc=ES.esc;
  const isAdmin=user.role==='admin';

  async function load(){
    try{
      all=await ES.api('/events/manage/list');
      draw();
    }catch(err){ES.toast(err.message||'Could not load events','error');root.innerHTML='<div class="empty">Could not load managed events.</div>';}
  }

  function filtered(){
    const q=String(search.value||'').toLowerCase().trim();
    const st=status.value;
    return all.filter(e=>{
      const hay=`${e.title||''} ${e.city||''} ${e.category||''} ${e.venue||''}`.toLowerCase();
      return (!q||hay.includes(q))&&(st==='all'||String(e.status||'')===st);
    });
  }

  function statusClass(s){return `status-${String(s||'published').toLowerCase()}`}

  function draw(){
    const list=filtered();
    if(!list.length){root.innerHTML='<div class="empty">No matching events.</div>';return;}
    root.innerHTML=list.map(e=>`
      <article class="manage-event-card reveal visible" data-event="${esc(e.id)}">
        <div class="manage-event-main">
          <div class="manage-event-media" style="background-image:url('${ES.img(e.image)}')"><span class="manage-category">${esc(e.category||'Event')}</span></div>
          <div class="manage-event-copy">
            <div class="manage-event-title-row"><h3>${esc(e.title)}</h3><span class="manage-status ${statusClass(e.status)}">${esc(e.status||'published')}</span></div>
            <p class="muted">${esc(e.city||'')} · ${esc(e.venue||'')} · ${ES.date(e.date)} · ${ES.time(e.time||'')}</p>
            <div class="manage-meta"><span>${ES.seats(e)} seats left</span><span>${Number(e.registeredCount||0).toLocaleString('en-IN')} registered</span><span>${e.price>0?'₹'+Number(e.price).toLocaleString('en-IN'):'Free'}</span></div>
          </div>
        </div>
        <div class="manage-actions">
          <a class="btn btn-small btn-ghost" href="event-details.html?id=${encodeURIComponent(e.id)}">View</a>
          <button class="btn btn-small btn-ghost" data-edit="${esc(e.id)}" type="button">Edit</button>
          <button class="btn btn-small btn-ghost" data-ops="${esc(e.id)}" type="button">Check-in & QR</button>
          ${e.status!=='cancelled'&&e.status!=='archived'?`<button class="btn btn-small btn-danger" data-cancel="${esc(e.id)}" type="button">Cancel event</button>`:''}${isAdmin?`<button class="btn btn-small btn-danger" data-remove="${esc(e.id)}" type="button">Remove</button>`:''}
        </div>
      </article>`).join('');

    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));
    root.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>cancelEvent(b.dataset.cancel));
    root.querySelectorAll('[data-ops]').forEach(b=>b.onclick=()=>openOps(b.dataset.ops));
    root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeEvent(b.dataset.remove));
    if(window.ES?.anim?.stagger)ES.anim.stagger(root.querySelectorAll('.manage-event-card'));
  }

  function drawEditPreview(){
    const box=document.querySelector('#edit-image-preview');if(!box)return;
    const urls=[editImage,...editGallery].filter(Boolean);
    box.innerHTML=urls.map((src,i)=>`<div class="image-preview-card"><img src="${src}" alt="${i?'Gallery image':'Cover image'}"><span>${i?'Gallery':'Cover'}</span></div>`).join('');
  }
  function openEdit(id){
    const e=all.find(x=>String(x.id)===String(id));
    if(!e)return;
    activeEvent=e;editImage=e.image||'';editGallery=Array.isArray(e.gallery)?e.gallery.slice(0,6):[];
    for(const [name,value] of Object.entries({id:e.id,title:e.title,category:e.category,date:e.date,time:e.time||'19:00',venue:e.venue,city:e.city,price:e.price,capacity:e.capacity,registrationDeadline:e.registrationDeadline||'',visibility:e.visibility||'public',description:e.description||''})){
      const field=editForm.elements[name];if(field)field.value=value;
    }
    const cover=document.querySelector('#edit-cover-file');const gallery=document.querySelector('#edit-gallery-files');if(cover)cover.value='';if(gallery)gallery.value='';
    drawEditPreview();document.querySelector('#edit-title').textContent=`Edit ${e.title}`;document.querySelector('#edit-message').textContent='';editModal.hidden=false;document.body.classList.add('modal-open');
  }

  function closeEdit(){editModal.hidden=true;if(!document.querySelector('.manage-modal:not([hidden])'))document.body.classList.remove('modal-open');}

  async function saveEdit(ev){
    ev.preventDefault();
    const id=editForm.elements.id.value;const data={};
    ['title','category','date','time','venue','city','price','capacity','registrationDeadline','visibility','description'].forEach(k=>data[k]=editForm.elements[k].value);
    data.price=Number(data.price||0);data.capacity=Number(data.capacity||1);data.image=editImage;data.gallery=editGallery;
    const msg=document.querySelector('#edit-message');msg.textContent='Saving…';
    try{
      const updated=await ES.api('/events/'+encodeURIComponent(id),{method:'PATCH',body:data});
      const i=all.findIndex(x=>String(x.id)===String(id));if(i>=0)all[i]=updated;
      msg.textContent='Saved successfully.';ES.toast('Event details updated ✓','success');draw();setTimeout(closeEdit,250);
    }catch(err){msg.textContent=err.message;ES.toast(err.message,'error');}
  }

  async function cancelEvent(id){
    const e=all.find(x=>String(x.id)===String(id));
    if(!e)return;
    const confirmed=window.confirm(`Cancel “${e.title}”?\n\nAll still-valid tickets for this event will be cancelled and ticket holders will be notified.`);
    if(!confirmed)return;
    try{
      const updated=await ES.api('/events/'+encodeURIComponent(id),{method:'PATCH',body:{status:'cancelled'}});
      const i=all.findIndex(x=>String(x.id)===String(id));if(i>=0)all[i]=updated;
      ES.toast('Event cancelled and ticket holders notified ✓','success');draw();
    }catch(err){ES.toast(err.message,'error');}
  }


  async function removeEvent(id){
    const e=all.find(x=>String(x.id)===String(id));if(!e)return;
    if(!isAdmin){ES.toast('Only an admin can permanently remove an event','error');return;}
    if(!window.confirm(`Permanently remove “${e.title}”?\n\nThis removes the event and its issued tickets, orders, reviews and reports. This cannot be undone.`))return;
    try{await ES.api('/events/'+encodeURIComponent(id),{method:'DELETE'});all=all.filter(x=>String(x.id)!==String(id));ES.toast('Event removed everywhere ✓','success');draw();}
    catch(err){ES.toast(err.message||'Could not remove event','error');}
  }

  async function openOps(id){
    activeEvent=all.find(x=>String(x.id)===String(id));if(!activeEvent)return;
    document.querySelector('#ops-title').textContent=activeEvent.title;
    document.querySelector('#ops-subtitle').textContent=`${ES.date(activeEvent.date)} · ${ES.time(activeEvent.time||'')} · ${activeEvent.venue||'Venue TBA'}`;
    opsCode.value='';opsResult.textContent='';opsList.innerHTML='<div class="empty">Loading tickets…</div>';
    opsModal.hidden=false;document.body.classList.add('modal-open');
    await loadOpsTickets();
  }

  async function loadOpsTickets(){
    try{
      activeTickets=await ES.api('/tickets/organizer?eventId='+encodeURIComponent(activeEvent.id));
      drawOpsTickets();
    }catch(err){opsList.innerHTML=`<div class="empty">${esc(err.message)}</div>`;}
  }

  function drawOpsTickets(){
    if(!activeTickets.length){opsList.innerHTML='<div class="empty">No tickets have been issued for this event yet.</div>';return;}
    opsList.innerHTML=activeTickets.map(t=>`<article class="ops-ticket" data-ticket="${esc(t.id)}">
      <div><strong>${esc(t.ticketCode)}</strong><small class="muted">${esc(t.eventSnapshot?.title||activeEvent.title)} · ${esc(t.status)}</small></div>
      <div class="ops-ticket-actions">
        <button class="btn btn-small btn-ghost" data-show-qr="${esc(t.id)}" type="button">QR</button>
        <button class="btn btn-small ${t.status==='valid'?'btn-cyan':'btn-ghost'}" data-check-ticket="${esc(t.id)}" type="button" ${t.status!=='valid'?'disabled':''}>${t.status==='used'?'Checked in ✓':t.status==='valid'?'Check in':'Unavailable'}</button>
      </div>
      <div class="ticket-qr-slot" id="qr-${esc(t.id)}"></div>
    </article>`).join('');
    opsList.querySelectorAll('[data-check-ticket]').forEach(b=>b.onclick=()=>checkinTicket(b.dataset.checkTicket));
    opsList.querySelectorAll('[data-show-qr]').forEach(b=>b.onclick=()=>showQR(b.dataset.showQr));
  }

  async function checkinTicket(id){
    try{
      await ES.api('/tickets/'+encodeURIComponent(id)+'/checkin',{method:'POST'});
      const t=activeTickets.find(x=>String(x.id)===String(id));if(t)t.status='used';
      ES.toast('Ticket checked in ✓','success');drawOpsTickets();
    }catch(err){ES.toast(err.message,'error');}
  }

  async function verifyAndCheckin(){
    const code=opsCode.value.trim();if(!code){opsResult.textContent='Enter a ticket code.';return;}
    opsResult.textContent='Checking…';
    try{
      const r=await ES.api('/tickets/verify/'+encodeURIComponent(code),{auth:false});
      if(!r.valid){opsResult.textContent='Invalid, cancelled, or already used ticket.';ES.toast('Ticket is not valid','error');return;}
      const found=activeTickets.find(t=>t.ticketCode===code);
      if(!found){opsResult.textContent='This ticket is valid, but it belongs to another event.';ES.toast('Wrong event ticket','error');return;}
      await checkinTicket(found.id);
      opsResult.innerHTML=`<strong class="success-text">✓ CHECKED IN</strong> · ${esc(code)}`;
    }catch(err){opsResult.textContent=err.message;ES.toast(err.message,'error');}
  }

  async function showQR(id){
    const slot=document.querySelector('#qr-'+CSS.escape(id));if(!slot)return;
    if(slot.dataset.loaded==='1'){slot.classList.toggle('open');return;}
    slot.innerHTML='<span class="muted">Generating QR…</span>';slot.classList.add('open');
    try{
      const r=await ES.api('/tickets/'+encodeURIComponent(id)+'/qr');
      slot.dataset.loaded='1';slot.innerHTML=`<div class="qr-card"><img src="${r.dataUrl}" alt="QR code for ${esc(r.ticketCode)}"><div><strong>${esc(r.ticketCode)}</strong><small class="muted">Scan to verify this ticket.</small></div></div>`;
    }catch(err){slot.innerHTML=`<span class="message">${esc(err.message)}</span>`;}
  }

  function closeOps(){opsModal.hidden=true;if(!document.querySelector('.manage-modal:not([hidden])'))document.body.classList.remove('modal-open');}

  search.addEventListener('input',draw);status.addEventListener('change',draw);document.querySelector('#refresh-events').onclick=load;
  editForm.addEventListener('submit',saveEdit);
  document.querySelectorAll('[data-close-edit]').forEach(x=>x.addEventListener('click',closeEdit));
  document.querySelectorAll('[data-close-ops]').forEach(x=>x.addEventListener('click',closeOps));
  document.querySelector('#edit-cover-file')?.addEventListener('change',async e=>{try{editImage=await ES.imageFileToDataUrl(e.target.files[0]);drawEditPreview();}catch(err){e.target.value='';ES.toast(err.message,'error')}});
  document.querySelector('#edit-gallery-files')?.addEventListener('change',async e=>{try{editGallery=await ES.imageFilesToDataUrls(e.target.files,6);drawEditPreview();}catch(err){e.target.value='';ES.toast(err.message,'error')}});
  document.querySelector('#ops-check-code').onclick=verifyAndCheckin;
  opsCode.addEventListener('keydown',e=>{if(e.key==='Enter')verifyAndCheckin()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!editModal.hidden)closeEdit();if(!opsModal.hidden)closeOps();}});

  await load();
});
