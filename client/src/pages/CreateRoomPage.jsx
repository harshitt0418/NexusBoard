import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { createRoom } from '../services/roomService';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';

const Toggle = ({ value, onChange, label, hint }) => (
    <div className="toggle-wrapper" style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: 14 }}>
        <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)' }}>{label}</div>
            {hint && <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 2 }}>{hint}</div>}
        </div>
        <div className={`toggle-track ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
            <div className="toggle-thumb" />
        </div>
    </div>
);

export default function CreateRoomPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();

    const [form, setForm] = useState({ name: '', isPrivate: false, maxParticipants: 20, autoApproveDrawing: false });
    const [guestName, setGuestName] = useState('');
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(null);
    const [copied, setCopied] = useState(false);

    const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast('Room name is required', 'error'); return; }
        if (!user && !guestName.trim()) { toast('Enter your display name', 'error'); return; }
        setLoading(true);
        try {
            const payload = {
                ...form,
                hostName: user?.name || guestName,
                guestId: user ? undefined : uuidv4(),
            };
            // Don't send any auth token when creating as guest so the route is never treated as protected
            const { data } = await createRoom(payload, user ? {} : { skipAuth: true });
            localStorage.setItem('nb_user_id', user?._id || payload.guestId);
            localStorage.setItem('nb_user_name', user?.name || guestName);
            setCreated({ ...data.room, guestId: payload.guestId });
        } catch (err) {
            const msg = err.response?.data?.message
                || (!err.response ? 'Cannot reach server. Start the backend (npm run dev in project root) and ensure client .env points to it.' : err.message || 'Failed to create room');
            toast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(created.roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast('Room ID copied!', 'success');
    };

    const goToLobby = () => {
        const roomId = created.roomId;
        const userId = user?._id || created.guestId;
        const userName = user?.name || guestName;
        sessionStorage.setItem(`nb_host_${roomId}`, userId);
        navigate(`/room/${roomId}/lobby`, {
            state: { roomId, userId, userName, isHost: true }
        });
    };

    if (created) {
        const joinUrl = `${window.location.origin}/join?id=${created.roomId}`;
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 100%)', padding: 24 }}>
                <div style={{ width: '100%', maxWidth: 460 }} className="animate-scale-in">
                    <div className="card card-padded">
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--color-success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '1.75rem' }}>✓</div>
                            <h3>Room Created!</h3>
                            <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>{created.name}</p>
                        </div>

                        {/* Room ID */}
                        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 20 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Room ID</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--color-text)' }}>{created.roomId}</span>
                                <button className="btn btn-secondary btn-sm" onClick={copyRoomId}>
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                            <div style={{ padding: 16, background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                <QRCodeSVG value={joinUrl} size={140} level="M" />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button className="btn btn-primary" onClick={goToLobby}>Enter Lobby →</button>
                            <button className="btn btn-secondary" onClick={() => setCreated(null)}>Create Another</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 100%)', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 460 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>← Back</button>

                <div className="card animate-fade-in">
                    <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
                        <h3>Create a Room</h3>
                        <p style={{ fontSize: '0.875rem', margin: '4px 0 0' }}>Set up your collaboration space</p>
                    </div>

                    <form onSubmit={submit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {!user && (
                            <div className="form-group">
                                <label className="form-label">Your Display Name</label>
                                <input className="input" placeholder="Enter your name" value={guestName} onChange={e => setGuestName(e.target.value)} />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Room Name</label>
                            <input className="input" placeholder="Design Review, Sprint Planning…" value={form.name} onChange={e => update('name', e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Max Participants</label>
                            <input className="input" type="number" min={2} max={50} value={form.maxParticipants} onChange={e => update('maxParticipants', Number(e.target.value))} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0 16px', overflow: 'hidden' }}>
                            <Toggle value={form.isPrivate} onChange={v => update('isPrivate', v)} label="Private Room" hint="Only people with the Room ID can join" />
                            <Toggle value={form.autoApproveDrawing} onChange={v => update('autoApproveDrawing', v)} label="Auto-approve Drawing" hint="All participants can draw without approval" />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Generate Room → '}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
