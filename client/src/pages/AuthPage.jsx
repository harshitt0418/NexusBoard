import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register } = useAuth();
    const toast = useToast();
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [form, setForm] = useState({ name: '', email: '', password: '' });

    const from = new URLSearchParams(location.search).get('from') || '/dashboard';

    const update = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (tab === 'register' && !form.name.trim()) errs.name = 'Name is required';
        if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Valid email required';
        if (form.password.length < 6) errs.password = 'Min 6 characters';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            if (tab === 'login') {
                await login(form.email, form.password);
                toast('Welcome back! 👋', 'success');
            } else {
                await register(form.name, form.email, form.password);
                toast('Account created! 🎉', 'success');
            }
            navigate(from, { replace: true });
        } catch (err) {
            toast(err.response?.data?.message || 'Something went wrong', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FAFC 100%)', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }} className="animate-fade-in">
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <span style={{ color: '#fff', fontSize: '1.5rem' }}>⬡</span>
                    </div>
                    <h2 style={{ marginBottom: 4 }}>NexusBoard</h2>
                    <p style={{ fontSize: '0.9rem', margin: 0 }}>Your real-time collaboration workspace</p>
                </div>

                <div className="card animate-scale-in">
                    {/* Tabs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '16px 16px 0', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                        {['login', 'register'].map(t => (
                            <button key={t} onClick={() => { setTab(t); setErrors({}); setForm({ name: '', email: '', password: '' }); }}
                                style={{
                                    padding: '10px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t ? 'var(--color-surface)' : 'transparent',
                                    color: tab === t ? 'var(--color-accent)' : 'var(--color-muted)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                    borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent', transition: 'all var(--transition-fast)'
                                }}>
                                {t === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {tab === 'register' && (
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Alex Johnson" value={form.name} onChange={update('name')} />
                                {errors.name && <span className="form-error">{errors.name}</span>}
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className={`input ${errors.email ? 'input-error' : ''}`} type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} />
                            {errors.email && <span className="form-error">{errors.email}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className={`input ${errors.password ? 'input-error' : ''}`} type="password" placeholder={tab === 'register' ? 'Min 6 characters' : '••••••••'} value={form.password} onChange={update('password')} />
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>
                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: 4 }}>
                            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (tab === 'login' ? 'Sign In' : 'Create Account')}
                        </button>

                        <div className="divider-text"><div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', padding: '0 12px' }}>or</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} /></div>

                        <button type="button" className="btn btn-secondary w-full"
                            onClick={() => navigate('/')}>
                            Continue as Guest
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.825rem', color: 'var(--color-muted)' }}>
                    {tab === 'login' ? "Don't have an account? " : 'Already have one? '}
                    <button onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
                        style={{ color: 'var(--color-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>
                        {tab === 'login' ? 'Register' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
}
