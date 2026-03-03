import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';

export default function VerifyOTPPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { verifyOTP, sendOTP } = useAuth();
    const toast = useToast();

    const [otp, setOTP] = useState('');
    const [name, setName] = useState(location.state?.name || '');
    const [password, setPassword] = useState(location.state?.password || '');
    const [showPassword, setShowPassword] = useState(false);
    // Auto-mark as new user if name+password were passed from RegisterPage
    const [isNewUser, setIsNewUser] = useState(!!(location.state?.name && location.state?.password));
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);

    const email = location.state?.email;

    useEffect(() => {
        if (!email) navigate('/login');
    }, [email, navigate]);

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) return toast('Enter 6-digit OTP', 'error');
        if (isNewUser && !name) return toast('Name is required for new users', 'error');
        if (isNewUser && (!password || password.length < 6)) return toast('Password must be at least 6 characters for new users', 'error');
        setLoading(true);
        try {
            await verifyOTP({ email, otp, name: isNewUser ? name : undefined, password: isNewUser ? password : undefined });
            toast('Login successful!', 'success');
            navigate('/');
        } catch (err) {
            toast(err.response?.data?.message || 'Invalid OTP', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;
        try {
            await sendOTP({ email });
            toast('OTP resent successfully', 'success');
            setResendTimer(60);
        } catch (err) {
            toast('Failed to resend OTP', 'error');
        }
    };

    return (
        <AuthLayout password={isNewUser ? password : ''} showPassword={showPassword}>
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Verify OTP</h1>
                <p className="text-gray-500 text-sm">
                    Enter the 6-digit code sent to <strong className="text-gray-700">{email}</strong>
                </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
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

                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <Checkbox
                        id="newUser"
                        checked={isNewUser}
                        onCheckedChange={setIsNewUser}
                        className="mt-0.5"
                    />
                    <Label htmlFor="newUser" className="text-sm font-normal cursor-pointer text-gray-600 leading-snug">
                        I&apos;m a new user (check this if you don&apos;t have an account yet)
                    </Label>
                </div>

                {isNewUser && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-gray-700">Your Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-12"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Create Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    className="h-12 pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <Button type="submit" className="w-full h-12 text-base font-medium" style={{ background: '#1a1a2e' }} onMouseEnter={e => e.currentTarget.style.background='#2d2d50'} onMouseLeave={e => e.currentTarget.style.background='#1a1a2e'} size="lg" disabled={loading}>
                    {loading ? 'Verifying…' : 'Verify OTP'}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-gray-200"
                    onClick={handleResend}
                    disabled={resendTimer > 0}
                >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </Button>
            </form>
        </AuthLayout>
    );
}
