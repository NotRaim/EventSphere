# EventSphere – Design Thinking Report

> **How to use this file:** the structure and the pain points come from the project brief. Sections marked **✏️ REPLACE** need *your* real data (interviews, survey numbers, test results). Do not submit invented statistics. Examiners ask follow-up questions, so use only what you actually collected.

## 1. Project Title
EventSphere – Smart Event Management System

## 2. Team Members
| Name | Roll no. | Role in project |
|---|---|---|
| ✏️ REPLACE | | |

## 3. Problem Statement
Students, colleges, organizations and event organizers struggle to manage events because information is scattered across WhatsApp groups, social media, posters and spreadsheets.

### PROBLEM STATEMENT FOR REPORT
Students, educational institutions and event organizers often rely on multiple disconnected platforms such as messaging applications, social media, spreadsheets and paper-based systems to manage events. This creates difficulties in discovering events, registering participants, communicating updates, managing attendance and analyzing event performance. There is a need for a centralized, user-friendly and efficient event management platform that connects participants, organizers and administrators in one system.

## 4. Background
Campus events (hackathons, fests, workshops, seminars) are announced through many channels. Each club uses its own form and spreadsheet. Nobody has a complete picture, either of what is happening or of how well events perform.

## 5. Target Users
Students (participants) · club / department event organizers · college administrators.

---
# Phase 1 – EMPATHIZE

## 6. Empathize
Goal: understand how people discover, join and run events today, without assuming the answer.
Methods used: interviews, a short survey, and observation of how an event is currently announced and managed.

## 7. User Research  ✏️ REPLACE
| Method | Who / how many | Date | Key insight |
|---|---|---|---|
| Interviews | e.g. 5 students, 2 organizers, 1 admin | | |
| Survey (Google Forms) | e.g. N = ___ students | | |
| Observation | e.g. one club's registration desk | | |

Suggested interview questions
- *Students:* How did you hear about the last event you attended? Have you ever missed one? Why? How do you register? Where do you keep your ticket?
- *Organizers:* How do you collect registrations? How do you know who attended? How long does it take to compile a report?
- *Admin:* How do you know which events are happening? How are venues and approvals handled?

Empathy map (fill in per user group): **Says · Thinks · Does · Feels**

## 8. User Pain Points
From the brief (confirm each with your research and add quotes):
1. Students miss important event information.
2. Registration is difficult to manage.
3. Organizers maintain participant lists manually.
4. There is no centralized event system.
5. Participants cannot easily track their registered events.
6. Organizers cannot see registration statistics.
7. Updates and announcements are hard to deliver.
8. Attendance tracking is manual.
9. Event reports are hard to generate.
10. Duplicate or invalid registrations occur.

---
# Phase 2 – DEFINE

## 9. Define / Problem Definition (point-of-view statements)
- **Student:** "A student who follows many chat groups needs one place to find and book events, because important announcements get buried and they miss them."
- **Organizer:** "An event organizer needs registrations, attendance and reports to be collected automatically, because compiling spreadsheets by hand is slow and error-prone."
- **Admin:** "A college administrator needs visibility and control over events and organizers, because there is no central record today."

**How Might We…**
- HMW make every event discoverable in one place?
- HMW let people register in seconds and prove it at the door?
- HMW give organizers live numbers instead of manual lists?
- HMW keep participants updated when plans change?

## 10. User Persona
*Sample personas, edit them to match your research.*

**Aarav, 20, Engineering student (participant)**
Goals: find hackathons and workshops, keep tickets safe. Frustrations: misses posts in chat groups, fills the same form repeatedly. Needs: search, one-click registration, reminders.

**Priya, 34, Faculty coordinator / club lead (organizer)**
Goals: run events smoothly, report to the department. Frustrations: manual lists, duplicate sign-ups, no attendance record. Needs: capacity control, check-in, exportable reports.

**Dr. Mehta, 48, Administrator**
Goals: oversight and safety. Frustrations: no single view of events. Needs: approvals, user management, analytics.

