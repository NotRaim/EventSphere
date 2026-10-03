document.addEventListener('DOMContentLoaded', async () => {
  const user = ES.guard();
  if (!user) return;
  if (!['organizer', 'admin'].includes(user.role)) {
    ES.toast('Organizer or admin access required', 'error');
    location.href = 'dashboard.html';
    return;
  }

  const select = document.querySelector('#event-select');
  const list = document.querySelector('#attendee-list');
  let attendees = [];

  try {
    const [events, tickets] = await Promise.all([
      ES.api('/events/manage/list'),
      ES.api('/tickets/organizer')
    ]);

    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = event.title;
      select.appendChild(option);
    });

    attendees = tickets;

    const draw = () => {
      const q = String(document.querySelector('#attendee-search').value || '').toLowerCase().trim();
      const eventId = select.value;
      const filter = document.querySelector('#checkin-filter').value;

      const rows = attendees.filter(ticket => {
        const person = ticket.attendee || {};
        const haystack = `${person.name || ''} ${person.email || ''} ${person.phone || ''} ${ticket.ticketCode || ''} ${ticket.eventSnapshot?.title || ''}`.toLowerCase();
        return (!eventId || String(ticket.eventId) === String(eventId)) &&
          (!q || haystack.includes(q)) &&
          (filter === 'all' || (filter === 'checked' && ticket.status === 'used') || (filter === 'pending' && ticket.status === 'valid'));
      });

      list.innerHTML = rows.length ? rows.map(ticket => {
        const person = ticket.attendee || {};
        const checked = ticket.status === 'used';
        return `<div class="list-item">
          <div style="min-width:0;flex:1">
            <strong>${ES.esc(person.name || 'Guest')}</strong>
            <small class="muted">${ES.esc(person.email || 'No email')} · ${ES.esc(ticket.eventSnapshot?.title || 'Event')}</small>
            <small class="muted">Ticket ${ES.esc(ticket.ticketCode)} · ${checked ? 'Checked in' : 'Not checked in'}</small>
          </div>
          <div class="toolbar">
            <span class="pill">${checked ? 'Checked in ✓' : 'Valid'}</span>
            <button class="btn btn-small ${checked ? 'btn-cyan' : 'btn-ghost'}" data-check="${ES.esc(ticket.id)}" ${checked ? 'disabled' : ''}>${checked ? 'Checked in' : 'Check in'}</button>
          </div>
        </div>`;
      }).join('') : '<div class="empty">No attendees match these filters.</div>';

      list.querySelectorAll('[data-check]').forEach(button => {
        button.onclick = async () => {
          try {
            await ES.api('/tickets/' + encodeURIComponent(button.dataset.check) + '/checkin', { method: 'POST' });
            const ticket = attendees.find(x => x.id === button.dataset.check);
            if (ticket) ticket.status = 'used';
            ES.toast('Ticket checked in ✓', 'success');
            draw();
          } catch (err) {
            ES.toast(err.message || 'Could not check in ticket', 'error');
          }
        };
      });
    };

    ['input', 'change'].forEach(type => document.addEventListener(type, event => {
      if (['attendee-search', 'event-select', 'checkin-filter'].includes(event.target?.id)) draw();
    }));

    document.querySelector('#export-csv').onclick = event => {
      event.preventDefault();
      const rows = [
        ['Name', 'Email', 'Phone', 'Event', 'Ticket', 'Status', 'Created'],
        ...attendees.map(ticket => [
          ticket.attendee?.name || '',
          ticket.attendee?.email || '',
          ticket.attendee?.phone || '',
          ticket.eventSnapshot?.title || '',
          ticket.ticketCode || '',
          ticket.status || '',
          ticket.createdAt || ''
        ])
      ];
      const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eventsphere-attendees.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    draw();
  } catch (err) {
    ES.toast(err.message || 'Could not load attendees', 'error');
    list.innerHTML = '<div class="empty">Could not load attendees.</div>';
  }
});
