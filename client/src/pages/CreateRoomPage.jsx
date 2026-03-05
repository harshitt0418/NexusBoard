import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderCanvas, destroyCanvas } from '../components/ui/canvas';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { createRoom } from '../services/roomService';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { IconCheck, IconCopy, IconArrowLeft, IconArrowRight } from '../components/ui/Icons';
import { saveRecentRoom } from '../utils/recentRooms';
import '../styles/lobby.css';

const Toggle = ({ value, onChange, label, hint }) => (
    <div className="lobby-toggle-row">
        <div>
            <div className="lobby-toggle-label-text">{label}</div>
            {hint && <div className="lobby-toggle-hint-text">{hint}</div>}
        </div>
        <div className={`lobby-toggle-track${value ? ' on' : ''}`} onClick={() => onChange(!value)}>
            <div className="lobby-toggle-thumb" />
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

    useEffect(() => { renderCanvas(); return () => destroyCanvas(); }, []);

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
        saveRecentRoom({ roomId, name: created.name, role: 'host' });
        navigate(`/room/${roomId}/lobby`, {
            state: { roomId, userId, userName, isHost: true }
        });
    };

    if (created) {
        const joinUrl = `${window.location.origin}/join?id=${created.roomId}`;
        return (
            <div className="lobby-wrap">
                <canvas id="doodle-canvas" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
                <div className="lobby-card animate-scale-in">
                    {/* ── Left hero ── */}
                    <div className="lobby-left">
                        <div className="lobby-left-top">
                            <div className="lobby-eyebrow">
                                <span className="lobby-eyebrow-dot" />
                                Room Ready
                            </div>
                            <div>
                                <h2 className="lobby-title">Your room<br />is live</h2>
                                <p className="lobby-desc" style={{ marginTop: 14 }}>
                                    Share the Room ID or QR code with your team to get everyone in.
                                </p>
                            </div>
                            <div className="lobby-room-id-box">
                                <div className="lobby-room-id-label">Room ID</div>
                                <div className="lobby-room-id-value">{created.roomId}</div>
                            </div>
                        </div>
                        <div className="lobby-left-bottom">
                            <button className="lobby-back-btn" onClick={() => setCreated(null)}>
                                <IconArrowLeft size={15} /> Create another room
                            </button>
                        </div>
                    </div>

                    {/* ── Right panel ── */}
                    <div className="lobby-right">
                        <div className="lobby-success-icon">
                            <IconCheck size={26} />
                        </div>
                        <div className="lobby-right-title">{created.name}</div>
                        <p className="lobby-right-sub">Invite via Room ID or share the QR code below</p>

                        <div className="lobby-copy-row">
                            <span className="lobby-copy-id">{created.roomId}</span>
                            <button className="lobby-copy-btn" onClick={copyRoomId}>
                                {copied ? <><IconCheck size={13} /> Copied</> : <><IconCopy size={13} /> Copy</>}
                            </button>
                        </div>

                        <div className="lobby-qr-wrap">
                            <QRCodeSVG value={joinUrl} size={130} level="M" />
                        </div>

                        <button className="lobby-btn" onClick={goToLobby}>
                            <IconArrowRight size={17} /> Enter Lobby
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="lobby-wrap">
            <canvas id="doodle-canvas" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
            <div className="lobby-card animate-fade-in">
                {/* ── Left dark hero ── */}
                <div className="lobby-left">
                    <div className="lobby-left-top">
                        <div className="lobby-eyebrow">
                            <span className="lobby-eyebrow-dot" />
                            New Session
                        </div>
                        <div>
                            <h2 className="lobby-title">Create a<br />room</h2>
                            <p className="lobby-desc" style={{ marginTop: 14 }}>
                                Set up your collaboration space, configure permissions, and invite your team in seconds.
                            </p>
                        </div>
                    </div>
                    <div className="lobby-left-bottom">
                        <button className="lobby-back-btn" onClick={() => navigate(-1)}>
                            <IconArrowLeft size={15} /> Back
                        </button>
                    </div>
                </div>

                {/* ── Right form ── */}
                <div className="lobby-right">
                    <div className="lobby-right-title">Room details</div>
                    <p className="lobby-right-sub">Fill in the details to generate your room</p>

                    <form onSubmit={submit}>
                        {!user && (
                            <div className="lobby-field">
                                <label className="lobby-label">Your Display Name</label>
                                <input
                                    className="lobby-input"
                                    placeholder="Enter your name"
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="lobby-field">
                            <label className="lobby-label">Room Name</label>
                            <input
                                className="lobby-input"
                                placeholder="Design Review, Sprint Planning…"
                                value={form.name}
                                onChange={e => update('name', e.target.value)}
                            />
                        </div>

                        <div className="lobby-field">
                            <label className="lobby-label">Max Participants</label>
                            <input
                                className="lobby-input"
                                type="number"
                                min={2}
                                max={50}
                                value={form.maxParticipants}
                                onChange={e => update('maxParticipants', Number(e.target.value))}
                            />
                        </div>

                        <div className="lobby-toggles">
                            <Toggle value={form.isPrivate} onChange={v => update('isPrivate', v)} label="Private Room" hint="Only people with the Room ID can join" />
                            <Toggle value={form.autoApproveDrawing} onChange={v => update('autoApproveDrawing', v)} label="Auto-approve Drawing" hint="All participants can draw without approval" />
                        </div>

                        <button type="submit" className="lobby-btn" disabled={loading}>
                            {loading
                                ? <span className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                                : <><IconArrowRight size={17} /> Generate Room</>
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
