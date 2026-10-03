document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#auth-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const msg = form.querySelector('.message');
    const mode = form.dataset.mode === 'login' ? 'login' : 'register';
    const data = Object.fromEntries(new FormData(form).entries());

    // Trim user input before sending it to the production API.
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === 'string') data[key] = data[key].trim();
    });
    if (data.email) data.email = data.email.toLowerCase();

    msg.textContent = '';
    button.disabled = true;
    button.textContent = 'Please wait…';

    try {
      // Send explicit JSON instead of relying on the shared API wrapper.
      // This prevents production builds with an older API wrapper from
      // accidentally sending an empty request body.
      const apiBase = ES.API || '/api';
      const response = await fetch(`${apiBase}/auth/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}

      if (!response.ok) {
        throw new Error(result.message || 'Unable to complete the request.');
      }

      if (result.token) {
        ES.session.set(result.token, result.user || {
          email: data.email,
          role: data.role || 'user'
        }, true);
      }

      ES.toast(
        mode === 'login' ? 'Welcome back.' : 'Your EventSphere account is ready.',
        'success'
      );

      const next = new URLSearchParams(location.search).get('next');
      const destination = next || (
        (result.user || {}).role === 'organizer'
          ? 'organizer.html'
          : 'dashboard.html'
      );

      setTimeout(() => { location.href = destination; }, 450);
    } catch (err) {
      msg.textContent = err.message || 'Please check your details.';
      ES.toast(msg.textContent, 'error');
    } finally {
      button.disabled = false;
      button.textContent = mode === 'login' ? 'Continue →' : 'Create my account →';
    }
  });
});
