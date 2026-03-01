import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../components/ui/Toast';

const Avatar = ({ name, isHost, isEditor }) => {
    const initial = name?.[0]?.toUpperCase() || '?';
    const color = isHost ? 'var(--color-accent)' : isEditor ? 'var(--color-success)' : 'var(--color-muted)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>{initial}</div>
            <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{name}</div>
                <div style={{ fontSize: '0.75rem', color: isHost ? 'var(--color-accent)' : isEditor ? 'var(--color-success)' : 'var(--color-muted)' }}>
                    {isHost ? '👑 Host' : isEditor ? '✏︎ Editor' : 'Viewer'}
                </div>
            </div>
        </div>
    );
};

export default function LobbyPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { roomId } = useParams();
    const { socket } = useSocket();
    const { initRoom, participants, setParticipants, clearRoom } = useRoom();
    const toast = useToast();
    const joinedRef = useRef(false);
    const joinedSuccessRef = useRef(false);
    const retryTimerRef = useRef(null);
    const retryJoinTimerRef = useRef(null);
    const [hostNotPresent, setHostNotPresent] = useState(false);
    // 'pending' | 'host_not_present' | 'joined' — only show lobby UI after 'joined' (room_state received)
    const [joinStatus, setJoinStatus] = useState('pending');

    const fromState = location.state || {};
    const userId = fromState.userId || localStorage.getItem('nb_user_id');
    const userName = fromState.userName || localStorage.getItem('nb_user_name');
    const isHostFromState = fromState.isHost === true;
    const storedHostId = roomId ? sessionStorage.getItem(`nb_host_${roomId}`) : null;
    const isHost = isHostFromState || (storedHostId != null && storedHostId === userId);

    const normalizedRoomId = (roomId || '').toString().trim().toUpperCase();
    const payload = { roomId: normalizedRoomId || roomId, userId, userName, isHost };

    const emitJoinRoom = () => {
        if (!socket || !roomId || !userId || !userName) return;
        if (joinedRef.current) return;
        joinedRef.current = true;
        socket.emit('join_room', payload);
    };

    useEffect(() => {
        if (!socket) return;
        joinedRef.current = false;
        joinedSuccessRef.current = false;

        // Register all response handlers BEFORE emitting join_room
        socket.on('host_not_present', () => {
            setJoinStatus('host_not_present');
            setHostNotPresent(true);
            joinedRef.current = false;
            retryTimerRef.current = setInterval(() => {
                socket.emit('join_room', payload);
            }, 5000);
        });

        socket.on('room_state', (state) => {
            joinedSuccessRef.current = true;
            setJoinStatus('joined');
            joinedRef.current = true;
            setHostNotPresent(false);
            if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
            if (retryJoinTimerRef.current) { clearInterval(retryJoinTimerRef.current); retryJoinTimerRef.current = null; }
            initRoom(state, userId, userName);
        });

        socket.on('error', ({ message } = {}) => {
            joinedRef.current = false;
            setJoinStatus('host_not_present');
            toast(message || 'Could not join room', 'error');
        });

        socket.on('participant_joined', ({ participants: ps }) => {
            setParticipants(ps);
            toast(`Someone joined the room`, 'info');
        });

        socket.on('participant_left', ({ userName: n, participants: ps }) => {
            setParticipants(ps);
            toast(`${n} left`, 'info');
        });

        socket.on('session_started', () => {
            navigate(`/room/${roomId}`, { state: { userId, userName, isHost } });
        });

        socket.on('session_ended', ({ reason } = {}) => {
            clearRoom();
            toast(reason || 'Host ended the session', 'error');
            navigate('/');
        });

        // Emit when connected: register connect FIRST so we never miss the event, then emit if already connected
        const onConnect = () => {
            joinedRef.current = false;
            emitJoinRoom();
        };
        socket.once('connect', onConnect);
        if (socket.connected) {
            onConnect();
        }

        // Retry join every 2s until we get room_state (for both host and participant; recovers from lost first emit)
        retryJoinTimerRef.current = setInterval(() => {
            if (!joinedSuccessRef.current && socket.connected) {
                joinedRef.current = false;
                emitJoinRoom();
            }
        }, 2000);

        return () => {
            if (retryTimerRef.current) clearInterval(retryTimerRef.current);
            if (retryJoinTimerRef.current) clearInterval(retryJoinTimerRef.current);
            retryJoinTimerRef.current = null;
            socket.off('host_not_present');
            socket.off('room_state');
            socket.off('error');
            socket.off('participant_joined');
            socket.off('participant_left');
            socket.off('session_started');
            socket.off('session_ended');
            socket.off('connect', onConnect);
        };
    }, [socket, roomId, userId, userName, isHost]);

    const startSession = () => {
        // Emit to server — the server will broadcast 'session_started' back to everyone
        // including the host, so navigation happens via the socket.on('session_started') handler
        socket.emit('session_start', { roomId });
    };

    const leaveRoom = () => {
        if (roomId) sessionStorage.removeItem(`nb_host_${roomId}`);
        socket.emit('leave_room');
        clearRoom();
        navigate('/');
    };

    // ── Pending: participants see "Connecting..."; host sees lobby immediately so they're never stuck ──
    if (joinStatus === 'pending' && !isHost) {
        return (
            <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div className="card card-padded animate-fade-in" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16, animation: 'spin 3s linear infinite' }}>⏳</div>
                    <h3 style={{ marginBottom: 8 }}>Connecting to room…</h3>
                    <p style={{ fontSize: '0.9375rem', marginBottom: 24 }}>
                        Checking if the host is in the lobby…
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Room: <strong>{roomId}</strong></p>
                </div>
            </div>
        );
    }

    // ── Host-not-present: only show lobby to participant after host has joined ──
    if (hostNotPresent) {
        return (
            <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div className="card card-padded animate-fade-in" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16, animation: 'spin 3s linear infinite' }}>⏳</div>
                    <h3 style={{ marginBottom: 8 }}>Host hasn't joined yet</h3>
                    <p style={{ fontSize: '0.9375rem', marginBottom: 24 }}>
                        The host needs to open the room before you can join. Retrying automatically every 5 seconds…
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }}
                            onClick={() => socket.emit('join_room', { roomId, userId, userName, isHost })}>
                            Retry Now
                        </button>
                        <button className="btn btn-secondary" onClick={() => { clearRoom(); navigate('/'); }}>
                            Leave
                        </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: 16 }}>Room: <strong>{roomId}</strong></p>
                </div>
            </div>
        );
    }
    // ── Joined: host is present, show full lobby ──────────────────────────────

    return (
        <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 520 }}>
                {/* Header card */}
                <div className="card card-padded animate-fade-in" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 0 3px var(--color-success-soft)' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>Waiting to start</span>
                            </div>
                            <h3 style={{ marginBottom: 4 }}>Room Lobby</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <code style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-accent)' }}>{roomId}</code>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                    onClick={() => { navigator.clipboard.writeText(roomId); toast('Copied!', 'success'); }}>Copy</button>
                            </div>
                        </div>
                        {isHost && <span className="badge badge-blue">Host</span>}
                    </div>

                    {isHost ? (
                        <div style={{ padding: '12px 16px', background: 'var(--color-accent-soft)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--color-accent)' }}>
                            {joinStatus === 'pending' ? '⏳ Connecting to room…' : '💡 Share the Room ID with participants, then click "Start Session" when ready.'}
                        </div>
                    ) : (
                        <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            {participants.some(p => p.isHost) ? '⏳ Waiting for the host to start the session…' : '⏳ Waiting for the host to join the lobby…'}
                        </div>
                    )}
                </div>

                {/* Participants */}
                <div className="card animate-fade-in stagger-1" style={{ marginBottom: 16 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4>Participants</h4>
                        <span className="badge badge-blue">{participants.length}</span>
                    </div>
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                        {participants.map(p => (
                            <Avatar key={p.userId} name={p.userName} isHost={p.isHost} isEditor={false} />
                        ))}
                        {participants.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                                {isHost ? 'Waiting for participants…' : 'Waiting for the host to join…'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="animate-fade-in stagger-2" style={{ display: 'flex', gap: 10 }}>
                    {isHost && (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={startSession}>
                            ▶ Start Session
                        </button>
                    )}
                    <button className="btn btn-secondary" style={{ flex: isHost ? '0 0 auto' : 1 }} onClick={leaveRoom}>
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
}
