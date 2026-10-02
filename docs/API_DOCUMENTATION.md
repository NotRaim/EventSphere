# API Documentation

Base URL: `http://localhost:5000/api` · All bodies are JSON unless noted.
Authenticated routes need the header `Authorization: Bearer <token>`.

Every error looks like `{ "success": false, "message": "Friendly message" }`.

| Status | Meaning |
|---|---|
| 400 | Validation error | 
| 401 | Missing / expired token, or wrong credentials |
| 403 | Logged in but not allowed (role, blocked, unapproved organizer) |
| 404 | Not found |
| 409 | Conflict (already registered, registration full, email exists) |
| 429 | Too many login attempts |
| 503 | Database connection error |

## Health
`GET /api/health` → `{ "success": true, "status": "EventSphere API running", "database": "connected" }`

## Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Body: `name, email, phone, password, role (user\|organizer)`. Password ≥ 8 chars with a letter and a number. |
| POST | `/auth/login` | public | Body: `email, password` → `{ token, user }` |
| GET | `/auth/profile` | any user | Current user |

```json
// POST /auth/login
{ "email": "aarav@student.com", "password": "Password@123" }
// 200
{ "success": true, "message": "Login successful", "token": "eyJ...", "user": { "id": "...", "name": "Aarav Patel", "role": "user" } }
```
Errors: `Invalid email`, `Wrong password`, `Email already registered`.

## Events
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/events` | public | Query: `search, category, location, date (on or after), when (upcoming\|past\|all), sort (date\|-date\|newest\|popular), page, limit` |
| GET | `/events/mine` | organizer, admin | Events I created (admin: all) |
| GET | `/events/:id` | public | Details + rating; adds `isRegistered`, `isFavorite`, `registrationId` when logged in |
| POST | `/events` | organizer (approved), admin | `multipart/form-data` (see below) |
| PUT | `/events/:id` | owner, admin | Same fields as POST. Registered users are notified if date/time/location change |
| DELETE | `/events/:id` | owner, admin | Deletes event + registrations, favorites, feedback; notifies participants |

**Event form fields:** `title, description, category, date (YYYY-MM-DD), time (HH:MM), location, capacity, registrationDeadline, image (file, optional), speakers (JSON string [{name,role}]), schedule (JSON string [{time,title}]), rules (JSON string [..]), contactEmail, contactPhone`.

```json
// GET /events?category=Technology&page=1&limit=9
{ "success": true, "total": 3, "page": 1, "pages": 1,
  "events": [ { "_id": "...", "title": "AI for Everyone", "capacity": 200, "registeredCount": 41, "availableSeats": 159, "organizerId": { "name": "Priya Nair" } } ] }
```

## Registrations
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/events/:id/register` | logged in | Takes a seat atomically. Returns `registration.registrationId` and `qrCode` (PNG data URL) |
| GET | `/registrations/my` | logged in | My registrations (with QR) |
| GET | `/events/:id/registrations` | event owner, admin | Participants of an event |
| DELETE | `/registrations/:id` | participant, event owner, admin | Cancels and releases the seat |
| PATCH | `/registrations/:id/attendance` | event owner, admin | Body `{ "attendance": true }` |
| POST | `/events/:id/checkin` | event owner, admin | Body `{ "code": "EVS-7F3A9C21" }` (or the raw QR text) |

Errors: `Already registered`, `Registration full`, `The registration deadline has passed`, `This event has already taken place`, `Event not found`.

QR payload: `{"e":"<eventId>","u":"<userId>","r":"<registrationId>"}`.

## Favorites (logged in)
`POST /favorites/:eventId` · `GET /favorites` · `DELETE /favorites/:eventId`

## Feedback
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/events/:id/feedback` | registered participants | Body `{ "rating": 1-5, "comment": "..." }` |
| GET | `/events/:id/feedback` | public | `{ average, count, feedback[] }` |

## Notifications (logged in)
`GET /notifications` → `{ unread, notifications[] }` · `PATCH /notifications/read-all` · `PATCH /notifications/:id/read`

## Reports (organizer, admin)
| Method | Path | Description |
|---|---|---|
| GET | `/reports/summary` | Totals, attendance rate, most popular event, events by category, monthly registrations, per-event table (organizers see only their events) |
| GET | `/reports/export` | CSV download |

## Admin (admin only)
| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Platform counts |
| GET | `/admin/users?role=user\|organizer` | List accounts |
| PATCH | `/admin/users/:id/block` | Toggle block / unblock |
| PATCH | `/admin/users/:id/approve` | Body `{ "approved": true }` (organizers) |
| DELETE | `/admin/users/:id` | Delete account (and an organizer's events) |
| GET | `/admin/events?status=` | All events |
| PATCH | `/admin/events/:id/status` | Body `{ "status": "approved" \| "rejected" }` |
| DELETE | `/admin/events/:id` | Delete event |
| GET | `/admin/registrations` | All registrations |
| GET | `/admin/settings` | Read-only platform settings |

## Contact (public)
`POST /contact` – Body `{ name, email, message }`.

## Testing with curl
```bash
curl http://localhost:5000/api/health
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"aarav@student.com","password":"Password@123"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
curl http://localhost:5000/api/registrations/my -H "Authorization: Bearer $TOKEN"
```
