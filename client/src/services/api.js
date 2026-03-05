import axios from 'axios';

// Production (Render free tier) needs longer timeout for cold starts (30-60s)
const isProduction = import.meta.env.VITE_API_URL?.includes('render.com') || 
                     import.meta.env.VITE_API_URL?.includes('railway.app') ||
                     import.meta.env.VITE_API_URL?.includes('fly.io');

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: isProduction ? 45000 : 10000, // 45s for production cold starts, 10s local
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // Include cookies in requests
});

// Attach token on each request (skip when config.skipAuth is true, e.g. guest create room)
api.interceptors.request.use((config) => {
    if (config.skipAuth) return config;
    const token = localStorage.getItem('nb_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle errors globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('nb_token');
        }
        
        // Add user-friendly error messages
        if (err.code === 'ECONNABORTED') {
            err.message = 'Request timeout. Server might be starting up (this can take 30-60s on first request).';
        } else if (err.code === 'ERR_NETWORK' || !err.response) {
            err.message = 'Cannot connect to server. Please check if the server is running.';
        }
        
        return Promise.reject(err);
    }
);

export default api;
