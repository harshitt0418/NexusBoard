const Room = require('../models/Room');
const SessionLog = require('../models/SessionLog');

// In-memory room state for fast socket access
const roomStates = new Map();

const getRoomState = (roomId) => {
    if (!roomStates.has(roomId)) {
        roomStates.set(roomId, {
            participants: [],
            activeEditors: [],
            boardLocked: false,
            strokes: [],
            pendingRequests: [],
        });
    }
    return roomStates.get(roomId);
};

const initSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // ─── JOIN ROOM ────────────────────────────────────────────────────────────
        socket.on('join_room', async (data) => {
            try {
                const rawRoomId = (data?.roomId || '').toString().trim();
                const roomId = rawRoomId.toUpperCase();
                const userId = data?.userId;
                const userName = data?.userName;
                const isHost = data?.isHost === true;
                if (!roomId || !userId || !userName) {
                    socket.emit('error', { message: 'Missing room or user info' });
                    return;
                }
                let room;
                try {
                    room = await Room.findOne({ roomId, isActive: true });
                } catch (dbErr) {
                    console.error('join_room DB error:', dbErr.message);
                    socket.emit('error', { message: 'Server database is not ready. Please try again in a moment.' });
                    return;
                }
                if (!room) {
                    socket.emit('error', { message: 'Room not found or no longer active' });
                    return;
                }

                socket.join(roomId);
                socket.data = { roomId, userId, userName, isHost };

                const state = getRoomState(roomId);
                const userIdStr = String(userId);
                const existing = state.participants.find((p) => String(p.userId) === userIdStr);
                if (!existing) {
                    state.participants.push({ userId: userIdStr, userName, isHost: isHost === true, socketId: socket.id });
                } else {
                    existing.socketId = socket.id;
                    existing.isHost = isHost === true;
                }

                // Send room_state to joiner FIRST so host/participant see the lobby even if DB persist fails
                socket.emit('room_state', {
                    roomId,
                    name: room.name,
                    hostId: room.hostId,
                    boardLocked: state.boardLocked,
                    activeEditors: state.activeEditors,
                    participants: state.participants,
                    strokes: state.strokes,
                    pendingRequests: state.pendingRequests,
                    autoApproveDrawing: room.autoApproveDrawing,
                });

                // Notify others in the room
                socket.to(roomId).emit('participant_joined', {
                    userId, userName, isHost,
                    socketId: socket.id,
                    participants: state.participants,
                });

                // Persist to DB after responding (don't block join on DB errors)
                try {
                    const alreadyInDB = room.participants.find((p) => String(p.userId) === userIdStr);
                    if (!alreadyInDB) {
                        room.participants.push({ userId: userIdStr, name: userName, isGuest: !isHost, socketId: socket.id });
                        await room.save();
                    }
                    await SessionLog.create({ roomId, action: 'participant_joined', userId: userIdStr, userName });
                } catch (persistErr) {
                    console.error('join_room persist error:', persistErr.message);
                }
            } catch (err) {
                console.error('join_room error:', err);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // ─── LEAVE ROOM ──────────────────────────────────────────────────────────
        socket.on('leave_room', async () => {
            await handleLeave(socket, io);
        });

        socket.on('disconnect', async () => {
            await handleLeave(socket, io);
        });

        // ─── DRAWING ─────────────────────────────────────────────────────────────
        socket.on('board_draw', (data) => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (state.boardLocked && !isHostSocket(state, userId)) return;
            if (!state.activeEditors.includes(userId) && !isHostSocket(state, userId)) return;
            if (data.type === 'end' && data.stroke) {
                state.strokes.push(data.stroke);
                if (state.strokes.length > 500) state.strokes.shift();
            }
            socket.to(roomId).emit('board_draw', { ...data, userId });
        });

        socket.on('board_clear', async () => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (!isHostSocket(state, userId)) return;
            state.strokes = [];
            io.to(roomId).emit('board_clear');
            await SessionLog.create({ roomId, action: 'board_cleared', userId });
        });

        socket.on('board_undo', (data) => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (!state.activeEditors.includes(userId) && !isHostSocket(state, userId)) return;
            // Remove last stroke by this user
            const idx = [...state.strokes].reverse().findIndex((s) => s.userId === userId);
            if (idx !== -1) state.strokes.splice(state.strokes.length - 1 - idx, 1);
            socket.to(roomId).emit('board_undo', { userId, strokeId: data?.strokeId });
        });

        // ─── CURSOR ──────────────────────────────────────────────────────────────
        socket.on('cursor_move', (data) => {
            const { roomId, userId, userName } = socket.data;
            if (!roomId) return;
            socket.to(roomId).emit('cursor_move', { ...data, userId, userName });
        });

        // ─── LOCK BOARD ──────────────────────────────────────────────────────────
        socket.on('lock_board', async ({ locked }) => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (!isHostSocket(state, userId)) return;
            state.boardLocked = locked;
            io.to(roomId).emit('board_locked', { locked });
            await Room.findOneAndUpdate({ roomId }, { boardLocked: locked });
        });

        // ─── PERMISSION REQUESTS ─────────────────────────────────────────────────
        socket.on('request_draw_access', async () => {
            const { roomId, userId, userName } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);

            const room = await Room.findOne({ roomId });
            if (room?.autoApproveDrawing) {
                if (!state.activeEditors.includes(userId)) state.activeEditors.push(userId);
                socket.emit('draw_access_approved', { userId });
                socket.to(roomId).emit('editor_updated', { activeEditors: state.activeEditors });
                return;
            }

            const alreadyPending = state.pendingRequests.find((r) => r.userId === userId);
            if (!alreadyPending) {
                state.pendingRequests.push({ userId, userName, requestedAt: Date.now() });
            }
            const host = state.participants.find((p) => p.isHost);
            if (host) {
                io.to(host.socketId).emit('draw_request_received', {
                    userId, userName, pendingRequests: state.pendingRequests,
                });
            }
            socket.emit('draw_request_sent');
        });

        socket.on('approve_draw_access', async ({ targetUserId }) => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (!isHostSocket(state, userId)) return;

            if (!state.activeEditors.includes(targetUserId)) {
                state.activeEditors.push(targetUserId);
            }
            state.pendingRequests = state.pendingRequests.filter((r) => r.userId !== targetUserId);

            const targetSocket = getSocketByUserId(state, targetUserId);
            if (targetSocket) io.to(targetSocket).emit('draw_access_approved', { userId: targetUserId });
            io.to(roomId).emit('editor_updated', {
                activeEditors: state.activeEditors,
                pendingRequests: state.pendingRequests,
            });
            await Room.findOneAndUpdate({ roomId }, { activeEditors: state.activeEditors });
        });

        socket.on('reject_draw_access', ({ targetUserId }) => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (!isHostSocket(state, userId)) return;

            state.pendingRequests = state.pendingRequests.filter((r) => r.userId !== targetUserId);
            const targetSocket = getSocketByUserId(state, targetUserId);
            if (targetSocket) io.to(targetSocket).emit('draw_access_rejected', { userId: targetUserId });
            io.to(roomId).emit('editor_updated', {
                activeEditors: state.activeEditors,
                pendingRequests: state.pendingRequests,
            });
        });

        socket.on('revoke_draw_access', async ({ targetUserId }) => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (!isHostSocket(state, userId)) return;

            state.activeEditors = state.activeEditors.filter((id) => id !== targetUserId);
            const targetSocket = getSocketByUserId(state, targetUserId);
            if (targetSocket) io.to(targetSocket).emit('draw_access_revoked', { userId: targetUserId });
            io.to(roomId).emit('editor_updated', { activeEditors: state.activeEditors });
            await Room.findOneAndUpdate({ roomId }, { activeEditors: state.activeEditors });
        });

        // ─── CHAT ────────────────────────────────────────────────────────────────
        socket.on('chat_message', ({ message }) => {
            const { roomId, userId, userName } = socket.data;
            if (!roomId || !message?.trim()) return;
            const payload = {
                id: Date.now(),
                userId, userName,
                message: message.trim().slice(0, 500),
                timestamp: new Date().toISOString(),
            };
            io.to(roomId).emit('chat_message', payload);
        });

        socket.on('user_typing', ({ typing }) => {
            const { roomId, userId, userName } = socket.data;
            if (!roomId) return;
            socket.to(roomId).emit('user_typing', { userId, userName, typing });
        });

        // ─── SESSION START (host triggers, all participants navigate to room) ────
        socket.on('session_start', async ({ roomId: rid }) => {
            const { roomId, userId } = socket.data;
            const targetRoom = rid || roomId;
            if (!targetRoom) return;
            const state = getRoomState(targetRoom);
            if (!isHostSocket(state, userId)) return;
            // Broadcast to everyone in the room (including host)
            io.to(targetRoom).emit('session_started', { roomId: targetRoom });
            await SessionLog.create({ roomId: targetRoom, action: 'session_started', userId });
        });

        // ─── SESSION END ─────────────────────────────────────────────────────────
        socket.on('end_session', async () => {
            const { roomId, userId } = socket.data;
            if (!roomId) return;
            const state = getRoomState(roomId);
            if (!isHostSocket(state, userId)) return;
            io.to(roomId).emit('session_ended', { roomId });
            roomStates.delete(roomId);
            await Room.findOneAndUpdate({ roomId }, { isActive: false });
            await SessionLog.create({ roomId, action: 'session_ended', userId });
        });


        // ─── WEBRTC SIGNALING ─────────────────────────────────────────────────────
        socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
            io.to(targetSocketId).emit('webrtc_offer', {
                fromSocketId: socket.id,
                offer,
                fromUserId: socket.data?.userId,
                fromUserName: socket.data?.userName,
            });
        });
        socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit('webrtc_answer', {
                fromSocketId: socket.id,
                answer,
                fromUserId: socket.data?.userId,
                fromUserName: socket.data?.userName,
            });
        });
        socket.on('webrtc_ice', ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit('webrtc_ice', { fromSocketId: socket.id, candidate });
        });
    });
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function handleLeave(socket, io) {
    const { roomId, userId, userName, isHost } = socket.data || {};
    if (!roomId) return;
    const state = getRoomState(roomId);

    // Remove from in-memory state first
    state.participants = state.participants.filter((p) => p.userId !== userId);
    state.activeEditors = state.activeEditors.filter((id) => id !== userId);
    state.pendingRequests = state.pendingRequests.filter((r) => r.userId !== userId);

    if (isHost) {
        // ── Host left → dismiss the entire room for everyone ──────────────
        io.to(roomId).emit('session_ended', {
            roomId,
            reason: 'Host left the session',
        });
        roomStates.delete(roomId); // clear in-memory state
        socket.leave(roomId);

        try {
            await Room.findOneAndUpdate({ roomId }, { isActive: false, participants: [] });
            await SessionLog.create({ roomId, action: 'host_left', userId, userName });
        } catch (_) { }
    } else {
        // ── Regular participant left ───────────────────────────────────────
        socket.to(roomId).emit('participant_left', {
            userId, userName, participants: state.participants,
        });
        socket.to(roomId).emit('editor_updated', { activeEditors: state.activeEditors });
        socket.leave(roomId);

        try {
            await Room.findOneAndUpdate({ roomId }, { $pull: { participants: { userId } } });
            await SessionLog.create({ roomId, action: 'participant_left', userId, userName });
        } catch (_) { }
    }
}

function isHostSocket(state, userId) {
    const p = state.participants.find((p) => p.userId === userId);
    return p?.isHost === true;
}

function getSocketByUserId(state, userId) {
    const p = state.participants.find((p) => p.userId === userId);
    return p?.socketId;
}

module.exports = initSockets;
