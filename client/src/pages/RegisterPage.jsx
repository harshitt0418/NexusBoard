import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { sendOTP } = useAuth();
    const toast = useToast();

    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, email, password } = formData;

        if (!name || !email || !password) return toast('All fields required', 'error');
        if (password.length < 6) return toast('Password must be at least 6 characters', 'error');

        setLoading(true);
        try {
            console.log('Sending OTP to:', email);
            await sendOTP({ email });
            console.log('OTP sent successfully');
            toast('OTP sent to your email', 'success');
            navigate('/verify-otp', { state: { email, name, password } });
        } catch (err) {
            console.error('Registration error:', err);
            console.error('Error details:', {
                status: err.response?.status,
                message: err.response?.data?.message,
                code: err.code
            });
            
            let errorMessage = 'Registration failed';
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. The server might be waking up (free hosting). Please try again in a minute.';
            } else if (err.code === 'ERR_NETWORK') {
                errorMessage = 'Cannot connect to server. Please check your connection.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            toast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout isTyping={isTyping} password={formData.password} showPassword={showPassword}>
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Create account</h1>
                <p className="text-gray-500 text-sm">Sign up for NexusBoard today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        required
                        className="h-12"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        required
                        className="h-12"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 6 characters"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={6}
                            required
                            className="h-12 pr-10"
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

                <Button type="submit" className="w-full h-12 text-base font-medium" style={{ background: '#1a1a2e' }} onMouseEnter={e => e.currentTarget.style.background='#2d2d50'} onMouseLeave={e => e.currentTarget.style.background='#1a1a2e'} size="lg" disabled={loading}>
                    {loading ? 'Sending OTP…' : 'Create Account'}
                </Button>
            </form>

            <div className="text-center text-sm text-gray-500 mt-8">
                Already have an account?{' '}
                <Link to="/login" className="text-gray-900 font-medium hover:underline">
                    Sign In
                </Link>
            </div>
        </AuthLayout>
    );
}
