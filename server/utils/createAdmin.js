// Usage: npm run create-admin
// Creates (or promotes) the admin account using ADMIN_* values from .env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const { MONGODB_URI, ADMIN_NAME = 'Platform Admin', ADMIN_EMAIL = 'admin@eventsphere.com', ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI) { console.error('MONGODB_URI is missing in .env'); process.exit(1); }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) { console.error('Set ADMIN_PASSWORD (min 8 chars) in .env first'); process.exit(1); }

  await mongoose.connect(MONGODB_URI);
  let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (admin) {
    admin.role = 'admin'; admin.isActive = true; admin.isApproved = true; admin.password = ADMIN_PASSWORD;
    await admin.save();
    console.log('✅ Existing account promoted to admin and password reset:', admin.email);
  } else {
    admin = await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, phone: '+910000000000', password: ADMIN_PASSWORD, role: 'admin' });
    console.log('✅ Admin created:', admin.email);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
