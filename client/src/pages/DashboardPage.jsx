import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useState, useEffect } from 'react';
import { renderCanvas, destroyCanvas } from '../components/ui/canvas';
import { IconLogo, IconClose, IconRocket, IconLink } from '../components/ui/Icons';

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

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 18) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => { renderCanvas(); return () => destroyCanvas(); }, []);

    return (
        <div style={{ minHeight: '100dvh', background: '#f7f5f0', overflow: 'hidden', position: 'relative' }}>
            <canvas id="doodle-canvas" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
            {/* Nav */}
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <IconLogo size={18} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>NexusBoard</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                            {avatarInitials}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)' }}>{user?.name}</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowLogoutModal(true)}>Sign Out</button>
                </div>
            </nav>

            <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

                {/* Welcome header */}
                <div className="animate-fade-in" style={{ marginBottom: 40 }}>
                    <h1 style={{ marginBottom: 6 }}>{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', margin: 0 }}>What would you like to do today?</p>
                </div>

                {/* Main actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 40 }}>
                    <button
                        className="card card-padded card-hover animate-fade-in"
                        onClick={() => navigate('/create')}
                        style={{ textAlign: 'left', border: '2px solid var(--color-accent)', background: 'var(--color-accent-soft)', cursor: 'pointer', padding: 28 }}
                    >
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 16 }}>
                            <IconRocket size={26} />
                        </div>
                        <h3 style={{ marginBottom: 8, color: 'var(--color-accent)' }}>Create a Room</h3>
                        <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>Start a new collaboration session and invite your team to join.</p>
                    </button>

                    <button
                        className="card card-padded card-hover animate-fade-in stagger-1"
                        onClick={() => navigate('/join')}
                        style={{ textAlign: 'left', cursor: 'pointer', padding: 28 }}
                    >
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(26,26,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e', marginBottom: 16 }}>
                            <IconLink size={26} />
                        </div>
                        <h3 style={{ marginBottom: 8 }}>Join a Room</h3>
                        <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>Enter a room code to join an existing collaboration session.</p>
                    </button>
                </div>

            </main>

            {/* Logout confirm modal */}
            {showLogoutModal && (
                <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Sign Out</h3>
                            <button className="btn-icon" onClick={() => setShowLogoutModal(false)} type="button" aria-label="Close"><IconClose size={18} /></button>
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