## 11. User Journey (participant)
| Stage | Action | Thought / feeling | Pain point today | EventSphere answer |
|---|---|---|---|---|
| Awareness | Sees a poster / chat message | "Sounds interesting" | Info incomplete | Event page with all details |
| Discovery | Looks for similar events | "What else is on?" | Must search many chats | Search + filters |
| Decision | Checks date, place, seats | "Can I make it?" | Unclear capacity | Seats left + deadline shown |
| Registration | Signs up | "Is it confirmed?" | Separate forms, no proof | One click + QR + notification |
| Attendance | Arrives at venue | "Will they find my name?" | Paper lists | QR check-in |
| After | Gives feedback | "Was it worth it?" | No channel | Ratings and history |

---
# Phase 3 – IDEATE

## 12. Ideate
Brainstorming session (team of ___, date ___): quantity first, no judging.

## 13. Proposed Solutions
1. A shared Google Calendar + Google Forms.
2. A WhatsApp broadcast bot.
3. A printed notice-board + QR to a form.
4. A dedicated web platform with accounts, dashboards and QR tickets (**EventSphere**).
5. A mobile-only app.

## 14. Solution Selection
| Criterion (1-5) | Calendar+Forms | WhatsApp bot | Web platform | Mobile app |
|---|---|---|---|---|
| Solves discovery | 2 | 3 | 5 | 5 |
| Handles capacity & duplicates | 1 | 1 | 5 | 5 |
| Attendance & reports | 1 | 1 | 5 | 5 |
| Feasible in our time | 5 | 3 | 4 | 2 |
| **Total** | 9 | 8 | **19** | 17 |

*(Scores are an example, so score them with your team.)* The web platform wins: it works on any device without installation and covers every pain point.

---
# Phase 4 – PROTOTYPE

## 15. Prototype
1. **Paper sketches** of home, events list, event details and dashboards. ✏️ attach photos.
2. **Mock-ups** (Figma or similar). ✏️ attach.
3. **Working prototype:** this repository (Node.js + Express + MongoDB + vanilla JS).

---
# Phase 5 – TEST

## 16. Testing  ✏️ REPLACE
Give 5+ users these tasks without helping them, and time them:
1. Create an account and log in.
2. Find a technology event and register.
3. Find your QR ticket.
4. (Organizer) Create an event and check someone in.
5. (Admin) Approve a pending organizer.

| Task | User 1 | User 2 | User 3 | User 4 | User 5 | Problems observed |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

Technical test cases are listed in the README (section 21).

## 17. User Feedback  ✏️ REPLACE
Record quotes, ratings (e.g. System Usability Scale), and what people liked / disliked.

## 18. Improvements
Record what you changed because of the feedback, e.g. "Users didn't notice the QR code → added a QR pop-up right after registering." (The sample app already includes such a pop-up; replace this example with your real findings.)

---
# Final Solution

## 19. Final Solution
EventSphere: one platform, three roles, a secure REST API and MongoDB storage.

## 20. Features
See README section 9.

## 21. Technology Stack
HTML5, CSS3, JavaScript, GSAP, Three.js, Chart.js · Node.js, Express · MongoDB, Mongoose · JWT, bcrypt · Cloudinary (optional).

## 22. System Architecture
Browser ⇄ (REST/JSON, JWT) ⇄ Express API ⇄ Mongoose ⇄ MongoDB. See README section 10.

## 23. Database Design
See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## 24. ER Diagram description
Users create Events (1:N). Users and Events are linked many-to-many through Registrations, Favorites and Feedbacks. Notifications belong to a User. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#er-diagram-description).

## 25. API Documentation
See [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## 26. Screenshots
✏️ Add screenshots of every page (light and dark mode) in `docs/screenshots/`.

## 27. Challenges
- Preventing overbooking when two people register at the same moment.
- Keeping animations smooth on phones.
- Designing three role-specific dashboards that share one design system.
- Moderation flow (organizer approval, event approval) without blocking demos.

## 28. Future Scope
Email/SMS notifications, password reset, Google sign-in, paid tickets, waiting list, calendar export, mobile app, certificates.

## 29. Conclusion
The project followed the full Design Thinking cycle from empathy to a tested, working product that removes the manual, scattered processes behind campus events.
