const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // can be mongo ObjectId or socket-based guest id
    name: { type: String, required: true },
    isGuest: { type: Boolean, default: false },
    socketId: { type: String },
    joinedAt: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema(
    {
        roomId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 60 },
        hostId: { type: String, required: true },
        hostName: { type: String, required: true },
        isPrivate: { type: Boolean, default: false },
        maxParticipants: { type: Number, default: 20, min: 2, max: 50 },
        autoApproveDrawing: { type: Boolean, default: false },
        boardLocked: { type: Boolean, default: false },
        activeEditors: [{ type: String }], // userId list
        participants: [participantSchema],
        isActive: { type: Boolean, default: true },
        boardState: { type: String, default: '' }, // JSON stringified canvas strokes
    },
    { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
