const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
}, { timestamps: true });

passwordResetTokenSchema.index({ userId: 1, expiresAt: 1 });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
