
document.addEventListener('DOMContentLoaded',async()=>{
 const user=ES.guard();if(!user)return;if(!['organizer','admin'].includes(user.role)){ES.toast('Organizer or admin access required','error');location.href='dashboard.html';return;}
 const events=await ES.events(), select=document.querySelector('#analytics-event'), mine=events.filter(e=>String(e.organizerId||e.createdBy||'')===String(user.id||user._id||'') || String(e.organizerEmail||'').toLowerCase()===String(user.email||'').toLowerCase());
 const source=mine.length?mine:events;
 source.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.title;select.append(o)});
 const draw=()=>{
   const id=select.value, rows=source.filter(e=>id==='all'||String(e.id)===String(id));
   const reg=rows.reduce((n,e)=>n+Number(e.registeredCount||0),0), views=rows.reduce((n,e)=>n+Math.max(120,Number(e.registeredCount||0)*12),0);
   document.querySelector('#a-views').textContent=views.toLocaleString('en-IN');document.querySelector('#a-reg').textContent=reg.toLocaleString('en-IN');document.querySelector('#a-conv').textContent=(views?Math.round(reg/views*100):0)+'%';
   document.querySelector('#capacity-chart').innerHTML=rows.map(e=>{const pct=e.capacity?Math.min(100,Math.round(Number(e.registeredCount||0)/e.capacity*100)):0;return `<div class="list-item"><div style="flex:1"><strong>${ES.esc(e.title)}</strong><div class="progress" style="margin-top:9px"><span style="width:${pct}%"></span></div></div><strong>${pct}%</strong></div>`}).join('');
 };
 select.onchange=draw;draw();
});
