document.addEventListener('DOMContentLoaded', () => {
  const user = ES.getUser();
  const form = document.querySelector('#contact-admin-form');
  if (!form) return;
  if (user && ES.getToken()) {
    form.elements.name.value = user.name || '';
    form.elements.email.value = user.email || '';
  }
  const counter = document.querySelector('#message-count');
  form.elements.message.addEventListener('input', () => { counter.textContent = `${form.elements.message.value.length} / 2000`; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.querySelector('#send-contact');
    const msg = document.querySelector('#contact-message');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Sending…';
    msg.textContent = '';
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await ES.api('/contact', { method: 'POST', body: data, auth: !!(user && ES.getToken()) });
      form.elements.message.value = '';
      counter.textContent = '0 / 2000';
      msg.textContent = 'Message sent successfully. The admin team can now review it.';
      msg.style.color = 'var(--success)';
      ES.toast('Message sent to admin ✓', 'success');
    } catch (err) {
      msg.textContent = err.message || 'Could not send your message.';
      msg.style.color = 'var(--danger)';
      ES.toast(err.message || 'Could not send your message', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send to admin →';
    }
  });
});
