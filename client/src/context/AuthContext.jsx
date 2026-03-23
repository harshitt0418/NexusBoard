import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // SAFARI GOOGLE AUTH FIX:
        // After a Google OAuth redirect, Safari's ITP may have blocked the httpOnly cookie.
        // The server passes the JWT as `auth_token` param so we can set it as a first-party token.
        const params = new URLSearchParams(window.location.search);
        const authToken = params.get('auth_token');
        if (authToken) {
            localStorage.setItem('nb_token', authToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
            // Clean the token from the URL without reload (don't expose it in history)
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        // Check if user authenticated via cookie (new auth system)
        api.get('/auth/me')
            .then(({ data }) => setUser(data.user))
            .catch(() => {
                // Fallback to localStorage token (old auth system)
                const token = localStorage.getItem('nb_token');
                if (token) {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    api.get('/auth/me')
                        .then(({ data }) => setUser(data.user))
                        .catch(() => {
                            localStorage.removeItem('nb_token');
                            delete api.defaults.headers.common['Authorization'];
                        });
                }
            })
            .finally(() => setLoading(false));
    }, []);

    // New OTP-based authentication methods
    const sendOTP = useCallback(async ({ email }) => {
        const { data } = await api.post('/auth/send-otp', { email }, { timeout: 30000 });
        return data;
    }, []);

    const verifyOTP = useCallback(async ({ email, otp, name, password }) => {
        const { data } = await api.post('/auth/verify-otp', { email, otp, name, password }, { withCredentials: true });
        setUser(data.user);
        return data;
    }, []);

    const forgotPassword = useCallback(async ({ email }) => {
        const { data } = await api.post('/auth/forgot-password', { email });
        return data;
    }, []);

    const resetPassword = useCallback(async ({ token, newPassword }) => {
        const { data } = await api.post('/auth/reset-password', { token, newPassword });
        return data;
    }, []);

    // Old authentication methods (backward compatibility)
    const login = useCallback(async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password }, { withCredentials: true });
        // Try cookie-based auth first, fallback to token
        if (data.token) {
            localStorage.setItem('nb_token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
        setUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (name, email, password) => {
        // With magic link flow, registration sends a verification email.
        // The user is NOT logged in until they verify. Just return the server message.
        const { data } = await api.post('/auth/register', { name, email, password });
        return data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout', {}, { withCredentials: true });
        } catch (err) {
            console.error('Logout error:', err);
        }
        localStorage.removeItem('nb_token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            login, 
            register, 
            logout, 
            sendOTP, 
            verifyOTP, 
            forgotPassword, 
            resetPassword,
            isAuthenticated: !!user 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
