const PDFDocument = require('pdfkit');
const QR = require('qrcode');

async function buildTicketPdf(ticket, baseUrl) {
  const verify = `${baseUrl}/verify/${encodeURIComponent(ticket.ticketCode)}?sig=${encodeURIComponent(ticket.verificationSig)}`;
  const qr = await QR.toDataURL(verify, { width: 280, margin: 1, errorCorrectionLevel: 'H' });
  const colors = {
    Music: '#18d7ff', Food: '#ffb84d', Design: '#d7a6ff', Film: '#ff6b9d',
    Sports: '#77e08b', Wellness: '#8ec5ff', Community: '#ffffff'
  };
  const accent = colors[ticket.eventSnapshot?.category] || '#18d7ff';
  const doc = new PDFDocument({ size: [420, 680], margin: 28 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 420, 680).fill('#050809');
    doc.roundedRect(18, 18, 384, 644, 24).fill('#0c1213').stroke('#263a3a');
    doc.fillColor(accent).fontSize(10).text('EVENTSPHERE · VERIFIED TICKET', 40, 44, { characterSpacing: 2 });
    doc.fillColor('#f4fbfb').fontSize(30).font('Helvetica-Bold').text(ticket.eventSnapshot?.title || 'Event', 40, 78, { width: 330 });
    doc.fillColor('#9bb0b0').fontSize(11).font('Helvetica').text(`${ticket.eventSnapshot?.category || 'Community'} · ${ticket.eventSnapshot?.city || ''}`, 40, 165);
    doc.fillColor('#f4fbfb').fontSize(13).text(`${ticket.eventSnapshot?.date || ''} · ${ticket.eventSnapshot?.time || ''}`, 40, 198);
    doc.text(ticket.eventSnapshot?.venue || 'Venue TBA', 40, 220, { width: 300 });
    doc.image(qr, 250, 275, { width: 125, height: 125 });
    doc.fillColor('#9bb0b0').fontSize(9).text('SCAN TO VERIFY', 265, 410, { width: 100, align: 'center' });
    doc.fillColor('#f4fbfb').fontSize(13).text('Ticket ID', 40, 300);
    doc.fillColor(accent).fontSize(16).font('Helvetica-Bold').text(ticket.ticketCode, 40, 320);
    doc.fillColor('#9bb0b0').fontSize(10).font('Helvetica').text(`Ticket: ${ticket.ticketType?.name || 'General Admission'}`, 40, 355);
    doc.text(`Status: ${String(ticket.status || 'valid').toUpperCase()}`, 40, 373);
    doc.text(`Paid: ₹${Number(ticket.amountPaid || 0).toLocaleString('en-IN')}`, 40, 391);

    const benefits = Array.isArray(ticket.ticketType?.benefits) ? ticket.ticketType.benefits.filter(Boolean) : [];
    if (benefits.length) {
      doc.fillColor('#f4fbfb').fontSize(11).text('Included benefits', 40, 430);
      doc.fillColor('#9bb0b0').fontSize(9).text(benefits.slice(0, 5).map(x => `• ${x}`).join('\n'), 40, 448, { width: 170, lineGap: 4 });
    }

    doc.fillColor('#9bb0b0').fontSize(9).text('This ticket is validated against the EventSphere database.', 40, 520, { width: 320 });
    doc.fillColor('#607474').fontSize(8).text('Do not edit the QR payload. Entry is subject to organizer validation.', 40, 590, { width: 320 });
    doc.end();
  });
}

module.exports = { buildTicketPdf };
