# EventSphere Stage 4 Setup Checklist

1. Open `EventSphere/server` in a terminal.
2. Copy `.env.example` to `.env`.
3. Add your MongoDB Atlas URI.
4. Generate two random secrets and add them to `JWT_SECRET` and `TICKET_SIGNING_SECRET`.
5. Keep `PAYMENT_MODE=demo`.
6. Set an admin email/password for local admin access.
7. Run `npm install`.
8. Run `npm run seed`.
9. Run `npm start`.
10. Open `http://localhost:5000`.

No Razorpay credentials are required for this build.
