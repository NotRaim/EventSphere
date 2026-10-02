const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  profileImage: u.profileImage, isApproved: u.isApproved, createdAt: u.createdAt,
});

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (await User.exists({ email })) throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name, email, phone, password,
    role: role === 'organizer' ? 'organizer' : 'user', // admins can never be created from the public form
    isApproved: role === 'organizer' ? false : true,   // organizers wait for admin approval
  });

  res.status(201).json({
    success: true,
    message: user.role === 'organizer'
      ? 'Account created. An admin must approve your organizer account before you can publish events.'
      : 'Account created successfully. You can log in now.',
    user: publicUser(user),
  });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email');
  if (!(await user.comparePassword(password))) throw new ApiError(401, 'Wrong password');
  if (!user.isActive) throw new ApiError(403, 'Your account has been blocked. Contact the administrator');

  res.json({ success: true, message: 'Login successful', token: signToken(user._id), user: publicUser(user) });
});

// GET /api/auth/profile
exports.profile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});
