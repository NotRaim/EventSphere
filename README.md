# EventSphere
**Smart Event Management System** – a full-stack web app built for a Design Thinking course project.

> Discover. Register. Experience.

---

## 1. Project Overview
EventSphere is a centralized platform where **participants** discover and register for events, **organizers** create events and track attendance, and **admins** moderate the whole platform. Everything is stored in MongoDB and served through a REST API built with Node.js and Express.

## 2. Problem Statement
**PROBLEM STATEMENT FOR REPORT**

> Students, educational institutions and event organizers often rely on multiple disconnected platforms such as messaging applications, social media, spreadsheets and paper-based systems to manage events. This creates difficulties in discovering events, registering participants, communicating updates, managing attendance and analyzing event performance. There is a need for a centralized, user-friendly and efficient event management platform that connects participants, organizers and administrators in one system.

## 3. Proposed Solution
One system that provides: secure accounts with three roles, event search/filter, one-click registration with seat-limit and duplicate protection, QR-code tickets, organizer attendance check-in, notifications, admin moderation, and analytics with CSV/PDF export.

## 4. Design Thinking Process
The full write-up (with templates for your own research data) is in [`docs/DESIGN_THINKING.md`](docs/DESIGN_THINKING.md). Summary:

### Empathize
Talk to students, organizers and a college administrator. Observe how events are currently announced (WhatsApp groups, posters, forms). Record what they say, do, think and feel.
### Define
Turn research into a point-of-view statement: *"Students need a single place to find and book events, because information scattered across chats makes them miss things."*
### Ideate
Brainstorm solutions (shared calendar, WhatsApp bot, Google Forms, dedicated web platform), then pick using an impact/effort matrix.
### Prototype
Low-fidelity sketches → clickable mockups → this working full-stack build.
### Test
Let real users complete tasks (register, create an event, check someone in), note where they struggle, iterate.

## 5. Target Users
- **Students / participants** – want to find events and keep tickets in one place.
- **Event organizers** – clubs, faculty and societies who need registrations, attendance and reports.
- **Administrators** – college staff who approve organizers/events and watch platform health.

## 6. Major Problems Identified
Scattered information · missed events · manual registration lists · duplicate registrations · no central place for updates · manual attendance · no event reports · participants cannot track their own registrations.

