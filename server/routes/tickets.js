const router = require('express').Router();

const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const QR = require('qrcode');
const PDFDocument = require('pdfkit');

const { auth, role } = require('../middleware/auth');
const { signature, safeEqual } = require('../utils/ticket');


// ============================================================
// HELPER — VERIFY TICKET SIGNATURE
// ============================================================

function isValid(t, sig) {
    return (
        !!t &&
        t.status === 'valid' &&
        safeEqual(
            sig || '',
            signature(t.ticketCode, t.userId, t.eventId)
        )
    );
}


// ============================================================
// GET MY TICKETS
// ============================================================

router.get('/mine', auth, async (req, res) => {
    try {
        const tickets = await Ticket
            .find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json(
            tickets.map(t => ({
                ...t,
                id: t._id.toString()
            }))
        );

    } catch (err) {
        console.error('MY TICKETS ERROR:', err);

        res.status(500).json({
            message: err.message || 'Could not load tickets'
        });
    }
});


// ============================================================
// ORGANIZER / ADMIN TICKETS
// ============================================================

router.get(
    '/organizer',
    auth,
    role('organizer', 'admin'),
    async (req, res) => {
        try {
            const ids =
                req.user.role === 'admin'
                    ? null
                    : (
                        await Event
                            .find({
                                organizerId: req.user._id
                            })
                            .select('_id')
                            .lean()
                    ).map(e => e._id);

            const q = ids
                ? { eventId: { $in: ids } }
                : {};

            if (req.query.eventId) {
                q.eventId = req.query.eventId;
            }

            const tickets = await Ticket
                .find(q)
                .sort({ createdAt: -1 })
                .lean();

            res.json(
                tickets.map(t => ({
                    ...t,
                    id: t._id.toString()
                }))
            );

        } catch (err) {
            console.error('ORGANIZER TICKETS ERROR:', err);

            res.status(500).json({
                message: err.message || 'Could not load organizer tickets'
            });
        }
    }
);


// ============================================================
// ORGANIZER / ADMIN — GENERATE QR
// ============================================================

router.get(
    '/:id/qr',
    auth,
    role('organizer', 'admin'),
    async (req, res) => {
        try {
            const ticket = await Ticket
                .findById(req.params.id)
                .lean();

            if (!ticket) {
                return res.status(404).json({
                    message: 'Ticket not found'
                });
            }

            const event = await Event
                .findById(ticket.eventId)
                .select('organizerId')
                .lean();

            if (
                req.user.role === 'organizer' &&
                (
                    !event ||
                    String(event.organizerId) !== String(req.user._id)
                )
            ) {
                return res.status(403).json({
                    message: 'You do not manage this event'
                });
            }

            const base =
                process.env.PUBLIC_BASE_URL ||
                `${req.protocol}://${req.get('host')}`;

            const verificationUrl =
                `${base}/verify/${encodeURIComponent(ticket.ticketCode)}` +
                `?sig=${encodeURIComponent(ticket.verificationSig)}`;

            const dataUrl = await QR.toDataURL(
                verificationUrl,
                {
                    width: 320,
                    margin: 2,
                    errorCorrectionLevel: 'H'
                }
            );

            res.json({
                ticketCode: ticket.ticketCode,
                status: ticket.status,
                verificationUrl,
                dataUrl
            });

        } catch (err) {
            console.error('QR GENERATION ERROR:', err);

            res.status(500).json({
                message: err.message || 'Could not generate QR'
            });
        }
    }
);


// ============================================================
// DOWNLOAD TICKET PDF
// ============================================================

