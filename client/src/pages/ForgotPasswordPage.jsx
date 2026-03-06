import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import api from '../services/api';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return toast('Email is required', 'error');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err) {
            toast(err.response?.data?.message || 'Failed to send reset link', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <AuthLayout>
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                            <Mail className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Check your email</h1>
                    <p className="text-gray-500 text-sm">
                        If <strong className="text-gray-700">{email}</strong> is registered, we&apos;ve sent a password reset link.
                    </p>
                    <p className="text-gray-400 text-xs mt-2">The link expires in 10 minutes.</p>
                </div>
                <div className="text-center">
                    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout isTyping={isTyping}>
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Forgot Password</h1>
                <p className="text-gray-500 text-sm">Enter your email to receive a reset link</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        required
                        className="h-12"
                    />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-medium" style={{ background: '#1a1a2e' }} onMouseEnter={e => e.currentTarget.style.background='#2d2d50'} onMouseLeave={e => e.currentTarget.style.background='#1a1a2e'} size="lg" disabled={loading}>
                    {loading ? 'Sending\u2026' : 'Send Reset Link'}
                </Button>
                <div className="text-center">
                    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