## 7. User Personas
Defined in [`docs/DESIGN_THINKING.md`](docs/DESIGN_THINKING.md#user-persona) (a student, an organizer and an admin). Replace the sample personas with ones based on **your** interviews.

## 8. User Journey
Participant: *hears about event → searches → opens details → registers → receives QR + notification → attends → leaves feedback.* Full journey map in the Design Thinking document.

## 9. Features
| Area | Features |
|---|---|
| Accounts | Register (User/Organizer), login, JWT sessions, remember me, password-strength meter, role-based redirects |
| Discovery | Search, category / date / location filters, sorting, pagination, skeleton loading |
| Event page | Banner, schedule, speakers, rules, capacity bar, favorites, share, ratings and reviews |
| Registration | Atomic seat claiming (no overbooking), duplicate prevention, cancel / re-register, unique ID + **QR code** |
| Participant dashboard | Stats, charts, upcoming events, QR tickets, favorites, history, notifications |
| Organizer dashboard | Create / edit / delete events with image upload, participants list, **attendance check-in** (ID or camera QR scan), charts, reports |
| Admin dashboard | Stats, users, block / delete, **approve organizers**, approve / reject / delete events, all registrations, reports, settings |
| Notifications | Registration confirmed, event tomorrow, deadline approaching, location/time changed, event cancelled |
| UI | Glassmorphism, dark + light mode, GSAP animations, Three.js hero, toasts instead of `alert()`, responsive, reduced-motion support |

## 10. System Architecture
```
 Browser (HTML / CSS / JS, GSAP, Three.js, Chart.js)
        │  fetch() + JWT in Authorization header
        ▼
 Express server (server/server.js)
   ├─ security: helmet, CORS, rate-limit, mongo-sanitize
   ├─ routes → middleware (protect / authorize / validate) → controllers
   ├─ static: serves /client and /uploads
   └─ background job: hourly reminders
        │  Mongoose
        ▼
 MongoDB  (users, events, registrations, favorites, feedbacks, notifications, messages)
        └─ optional: Cloudinary for event images
```

## 11. Technology Stack
HTML5, CSS3, vanilla JavaScript · GSAP · Three.js · Chart.js · Font Awesome · Node.js · Express · MongoDB + Mongoose · JWT · bcryptjs · express-validator · multer · Cloudinary · qrcode.

## 12. Frontend
`client/` – eight pages, one shared stylesheet, and small scripts: `api.js` (API + session + toasts + modals), `layout.js` (navbar/footer), `animations.js` (GSAP), per-page scripts.

## 13. Backend
`server/` – `routes/` map URLs to `controllers/`, which use `models/`. `middleware/` holds authentication, role checks, validation and error formatting.

## 14. Database
MongoDB with Mongoose schemas. See [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md).

## 15. Authentication
Passwords are hashed with bcrypt (cost 12) before saving. Login returns a JWT (default 7 days). The client sends it as `Authorization: Bearer <token>`. `protect` verifies it and loads the user (blocked users are rejected); `authorize('admin')` etc. enforce roles. Public sign-up can never create an admin.

> Note: the package is **bcryptjs** (same algorithm as bcrypt, pure JavaScript) so `npm install` never needs a C++ compiler on Windows.

## 16. Database Schema
Collections: `users`, `events`, `registrations`, `favorites`, `feedbacks`, `notifications`, `messages`. Details and ER description in [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md).

## 17. API Documentation
Every endpoint with request and response examples: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

## 18. Website Pages
| Page | File |
|---|---|
| Landing / Home | `client/index.html` |
| Login | `client/login.html` |
| Register | `client/register.html` |
| Events | `client/events.html` |
| Event details | `client/event-details.html` |
| User dashboard | `client/dashboard.html` |
| Organizer dashboard (incl. reports) | `client/organizer.html` |
| Admin dashboard (incl. reports) | `client/admin.html` |

## 19. UI/UX Design
Colors: primary `#6C63FF`, secondary `#00D4FF`, background `#0B1020`, cards `#151B2E`, text `#FFFFFF` (light theme inverts surfaces). Fonts: Sora (headings) and Manrope (body). Glass surfaces, rounded cards, visible keyboard focus, mobile navigation menu, tables scroll horizontally on small screens.

## 20. Animation Features
Hero text sequence and floating cards, Three.js wireframe sphere (pauses off-screen), scroll reveal, staggered cards, animated counters, page-transition curtain, modal and toast animations, skeleton loaders, magnetic buttons, chart animations. All animations are skipped when the visitor prefers reduced motion.

## 21. Testing
Run these manual test cases after setup (fill the last column for your report):

| # | Test | Expected result | Pass? |
|---|---|---|---|
| 1 | Register with invalid email | "Invalid email" shown, nothing saved | |
| 2 | Register with an existing email | "Email already registered" | |
| 3 | Login with wrong password | "Wrong password" | |
| 4 | Login as user / organizer / admin | Redirected to the matching dashboard | |
| 5 | Open `admin.html` as a user | Redirected away | |
| 6 | Register for an event | Success toast, QR + registration ID, seat count drops by 1 | |
| 7 | Register for the same event again | "Already registered" | |
| 8 | Register for the full event (seeded: *Web Development Bootcamp*) | Button reads "Registration Full" | |
| 9 | Cancel a registration | Seat released, status cancelled | |
| 10 | Organizer creates / edits / deletes an event | Change visible in MongoDB and on the Events page | |
| 11 | Organizer checks in a registration ID twice | Second attempt: "already checked in" | |
| 12 | Admin approves a pending organizer | Organizer can now create events | |
| 13 | Admin blocks a user | User can no longer log in | |
| 14 | Call `GET /api/admin/users` without a token | 401 Unauthorized | |
| 15 | Stop MongoDB and call `/api/health` | 503 with `database: disconnected` | |

## 22. User Feedback
Collect feedback from 5-10 real users and summarise it in `docs/DESIGN_THINKING.md` (Testing + Improvements). Inside the app, participants can also rate events (1-5 stars + comment).

## 23. Problems Faced During Development
Examples to adapt to your real experience: preventing two users from taking the last seat at the same time; keeping the front-end safe from XSS when rendering user text; making animations smooth without slowing the page; handling image uploads without Cloudinary credentials; organizing roles and approvals.

## 24. Solutions Implemented
Atomic `findOneAndUpdate` seat claim plus a unique `(userId, eventId)` index · HTML-escaping helper for all rendered text · GSAP only on key moments, `IntersectionObserver` for off-screen pause · automatic fallback to a local `uploads/` folder · `protect` / `authorize` middleware and an `isApproved` flag.

## 25. Screenshots
Add your own screenshots to `docs/screenshots/` and link them here:
```md
![Home](docs/screenshots/home.png)
![Events](docs/screenshots/events.png)
![Dashboard](docs/screenshots/dashboard.png)
```

## 26. Installation
Requirements: **Node.js 18+**, and **MongoDB** (local Community Server *or* a free MongoDB Atlas cluster).
```bash
git clone <your-repo-url> EventSphere
cd EventSphere/server
npm install
```

## 27. Environment Variables
```bash
# from the project root
cp .env.example .env        # Windows: copy .env.example .env
```
Fill in `.env` (never commit it):

| Variable | Meaning |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/eventsphere` (local) or your Atlas connection string |
| `JWT_SECRET` | Long random string. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLOUDINARY_*` | Optional. Leave empty to store images in `server/uploads/` |
| `REQUIRE_EVENT_APPROVAL` | `true` = admin must approve new events |
| `ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD` | Used to create the admin account |

**MongoDB options**
- *Local:* install MongoDB Community Server, start it, use the local URI above.
- *Atlas:* create a free cluster → Database Access (create user) → Network Access (allow your IP) → Connect → copy the `mongodb+srv://…` string into `MONGODB_URI`.

**Cloudinary (optional):** create a free account → Dashboard → copy Cloud name, API key, API secret into `.env`.

## 28. How to Run
```bash
cd server
npm run seed            # sample data + creates the admin account (add -- --fresh to reset)
npm start               # or: npm run dev  (auto-restart)
```
Open **http://localhost:5000** – the Express server serves both the API and the website, so there is nothing else to start.

*Using VS Code Live Server instead?* Open `client/index.html` with Live Server (port 5500); the client automatically talks to `http://localhost:5000/api` and `CLIENT_ORIGIN` already allows it. The backend must still be running.

**Create the admin account** – either `npm run seed`, or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` and run `npm run create-admin`.

**Demo accounts created by the seed** (password for all demo accounts: `Password@123`; the admin password is whatever you set in `ADMIN_PASSWORD`, or a random one printed in the terminal):

| Role | Email |
|---|---|
| Admin | `admin@eventsphere.com` (or your `ADMIN_EMAIL`) |
| Organizer | `priya.organizer@eventsphere.com` |
| User | `aarav@student.com` |
| Pending organizer (approval demo) | `kabir.pending@eventsphere.com` |

**Test login:** go to `/login.html`, sign in, confirm you land on the right dashboard.
**Test registration:** log in as a user → Events → *Register* → check *My Registrations* for the QR, then in MongoDB (`registrations` collection) or Compass confirm the new document.
**Test database connection:** open `http://localhost:5000/api/health` → `"database": "connected"`.

## 29. Future Scope
Email/SMS delivery of notifications, real password reset by email, Google OAuth, payments for paid events, waiting lists, a PWA / mobile app, calendar export (.ics), multi-college tenancy, and automatic PDF certificates.

## 30. Conclusion
EventSphere replaces scattered chats and spreadsheets with one connected system, and demonstrates the full Design Thinking path: real problem → research → pain points → solution → prototype → testing → full-stack implementation.

---

### Security checklist
Never commit `.env`; only `.env.example` is committed. Passwords are hashed, JWTs are signed with your secret, inputs are validated and sanitized, and role checks happen on the server (the client-side redirects are only for convenience).

### Project structure
```
EventSphere/
├── client/    index.html login.html register.html events.html event-details.html
│              dashboard.html organizer.html admin.html + css/ js/ assets/ components/
├── server/    server.js config/ controllers/ middleware/ models/ routes/ utils/
├── docs/      PROJECT_REPORT.md DESIGN_THINKING.md API_DOCUMENTATION.md DATABASE_SCHEMA.md
├── .env.example
└── .gitignore
```
