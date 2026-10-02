document.addEventListener('DOMContentLoaded', async () => {
  const u = ES.guard();
  if (!u) return;
  const nameEl = document.querySelector('#profile-name');
  const emailEl = document.querySelector('#profile-email');
  const emailInput = document.querySelector('#profile-email-input');
  const roleEl = document.querySelector('#profile-role');
  const avatar = document.querySelector('#avatar');
  const f = document.querySelector('#profile-form');
  const setIdentity = user => {
    nameEl.textContent = user.name || 'EventSphere member';
    emailEl.textContent = user.email || '';
    emailInput.value = user.email || '';
    roleEl.textContent = String(user.role || 'user').replace(/^./, c => c.toUpperCase());
    avatar.textContent = (user.name || user.email || 'E').slice(0, 1).toUpperCase();
  };
  let current = u;
  try { const fresh = await ES.api('/me/profile'); current = fresh.user || fresh; } catch {}
  setIdentity(current);
  const prefs = await ES.remotePrefs();
  f.elements.name.value = current.name || '';
  f.elements.phone.value = current.phone || '';
  f.elements.bio.value = current.bio || '';
  f.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const updated = await ES.remoteProfile(Object.fromEntries(new FormData(f).entries()));
      setIdentity(updated);
      f.elements.bio.value = updated.bio || '';
      ES.toast('Profile saved to database', 'success');
    } catch (err) { ES.toast(err.message, 'error'); }
  });
  const chips = [...document.querySelectorAll('#profile-interests [data-interest]')];
  chips.forEach(c => c.classList.toggle('active', (prefs.interests || []).includes(c.dataset.interest)));
  document.querySelector('#preferred-city').value = prefs.city || '';
  document.querySelector('#discovery-mode').value = prefs.mode || 'balanced';
  chips.forEach(c => c.onclick = () => c.classList.toggle('active'));
  document.querySelector('#save-preferences').onclick = async () => {
    try {
      await ES.remoteSavePrefs({
        interests: chips.filter(c => c.classList.contains('active')).map(c => c.dataset.interest),
        city: document.querySelector('#preferred-city').value,
        mode: document.querySelector('#discovery-mode').value
      });
      ES.toast('Discovery preferences saved to database', 'success');
    } catch (err) { ES.toast(err.message, 'error'); }
  };


  // Password change — validated by the server and stored as a bcrypt hash.
  const passwordForm = document.querySelector('#password-form');
  const strength = document.querySelector('#password-strength');
  const strengthText = strength?.querySelector('small');
  const strengthBars = strength ? [...strength.querySelectorAll('span')] : [];
  const passwordScore = value => {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]/.test(value)) score++;
    return score;
  };
  const updateStrength = value => {
    if (!strength) return;
    const score = passwordScore(value);
    strengthBars.forEach((bar, i) => bar.classList.toggle('on', i < score));
    if (strengthText) strengthText.textContent = !value ? 'Enter a new password' : score < 2 ? 'Too weak' : score === 2 ? 'Getting there' : score === 3 ? 'Good password' : 'Strong password';
    strength.dataset.level = String(score);
  };
  document.querySelector('#new-password')?.addEventListener('input', e => updateStrength(e.target.value));
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.classList.toggle('active', !visible);
      button.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    });
  });
  passwordForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const button = passwordForm.querySelector('.password-submit');
    const message = passwordForm.querySelector('.password-message');
    const data = Object.fromEntries(new FormData(passwordForm).entries());
    message.textContent = '';
    if (data.newPassword !== data.confirmPassword) { message.textContent = 'New passwords do not match.'; return; }
    if (data.newPassword.length < 8) { message.textContent = 'New password must be at least 8 characters.'; return; }
    button.disabled = true;
    button.textContent = 'Updating…';
    try {
      const result = await ES.api('/me/password', { method:'PUT', body:data });
      passwordForm.reset();
      updateStrength('');
      ES.toast(result.message || 'Password changed successfully', 'success');
      message.textContent = 'Password updated successfully.';
    } catch (err) {
      message.textContent = err.message || 'Could not change password.';
      ES.toast(message.textContent, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Update password →';
    }
  });
});
