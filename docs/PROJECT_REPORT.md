# EventSphere – Smart Event Management System
### Project Report (Design Thinking)

✏️ Fill in: team members, guide, college, department, academic year.

## Abstract
EventSphere is a full-stack web application that centralizes event discovery, registration, attendance tracking and reporting for students, organizers and administrators. It uses Node.js, Express and MongoDB on the back end and HTML, CSS and JavaScript (with GSAP, Three.js and Chart.js) on the front end. The system applies the Design Thinking process: empathize, define, ideate, prototype and test.

## 1. Introduction
Events are central to campus life, but managing them is fragmented. This project builds one platform for the whole lifecycle of an event.

## 2. PROBLEM STATEMENT FOR REPORT
Students, educational institutions and event organizers often rely on multiple disconnected platforms such as messaging applications, social media, spreadsheets and paper-based systems to manage events. This creates difficulties in discovering events, registering participants, communicating updates, managing attendance and analyzing event performance. There is a need for a centralized, user-friendly and efficient event management platform that connects participants, organizers and administrators in one system.

## 3. Objectives
1. Provide a single place to discover and search events.
2. Make registration quick, with duplicate and capacity protection.
3. Give organizers tools for event management, attendance and reports.
4. Give administrators control over users, organizers and events.
5. Keep all data in a secure database with role-based access.

## 4. Scope and Limitations
In scope: three roles, event CRUD, registrations, QR tickets, attendance, notifications (in-app), reports. Out of scope in this version: email/SMS delivery, online payments, real Google sign-in, password reset by email.

## 5. Existing System
WhatsApp/Instagram posts, posters, Google Forms and spreadsheets. Drawbacks: scattered information, manual lists, no capacity control, no analytics.

## 6. Proposed System
A web platform exposing a REST API consumed by role-specific dashboards. See README for architecture.

## 7. Requirements
**Functional:** registration/login; browse, search and filter events; register and cancel; favorites; feedback; organizer event CRUD, participants, check-in; admin moderation; reports; notifications.
**Non-functional:** security (hashing, JWT, validation), responsiveness, performance (indexed queries, paginated lists), usability (clear errors, toasts), maintainability (modular code).
**Software:** Node.js 18+, MongoDB, a modern browser. **Hardware:** any computer able to run these.

## 8. Design
- Architecture, database and API: see [README](../README.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
- UI: dark/light themes, glassmorphism, six-colour palette, responsive layouts.
- Design Thinking artefacts (personas, journey map, ideation): [DESIGN_THINKING.md](DESIGN_THINKING.md).

## 9. Implementation highlights
- **Atomic registration:** one `findOneAndUpdate` increments `registeredCount` only while seats remain; a unique index prevents duplicates.
- **Security:** bcrypt hashing, JWT, `protect`/`authorize` middleware, express-validator, mongo-sanitize, helmet, CORS, rate limiting, HTML escaping on the client.
- **QR tickets:** the server generates a QR containing event ID, user ID and registration ID; organizers check people in by ID or camera scan (where supported).
- **Notifications:** created on registration, event changes, cancellations, approvals and by an hourly reminder job.
- **Reports:** MongoDB aggregation pipelines feed Chart.js charts and CSV/PDF export.

## 10. Testing
Test cases are in README section 21. ✏️ Add your results, user testing observations and screenshots.

## 11. Results
✏️ Summarise what the system achieves versus the objectives, and the feedback you collected.

## 12. Challenges
See DESIGN_THINKING.md section 27.

## 13. Future Scope
Email/SMS, password reset, OAuth, payments, waiting list, calendar export, mobile app, certificates.

## 14. Conclusion
EventSphere shows how a user-centred process leads to a practical system: a centralized platform that makes events easier to find, join, run and measure.

## References
Node.js, Express, MongoDB/Mongoose, GSAP, Three.js, Chart.js documentation; Stanford d.school Design Thinking resources. ✏️ Add the ones you used.
