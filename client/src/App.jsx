import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RoomProvider } from './context/RoomContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import './index.css';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function BackendBanner() {
  const [issue, setIssue] = useState(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.protocol === 'file:') {
      setIssue('file');
      return;
    }
    const healthUrl = apiBase.replace(/\/api\/?$/, '') + '/health';
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(healthUrl, { method: 'GET', mode: 'cors' })
        .then(() => { if (!cancelled) setIssue(null); })
        .catch(() => { if (!cancelled) setIssue('backend'); });
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);
  if (!issue) return null;
  if (issue === 'file') {
    return (
      <div style={{ background: '#FEF3C7', color: '#92400E', padding: '8px 16px', textAlign: 'center', fontSize: '0.875rem' }}>
        Open the app via a server (e.g. <code>npm run dev</code> in client folder), not by opening the HTML file directly.
      </div>
    );
  }
  return (
    <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '8px 16px', textAlign: 'center', fontSize: '0.875rem' }}>
      Backend unreachable. Start it with <code>npm run dev</code> in the project root.
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BackendBanner />
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <RoomProvider>
              <ToastProvider>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/create" element={<CreateRoomPage />} />
                  <Route path="/join" element={<JoinRoomPage />} />
                  <Route path="/room/:roomId/lobby" element={<LobbyPage />} />
                  <Route path="/room/:roomId" element={<RoomPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ToastProvider>
            </RoomProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
