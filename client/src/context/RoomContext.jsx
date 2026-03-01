import { createContext, useContext, useState, useCallback } from 'react';

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
    const [room, setRoom] = useState(null);
    const [hostId, setHostId] = useState(null);
    const [boardLocked, setBoardLocked] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [activeEditors, setActiveEditors] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [strokes, setStrokes] = useState([]);
    const [myRole, setMyRole] = useState('viewer'); // 'host' | 'editor' | 'viewer'
    const [myUserId, setMyUserId] = useState(null);
    const [myName, setMyName] = useState('');

    const initRoom = useCallback((state, userId, userName) => {
        setRoom(state);
        setHostId(state.hostId);
        setBoardLocked(state.boardLocked);
        setParticipants(state.participants || []);
        setActiveEditors(state.activeEditors || []);
        setPendingRequests(state.pendingRequests || []);
        setStrokes(state.strokes || []);
        setMyUserId(userId);
        setMyName(userName);
        const isHost = state.hostId === userId;
        const isEditor = (state.activeEditors || []).includes(userId);
        setMyRole(isHost ? 'host' : isEditor ? 'editor' : 'viewer');
    }, []);

    const updateEditors = useCallback((editors, requests) => {
        setActiveEditors(editors);
        if (requests !== undefined) setPendingRequests(requests);
        setMyRole(prev => {
            if (prev === 'host') return 'host';
            return editors.includes(myUserId) ? 'editor' : 'viewer';
        });
    }, [myUserId]);

    const clearRoom = useCallback(() => {
        setRoom(null); setHostId(null); setBoardLocked(false);
        setParticipants([]); setActiveEditors([]); setPendingRequests([]);
        setStrokes([]); setMyRole('viewer'); setMyUserId(null); setMyName('');
    }, []);

    const canDraw = myRole === 'host' || myRole === 'editor';

    return (
        <RoomContext.Provider value={{
            room, hostId, boardLocked, setBoardLocked,
            participants, setParticipants,
            activeEditors, pendingRequests,
            strokes, setStrokes,
            myRole, myUserId, myName,
            initRoom, updateEditors, clearRoom, canDraw,
        }}>
            {children}
        </RoomContext.Provider>
    );
};

export const useRoom = () => {
    const ctx = useContext(RoomContext);
    if (!ctx) throw new Error('useRoom must be inside RoomProvider');
    return ctx;
};
