import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useRoom } from '../../context/RoomContext';

export default function ChatPanel({ isOpen, onClose }) {
    const { socket } = useSocket();
    const { myUserId, myName } = useRoom();
    const [messages, setMessages] = useState([
        { id: 0, type: 'system', message: 'Session started — welcome!' }
    ]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState([]);
    const bottomRef = useRef(null);
    const typingTimer = useRef(null);

    useEffect(() => {
        if (!socket) return;
        socket.on('chat_message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });
        socket.on('user_typing', ({ userId, userName, typing: t }) => {
            setTyping(prev => t ? [...prev.filter(u => u.userId !== userId), { userId, userName }] : prev.filter(u => u.userId !== userId));
        });
        socket.on('participant_joined', ({ userName }) => {
            setMessages(prev => [...prev, { id: Date.now(), type: 'system', message: `${userName} joined` }]);
        });
        socket.on('participant_left', ({ userName }) => {
            setMessages(prev => [...prev, { id: Date.now(), type: 'system', message: `${userName} left` }]);
        });
        socket.on('draw_access_approved', ({ userId }) => {
            if (userId === myUserId) {
                setMessages(prev => [...prev, { id: Date.now(), type: 'system', message: '✏︎ You have been granted drawing access' }]);
            }
        });
        return () => {
            socket.off('chat_message');
            socket.off('user_typing');
            socket.off('participant_joined');
            socket.off('participant_left');
            socket.off('draw_access_approved');
        };
    }, [socket, myUserId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const send = () => {
        if (!input.trim()) return;
        socket?.emit('chat_message', { message: input.trim() });
        setInput('');
        socket?.emit('user_typing', { typing: false });
    };

    const handleInput = (e) => {
        setInput(e.target.value);
        socket?.emit('user_typing', { typing: true });
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => socket?.emit('user_typing', { typing: false }), 1500);
    };

    return (
        <div className={`side-panel ${isOpen ? 'open' : ''}`} style={{
            gridArea: 'participants',
            display: 'flex', flexDirection: 'column',
            background: 'var(--color-surface)',
            borderLeft: '1px solid var(--color-border)',
            width: 'var(--panel-w)',
            position: 'relative',
            zIndex: 200,
        }}>
            {/* Header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Chat</div>
                <button className="btn-icon" onClick={onClose} style={{ fontSize: '1rem' }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((msg, i) => {
                    if (msg.type === 'system') {
                        return (
                            <div key={msg.id || i} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted)', padding: '4px 0' }}>
                                {msg.message}
                            </div>
                        );
                    }
                    const isMine = msg.userId === myUserId;
                    return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 2 }}>
                            {!isMine && <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', paddingLeft: 2 }}>{msg.userName}</span>}
                            <div style={{
                                maxWidth: '80%', padding: '8px 12px', borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                background: isMine ? 'var(--color-accent)' : 'var(--color-surface-2)',
                                color: isMine ? '#fff' : 'var(--color-text)',
                                fontSize: '0.875rem', lineHeight: 1.5,
                            }}>
                                {msg.message}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                {typing.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {[0, 1, 2].map(i => (
                                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-muted)', display: 'inline-block', animation: `bounce-in 0.7s ${i * 0.15}s infinite alternate` }} />
                            ))}
                        </div>
                        {typing.map(t => t.userName).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
                <input
                    className="input" style={{ flex: 1, padding: '8px 12px', fontSize: '0.875rem' }}
                    placeholder="Type a message…"
                    value={input}
                    onChange={handleInput}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                />
                <button className="btn btn-primary btn-sm" onClick={send} disabled={!input.trim()}>↑</button>
            </div>
        </div>
    );
}
