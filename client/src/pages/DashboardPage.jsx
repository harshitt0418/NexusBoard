import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useState, useEffect } from 'react';
import { IconLogo } from '../components/ui/Icons';
import { getRecentRooms } from '../utils/recentRooms';
import '../styles/dashboard.css';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [recentRooms, setRecentRooms] = useState([]);

    useEffect(() => {
        setRecentRooms(getRecentRooms());
    }, []);

    const handleLogout = () => {
        logout();
        toast('Signed out successfully', 'info');
        navigate('/');
    };

    const avatarInitials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    const avatarColor = user?.name
        ? `hsl(${user.name.charCodeAt(0) * 37 % 360}, 60%, 50%)`
        : '#1a1a2e';

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const formatTime = (ts) => {
        const diff = (Date.now() - ts) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const hostedCount = recentRooms.filter(r => r.role === 'host').length;
    const joinedCount = recentRooms.filter(r => r.role === 'joined').length;

    return (
        <div className="db-root">
            {/* Animated background */}
            <div className="db-bg" aria-hidden="true">
                <div className="db-blob db-blob-1" />
                <div className="db-blob db-blob-2" />
                <div className="db-blob db-blob-3" />
            </div>
            <div className="db-noise" aria-hidden="true" />

            {/* Navigation */}
            <nav className="db-nav" aria-label="Dashboard navigation">
                <div
                    className="db-nav-brand"
                    onClick={() => navigate('/')}
                    role="button"
                    tabIndex={0}
                    aria-label="Go to home"
                    onKeyDown={e => e.key === 'Enter' && navigate('/')}
                >
                    <div className="db-nav-logo" aria-hidden="true">
                        <IconLogo size={18} />
                    </div>
                    <span className="db-nav-logo-text">NexusBoard</span>
                </div>

                <div className="db-nav-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            className="db-avatar"
                            style={{ background: avatarColor }}
                            title={user?.name}
                            aria-label={`Avatar for ${user?.name}`}
                        >
                            {avatarInitials}
                        </div>
                        <span className="db-nav-name">{user?.name}</span>
                    </div>
                    <button
                        className="db-btn-signout"
                        onClick={() => setShowLogoutModal(true)}
                        aria-label="Sign out of NexusBoard"
                    >
                        Sign out
                    </button>
                </div>
            </nav>

            {/* Main */}
            <main className="db-main">

                {/* Hero */}
                <div className="db-hero">
                    <p className="db-greeting">{greeting()}</p>
                    <h1 className="db-hero-title">{user?.name?.split(' ')[0] || 'Welcome'} 👋</h1>
                    <p className="db-hero-sub">What would you like to do today?</p>
                </div>

                {/* Stats strip */}
                <div className="db-stats" aria-label="Your activity">
                    <div className="db-stat-card">
                        <div className="db-stat-value">{hostedCount}</div>
                        <div className="db-stat-label">Rooms Hosted</div>
                    </div>
                    <div className="db-stat-card">
                        <div className="db-stat-value">{joinedCount}</div>
                        <div className="db-stat-label">Sessions Joined</div>
                    </div>
                    <div className="db-stat-card">
                        <div className="db-stat-value">{recentRooms.length}</div>
                        <div className="db-stat-label">Total Sessions</div>
                    </div>
                </div>

                {/* Quick actions */}
                <h2 className="db-section-title">Quick actions</h2>
                <div className="db-actions">
                    <button
                        className="db-action-card db-action-primary"
                        onClick={() => navigate('/create')}
                        aria-label="Create a new collaboration room"
                        title="Create a new room"
                    >
                        <div className="db-action-icon" aria-hidden="true">🚀</div>
                        <h3 className="db-action-title">Create a Room</h3>
                        <p className="db-action-desc">Start a new session and invite your team to collaborate in real time.</p>
                        <span className="db-action-arrow" aria-hidden="true">↗</span>
                    </button>

                    <button
                        className="db-action-card db-action-secondary"
                        onClick={() => navigate('/join')}
                        aria-label="Join an existing collaboration room"
                        title="Join a room"
                    >
                        <div className="db-action-icon" aria-hidden="true">🔗</div>
                        <h3 className="db-action-title">Join a Room</h3>
                        <p className="db-action-desc">Enter a room code to join an existing collaboration session.</p>
                        <span className="db-action-arrow" aria-hidden="true">↗</span>
                    </button>
                </div>

                {/* Recent rooms */}
                <h2 className="db-section-title">Recent rooms</h2>
                {recentRooms.length === 0 ? (
                    <div className="db-empty">
                        <div className="db-empty-icon" aria-hidden="true">🗂️</div>
                        <p className="db-empty-text">No recent rooms yet. Create or join one to get started.</p>
                    </div>
                ) : (
                    <div className="db-recent-list" role="list">
                        {recentRooms.map(room => {
                            const isLocked = room.role === 'host' || room.isPrivate;
                            const lockReason = room.role === 'host'
                                ? 'Start this room from Create a Room'
                                : 'Private — cannot rejoin directly';
                            return (
                            <div
                                key={room.roomId}
                                className={`db-recent-item${isLocked ? ' db-recent-item--locked' : ''}`}
                                role="listitem"
                                onClick={!isLocked ? () => navigate(`/join?id=${room.roomId}`) : undefined}
                                tabIndex={isLocked ? -1 : 0}
                                aria-label={isLocked ? lockReason : `Rejoin ${room.name} (${room.roomId})`}
                                aria-disabled={isLocked}
                                onKeyDown={!isLocked ? (e => e.key === 'Enter' && navigate(`/join?id=${room.roomId}`)) : undefined}
                                title={isLocked ? lockReason : `Rejoin ${room.name}`}
                            >
                                <div className={`db-recent-dot ${room.role}`} aria-hidden="true" />
                                <div className="db-recent-info">
                                    <div className="db-recent-name">{room.name}</div>
                                    <div className="db-recent-meta">{room.roomId} · {formatTime(room.ts)}</div>
                                </div>
                                <span className={`db-recent-badge ${room.role}`}>
                                    {room.role === 'host' ? 'Host' : room.isPrivate ? '🔒 Private' : 'Joined'}
                                </span>
                            </div>
                            );
                        })}
                    </div>
                )}

            </main>

            {/* Logout confirmation modal */}
            {showLogoutModal && (
                <div
                    className="db-modal-overlay"
                    onClick={() => setShowLogoutModal(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="db-modal-title"
                >
                    <div className="db-modal" onClick={e => e.stopPropagation()}>
                        <div className="db-modal-icon" aria-hidden="true">👋</div>
                        <h3 className="db-modal-title" id="db-modal-title">Sign out?</h3>
                        <p className="db-modal-desc">Are you sure you want to sign out of NexusBoard?</p>
                        <div className="db-modal-actions">
                            <button
                                className="db-modal-cancel"
                                onClick={() => setShowLogoutModal(false)}
                                aria-label="Cancel sign out"
                            >
                                Cancel
                            </button>
                            <button
                                className="db-modal-confirm"
                                onClick={handleLogout}
                                aria-label="Confirm sign out"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
