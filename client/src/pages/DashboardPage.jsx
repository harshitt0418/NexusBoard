import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useState } from 'react';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

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
        : 'var(--color-accent)';

    return (
        <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 50%, #F0F5FF 100%)', position: 'relative' }}>
            {/* Nav */}
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: '1rem' }}>⬡</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>NexusBoard</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowLogoutModal(true)}>
                    Sign Out
                </button>
            </nav>

            <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

                {/* Profile card */}
                <div className="card card-padded animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
                        {avatarInitials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ marginBottom: 4 }}>{user?.name || 'Guest'}</h2>
                        <p style={{ margin: 0, fontSize: '0.9375rem' }}>{user?.email}</p>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">✦ Member</span>
                            <span className="badge badge-green">● Active</span>
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowLogoutModal(true)} style={{ flexShrink: 0 }}>
                        Sign Out
                    </button>
                </div>

                {/* Quick actions */}
                <div style={{ marginBottom: 32 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
                        Quick actions
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>

                        {/* Create room */}
                        <button
                            className="card card-padded card-hover"
                            onClick={() => navigate('/create')}
                            style={{ textAlign: 'left', border: '2px solid var(--color-accent)', background: 'var(--color-accent-soft)', cursor: 'pointer' }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🚀</div>
                            <h4 style={{ marginBottom: 6, color: 'var(--color-accent)' }}>Create a Room</h4>
                            <p style={{ fontSize: '0.875rem', margin: 0 }}>Start a new collaboration session and invite your team.</p>
                        </button>

                        {/* Join room */}
                        <button
                            className="card card-padded card-hover"
                            onClick={() => navigate('/join')}
                            style={{ textAlign: 'left', cursor: 'pointer' }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔗</div>
                            <h4 style={{ marginBottom: 6 }}>Join a Room</h4>
                            <p style={{ fontSize: '0.875rem', margin: 0 }}>Enter a room ID to join an existing session.</p>
                        </button>

                        {/* Back to home */}
                        <button
                            className="card card-padded card-hover"
                            onClick={() => navigate('/')}
                            style={{ textAlign: 'left', cursor: 'pointer' }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏠</div>
                            <h4 style={{ marginBottom: 6 }}>Home</h4>
                            <p style={{ fontSize: '0.875rem', margin: 0 }}>Return to the landing page.</p>
                        </button>
                    </div>
                </div>

                {/* Account info */}
                <div className="card card-padded animate-fade-in stagger-2">
                    <h4 style={{ marginBottom: 20 }}>Account Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {[
                            { label: 'Full Name', value: user?.name },
                            { label: 'Email Address', value: user?.email },
                            { label: 'Account ID', value: user?._id ? `${user._id.toString().slice(0, 8)}...` : '—' },
                        ].map((row, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 2 ? '1px solid var(--color-border-light)' : 'none' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)', fontWeight: 500 }}>{row.label}</span>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--color-text)', fontWeight: 500 }}>{row.value || '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Logout confirm modal */}
            {showLogoutModal && (
                <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Sign Out</h3>
                            <button className="btn-icon" onClick={() => setShowLogoutModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to sign out of NexusBoard?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowLogoutModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleLogout}>Sign Out</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
