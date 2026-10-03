document.addEventListener('DOMContentLoaded',async()=>{
 const u=ES.guard();if(!u)return;
 const root=document.querySelector('#tickets-list');
 try{
  const list=await ES.remoteTickets();
  if(!list.length){root.innerHTML='<div class="glass-panel panel"><h3>No tickets yet.</h3><p class="muted">Reserve an event and your verified ticket will appear here.</p><a class="btn btn-cyan" href="events.html">Discover events →</a></div>';return;}
  const colors={music:'#18d7ff',food:'#ffb84d',design:'#d7a6ff',film:'#ff6b9d',sports:'#77e08b',wellness:'#8ec5ff',community:'#ffffff'};
  root.innerHTML=list.map(t=>{
   const cat=String(t.eventSnapshot?.category||'community').toLowerCase();
   const accent=colors[cat]||'#18d7ff';
   const benefits=Array.isArray(t.ticketType?.benefits)?t.ticketType.benefits:[];
   const checkedIn=t.status==='used' || !!t.checkedInAt;
   const checkedInLabel=checkedIn ? 'CHECKED IN' : (t.status==='valid' ? 'VALID' : t.status.toUpperCase());
   const checkedInAt= t.checkedInAt ? new Date(t.checkedInAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
   return `<article class="ticket-pass reveal" style="--ticket-accent:${accent}">
    <div class="ticket-top"><div><div class="section-kicker">Verified EventSphere ticket</div><h2 class="serif" style="font-size:31px;margin:8px 0">${ES.esc(t.eventSnapshot?.title||'Event')}</h2><p class="muted">${ES.date(t.eventSnapshot?.date)} · ${ES.time(t.eventSnapshot?.time||'')} · ${ES.esc(t.eventSnapshot?.venue||'')}</p></div><span class="ticket-status ${checkedIn?'ticket-status-checked':''}">${checkedInLabel}</span></div>
    <div class="ticket-category">${ES.esc(t.ticketType?.name||'General Admission')}</div>
    <div class="ticket-security"><div><small class="muted">Ticket ID</small><br><strong>${ES.esc(t.ticketCode)}</strong></div><div><small class="muted">Paid</small><br><strong>₹${Number(t.amountPaid||0).toLocaleString('en-IN')}</strong></div></div>
    ${checkedIn ? `<div class="ticket-checkin"><span>✓</span><div><strong>Checked in</strong><small>Organizer confirmed entry${checkedInAt?` · ${ES.esc(checkedInAt)}`:''}</small></div></div>` : ''}
    ${benefits.length?`<div class="ticket-benefits"><small class="muted">Included benefits</small><div>${benefits.map(b=>`<span>✓ ${ES.esc(b)}</span>`).join('')}</div></div>`:''}
    <div class="ticket-actions"><button class="btn btn-cyan btn-small" data-download="${ES.esc(t.id)}">Download PDF</button><button class="btn btn-small btn-ghost" data-email="${ES.esc(t.id)}">Email ticket</button></div>
    <div class="ticket-verified">✓ Database-backed ticket · cryptographically signed QR</div>
   </article>`;
  }).join('');
  root.querySelectorAll('[data-download]').forEach(btn=>btn.onclick=async()=>{try{const r=await fetch(ES.API+'/tickets/'+encodeURIComponent(btn.dataset.download)+'/download',{headers:{Authorization:'Bearer '+ES.session.getToken()}});if(!r.ok)throw new Error('Ticket download failed');const blob=await r.blob();const cd=r.headers.get('Content-Disposition')||'';const match=cd.match(/filename="?([^";]+)"?/i);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=match?.[1]||'eventsphere-ticket.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(err){ES.toast(err.message,'error')}});
  root.querySelectorAll('[data-email]').forEach(btn=>btn.onclick=async()=>{const original=btn.textContent;btn.disabled=true;btn.textContent='Emailing…';try{const r=await ES.api('/tickets/'+encodeURIComponent(btn.dataset.email)+'/email',{method:'POST'});ES.toast(r.message||'Ticket emailed ✓','success')}catch(err){ES.toast(err.message||'Could not email ticket','error')}finally{btn.disabled=false;btn.textContent=original}});
  requestAnimationFrame(()=>root.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible')));
 }catch(err){root.innerHTML='<div class="glass-panel panel"><strong>Could not load tickets.</strong><p class="muted">'+ES.esc(err.message||'Please try again.')+'</p></div>';}
});