router.get('/:id/download', auth, async (req, res) => {
    try {
        // ------------------------------------------------------
        // FIND TICKET
        // ------------------------------------------------------

        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                message: 'Ticket not found'
            });
        }

        // ------------------------------------------------------
        // MAKE SURE TICKET BELONGS TO LOGGED-IN USER
        // ------------------------------------------------------

        if (
            String(ticket.userId) !==
            String(req.user._id)
        ) {
            return res.status(404).json({
                message: 'Ticket not found'
            });
        }

        // ------------------------------------------------------
        // VERIFICATION URL
        // ------------------------------------------------------

        const base =
            process.env.PUBLIC_BASE_URL ||
            `${req.protocol}://${req.get('host')}`;

        const verificationUrl =
            `${base}/verify/${encodeURIComponent(ticket.ticketCode)}` +
            `?sig=${encodeURIComponent(ticket.verificationSig)}`;

        // ------------------------------------------------------
        // GENERATE QR CODE
        // ------------------------------------------------------

        const qr = await QR.toDataURL(
            verificationUrl,
            {
                width: 280,
                margin: 1,
                errorCorrectionLevel: 'H'
            }
        );

        // ------------------------------------------------------
        // CATEGORY COLORS
        // ------------------------------------------------------

        const colors = {
            Music: '#18d7ff',
            Food: '#ffb84d',
            Design: '#d7a6ff',
            Film: '#ff6b9d',
            Sports: '#77e08b',
            Wellness: '#8ec5ff',
            Community: '#ffffff'
        };

        const category =
            ticket.eventSnapshot?.category || 'Community';

        const accent =
            colors[category] || '#18d7ff';


        // ------------------------------------------------------
        // PDF DOCUMENT
        // ------------------------------------------------------

        const doc = new PDFDocument({
            size: [420, 680],
            margin: 28,
            autoFirstPage: true
        });


        // ------------------------------------------------------
        // RESPONSE HEADERS
        // ------------------------------------------------------

        res.status(200);

        res.setHeader(
            'Content-Type',
            'application/pdf'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${ticket.ticketCode}.pdf"`
        );

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        );

        res.setHeader(
            'Pragma',
            'no-cache'
        );

        res.setHeader(
            'Expires',
            '0'
        );


        // ------------------------------------------------------
        // PIPE PDF TO RESPONSE
        // ------------------------------------------------------

        doc.pipe(res);


        // ======================================================
        // BACKGROUND
        // ======================================================

        doc
            .rect(0, 0, 420, 680)
            .fill('#050809');


        // ======================================================
        // MAIN CARD
        // ======================================================

        doc
            .roundedRect(
                18,
                18,
                384,
                644,
                24
            )
            .fill('#0c1213')
            .stroke('#263a3a');


        // ======================================================
        // HEADER
        // ======================================================

        doc
            .fillColor(accent)
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(
                'EVENTSPHERE · VERIFIED TICKET',
                40,
                44,
                {
                    characterSpacing: 2
                }
            );


        // ======================================================
        // EVENT TITLE
        // ======================================================

        doc
            .fillColor('#f4fbfb')
            .font('Helvetica-Bold')
            .fontSize(30)
            .text(
                ticket.eventSnapshot?.title ||
                'EventSphere Event',
                40,
                78,
                {
                    width: 330,
                    height: 70
                }
            );


        // ======================================================
        // CATEGORY + CITY
        // ======================================================

        doc
            .fillColor('#9bb0b0')
            .font('Helvetica')
            .fontSize(11)
            .text(
                `${ticket.eventSnapshot?.category || 'Event'} · ` +
                `${ticket.eventSnapshot?.city || 'Location TBA'}`,
                40,
                165,
                {
                    width: 330
                }
            );


        // ======================================================
        // DATE + TIME
        // ======================================================

        doc
            .fillColor('#f4fbfb')
            .font('Helvetica')
            .fontSize(13)
            .text(
                `${ticket.eventSnapshot?.date || 'Date TBA'} · ` +
                `${ticket.eventSnapshot?.time || ''}`,
                40,
                198,
                {
                    width: 330
                }
            );


        // ======================================================
        // VENUE
        // ======================================================

        doc
            .fillColor('#f4fbfb')
            .font('Helvetica')
            .fontSize(12)
            .text(
                ticket.eventSnapshot?.venue ||
                'Venue TBA',
                40,
                220,
                {
                    width: 200
                }
            );


        // ======================================================
        // TICKET ID
        // ======================================================

        doc
            .fillColor('#f4fbfb')
            .font('Helvetica-Bold')
            .fontSize(13)
            .text(
                'Ticket ID',
                40,
                300
            );


        doc
            .fillColor(accent)
            .font('Helvetica-Bold')
            .fontSize(16)
            .text(
                ticket.ticketCode,
                40,
                320,
                {
                    width: 190
                }
            );


        // ======================================================
        // STATUS
        // ======================================================

        doc
            .fillColor('#9bb0b0')
            .font('Helvetica')
            .fontSize(10)
            .text(
                `Status: ${(ticket.status || 'valid').toUpperCase()}`,
                40,
                355
            );


        // ======================================================
        // PAID AMOUNT
        // ======================================================

        doc
            .fillColor('#9bb0b0')
            .font('Helvetica')
            .fontSize(10)
            .text(
                `Paid: Rs. ${Number(
                    ticket.amountPaid || 0
                ).toLocaleString('en-IN')}`,
                40,
                374
            );


        // ======================================================
        // QR CODE
        // ======================================================

        doc.image(
            qr,
            250,
            275,
            {
                width: 125,
                height: 125
            }
        );


        // ======================================================
        // QR LABEL
        // ======================================================

        doc
            .fillColor('#9bb0b0')
            .font('Helvetica')
            .fontSize(9)
            .text(
                'SCAN TO VERIFY',
                250,
                410,
                {
                    width: 125,
                    align: 'center'
                }
            );


        // ======================================================
        // INFORMATION
        // ======================================================

        doc
            .fillColor('#f4fbfb')
            .font('Helvetica')
            .fontSize(11)
            .text(
                'This ticket is validated against the',
                40,
                470,
                {
                    width: 320
                }
            );

        doc
            .fillColor('#f4fbfb')
            .font('Helvetica')
            .fontSize(11)
            .text(
                'EventSphere database.',
                40,
                488,
                {
                    width: 320
                }
            );


        // ======================================================
        // FOOTER
        // ======================================================

        doc
            .fillColor('#607474')
            .font('Helvetica')
            .fontSize(8)
            .text(
                'Do not edit the QR payload. Entry is subject to organizer validation.',
                40,
                590,
                {
                    width: 320,
                    align: 'left'
                }
            );


        // ======================================================
        // END PDF
        // ======================================================

        doc.end();

    } catch (err) {

        console.error(
            'TICKET PDF ERROR:',
            err
        );

        // Only send JSON if the PDF response has not already started.
        if (!res.headersSent) {
            return res.status(500).json({
                message:
                    err.message ||
                    'Could not generate ticket PDF'
            });
        }

        res.end();
    }
});


