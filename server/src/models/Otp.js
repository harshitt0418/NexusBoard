const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, max: 5 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
}, { timestamps: true });

// Index for faster lookups and auto-cleanup
otpSchema.index({ email: 1, expiresAt: 1 });

module.exports = mongoose.model('Otp', otpSchema);
