const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');
const Room = require('../models/Room');
const SessionLog = require('../models/SessionLog');
const { createError } = require('../middleware/errorHandler');

const generateRoomId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

exports.createRoom = async (req, res, next) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            throw createError('Database is not ready. Please try again in a moment.', 503);
        }

        const { name, isPrivate, maxParticipants, autoApproveDrawing } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) throw createError('Room name is required');

        const hostId = req.user ? req.user._id.toString() : req.body.guestId;
        const hostName = (req.user ? req.user.name : req.body.hostName)?.trim?.() || '';
        if (!hostId || !hostName) throw createError('Host information required (display name and guest id)');

        const roomId = generateRoomId();
        let room;
        try {
            room = await Room.create({
                roomId,
                name: name.trim(),
                hostId,
                hostName,
                isPrivate: isPrivate || false,
                maxParticipants: maxParticipants || 20,
                autoApproveDrawing: autoApproveDrawing || false,
            });
        } catch (dbErr) {
            const msg = dbErr.code === 11000 ? 'Room ID collision; please try again.' : (dbErr.message || 'Database error. Please try again.');
            throw createError(msg, 503);
        }

        try {
            await SessionLog.create({ roomId, action: 'room_created', userId: hostId, userName: hostName });
        } catch (_) { /* non-fatal */ }
        res.status(201).json({ room });
    } catch (err) {
        next(err);
    }
};

exports.getRoom = async (req, res, next) => {
    try {
        const roomId = (req.params.roomId || '').toString().trim().toUpperCase();
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) throw createError('Room not found', 404);
        res.json({ room });
    } catch (err) {
        next(err);
    }
};

exports.joinRoom = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { name, guestId } = req.body;

        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) throw createError('Room not found or inactive', 404);
        if (room.participants.length >= room.maxParticipants)
            throw createError('Room is full', 403);

        const userId = req.user ? req.user._id.toString() : guestId;
        const userName = req.user ? req.user.name : name;
        if (!userId || !userName) throw createError('User information required');

        res.json({ room, userId, userName });
    } catch (err) {
        next(err);
    }
};

exports.endRoom = async (req, res, next) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) throw createError('Room not found', 404);
        const userId = req.user ? req.user._id.toString() : req.body.userId;
        if (room.hostId !== userId) throw createError('Only host can end the session', 403);
        room.isActive = false;
        await room.save();
        await SessionLog.create({ roomId: room.roomId, action: 'room_ended', userId });
        res.json({ message: 'Room ended' });
    } catch (err) {
        next(err);
    }
};
