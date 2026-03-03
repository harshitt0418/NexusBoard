import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import api from '../services/api';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
    const toast = useToast();
    const navigate = useNavigate();
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOTP] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!email) return toast('Email is required', 'error');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setStep('otp');
            toast('OTP sent to your email', 'success');
        } catch (err) {
            toast(err.response?.data?.message || 'Failed to send OTP', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!otp || !newPassword) return toast('All fields are required', 'error');
        if (newPassword.length < 6) return toast('Password must be at least 6 characters', 'error');
        if (newPassword !== confirmPassword) return toast('Passwords do not match', 'error');
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword });
            toast('Password reset successful!', 'success');
            navigate('/login');
        } catch (err) {
            toast(err.response?.data?.message || 'Failed to reset password', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            isTyping={isTyping}
            password={step === 'otp' ? newPassword : ''}
            showPassword={step === 'otp' ? showNewPassword : false}
        >
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">
                    {step === 'email' ? 'Forgot Password' : 'Reset Password'}
                </h1>
                <p className="text-gray-500 text-sm">
                    {step === 'email'
                        ? 'Enter your email to receive an OTP'
                        : <>Enter the OTP sent to <strong className="text-gray-700">{email}</strong></>}
                </p>
            </div>

            {step === 'email' ? (
                <form onSubmit={handleSendOTP} className="space-y-5">
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
                        {loading ? 'Sending…' : 'Send OTP'}
                    </Button>
                    <div className="text-center">
                        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="otp" className="text-sm font-medium text-gray-700">OTP Code</Label>
                        <Input
                            id="otp"
                            type="text"
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            className="h-12 text-center text-xl tracking-[0.5em]"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Min. 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                required
                                className="h-12 pr-10"
                            />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                required
                                className="h-12 pr-10"
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-medium" style={{ background: '#1a1a2e' }} onMouseEnter={e => e.currentTarget.style.background='#2d2d50'} onMouseLeave={e => e.currentTarget.style.background='#1a1a2e'} size="lg" disabled={loading}>
                        {loading ? 'Resetting…' : 'Reset Password'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full h-12 border-gray-200"
                        onClick={() => { setStep('email'); setOTP(''); }}>
                        Resend OTP
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}
