const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const {
    register,
    login,
    getMe,
    sendOTP,
    verifyOTP,
    forgotPassword,
    resetPassword,
    googleCallback,
    logout,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Traditional auth
router.post('/register', register);
router.post('/login', login);

// OTP authentication
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    googleCallback
);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;