// ============================================================
// PUBLIC TICKET VERIFICATION
// ============================================================

router.get('/verify/:code', async (req, res) => {
    try {
        const ticket = await Ticket
            .findOne({
                ticketCode: req.params.code
            })
            .lean();

        const ok = isValid(
            ticket,
            req.query.sig
        );

        res.json({
            valid: ok,

            status:
                !ticket
                    ? 'NOT_FOUND'
                    : !ok
                        ? 'INVALID'
                        : ticket.status.toUpperCase(),

            ticket: ok
                ? {
                    ticketCode: ticket.ticketCode,
                    event: ticket.eventSnapshot,
                    checkedInAt:
                        ticket.checkedInAt || null
                }
                : null
        });

    } catch (err) {
        console.error(
            'TICKET VERIFICATION ERROR:',
            err
        );

        res.status(500).json({
            message:
                err.message ||
                'Could not verify ticket'
        });
    }
});


// ============================================================
// ORGANIZER / ADMIN CHECK-IN
// ============================================================

router.post(
    '/:id/checkin',
    auth,
    role('organizer', 'admin'),
    async (req, res) => {
        try {
            const ticket = await Ticket.findById(
                req.params.id
            );

            if (!ticket) {
                return res.status(404).json({
                    message: 'Ticket not found'
                });
            }

            const event = await Event.findById(
                ticket.eventId
            );

            if (
                req.user.role === 'organizer' &&
                (
                    !event ||
                    String(event.organizerId) !==
                    String(req.user._id)
                )
            ) {
                return res.status(403).json({
                    message:
                        'You do not manage this event'
                });
            }

            if (ticket.status !== 'valid') {
                return res.status(409).json({
                    message:
                        `Ticket is ${ticket.status}`
                });
            }

            ticket.status = 'used';

            ticket.checkedInAt = new Date();

            ticket.checkedInBy =
                req.user._id;

            await ticket.save();

            res.json({
                ok: true,

                message:
                    'Ticket checked in',

                ticket: {
                    id: ticket._id.toString(),
                    status: ticket.status,
                    checkedInAt:
                        ticket.checkedInAt
                }
            });

        } catch (err) {
            console.error(
                'CHECK-IN ERROR:',
                err
            );

            res.status(500).json({
                message:
                    err.message ||
                    'Could not check in ticket'
            });
        }
    }
);


module.exports = router;