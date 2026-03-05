import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { getRoom } from '../services/roomService';
import { v4 as uuidv4 } from 'uuid';
import { IconCheck, IconArrowLeft, IconArrowRight } from '../components/ui/Icons';
import { saveRecentRoom } from '../utils/recentRooms';
import '../styles/lobby.css';

export default function JoinRoomPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { user } = useAuth();
    const toast = useToast();

    const [roomId, setRoomId] = useState(params.get('id') || '');
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [roomPreview, setRoomPreview] = useState(null);

    useEffect(() => {
        if (roomId.length === 8) {
            getRoom(roomId).then(({ data }) => setRoomPreview(data.room)).catch(() => setRoomPreview(null));
        } else {
            setRoomPreview(null);
        }
    }, [roomId]);

    const validate = () => {
        const errs = {};
        if (!roomId.trim() || roomId.length < 6) errs.roomId = 'Enter a valid Room ID';
        if (!user && !name.trim()) errs.name = 'Display name is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const userId = user?._id || uuidv4();
            const userName = user?.name || name;
            localStorage.setItem('nb_user_id', userId);
            localStorage.setItem('nb_user_name', userName);
            const id = roomId.trim().toUpperCase();
            saveRecentRoom({ roomId: id, name: roomPreview?.name || id, role: 'joined', isPrivate: roomPreview?.isPrivate || false });
            navigate(`/room/${id}/lobby`, {
                state: { roomId: id, userId, userName, isHost: false }
            });
        } catch (err) {
            toast(err.response?.data?.message || 'Could not join room', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lobby-wrap">
            <div className="lobby-card animate-fade-in">
                {/* ── Left dark hero ── */}
                <div className="lobby-left">
                    <div className="lobby-left-top">
                        <div className="lobby-eyebrow">
                            <span className="lobby-eyebrow-dot" />
                            Join Session
                        </div>
                        <div>
                            <h2 className="lobby-title">Join a<br />room</h2>
                            <p className="lobby-desc" style={{ marginTop: 14 }}>
                                Enter the Room ID shared by the host to join the collaboration session.
                            </p>
                        </div>
                    </div>
                    <div className="lobby-left-bottom">
                        <button className="lobby-back-btn" onClick={() => navigate('/')}>
                            <IconArrowLeft size={15} /> Back to Home
                        </button>
                    </div>
                </div>

                {/* ── Right form ── */}
                <div className="lobby-right">
                    <div className="lobby-right-title">Enter room details</div>
                    <p className="lobby-right-sub">You'll be taken to the lobby once verified</p>

                    <form onSubmit={submit}>
                        <div className="lobby-field">
                            <label className="lobby-label">Room ID</label>
                            <input
                                className={`lobby-input${errors.roomId ? ' error' : ''}`}
                                placeholder="e.g. ABCD1234"
                                value={roomId}
                                onChange={e => setRoomId(e.target.value.toUpperCase().trim())}
                                maxLength={8}
                                style={{ letterSpacing: '0.12em', fontWeight: 600, fontSize: '1.125rem' }}
                            />
                            {errors.roomId && <span className="lobby-field-error">{errors.roomId}</span>}
                        </div>

                        {roomPreview && (
                            <div className="lobby-room-preview">
                                <div className="lobby-room-preview-badge">
                                    <IconCheck size={13} /> Room found
                                </div>
                                <div className="lobby-room-preview-name">{roomPreview.name}</div>
                                <div className="lobby-room-preview-meta">
                                    Hosted by {roomPreview.hostName} · {roomPreview.participants?.length || 0}/{roomPreview.maxParticipants} participants
                                </div>
                            </div>
                        )}

                        {!user && (
                            <div className="lobby-field">
                                <label className="lobby-label">Your Display Name</label>
                                <input
                                    className={`lobby-input${errors.name ? ' error' : ''}`}
                                    placeholder="How should we call you?"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                                {errors.name && <span className="lobby-field-error">{errors.name}</span>}
                            </div>
                        )}

                        {user && (
                            <div className="lobby-user-chip">
                                <div className="lobby-user-chip-avatar">{user.name[0].toUpperCase()}</div>
                                <div>
                                    <div className="lobby-user-chip-name">{user.name}</div>
                                    <div className="lobby-user-chip-sub">Joining as authenticated user</div>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="lobby-btn" disabled={loading}>
                            {loading
                                ? <span className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                                : <><IconArrowRight size={17} /> Join Room</>
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
