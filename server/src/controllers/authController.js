const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') return null;
  return 'nexusboard-dev-secret-change-in-production';
};

const signToken = (id) => {
    const secret = getJwtSecret();
    if (!secret) throw createError('Server auth not configured', 503);
    return jwt.sign({ id }, secret, { expiresIn: '7d' });
};

// Express 5 auto-forwards async rejections — throw instead of calling next()
exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw createError('All fields are required');
    const existing = await User.findOne({ email });
    if (existing) throw createError('Email already registered', 409);
    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublic() });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw createError('Email and password required');
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
        throw createError('Invalid credentials', 401);
    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
};

exports.getMe = async (req, res) => {
    res.json({ user: req.user.toPublic() });
};
