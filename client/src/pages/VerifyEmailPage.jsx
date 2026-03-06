import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Button } from '../components/ui/button';
import api from '../services/api';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('No verification token found in the link.');
            return;
        }

        api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
            .then(({ data }) => {
                setStatus('success');
                setMessage(data.message || 'Email verified successfully!');
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Invalid or expired verification link.');
            });
    }, [searchParams]);

    return (
        <AuthLayout>
            <div className="text-center">
                {status === 'verifying' && (
                    <>
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Verifying…</h1>
                        <p className="text-gray-500 text-sm">Please wait while we verify your email.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Email Verified!</h1>
                        <p className="text-gray-500 text-sm mb-6">{message}</p>
                        <Button
                            className="w-full h-12 text-base font-medium"
                            style={{ background: '#1a1a2e' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2d2d50'}
                            onMouseLeave={e => e.currentTarget.style.background = '#1a1a2e'}
                            asChild
                        >
                            <Link to="/login">Go to Login</Link>
                        </Button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Verification Failed</h1>
                        <p className="text-gray-500 text-sm mb-6">{message}</p>
                        <div className="space-y-3">
                            <Link to="/register" className="block text-center text-sm text-blue-600 hover:underline">
                                Sign up again to get a new link
                            </Link>
                            <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-700">
                                Back to Login
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}
