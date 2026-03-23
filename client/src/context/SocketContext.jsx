import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const s = io(SOCKET_URL, {
            autoConnect: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 60000, // Render free tier can take up to 60s to wake
            // Start with polling so the HTTP handshake succeeds first,
            // then upgrade to WebSocket. This is critical for cross-origin
            // deployments on Render + Vercel where raw WS can be blocked.
            transports: ['polling', 'websocket'],
            withCredentials: true,
        });
        setSocket(s);
        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));
        s.on('connect_error', (err) => {
            console.warn('[Socket] connect_error:', err.message);
            setConnected(false);
        });
        return () => { s.disconnect(); };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
