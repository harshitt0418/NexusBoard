import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { getRoom } from '../services/roomService';
import { v4 as uuidv4 } from 'uuid';

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
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 100%)', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 24 }}>← Back</button>

                <div className="card animate-fade-in">
                    <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
                        <h3>Join a Room</h3>
                        <p style={{ fontSize: '0.875rem', margin: '4px 0 0' }}>Enter the Room ID shared by the host</p>
                    </div>

                    <form onSubmit={submit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div className="form-group">
                            <label className="form-label">Room ID</label>
                            <input
                                className={`input ${errors.roomId ? 'input-error' : ''}`}
                                placeholder="e.g. ABCD1234"
                                value={roomId}
                                onChange={e => setRoomId(e.target.value.toUpperCase().trim())}
                                maxLength={8}
                                style={{ letterSpacing: '0.12em', fontWeight: 600, fontSize: '1.125rem' }}
                            />
                            {errors.roomId && <span className="form-error">{errors.roomId}</span>}
                        </div>

                        {/* Room preview */}
                        {roomPreview && (
                            <div style={{ background: 'var(--color-accent-soft)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: 4 }}>Room found ✓</div>
                                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{roomPreview.name}</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                    Hosted by {roomPreview.hostName} · {roomPreview.participants?.length || 0}/{roomPreview.maxParticipants} participants
                                </div>
                            </div>
                        )}

                        {!user && (
                            <div className="form-group">
                                <label className="form-label">Your Display Name</label>
                                <input
                                    className={`input ${errors.name ? 'input-error' : ''}`}
                                    placeholder="How should we call you?"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                                {errors.name && <span className="form-error">{errors.name}</span>}
                            </div>
                        )}

                        {user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
                                    {user.name[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Joining as authenticated user</div>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Join Room →'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
