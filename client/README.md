# EventSphere — Stage 4 Fresh Build (Demo Payments)

This is a clean Stage 4 build containing the complete EventSphere client and Express/MongoDB server.

## Stage 4 features

- MongoDB-backed users, events, favorites, ratings, preferences, notifications, orders and tickets
- JWT authentication with role-based organizer/admin routes
- Organizer event creation and attendee/check-in management
- Admin moderation and statistics
- Genuine database-backed tickets with random ticket codes
- HMAC ticket signatures bound to the user and event
- Public QR verification endpoint
- Organizer check-in changes a valid ticket to `used`
- Category-specific ticket designs
- PDF ticket generation with QR code
- Demo payment checkout for paid events
- No PAN, Razorpay account, API key, or real-money transaction required for the demo payment flow
- Free events still issue tickets directly

## Folder structure

```text
EventSphere/
├── client files at root (HTML/CSS/JS)
├── server/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

The server is intentionally inside `server/`. Create the real environment file at `server/.env`.

## 1. Configure MongoDB

Create/use a MongoDB Atlas database user and copy the application connection string into `server/.env` as `MONGODB_URI`.

## 2. Create `server/.env`

Copy `server/.env.example` to `server/.env` and replace the placeholders:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5000,http://127.0.0.1:5000,http://localhost:5500,http://127.0.0.1:5500
MONGODB_URI=mongodb+srv://eventsphere_admin:<password>@cluster0.yskxqut.mongodb.net/eventsphere?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
TICKET_SIGNING_SECRET=your_second_long_random_secret
REQUIRE_EVENT_APPROVAL=false
PAYMENT_MODE=demo
PUBLIC_BASE_URL=http://localhost:5000
ADMIN_NAME=EventAdmin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password
```

Generate secrets locally with PowerShell, for example:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Run it twice and use different values for `JWT_SECRET` and `TICKET_SIGNING_SECRET`.

## 3. Install dependencies

Open a terminal in:

```text
EventSphere/server
```

Run:

```bash
npm install
```

## 4. Seed demo data

```bash
npm run seed
```

The seed creates a demo organizer:

- Email: `demo.organizer@eventsphere.local`
- Password: `EventSphereDemo123!`

If the database has no events, it also creates sample events across multiple categories.

## 5. Start EventSphere

```bash
npm start
```

Open:

```text
http://localhost:5000
```

## Demo payment flow

Paid tickets use `PAYMENT_MODE=demo`.

1. Log in.
2. Open a paid event.
3. Select quantity.
4. Choose UPI, Card, or Net Banking in the EventSphere demo checkout.
5. Click `Complete demo payment`.
6. The server creates and records the order in MongoDB.
7. The server issues signed tickets.
8. Open My Tickets to download the PDF and verify the ticket.

The demo checkout never requests or stores real card/UPI/bank credentials and does not move real money.

## QR verification

For a QR code to be scanned by a phone, `PUBLIC_BASE_URL` must be reachable from that phone. `localhost` only works on the same computer.

For LAN testing, set it to your PC's LAN URL, for example:

```env
PUBLIC_BASE_URL=http://192.168.1.5:5000
```

Use your actual PC IPv4 address from `ipconfig`.

## Security

- Never commit `server/.env`.
- Never put database passwords or signing secrets in client-side JavaScript.
- Demo payment does not make a real financial transaction.
- Ticket verification is server-side and database-backed.
