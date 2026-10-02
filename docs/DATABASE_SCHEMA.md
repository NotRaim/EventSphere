# Database Schema (MongoDB + Mongoose)

Database name: `eventsphere` (taken from `MONGODB_URI`). Every collection also has Mongoose `createdAt` / `updatedAt` timestamps.

## users
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | 2-80 chars |
| `email` | String | unique, lowercase |
| `phone` | String | |
| `password` | String | **bcrypt hash**, hidden from queries by default (`select:false`) |
| `role` | `user` \| `organizer` \| `admin` | default `user` |
| `profileImage` | String | |
| `isActive` | Boolean | `false` = blocked |
| `isApproved` | Boolean | organizers start `false` until an admin approves |

## events
| Field | Type | Notes |
|---|---|---|
| `title`, `description` | String | |
| `category` | enum | Technology, Cultural, Sports, Business, Education, Music, Workshop, Competition, Seminar |
| `date` | Date | stored as UTC midnight |
| `time` | String | `HH:MM` (24h) |
| `location` | String | |
| `organizerId` | ObjectId → users | indexed |
| `capacity` | Number | ≥ 1 |
| `registeredCount` | Number | seats taken; updated **atomically** |
| `registrationDeadline` | Date | |
| `image` | String | Cloudinary URL or `/uploads/...` |
| `speakers` | `[{name, role}]` | |
| `schedule` | `[{time, title}]` | |
| `rules` | `[String]` | |
| `contact` | `{email, phone}` | |
| `status` | `pending` \| `approved` \| `rejected` \| `cancelled` | default `approved` |

Virtual: `availableSeats = capacity - registeredCount`. Indexes: `date`, `(category, date)`.

## registrations
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → users | |
| `eventId` | ObjectId → events | |
| `registrationDate` | Date | |
| `registrationId` | String | unique, e.g. `EVS-7F3A9C21` (encoded in the QR) |
| `status` | `confirmed` \| `cancelled` | |
| `attendance` | Boolean | set by organizer check-in |
| `attendedAt` | Date | |

**Unique index on `(userId, eventId)`** – the database itself refuses duplicate registrations.

## favorites
`userId`, `eventId` – unique on `(userId, eventId)`.

## feedbacks
`userId`, `eventId`, `rating` (1-5), `comment` – unique on `(userId, eventId)` (one review per person; resubmitting updates it).

## notifications
`userId`, `title`, `message`, `isRead`, `refKey` (internal key that prevents duplicate reminders).

## messages
Contact-form submissions: `name`, `email`, `message`.

## ER diagram (description)
```
USERS 1 ───< EVENTS            (an organizer creates many events)       events.organizerId → users._id
USERS 1 ───< REGISTRATIONS >─── 1 EVENTS   (many-to-many via registrations)
USERS 1 ───< FAVORITES   >─── 1 EVENTS     (many-to-many via favorites)
USERS 1 ───< FEEDBACKS   >─── 1 EVENTS     (a participant reviews an event once)
USERS 1 ───< NOTIFICATIONS
```
- A **user** can register for many events; an **event** has many registrations.
- `registrations`, `favorites` and `feedbacks` are the "join" collections that resolve the many-to-many relationships.
- Deleting an event deletes its registrations, favorites and feedbacks; deleting an organizer deletes their events first.

## Why `registeredCount` is stored on the event
Counting registrations on every page view is slow, and checking "is there a seat left?" then inserting is a race condition. Instead the server runs one atomic update (`registeredCount < capacity` → `$inc`) so two people can never take the last seat.
