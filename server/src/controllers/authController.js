const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
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

// Express 5 auto-forwards async rejections â€” throw instead of calling next()
exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw createError('All fields are required', 400);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw createError('Email already registered', 409);

    // Create user as unverified until they click the magic link
    const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        isVerified: false,
    });

    // Generate verification magic link token (10 min)
    const secret = getJwtSecret();
    if (!secret) throw createError('Server auth not configured', 503);
    const verifyToken = jwt.sign(
        { email: user.email, purpose: 'email-verification' },
        secret,
        { expiresIn: '10m' }
    );

    const clientUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${clientUrl}/verify-email?token=${verifyToken}`;

    try {
        await sendEmail({
            to: email,
            subject: 'Verify your NexusBoard email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3B82F6;">Welcome to NexusBoard!</h2>
                    <p>Click the button below to verify your email address and activate your account:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verifyLink}" style="background: #3B82F6; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">Verify Email</a>
                    </div>
                    <p style="color: #64748B; font-size: 14px;">Or copy this link into your browser:</p>
                    <p style="color: #3B82F6; font-size: 13px; word-break: break-all;">${verifyLink}</p>
                    <p style="color: #64748B; font-size: 14px;">This link expires in 10 minutes.</p>
                    <p style="color: #64748B; font-size: 14px;">If you didn't sign up for NexusBoard, please ignore this email.</p>
                </div>
            `,
        });
        console.log(`âœ… Verification email sent to ${email}`);
    } catch (emailError) {
        console.error('âŒ Failed to send verification email:', emailError);
        // Roll back user creation so they can retry registration
        await User.deleteOne({ _id: user._id });
        throw createError('Failed to send verification email. Please try again.', 500);
    }

    res.status(201).json({ message: 'Check your email to verify your account' });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw createError('Email and password required', 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw createError('Invalid email or password', 401);

    if (!user.password) {
        throw createError('This account was created using Google sign-in. Please use Google to login.', 400);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw createError('Password is incorrect. Try resetting your password if you forgot it.', 401);
    }

    if (!user.isVerified) {
        throw createError('Please verify your email before logging in. Check your inbox for the verification link.', 403);
    }

    const token = signToken(user._id);
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user: user.toPublic() });
};

exports.getMe = async (req, res) => {
    res.json({ user: req.user.toPublic() });
};

// ============================================
// MAGIC LINK EMAIL VERIFICATION
// ============================================

exports.verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) throw createError('Verification token is required', 400);

    const secret = getJwtSecret();
    if (!secret) throw createError('Server auth not configured', 503);

    let decoded;
    try {
        decoded = jwt.verify(token, secret);
    } catch {
        throw createError('Invalid or expired verification link', 400);
    }

    if (decoded.purpose !== 'email-verification') {
        throw createError('Invalid verification token', 400);
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) throw createError('User not found', 404);

    if (user.isVerified) {
        return res.json({ message: 'Email already verified. You can now log in.' });
    }

    user.isVerified = true;
    await user.save();

    res.json({ message: 'Email verified successfully! You can now log in.' });
};

// ============================================
// GOOGLE OAUTH AUTHENTICATION
// ============================================

exports.googleCallback = async (req, res) => {
    const user = req.user;
    if (!user) throw createError('Authentication failed', 401);

    const token = signToken(user._id);

    // Set the auth cookie (works for Chrome/Edge/Firefox with proper CORS headers)
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // SAFARI FIX: Safari's ITP blocks cookies set in cross-origin redirects.
    // Pass the token as a URL query param so the client can set it as a first-party cookie.
    // This is safe because HTTPS + short-lived tokens mitigate token-in-URL risks.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?auth_token=${encodeURIComponent(token)}`);
};

// ============================================
// FORGOT PASSWORD & RESET (MAGIC LINK)
// ============================================

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) throw createError('Email is required', 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return the same message to avoid revealing whether an email is registered
    if (!user || !user.password) {
        return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const secret = getJwtSecret();
    if (!secret) throw createError('Server auth not configured', 503);

    const resetToken = jwt.sign(
        { email: user.email, purpose: 'password-reset' },
        secret,
        { expiresIn: '10m' }
    );

    const clientUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
        to: email,
        subject: 'Reset Your NexusBoard Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3B82F6;">Reset Your Password</h2>
                <p>Click the button below to reset your NexusBoard password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background: #3B82F6; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #64748B; font-size: 14px;">Or copy this link into your browser:</p>
                <p style="color: #3B82F6; font-size: 13px; word-break: break-all;">${resetLink}</p>
                <p style="color: #64748B; font-size: 14px;">This link expires in 10 minutes.</p>
                <p style="color: #64748B; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
        `,
    });

    res.json({ message: 'If that email exists, a reset link has been sent' });
};

exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        throw createError('Token and new password are required', 400);
    }

    if (newPassword.length < 6) {
        throw createError('Password must be at least 6 characters', 400);
    }

    const secret = getJwtSecret();
    if (!secret) throw createError('Server auth not configured', 503);

    let decoded;
    try {
        decoded = jwt.verify(token, secret);
    } catch {
        throw createError('Invalid or expired reset link', 400);
    }

    if (decoded.purpose !== 'password-reset') {
        throw createError('Invalid reset token', 400);
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) throw createError('User not found', 404);

    user.password = newPassword; // Hashed by pre-save hook
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
};

// ============================================
// LOGOUT
// ============================================

exports.logout = async (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};

