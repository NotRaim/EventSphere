document.addEventListener('DOMContentLoaded',async()=>{
 const user=ES.guard();if(!user)return;if(!['organizer','admin'].includes(user.role)){ES.toast('Organizer or admin access required','error');location.href='dashboard.html';return;}
 const form=document.querySelector('#create-event');if(!form)return;
 const builder=document.querySelector('#ticket-types-builder');
 const coverFile=document.querySelector('#cover-image-file');
 const coverPreview=document.querySelector('#cover-image-preview');
 const galleryFiles=document.querySelector('#gallery-image-files');
 const galleryPreview=document.querySelector('#gallery-image-preview');
 const previewFile=(file,target)=>{if(!file||!target)return;const r=new FileReader();r.onload=()=>{target.hidden=false;target.innerHTML=`<img src="${r.result}" alt="Selected image preview">`;};r.readAsDataURL(file)};
 coverFile?.addEventListener('change',()=>previewFile(coverFile.files?.[0],coverPreview));
 galleryFiles?.addEventListener('change',()=>{if(!galleryPreview)return;galleryPreview.innerHTML='';[...galleryFiles.files].slice(0,6).forEach(f=>{const wrap=document.createElement('div');wrap.className='upload-preview';const r=new FileReader();r.onload=()=>{wrap.innerHTML=`<img src="${r.result}" alt="Gallery preview">`;};r.readAsDataURL(f);galleryPreview.append(wrap);});});
 let typeIndex=0;
 const addType=(data={})=>{
   typeIndex+=1;
   const row=document.createElement('div');
   row.className='ticket-type-builder-row';
   row.innerHTML=`<div class="ticket-type-builder-grid">
     <div class="field"><label>Ticket name</label><input data-tt-name value="${ES.esc(data.name||`Type ${typeIndex}`)}" placeholder="VIP"></div>
     <div class="field"><label>Price (₹)</label><input data-tt-price type="number" min="0" value="${Number(data.price??(typeIndex===1?Number(form.elements.price.value||0):0))}"></div>
     <div class="field"><label>Capacity</label><input data-tt-capacity type="number" min="1" value="${Number(data.capacity||50)}"></div>
     <div class="field ticket-benefits-field"><label>Benefits</label><input data-tt-benefits value="${ES.esc((data.benefits||[]).join(', '))}" placeholder="Priority entry, T-shirt, Lounge access"></div>
   </div><button class="icon-btn ticket-type-remove" type="button" aria-label="Remove ticket type">×</button>`;
   row.querySelector('.ticket-type-remove').onclick=()=>{if(builder.children.length>1)row.remove();else ES.toast('Keep at least one ticket type','error')};
   builder.append(row);
 };
 addType({name:'General Admission',price:Number(form.elements.price.value||0),capacity:Number(form.elements.capacity.value||100),benefits:[]});
 document.querySelector('#add-ticket-type')?.addEventListener('click',()=>addType());
 form.elements.price.addEventListener('input',()=>{const first=builder.querySelector('[data-tt-price]');if(first&&Number(first.value||0)===0)first.value=Number(form.elements.price.value||0)});
 const collectTicketTypes=()=>[...builder.querySelectorAll('.ticket-type-builder-row')].map(row=>({
   name:row.querySelector('[data-tt-name]').value.trim(),
   price:Number(row.querySelector('[data-tt-price]').value||0),
   capacity:Number(row.querySelector('[data-tt-capacity]').value||1),
   benefits:row.querySelector('[data-tt-benefits]').value.split(',').map(x=>x.trim()).filter(Boolean)
 })).filter(x=>x.name);
 const refresh=async()=>{try{const list=await ES.events();const mine=list.filter(e=>String(e.organizerId||'')===String(user.id||user._id||'')||String(e.organizerEmail||'').toLowerCase()===String(user.email||'').toLowerCase());const source=mine.length?mine:list;const reg=source.reduce((n,e)=>n+Number(e.registeredCount||0),0),cap=source.reduce((n,e)=>n+Number(e.capacity||0),0);document.querySelector('#published-count').textContent=source.filter(e=>e.status==='published').length;document.querySelector('#registration-count').textContent=reg.toLocaleString('en-IN');document.querySelector('#capacity-count').textContent=(cap?Math.round(reg/cap*100):0)+'%'}catch{}};refresh();
 document.querySelector('#save-draft').onclick=()=>{const d=Object.fromEntries(new FormData(form).entries());d.ticketTypes=collectTicketTypes();localStorage.setItem('es_event_draft',JSON.stringify(d));ES.toast('Draft saved on this device','success')};
 form.addEventListener('submit',async ev=>{ev.preventDefault();const btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Publishing…';try{
   const body=Object.fromEntries(new FormData(form).entries());
   body.ticketTypes=collectTicketTypes();
   if(!body.ticketTypes.length)throw new Error('Add at least one ticket type');
   const totalTypeCapacity=body.ticketTypes.reduce((n,t)=>n+Math.max(1,Number(t.capacity||1)),0);
   body.capacity=Math.max(Number(body.capacity||1),totalTypeCapacity);
   body.price=Number(body.ticketTypes[0]?.price||0);
   if(coverFile?.files?.[0]){
     btn.textContent='Uploading cover…';
     body.image=await ES.uploadImage(coverFile.files[0]);
   }
   if(galleryFiles?.files?.length){
     btn.textContent='Uploading gallery…';
     body.gallery=[];
     for(const file of [...galleryFiles.files].slice(0,6)) body.gallery.push(await ES.uploadImage(file));
   }else body.gallery=[];
   await ES.api('/events',{method:'POST',body});
   localStorage.removeItem('es_event_draft');ES.toast('Event published with multiple ticket types ✓','success');form.reset();form.elements.city.value='Ahmedabad';if(coverPreview){coverPreview.hidden=true;coverPreview.innerHTML=''}if(galleryPreview)galleryPreview.innerHTML='';builder.innerHTML='';typeIndex=0;addType({name:'General Admission',price:0,capacity:50,benefits:[]});await refresh()
 }catch(err){ES.toast(err.message||'Could not publish this event','error')}finally{btn.disabled=false;btn.textContent='Publish event →'}});
});
