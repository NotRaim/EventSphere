require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const connect = require('./config/db');

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = Number(process.env.PORT || 5000);

const origins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);


/* =========================================================
   SECURITY / MIDDLEWARE
========================================================= */

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests without an Origin header
            // and allow all origins if CLIENT_ORIGIN is empty.
            if (
                !origin ||
                !origins.length ||
                origins.includes(origin)
            ) {
                return callback(null, true);
            }

            return callback(new Error('CORS blocked'));
        }
    })
);


/* =========================================================
   RAZORPAY WEBHOOK
   IMPORTANT:
   Raw body must be received BEFORE express.json()
========================================================= */

app.use(
    '/api/payments/webhook',
    express.raw({
        type: 'application/json'
    })
);


/* =========================================================
   JSON BODY
========================================================= */

app.use(
    express.json({
        limit: '1mb'
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);

/* Netlify/serverless request-body normalization. */
app.use((req,res,next)=>{
    if(req.path==='/api/payments/webhook')return next();
    let body=req.body;
    if(Buffer.isBuffer(body))body=body.toString('utf8');
    if(typeof body==='string'&&body.trim()){try{body=JSON.parse(body)}catch{}}
    if(body&&typeof body==='object'&&!Buffer.isBuffer(body))req.body=body;
    next();
});


/* =========================================================
   API HEALTH CHECK
========================================================= */

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'EventSphere',
        database:
            mongoose.connection.readyState === 1
                ? 'connected'
                : 'disconnected',
        paymentMode: process.env.PAYMENT_MODE || 'demo',
        time: new Date().toISOString()
    });
});


/* =========================================================
   API ROUTES
========================================================= */

app.use(
    '/api/auth',
    require('./routes/auth')
);

app.use(
    '/api/events',
    require('./routes/events')
);

app.use(
    '/api/me',
    require('./routes/me')
);

app.use(
    '/api/payments',
    require('./routes/payments').router
);

app.use(
    '/api/tickets',
    require('./routes/tickets')
);

app.use(
    '/api/admin',
    require('./routes/admin')
);

app.use(
    '/api/contact',
    require('./routes/contact')
);

app.use(
    '/api/event-reports',
    require('./routes/event-reports')
);

app.use(
    '/api/recommendations',
    require('./routes/recommendations')
);


/* =========================================================
   PUBLIC TICKET VERIFICATION PAGE
========================================================= */

