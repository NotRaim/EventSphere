document.addEventListener('DOMContentLoaded', () => {
  const user = ES.guard();
  if (!user) return;
  if (!['organizer', 'admin'].includes(user.role)) {
    ES.toast('Organizer or admin access required', 'error');
    location.href = 'dashboard.html';
    return;
  }

  const video = document.querySelector('#qr-video');
  const wrap = document.querySelector('#scanner-wrap');
  const status = document.querySelector('#scanner-status');
  const codeInput = document.querySelector('#ticket-code');
  const result = document.querySelector('#checkin-result');
  let stream = null;
  let scanning = false;
  let detector = null;

  const stopScanner = () => {
    scanning = false;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    wrap.hidden = true;
  };

  const extractCode = value => {
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/verify\/([^/]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch (_) {}
    return String(value || '').trim();
  };

  async function checkin(code) {
    code = extractCode(code);
    if (!code) {
      result.textContent = 'Enter or scan a ticket code.';
      return;
    }

    result.textContent = 'Verifying ticket…';
    try {
      const verification = await ES.api('/tickets/verify/' + encodeURIComponent(code), { auth: false });
      if (!verification.valid) {
        result.textContent = 'Invalid, cancelled, or already used ticket.';
        ES.toast('Ticket is not valid', 'error');
        return;
      }

      const tickets = await ES.api('/tickets/organizer');
      const found = tickets.find(ticket => ticket.ticketCode === code);
      if (!found) {
        result.textContent = 'This ticket is valid, but it is not assigned to an event you manage.';
        ES.toast('Ticket belongs to another event', 'error');
        return;
      }

      await ES.api('/tickets/' + encodeURIComponent(found.id) + '/checkin', { method: 'POST' });
      result.innerHTML = `<strong class="success-text">✓ CHECKED IN</strong><br>${ES.esc(verification.ticket.event.title)}<br>${ES.esc(verification.ticket.ticketCode)}`;
      ES.toast('Ticket checked in ✓', 'success');
      codeInput.value = '';
      stopScanner();
    } catch (err) {
      result.textContent = err.message || 'Could not check in ticket';
      ES.toast(result.textContent, 'error');
    }
  }

  document.querySelector('#verify-ticket').onclick = () => checkin(codeInput.value);
  codeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') checkin(codeInput.value);
  });
  document.querySelector('#stop-scanner').onclick = stopScanner;

  document.querySelector('#start-scanner').onclick = async () => {
    if (!('BarcodeDetector' in window)) {
      ES.toast('QR camera scanning is not supported in this browser. Use Chrome on Android or enter the ticket code manually.', 'error');
      return;
    }

    try {
      detector = new BarcodeDetector({ formats: ['qr_code'] });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      video.srcObject = stream;
      await video.play();
      wrap.hidden = false;
      scanning = true;
      status.textContent = 'Point the camera at the ticket QR.';

      const scan = async () => {
        if (!scanning) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length && codes[0].rawValue) {
            scanning = false;
            codeInput.value = extractCode(codes[0].rawValue);
            await checkin(codeInput.value);
            return;
          }
        } catch (_) {}
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch (err) {
      stopScanner();
      ES.toast('Camera access was blocked. Allow camera permission and try again.', 'error');
    }
  };
});
