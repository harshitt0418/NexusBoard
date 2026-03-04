import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { renderCanvas, destroyCanvas } from '../components/ui/canvas';
import { useSocket } from '../context/SocketContext';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../components/ui/Toast';
import { IconCrown, IconPen, IconLoader, IconLightbulb, IconPlay, IconArrowLeft } from '../components/ui/Icons';
import '../styles/lobby.css';

const Avatar = ({ name, isHost, isEditor }) => {
    const initial = name?.[0]?.toUpperCase() || '?';
    return (
        <div className="lobby-participant-item">
            <div className={`lobby-participant-avatar${isHost ? ' host-avatar' : ''}`}>{initial}</div>
            <div>
                <div className="lobby-participant-name">{name}</div>
                <div className={`lobby-participant-role${isHost ? ' is-host-role' : ''}`}>
                    {isHost ? <><IconCrown size={11} /> Host</> : isEditor ? <><IconPen size={11} /> Editor</> : 'Viewer'}
                </div>
            </div>
        </div>
    );
};

export default function LobbyPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { roomId } = useParams();
    const { socket, connected } = useSocket();
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
            // If session already started, skip lobby and go directly to room (late joiner)
            if (state.sessionStarted) {
                navigate(`/room/${roomId}`, { state: { userId, userName, isHost } });
            }
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

    useEffect(() => { renderCanvas(); return () => destroyCanvas(); }, []);

    // ── Pending: participants see "Connecting..."; host sees lobby immediately so they're never stuck ──
    if (joinStatus === 'pending' && !isHost) {
        return (
            <div className="lobby-centered-wrap">
                <canvas id="doodle-canvas" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
                <div className="lobby-centered-card animate-fade-in">
                    <div className="lobby-centered-spinner" style={{ animation: 'spin 2.5s linear infinite' }}>
                        <IconLoader size={26} />
                    </div>
                    <div className="lobby-centered-title">
                        {connected ? 'Joining room…' : 'Connecting to server…'}
                    </div>
                    <p className="lobby-centered-desc">
                        {connected
                            ? 'Checking if the host is in the lobby…'
                            : 'Waiting for the server to respond. If the server is on a free plan it may take up to 60 seconds to wake up.'}
                    </p>
                    <div className="lobby-room-badge">{roomId}</div>
                    {!connected && (
                        <button
                            className="lobby-btn-dark"
                            style={{ marginTop: 14 }}
                            onClick={() => socket?.connect()}
                        >
                            Retry Connection
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── Host-not-present: only show lobby to participant after host has joined ──
    if (hostNotPresent) {
        return (
            <div className="lobby-centered-wrap">
                <canvas id="doodle-canvas" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
                <div className="lobby-centered-card animate-fade-in">
                    <div className="lobby-centered-spinner" style={{ animation: 'spin 2.5s linear infinite' }}>
                        <IconLoader size={26} />
                    </div>
                    <div className="lobby-centered-title">Host hasn't joined yet</div>
                    <p className="lobby-centered-desc">
                        The host needs to open the room first. Retrying automatically every 5 seconds…
                    </p>
                    <div className="lobby-room-badge">{roomId}</div>
                    <div className="lobby-btn-row">
                        <button className="lobby-btn-dark"
                            onClick={() => socket.emit('join_room', { roomId, userId, userName, isHost })}>
                            Retry Now
                        </button>
                        <button className="lobby-btn-ghost" onClick={() => { clearRoom(); navigate('/'); }}>
                            Leave
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // ── Joined: host is present, show full lobby ──────────────────────────────

    return (
        <div className="lobby-wrap">
            <canvas id="doodle-canvas" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
            <div className="lobby-card animate-fade-in">

                {/* ── Left dark hero ── */}
                <div className="lobby-left">
                    <div className="lobby-left-top">
                        <div className="lobby-status-pill">
                            <span className="lobby-status-dot" />
                            Waiting to start
                        </div>
                        <div>
                            <div className="lobby-eyebrow" style={{ marginBottom: 10 }}>
                                <span className="lobby-eyebrow-dot" />
                                {isHost ? 'Host View' : 'Participant View'}
                            </div>
                            <h2 className="lobby-title">Room<br />Lobby</h2>
                            <p className="lobby-desc" style={{ marginTop: 12 }}>
                                {isHost
                                    ? 'Share the Room ID with participants, then start the session when ready.'
                                    : 'Waiting for the host to begin the session.'}
                            </p>
                        </div>
                        <div className="lobby-room-id-box">
                            <div className="lobby-room-id-label">Room ID</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div className="lobby-room-id-value">{roomId}</div>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(roomId); toast('Copied!', 'success'); }}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'rgba(255,255,255,0.65)', padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="lobby-left-bottom">
                        <button className="lobby-back-btn" onClick={leaveRoom}>
                            <IconArrowLeft size={15} /> Leave Room
                        </button>
                    </div>
                </div>

                {/* ── Right panel: participants + actions ── */}
                <div className="lobby-right">
                    {/* Hint banner */}
                    {isHost ? (
                        <div className="lobby-hint">
                            {joinStatus === 'pending'
                                ? <><IconLoader size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{connected ? 'Joining room…' : 'Connecting to server…'}</>
                                : <><IconLightbulb size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Share the Room ID, then click <strong>Start Session</strong> when everyone's here.</>}
                        </div>
                    ) : (
                        <div className="lobby-hint">
                            <IconLoader size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            {participants.some(p => p.isHost) ? 'Waiting for the host to start the session…' : 'Waiting for the host to join the lobby…'}
                        </div>
                    )}

                    {/* Participants */}
                    <div className="lobby-section-head">
                        <div className="lobby-section-title">Participants</div>
                        <div className="lobby-count-badge">{participants.length}</div>
                    </div>

                    <div className="lobby-participants-list" style={{ marginBottom: 24 }}>
                        {participants.map(p => (
                            <Avatar key={p.userId} name={p.userName} isHost={p.isHost} isEditor={false} />
                        ))}
                        {participants.length === 0 && (
                            <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(26,26,46,0.38)', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                                {isHost ? 'Waiting for participants to join…' : 'Waiting for the host…'}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {isHost && (
                            <button className="lobby-btn" onClick={startSession}>
                                <IconPlay size={17} /> Start Session
                            </button>
                        )}
                        {!isHost && (
                            <button className="lobby-btn-outline" onClick={leaveRoom}>
                                Leave Room
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
