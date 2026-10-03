# EventSphere Security Hardening

This release adds a final security hardening layer for the Netlify/Express deployment.

## Included

- Production environment validation for MongoDB, JWT, ticket signing, CORS and public URL secrets.
- Helmet security headers with a restrictive CSP baseline.
- Same-site CORS allowlist based on `CLIENT_ORIGIN`; missing origins no longer mean "allow all".
- Global and endpoint-specific rate limiting for API traffic, authentication, ticket verification and reports.
- Strict registration/login input checks and password length limits.
- Organizer authorization hardening: organizers cannot self-publish or change moderation states; with `REQUIRE_EVENT_APPROVAL=true`, edits to published events return to pending review.
- Atomic ticket check-in to prevent double check-in races.
- Signed QR verification remains server-side and now correctly displays `CHECKED IN` for used tickets.
- Demo-payment order claiming prevents concurrent duplicate payment processing.
- Whole-number ticket quantity validation.
- Event field length/type validation.
- Image upload MIME plus file-signature validation.
- Generic production-facing server errors to reduce internal detail leakage.

## Required production variables

Keep these in Netlify environment variables only:

- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET`
- `TICKET_SIGNING_SECRET`
- `CLIENT_ORIGIN`
- `PUBLIC_BASE_URL`
- `PAYMENT_MODE=demo`
- `RESEND_API_KEY` (for email tickets)
- `EMAIL_FROM` (for email tickets)

Do not commit real secrets to GitHub.

## Important deployment note

The rate limiter is intentionally dependency-free so the final patch does not require another package. On Netlify/serverless it is per warm function instance, so it is a useful application-level throttle but not a substitute for an edge/WAF rate limit. If EventSphere later needs high-volume production traffic, add a distributed limiter at the edge or use a shared store.
