const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') return null;
  console.warn('⚠️  JWT_SECRET not set — using dev default. Set JWT_SECRET in server/.env for production.');
  return 'nexusboard-dev-secret-change-in-production';
};

const authenticate = async (req, res, next) => {
    try {
        // Check Authorization header first, then cookie
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const secret = getJwtSecret();
        if (!secret) return res.status(503).json({ message: 'Server auth not configured' });

        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ message: 'User not found' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Optional auth: allow both guests and logged-in users. Never blocks or returns 401.
const optionalAuth = async (req, res, next) => {
    req.user = null;
    try {
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (token) {
            const secret = getJwtSecret();
            if (secret) {
                const decoded = jwt.verify(token, secret);
                const user = await User.findById(decoded.id).select('-password');
                req.user = user || null;
            }
        }
    } catch (_) {
        req.user = null;
    }
    next();
};

module.exports = { authenticate, optionalAuth };
