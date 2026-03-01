import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import SimplePeer from 'simple-peer';
import { useSocket } from '../context/SocketContext';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../components/ui/Toast';
import WhiteboardCanvas from '../components/canvas/WhiteboardCanvas';
import ToolPalette from '../components/canvas/ToolPalette';
import ChatPanel from '../components/chat/ChatPanel';
import ParticipantsPanel from '../components/participants/ParticipantsPanel';
import VideoStrip from '../components/video/VideoStrip';

export default function RoomPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { roomId } = useParams();
    const { socket } = useSocket();
    const { initRoom, myRole, myUserId, myName, updateEditors, clearRoom, setParticipants, boardLocked } = useRoom();
    const toast = useToast();

    const { userId, userName, isHost } = location.state || {
        userId: localStorage.getItem('nb_user_id'),
        userName: localStorage.getItem('nb_user_name'),
        isHost: false,
    };

    // Canvas state
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#0F172A');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const undoRef = useRef(null);

    // UI state
    const [rightPanel, setRightPanel] = useState('participants'); // 'participants' | 'chat' | null
    const [focusMode, setFocusMode] = useState(false);

    // WebRTC state — use ref for localStream so socket handlers never have stale closures
    const [localStream, setLocalStream] = useState(null);
    const localStreamRef = useRef(null);
    const [peers, setPeers] = useState([]);
    const peersRef = useRef({});
    const joinedRef = useRef(false);
    const pendingOffersRef = useRef([]);
    const pendingPeerCreationsRef = useRef([]);

    const normalizedRoomId = (roomId || '').toString().trim().toUpperCase();

    // ── Socket join ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || joinedRef.current || !normalizedRoomId) return;
        joinedRef.current = true;

        socket.emit('join_room', { roomId: normalizedRoomId, userId, userName, isHost });

        socket.on('room_state', (state) => {
            initRoom(state, userId, userName);
        });

        socket.on('participant_joined', ({ participants: ps, socketId: sid, userId: uid, userName: uname }) => {
            setParticipants(ps);
            if (uid === userId || !sid) return;
            const stream = localStreamRef.current;
            if (stream) {
                createPeer(sid, uid, uname || 'Participant', stream);
            } else {
                pendingPeerCreationsRef.current.push({ targetSocketId: sid, targetUserId: uid, targetName: uname || 'Participant' });
            }
        });

        socket.on('participant_left', ({ userId: uid, participants: ps }) => {
            setParticipants(ps);
            if (peersRef.current[uid]) {
                peersRef.current[uid].peer.destroy();
                delete peersRef.current[uid];
                setPeers(p => p.filter(x => x.userId !== uid));
            }
        });

        socket.on('editor_updated', ({ activeEditors, pendingRequests }) => {
            updateEditors(activeEditors, pendingRequests);
        });

        socket.on('board_locked', ({ locked }) => {
            toast(locked ? '🔒 Board locked by host' : '🔓 Board unlocked', 'info');
        });

        socket.on('draw_access_approved', ({ userId: uid }) => {
            if (uid === userId) toast('✏︎ Drawing access granted!', 'success');
        });
        socket.on('draw_access_rejected', ({ userId: uid }) => {
            if (uid === userId) toast('Drawing request denied', 'error');
        });
        socket.on('draw_access_revoked', ({ userId: uid }) => {
            if (uid === userId) toast('✏︎ Drawing access revoked', 'error');
        });
        socket.on('draw_request_sent', () => {
            toast('Draw request sent to host', 'info');
        });

        socket.on('session_ended', ({ reason } = {}) => {
            clearRoom();
            Object.values(peersRef.current).forEach(e => e.peer.destroy());
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            toast(reason || 'Host ended the session', 'error');
            navigate('/');
        });

        // WebRTC signaling — answer when we have stream; queue offer if stream not ready yet
        socket.on('webrtc_offer', ({ fromSocketId, offer, fromUserId, fromUserName }) => {
            const stream = localStreamRef.current;
            if (stream) {
                answerPeer(fromSocketId, offer, stream, fromUserId, fromUserName);
            } else {
                pendingOffersRef.current.push({ fromSocketId, offer, fromUserId, fromUserName });
            }
        });
        socket.on('webrtc_answer', ({ fromSocketId, answer }) => {
            const entry = Object.values(peersRef.current).find(e => e.socketId === fromSocketId);
            if (entry) entry.peer.signal(answer);
        });
        socket.on('webrtc_ice', ({ fromSocketId, candidate }) => {
            const entry = Object.values(peersRef.current).find(e => e.socketId === fromSocketId);
            if (entry) entry.peer.signal(candidate);
        });

        return () => {
            joinedRef.current = false;
            socket.off('room_state'); socket.off('participant_joined'); socket.off('participant_left');
            socket.off('editor_updated'); socket.off('board_locked');
            socket.off('draw_access_approved'); socket.off('draw_access_rejected');
            socket.off('draw_access_revoked'); socket.off('draw_request_sent');
            socket.off('session_ended');
            socket.off('webrtc_offer'); socket.off('webrtc_answer'); socket.off('webrtc_ice');
        };
    }, [socket, normalizedRoomId]);

    // ── WebRTC setup — get camera/mic, then process any queued offers
    useEffect(() => {
        let cancelled = false;
        const constraints = { video: true, audio: true };

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast('Camera and microphone are not supported in this browser.', 'error');
            return;
        }

        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                if (!stream || stream.getTracks().length === 0) {
                    if (stream) stream.getTracks().forEach((t) => t.stop());
                    toast('Could not get camera or microphone. Please allow access and refresh.', 'error');
                    return;
                }
                localStreamRef.current = stream;
                setLocalStream(stream);
                const pendingOffers = pendingOffersRef.current.splice(0);
                pendingOffers.forEach(({ fromSocketId, offer, fromUserId, fromUserName }) =>
                    answerPeer(fromSocketId, offer, stream, fromUserId, fromUserName));
                const pendingCreations = pendingPeerCreationsRef.current.splice(0);
                pendingCreations.forEach(({ targetSocketId, targetUserId, targetName }) =>
                    createPeer(targetSocketId, targetUserId, targetName, stream));
            })
            .catch((err) => {
                if (cancelled) return;
                console.warn('getUserMedia failed:', err);
                localStreamRef.current = null;
                setLocalStream(null);
                toast('Camera and microphone are needed. Please allow access and refresh.', 'error');
            });

        return () => {
            cancelled = true;
            const s = localStreamRef.current;
            if (s) {
                s.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
            }
        };
    }, []);

    const ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ];

    const createPeer = useCallback((targetSocketId, targetUserId, targetName, stream) => {
        if (peersRef.current[targetUserId]) return;
        const pc = new SimplePeer({
            initiator: true,
            stream: stream || undefined,
            trickle: true,
            config: { iceServers: ICE_SERVERS },
        });
        pc.on('signal', (data) => {
            if (!socket) return;
            if (data.candidate) socket.emit('webrtc_ice', { targetSocketId, candidate: data });
            else if (data.type === 'offer') socket.emit('webrtc_offer', { targetSocketId, offer: data });
        });
        pc.on('stream', remoteStream => addPeerStream(targetUserId, targetName, remoteStream));
        pc.on('error', (err) => {
            if (err.message?.includes('Close called') || err.message?.includes('Abort')) return;
            if (err.message?.includes('Connection failed')) toast('Video connection failed. Check that both sides allowed camera/mic and try again.', 'error');
            console.warn('Peer error (initiator):', err.message);
        });
        pc.on('close', () => { delete peersRef.current[targetUserId]; setPeers(p => p.filter(x => x.userId !== targetUserId)); });
        peersRef.current[targetUserId] = { peer: pc, socketId: targetSocketId };
    }, [socket]);

    const answerPeer = useCallback((fromSocketId, offer, stream, fromUserId, fromUserName) => {
        const remoteUserId = fromUserId || fromSocketId;
        const remoteName = fromUserName || 'Participant';
        if (peersRef.current[remoteUserId]) {
            peersRef.current[remoteUserId].peer.signal(offer);
            return;
        }
        const pc = new SimplePeer({
            initiator: false,
            stream: stream || undefined,
            trickle: true,
            config: { iceServers: ICE_SERVERS },
        });
        pc.on('signal', (data) => {
            if (!socket) return;
            if (data.candidate) socket.emit('webrtc_ice', { targetSocketId: fromSocketId, candidate: data });
            else if (data.type === 'answer') socket.emit('webrtc_answer', { targetSocketId: fromSocketId, answer: data });
        });
        pc.on('stream', remoteStream => addPeerStream(remoteUserId, remoteName, remoteStream));
        pc.on('error', (err) => {
            if (err.message?.includes('Close called') || err.message?.includes('Abort')) return;
            if (err.message?.includes('Connection failed')) toast('Video connection failed. Check that both sides allowed camera/mic and try again.', 'error');
            console.warn('Peer error (answerer):', err.message);
        });
        pc.on('close', () => { delete peersRef.current[remoteUserId]; setPeers(p => p.filter(x => x.userId !== remoteUserId)); });
        pc.signal(offer);
        peersRef.current[remoteUserId] = { peer: pc, socketId: fromSocketId };
    }, [socket]);

    const addPeerStream = (id, name, stream) => {
        setPeers(prev => {
            const existing = prev.find(p => p.userId === id);
            if (existing) return prev.map(p => p.userId === id ? { ...p, stream } : p);
            return [...prev, { userId: id, name, stream }];
        });
    };

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') undoRef.current?.();
            if (e.key === 'Escape') setFocusMode(false);
            if (e.key === 'f' && !e.ctrlKey) setFocusMode(m => !m);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const leaveRoom = () => {
        socket?.emit('leave_room');
        clearRoom();
        Object.values(peersRef.current).forEach(e => e.peer.destroy());
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        navigate('/');
    };

    const clearBoard = () => {
        socket?.emit('board_clear');
    };

    const togglePanel = (panel) => {
        setRightPanel(prev => prev === panel ? null : panel);
    };

    return (
        <div className={`room-layout ${focusMode ? 'focus-mode' : ''}`}>
            {/* ── HEADER ────────────────────────────────────────────────────────── */}
            <header style={{
                gridArea: 'header',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 16px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
                zIndex: 100,
            }}>
                {/* Left: logo + room name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>⬡</span>
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.2 }}>NexusBoard</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', lineHeight: 1. }}>
                            <code style={{ letterSpacing: '0.08em' }}>{roomId}</code>
                            {myRole === 'host' && <span className="badge badge-blue" style={{ marginLeft: 6, padding: '1px 7px', fontSize: '0.65rem' }}>Host</span>}
                            {myRole === 'editor' && <span className="badge badge-green" style={{ marginLeft: 6, padding: '1px 7px', fontSize: '0.65rem' }}>Editor</span>}
                            {boardLocked && <span className="badge badge-red" style={{ marginLeft: 6, padding: '1px 7px', fontSize: '0.65rem' }}>🔒 Locked</span>}
                        </div>
                    </div>
                </div>

                {/* Right: header actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        className={`btn btn-ghost btn-sm ${focusMode ? 'active' : ''}`}
                        title="Focus mode (F)"
                        onClick={() => setFocusMode(m => !m)}
                        style={{ fontSize: '0.8rem' }}>
                        {focusMode ? '⊞ Exit Focus' : '⊡ Focus'}
                    </button>
                    <button
                        className={`btn btn-secondary btn-sm ${rightPanel === 'participants' ? 'active' : ''}`}
                        onClick={() => togglePanel('participants')}>
                        👥 People
                    </button>
                    <button
                        className={`btn btn-secondary btn-sm ${rightPanel === 'chat' ? 'active' : ''}`}
                        onClick={() => togglePanel('chat')}>
                        💬 Chat
                    </button>
                    <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />
                    <button className="btn btn-danger btn-sm" onClick={leaveRoom}>Leave</button>
                </div>
            </header>

            {/* ── TOOL PALETTE ──────────────────────────────────────────────────── */}
            <ToolPalette
                tool={tool} setTool={setTool}
                color={color} setColor={setColor}
                strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                onUndo={() => undoRef.current?.()}
                onClear={clearBoard}
                canClear={myRole === 'host'}
            />

            {/* ── CANVAS ────────────────────────────────────────────────────────── */}
            <div style={{ gridArea: 'canvas', position: 'relative', overflow: 'hidden' }}>
                <WhiteboardCanvas
                    tool={tool} color={color} strokeWidth={strokeWidth}
                    onUndoRef={undoRef}
                />
            </div>

            {/* ── VIDEO STRIP ───────────────────────────────────────────────────── */}
            <VideoStrip localStream={localStream} peers={peers} />

            {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
            {rightPanel === 'participants' && (
                <ParticipantsPanel isOpen={true} onClose={() => setRightPanel(null)} />
            )}
            {rightPanel === 'chat' && (
                <ChatPanel isOpen={true} onClose={() => setRightPanel(null)} />
            )}

            {/* ── MOBILE BOTTOM FAB ─────────────────────────────────────────────── */}
            <div style={{
                display: 'none',
                position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
                boxShadow: 'var(--shadow-float)', border: '1px solid var(--color-border)',
                padding: '8px 16px', gap: 16, zIndex: 300,
                '@media(maxWidth:767px)': { display: 'flex' },
            }}
                className="mobile-fab">
                <button className="btn-icon" style={{ flexDirection: 'column', gap: 2, height: 'auto', padding: '6px 10px' }} onClick={() => togglePanel('participants')}>
                    <span style={{ fontSize: '1.1rem' }}>👥</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>People</span>
                </button>
                <button className="btn-icon" style={{ flexDirection: 'column', gap: 2, height: 'auto', padding: '6px 10px' }} onClick={() => togglePanel('chat')}>
                    <span style={{ fontSize: '1.1rem' }}>💬</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>Chat</span>
                </button>
                <button className="btn-icon" style={{ flexDirection: 'column', gap: 2, height: 'auto', padding: '6px 10px' }} onClick={leaveRoom}>
                    <span style={{ fontSize: '1.1rem' }}>🚪</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-danger)' }}>Leave</span>
                </button>
            </div>
        </div>
    );
}
