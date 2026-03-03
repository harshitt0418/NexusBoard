import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
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

// Handle 401 globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('nb_token');
        }
        return Promise.reject(err);
    }
);

export default api;
