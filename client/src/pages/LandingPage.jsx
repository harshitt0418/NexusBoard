import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderCanvas, destroyCanvas } from '../components/ui/canvas';
import { useAuth } from '../context/AuthContext';
import { IconLogo, IconStar, IconPalette, IconVideo, IconShield, IconChat, IconZap, IconSmartphone, IconPen, IconSync } from '../components/ui/Icons';

// Lazy-load framer-motion + scroll animation — not needed on first paint
const ContainerScroll = lazy(() =>
    import('../components/ui/container-scroll-animation').then(m => ({ default: m.ContainerScroll }))
);

export default function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [joinId, setJoinId] = useState('');

    // Avatar helpers
    const avatarInitials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : null;
    const avatarColor = user?.name
        ? `hsl(${user.name.charCodeAt(0) * 37 % 360}, 60%, 50%)`
        : 'var(--color-accent)';

    useEffect(() => {
        renderCanvas();
        return () => destroyCanvas();
    }, []);

    return (
        <div style={{ minHeight: '100dvh', background: '#f7f5f0', overflow: 'hidden', position: 'relative' }}>
            {/* Doodle canvas — full-page trail animation */}
            <canvas
                id="doodle-canvas"
                style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    pointerEvents: 'none',
                    zIndex: 0,
                    willChange: 'transform', // promote to own GPU layer
                }}
            />
            {/* Decorative blobs */}
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,26,46,0.06) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,168,76,0.07) 0%, transparent 70%)', bottom: -80, left: -80, pointerEvents: 'none' }} />

            {/* Nav */}
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <IconLogo size={20} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>NexusBoard</span>
                </div>

                {user ? (
                    /* ── Logged-in state ─────────────────────── */
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Profile avatar chip */}
                        <div
                            onClick={() => navigate('/dashboard')}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', boxShadow: 'var(--shadow-xs)', transition: 'box-shadow var(--transition-fast)' }}
                            title="Go to Dashboard"
                        >
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {avatarInitials}
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.name}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* ── Logged-out state ────────────────────── */
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign In</button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Sign Up</button>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <main style={{ maxWidth: 780, margin: '0 auto', padding: '80px 24px 40px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                {/* Badge */}
                <div className="animate-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--color-accent-soft)', border: '1px solid rgba(26,26,46,0.12)', borderRadius: 'var(--radius-full)', padding: '6px 16px', marginBottom: 28 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-accent)' }}>Real-time collaboration, reimagined</span>
                </div>

                <h1 className="animate-fade-in stagger-1" style={{ marginBottom: 20, color: '#1a1a2e' }}>
                    Collaborate on ideas<br />in real&nbsp;time
                </h1>

                <p className="animate-fade-in stagger-2" style={{ fontSize: '1.125rem', maxWidth: 560, margin: '0 auto 48px', color: 'var(--color-text-secondary)' }}>
                    Draw, discuss, and build together — with an infinite whiteboard, live video, and smart permission controls.
                </p>

                {/* CTAs */}
                <div className="animate-fade-in stagger-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/create')} style={{ width: '100%', maxWidth: 320, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <IconStar size={20} /> Create a Room
                    </button>

                    <div style={{ display: 'flex', width: '100%', maxWidth: 320, gap: 10 }}>
                        <input
                            className="input"
                            placeholder="Enter Room ID to join…"
                            value={joinId}
                            onChange={e => setJoinId(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && joinId && navigate(`/join?id=${joinId}`)}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="btn btn-secondary"
                            disabled={!joinId.trim()}
                            onClick={() => navigate(`/join?id=${joinId.trim()}`)}
                        >
                            Join
                        </button>
                    </div>
                </div>
            </main>

            {/* ── Scroll Animation Section ─────────────────────────────────────── */}
            <div style={{ position: 'relative', zIndex: 10, overflow: 'hidden' }}>
                <Suspense fallback={
                    <div style={{ height: '55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner spinner-lg" />
                    </div>
                }>
                    <ContainerScroll
                        titleComponent={
                            <>
                                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-accent)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                                    See it in action
                                </p>
                                <h2 style={{ color: '#0F172A', marginBottom: 0 }}>
                                    Your team's infinite canvas,<br />
                                    <span style={{ color: '#e9a84c' }}>
                                        live and in sync
                                    </span>
                                </h2>
                                <p style={{ marginTop: 16, fontSize: '1.0625rem', color: 'var(--color-text-secondary)', maxWidth: 520, margin: '16px auto 0' }}>
                                    Multiple participants. One shared whiteboard. Real-time pen strokes, sticky notes, and shapes — all flowing together seamlessly.
                                </p>
                            </>
                        }
                    >
                        <CanvasPreview />
                    </ContainerScroll>
                </Suspense>
            </div>

            {/* Feature cards — 3-column grid, 6 items */}
            <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 10 }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Everything you need
                    </p>
                    <h2 style={{ color: 'var(--color-text)', marginBottom: 12 }}>Built for real collaboration</h2>
                    <p style={{ maxWidth: 480, margin: '0 auto', fontSize: '1rem' }}>
                        Every feature is designed to keep your team in flow — no tab-switching, no friction.
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                    {[
                        { Icon: IconPalette, title: 'Infinite Canvas', desc: 'Draw freely with pens, shapes, arrows and sticky notes — synced live across every participant.' },
                        { Icon: IconVideo, title: 'Live Video', desc: 'WebRTC-powered video tiles so your team can see each other without leaving the board.' },
                        { Icon: IconShield, title: 'Smart Permissions', desc: 'The host decides who can draw, who can view, and who can join — with one click.' },
                        { Icon: IconChat, title: 'Contextual Chat', desc: 'A slide-in chat panel with typing indicators, so conversation stays close to the canvas.' },
                        { Icon: IconZap, title: 'Instant Rooms', desc: 'Create a collaboration room in seconds and share a link — no sign-up required for guests.' },
                        { Icon: IconSmartphone, title: 'Touch Friendly', desc: 'Fully responsive on tablets and phones — draw with your finger or a stylus on the go.' },
                    ].map((f, i) => (
                        <div key={i} className="card card-padded card-hover">
                            <div style={{ marginBottom: 14, color: 'var(--color-accent)' }}><f.Icon size={28} /></div>
                            <h4 style={{ marginBottom: 8 }}>{f.title}</h4>
                            <p style={{ fontSize: '0.875rem', margin: 0 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid var(--color-border-light)' }}>
                <small>NexusBoard © 2025 — Built for modern teams</small>
            </footer>
        </div>
    );
}

/* ── Mini Canvas Preview ──────────────────────────────────────────────────── */
function CanvasPreview() {
    const toolIcons = [IconPen, IconPen, IconPen];
    const participants = [
        { name: 'Alex', color: '#e9a84c', x: '15%', y: '30%' },
        { name: 'Mia', color: '#8B5CF6', x: '55%', y: '55%' },
        { name: 'Sam', color: '#10B981', x: '75%', y: '25%' },
    ];
    const strokes = [
        { d: 'M 60 120 Q 140 60 220 130 T 380 110', color: '#e9a84c', opacity: 0.7 },
        { d: 'M 300 200 Q 400 140 500 190 T 680 160', color: '#8B5CF6', opacity: 0.6 },
        { d: 'M 100 280 L 260 280 L 260 360 L 100 360 Z', color: '#10B981', opacity: 0.5 },
        { d: 'M 420 240 Q 480 200 540 240 Q 600 280 660 240', color: '#F59E0B', opacity: 0.6 },
    ];
    const stickyNotes = [
        { text: 'Whiteboard', x: 30, y: 60, color: '#FEF9C3', border: '#F59E0B' },
        { text: 'Live video', x: 420, y: 300, color: '#fff8ee', border: '#e9a84c' },
        { text: 'Sync', x: 620, y: 80, color: '#F0FDF4', border: '#10B981' },
    ];

    return (
        <div style={{ width: '100%', height: '100%', background: '#1a1a2e', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#16213e', borderBottom: '1px solid #0f3460' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e9a84c' }}>
                        <IconLogo size={14} />
                    </div>
                    <span style={{ color: '#e2e8f0', fontSize: '0.8125rem', fontWeight: 600 }}>NexusBoard</span>
                    <span style={{ color: '#475569', fontSize: '0.75rem', marginLeft: 8 }}>Team Ideation Room</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {participants.map(p => (
                        <div key={p.name} style={{ width: 26, height: 26, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1a1a2e', fontSize: '0.625rem', color: '#fff', fontWeight: 700 }}>
                            {p.name[0]}
                        </div>
                    ))}
                    <div style={{ background: '#0f3460', color: '#94a3b8', fontSize: '0.6875rem', padding: '0 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} /> LIVE
                    </div>
                </div>
            </div>

            {/* Canvas area */}
            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                {/* Tool palette */}
                <div style={{ width: 40, background: '#16213e', borderRight: '1px solid #0f3460', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 4 }}>
                    {toolIcons.map((Icon, i) => (
                        <div key={i} style={{ width: 30, height: 30, borderRadius: 6, background: i === 0 ? '#e9a84c' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 0 ? '#1a1a2e' : '#94a3b8', cursor: 'pointer' }}>
                            <Icon size={16} />
                        </div>
                    ))}
                </div>

                {/* Drawing surface */}
                <div style={{ flex: 1, position: 'relative', background: '#0f0f1a' }}>
                    {/* Grid dots */}
                    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
                        <defs>
                            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="1" fill="#94a3b8" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dots)" />
                    </svg>

                    {/* SVG strokes */}
                    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                        {strokes.map((s, i) => (
                            <path key={i} d={s.d} stroke={s.color} strokeWidth="2.5" fill="none" opacity={s.opacity} strokeLinecap="round" />
                        ))}
                        {/* Circle shape */}
                        <ellipse cx="540" cy="300" rx="60" ry="45" stroke="#F59E0B" strokeWidth="2" fill="none" opacity="0.5" />
                    </svg>

                    {/* Sticky notes */}
                    {stickyNotes.map((note, i) => (
                        <div key={i} style={{ position: 'absolute', left: note.x, top: note.y, background: note.color, border: `1px solid ${note.border}`, borderRadius: 6, padding: '6px 10px', fontSize: '0.6875rem', fontWeight: 600, color: '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
                            {note.text}
                        </div>
                    ))}

                    {/* Live cursors */}
                    {participants.map(p => (
                        <div key={p.name} style={{ position: 'absolute', left: p.x, top: p.y, display: 'flex', alignItems: 'flex-start', gap: 4, pointerEvents: 'none' }}>
                            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                                <path d="M1 1L13 7L7 9L5 17L1 1Z" fill={p.color} stroke="#fff" strokeWidth="1" />
                            </svg>
                            <span style={{ background: p.color, color: '#fff', fontSize: '0.5625rem', padding: '1px 5px', borderRadius: 3, fontWeight: 600, marginTop: 2 }}>{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