app.get('/verify/:code', async (req, res) => {
    try {
        const Ticket = require('./models/Ticket');

        const {
            signature,
            safeEqual
        } = require('./utils/ticket');

        const ticket = await Ticket
            .findOne({
                ticketCode: req.params.code
            })
            .lean();

        const valid =
            !!ticket &&
            ticket.status === 'valid' &&
            safeEqual(
                req.query.sig || '',
                signature(
                    ticket.ticketCode,
                    ticket.userId,
                    ticket.eventId
                )
            );

        const escapeHtml = value =>
            String(value ?? '')
                .replace(
                    /[&<>"']/g,
                    char => ({
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#39;'
                    }[char])
                );

        res.type('html').send(`
<!doctype html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
    >

    <title>EventSphere Ticket Verification</title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;

            display: grid;
            place-items: center;

            padding: 20px;

            background:
                radial-gradient(
                    circle at top,
                    #123034 0,
                    #071011 45%,
                    #050809 100%
                );

            color: #eef8f8;

            font-family:
                Arial,
                Helvetica,
                sans-serif;
        }

        .card {

            width: min(
                520px,
                100%
            );

            background: #0d1415;

            border: 1px solid #263a3a;

            border-radius: 28px;

            padding: 32px;

            box-shadow:
                0 25px 80px
                rgba(0, 0, 0, 0.45);
        }

        .tag {

            margin-bottom: 14px;

            letter-spacing: 2px;

            font-size: 11px;

            color: #1dd9ef;

            font-weight: 700;
        }

        h1 {

            margin:
                0 0 20px;
        }

        h2 {

            margin:
                0 0 12px;
        }

        p {

            color: #a9bbbb;

            line-height: 1.7;
        }

        .ok {

            color: #21e0a2;
        }

        .bad {

            color: #ff6e86;
        }

        .id {

            display: inline-block;

            padding: 10px 14px;

            border-radius: 10px;

            background: #081011;

            color: #1dd9ef;

            font-family: monospace;

            word-break: break-all;
        }

        .status {

            display: inline-flex;

            padding: 8px 12px;

            border-radius: 999px;

            background: rgba(
                33,
                224,
                162,
                0.1
            );

            color: #21e0a2;

            font-size: 13px;

            font-weight: 700;
        }

    </style>

</head>

<body>

    <main class="card">

        <div class="tag">
            EVENTSPHERE · TICKET CHECK
        </div>

        <h1 class="${valid ? 'ok' : 'bad'}">
            ${valid
                ? '✓ Valid ticket'
                : '✕ Invalid ticket'}
        </h1>

        ${
            valid
                ? `
                    <span class="status">
                        VERIFIED
                    </span>

                    <h2>
                        ${escapeHtml(
                            ticket.eventSnapshot?.title
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            ticket.eventSnapshot?.date
                        )}

                        ·

                        ${escapeHtml(
                            ticket.eventSnapshot?.time || ''
                        )}

                        <br>

                        ${escapeHtml(
                            ticket.eventSnapshot?.venue || ''
                        )}

                        ·

                        ${escapeHtml(
                            ticket.eventSnapshot?.city || ''
                        )}
                    </p>

                    <p class="id">
                        ${escapeHtml(
                            ticket.ticketCode
                        )}
                    </p>

                    <p>
                        This ticket is valid according
                        to the EventSphere database.
                    </p>
                `
                : `
                    <p>
                        The ticket code or signature
                        is invalid, or this ticket has
                        already been used or cancelled.
                    </p>
                `
        }

    </main>

</body>

</html>
        `);

    } catch (error) {

        console.error(
            'Ticket verification error:',
            error
        );

        res.status(500).send(
            'Unable to verify ticket.'
        );
    }
});


/* =========================================================
   SERVE EVENTSPHERE FRONTEND
========================================================= */

/*
    IMPORTANT:

    server.js is located at:

    D:\EventSphere\server\server.js

    Frontend is located at:

    D:\EventSphere\client\

    Therefore:

    path.join(__dirname, '..', 'client')
*/

const clientPath = path.join(
    __dirname,
    '..',
    'client'
);


/*
    Serve CSS, JS, images and HTML
*/

if (!process.env.NETLIFY) {
    app.use(express.static(clientPath));
}


/*
    Homepage

    http://localhost:5000/
    ↓
    D:\EventSphere\client\index.html
*/

if (!process.env.NETLIFY) {
    app.get('/', (req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'));
    });
}


/* =========================================================
   FRONTEND PAGES
========================================================= */

/*
    express.static(clientPath) already serves every HTML page
    from the client folder, for example:

      /events.html
      /dashboard.html
      /tickets.html

    Express 5 no longer accepts the old "*.html" wildcard
    syntax, so no wildcard GET route is needed here.
*/


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
    (err, req, res, next) => {

        console.error(err);

        if (res.headersSent) {
            return next(err);
        }

        res.status(500).json({
            message: 'Server error'
        });

    }
);


/* =========================================================
   DATABASE / ADMIN INITIALIZATION
========================================================= */

let adminInitPromise = null;

async function ensureAdmin() {
    if (adminInitPromise) return adminInitPromise;

    adminInitPromise = (async () => {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');

        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
            return;
        }

        const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
        const adminExists = await User.exists({ email: adminEmail });

        if (!adminExists) {
            await User.create({
                name: process.env.ADMIN_NAME || 'EventAdmin',
                email: adminEmail,
                passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
                role: 'admin'
            });
            console.log(`✅ Admin account created: ${adminEmail}`);
        }
    })();

    return adminInitPromise;
}

let databasePromise = null;

async function ensureDatabase() {
    if (!databasePromise) {
        databasePromise = connect().catch(error => {
            databasePromise = null;
            throw error;
        });
    }
    return databasePromise;
}

/*
   Export the Express app for Netlify Functions.
   Local development still uses `npm start` below.
*/
module.exports = {
    app,
    ensureDatabase,
    ensureAdmin
};

/* =========================================================
   LOCAL SERVER START
========================================================= */

if (require.main === module) {
    ensureDatabase()
        .then(ensureAdmin)
        .then(() => {
            app.listen(PORT, () => {
                console.log(`🚀 EventSphere running → http://localhost:${PORT}`);
                console.log(`🌐 Frontend → http://localhost:${PORT}/`);
                console.log(`❤️ Health → http://localhost:${PORT}/api/health`);
                console.log(`💳 Payment mode → ${process.env.PAYMENT_MODE || 'demo'}`);
            });
        })
        .catch(error => {
            console.error('❌ Database connection error:', error.message);
            process.exit(1);
        });
}
