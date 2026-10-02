
document.addEventListener('DOMContentLoaded',()=>{
  const form=document.querySelector('#auth-form');if(!form)return;
  form.addEventListener('submit',async e=>{
    e.preventDefault();const button=form.querySelector('button[type=submit]'),msg=form.querySelector('.message');button.disabled=true;button.textContent='Please wait…';msg.textContent='';
    const mode=form.dataset.mode,data=Object.fromEntries(new FormData(form).entries());
    try{
      const result=await ES.api('/auth/'+(mode==='login'?'login':'register'),{method:'POST',body:data,auth:false});
      if(result.token)ES.session.set(result.token,result.user||{email:data.email,role:data.role||'user'},true);
      ES.toast(mode==='login'?'Welcome back.':'Your EventSphere account is ready.','success');
      const next=new URLSearchParams(location.search).get('next');
      setTimeout(()=>location.href=next||((result.user||{}).role==='organizer'?'organizer.html':'dashboard.html'),450);
    }catch(err){msg.textContent=err.message||'Please check your details';}
    finally{button.disabled=false;button.textContent=mode==='login'?'Continue →':'Create my account →'}
  });
});
