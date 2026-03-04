import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../components/ui/Toast';
import WhiteboardCanvas from '../components/canvas/WhiteboardCanvas';
import ToolPalette from '../components/canvas/ToolPalette';
import ChatPanel from '../components/chat/ChatPanel';
import ParticipantsPanel from '../components/participants/ParticipantsPanel';
import VideoStrip from '../components/video/VideoStrip';
import VideoFocusPanel from '../components/video/VideoFocusPanel';
import { IconLogo, IconLock, IconFocus, IconFocusExit, IconPeople, IconChat, IconLogOut, IconCheck, IconClose } from '../components/ui/Icons';
import { getPdfNumPages, pdfPageToDataUrl } from '../utils/pdfToImage';

export default function RoomPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { roomId } = useParams();
    const { socket } = useSocket();
    const { initRoom, myRole, myUserId, myName, updateEditors, clearRoom, setParticipants, boardLocked, setBoardLocked, activeEditors } = useRoom();
    const toast = useToast();

    const fromState = location.state || {};
    const userId = fromState.userId ?? localStorage.getItem('nb_user_id');
    const userName = fromState.userName ?? localStorage.getItem('nb_user_name');
    const normalizedRoomIdForHost = (roomId || '').toString().trim().toUpperCase();
    const storedHostId = normalizedRoomIdForHost ? sessionStorage.getItem(`nb_host_${normalizedRoomIdForHost}`) : null;
    const isHost = fromState.isHost === true || (storedHostId != null && String(storedHostId) === String(userId));

    // Canvas state: photos are a separate layer (eraser does not touch them); multiple photos supported
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#0F172A');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [photos, setPhotos] = useState([]); // [{ id, url }, ...]
    const [photosTransform, setPhotosTransform] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
    const [pdfNumPages, setPdfNumPages] = useState(0);
    const [currentPdfPage, setCurrentPdfPage] = useState(0);
    const pdfDataRef = useRef(null);
    const prevPhotosRef = useRef([]);
    const undoRef = useRef(null);
    const pdfInputRef = useRef(null);
    useEffect(() => {
        const prev = prevPhotosRef.current;
        prev.forEach((p) => {
            if (p.url?.startsWith('blob:') && !photos.some((q) => q.url === p.url)) URL.revokeObjectURL(p.url);
        });
        prevPhotosRef.current = photos;
    }, [photos]);

    // UI state
    const [rightPanel, setRightPanel] = useState('participants'); // 'participants' | 'chat' | 'video' | null
    const [drawRequestPopup, setDrawRequestPopup] = useState(null); // { userId, userName } when a viewer asked to draw (host only)
    const [focusMode, setFocusMode] = useState(false);
    const [focusedVideo, setFocusedVideo] = useState(null); // { userId, stream, name, label? } when zooming a participant

    // WebRTC state — use ref for localStream so socket handlers never have stale closures
    const [localStream, setLocalStream] = useState(null);
    const localStreamRef = useRef(null);
    const [hostForcedCameraOff, setHostForcedCameraOff] = useState(false);
    const [hostForcedMicOff, setHostForcedMicOff] = useState(false);
    const [peers, setPeers] = useState([]);
    const peersRef = useRef({});
    const joinedRef = useRef(false);
    const pendingOffersRef = useRef([]);
    const pendingPeerCreationsRef = useRef([]);
    // Stable refs to createPeer/answerPeer so socket handlers (registered once) always call the latest version
    const createPeerRef = useRef(null);
    const answerPeerRef = useRef(null);
    // Ref that holds cleanup info for unmount (avoids stale closures)
    const unmountCleanupRef = useRef({ peers: peersRef, stream: localStreamRef });
    // Per-participant mic/camera state (signaled) so remote tiles show mic-off/camera-off icons
    const [peerMediaState, setPeerMediaState] = useState({});
    // Chat messages live here so they persist for the whole room session (not lost when panel is closed)
    const [chatMessages, setChatMessages] = useState([]);
    // When host disconnects (e.g. refresh), participants see this countdown until session ends
    const [hostReconnectSeconds, setHostReconnectSeconds] = useState(null);
    // Track pending "left" messages to cancel them if user rejoins quickly (refresh case)
    const pendingLeaveMessagesRef = useRef({}); // { userId: timeoutId }
    // Track users we've seen join to avoid duplicate "joined" messages on refresh
    const seenParticipantsRef = useRef(new Set());

    const normalizedRoomId = (roomId || '').toString().trim().toUpperCase();
    const activeEditorsRef = useRef(activeEditors);
    useEffect(() => { activeEditorsRef.current = activeEditors; }, [activeEditors]);

    const MAX_CHAT_STORED = 500;

    // ── Socket join ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || joinedRef.current || !normalizedRoomId) return;
        joinedRef.current = true;

        const emitJoin = () => {
            socket.emit('join_room', { roomId: normalizedRoomId, userId: String(userId ?? ''), userName: String(userName ?? ''), isHost });
        };
        emitJoin();

        // Handle socket transport reconnect within the same page session (e.g. brief network blip).
        // Re-emit join_room so the server re-registers us, then trigger a fresh WebRTC negotiation.
        const handleReconnect = () => {
            // Close all stale peer connections so we start fresh
            Object.entries(peersRef.current).forEach(([uid, entry]) => {
                try { entry.pc.close(); } catch (_) { }
            });
            peersRef.current = {};
            setPeers([]);
            pendingOffersRef.current = [];
            pendingPeerCreationsRef.current = [];
            emitJoin();
        };
        socket.on('connect', handleReconnect);

        socket.on('room_state', (state) => {
            initRoom(state, userId, userName);
            if (Array.isArray(state.photos)) setPhotos(state.photos);
            if (state.photosTransform) setPhotosTransform(state.photosTransform);
            if (typeof state.pdfNumPages === 'number') setPdfNumPages(state.pdfNumPages);
            if (typeof state.currentPdfPage === 'number') setCurrentPdfPage(state.currentPdfPage);
            
            // Initialize seen participants to avoid showing "joined" for everyone already in room
            if (Array.isArray(state.participants)) {
                state.participants.forEach(p => {
                    if (p.userId) seenParticipantsRef.current.add(String(p.userId));
                });
            }
            
            // Persist host for this room so refresh still treats them as host
            if (state.hostId != null && String(state.hostId) === String(userId)) {
                try { sessionStorage.setItem(`nb_host_${normalizedRoomId}`, String(userId)); } catch (_) { }
            }
            try {
                const raw = localStorage.getItem(`nb_chat_${normalizedRoomId}`);
                const stored = raw ? JSON.parse(raw) : null;
                if (Array.isArray(stored) && stored.length > 0) setChatMessages(stored);
                else setChatMessages([{ id: 0, type: 'system', message: 'Session started — welcome!' }]);
            } catch {
                setChatMessages([{ id: 0, type: 'system', message: 'Session started — welcome!' }]);
            }

            // ── KEY FIX: After receiving room_state (which happens on every join/rejoin),
            // initiate WebRTC offers to all EXISTING participants that are NOT us.
            // The server now includes socketId in each participant entry.
            const stream = localStreamRef.current;
            const existingPeers = (state.participants || []).filter(
                (p) => String(p.userId) !== String(userId) && p.socketId
            );
            if (existingPeers.length > 0) {
                if (stream) {
                    existingPeers.forEach((p) => createPeerRef.current?.(p.socketId, p.userId, p.userName, stream));
                } else {
                    existingPeers.forEach((p) =>
                        pendingPeerCreationsRef.current.push({
                            targetSocketId: p.socketId,
                            targetUserId: p.userId,
                            targetName: p.userName,
                        })
                    );
                }
            }
        });

        socket.on('chat_message', (msg) => setChatMessages((prev) => [...prev, msg]));

        // Single handler: one "X joined" in chat + update participants + WebRTC mesh
        socket.on('participant_joined', ({ participants: ps, socketId: sid, userId: uid, userName: uname, isHost: joinedIsHost }) => {
            // Cancel any pending "left" message for this user (they rejoined quickly - likely a refresh)
            if (pendingLeaveMessagesRef.current[uid]) {
                clearTimeout(pendingLeaveMessagesRef.current[uid]);
                delete pendingLeaveMessagesRef.current[uid];
            }
            
            // Only show "joined" message if this is the first time we're seeing this participant
            const uidStr = String(uid);
            if (!seenParticipantsRef.current.has(uidStr)) {
                seenParticipantsRef.current.add(uidStr);
                setChatMessages((prev) => [...prev, { id: Date.now(), type: 'system', message: `${uname || 'Someone'} joined` }]);
            }
            
            setParticipants(ps);
            if (joinedIsHost || ps?.some((p) => p.isHost)) setHostReconnectSeconds(null); // host rejoined
            if (uid === userId || !sid) return;
            const stream = localStreamRef.current;
            if (stream) {
                createPeerRef.current?.(sid, uid, uname || 'Participant', stream);
            } else {
                pendingPeerCreationsRef.current.push({ targetSocketId: sid, targetUserId: uid, targetName: uname || 'Participant' });
            }
        });

        // Combined handler for participant_left: add chat message (delayed) + update participants + cleanup peer
        socket.on('participant_left', ({ userId: uid, userName: uname, participants: ps }) => {
            setParticipants(ps);
            if (peersRef.current[uid]) {
                try { peersRef.current[uid].pc.close(); } catch (_) { }
                delete peersRef.current[uid];
                setPeers(p => p.filter(x => x.userId !== uid));
            }
            
            // Delay showing "left" message in case they're just refreshing (will rejoin within 1 second)
            const timeoutId = setTimeout(() => {
                setChatMessages((prev) => [...prev, { id: Date.now(), type: 'system', message: `${uname || 'A participant'} left` }]);
                // Remove from seen participants so if they rejoin later, it shows "joined" again
                seenParticipantsRef.current.delete(String(uid));
                delete pendingLeaveMessagesRef.current[uid];
            }, 1000);
            pendingLeaveMessagesRef.current[uid] = timeoutId;
        });

        socket.on('editor_updated', ({ activeEditors, pendingRequests }) => {
            updateEditors(activeEditors, pendingRequests);
        });

        socket.on('board_locked', ({ locked }) => {
            setBoardLocked(locked);
            toast(locked ? 'Board locked by host' : 'Board unlocked', 'info');
        });
        socket.on('board_photos', ({ photos: nextPhotos, pdfNumPages: nextPdfNumPages, currentPdfPage: nextPdfPage }) => {
            if (Array.isArray(nextPhotos)) setPhotos(nextPhotos);
            if (typeof nextPdfNumPages === 'number') setPdfNumPages(nextPdfNumPages);
            if (typeof nextPdfPage === 'number') setCurrentPdfPage(nextPdfPage);
        });
        
        socket.on('board_photos_transform', ({ transform }) => {
            if (transform) setPhotosTransform(transform);
        });

        socket.on('draw_access_approved', ({ userId: uid }) => {
            if (String(uid) === String(userId)) {
                setChatMessages((prev) => [...prev, { id: Date.now(), type: 'system', message: 'You have been granted drawing access' }]);
                toast('Drawing access granted!', 'success');
            }
        });
        socket.on('draw_access_rejected', ({ userId: uid }) => {
            if (String(uid) === String(userId)) toast('Drawing request denied', 'error');
        });
        socket.on('draw_access_revoked', ({ userId: uid }) => {
            if (String(uid) === String(userId)) {
                setChatMessages((prev) => [...prev, { id: Date.now(), type: 'system', message: 'Your drawing access has been revoked' }]);
                toast('Drawing access revoked', 'error');
            }
        });
        socket.on('draw_request_sent', () => {
            toast('Draw request sent to host', 'info');
        });
        socket.on('draw_request_received', (data) => {
            if (data?.userId != null && data?.userName != null) setDrawRequestPopup({ userId: data.userId, userName: data.userName });
            if (Array.isArray(data?.pendingRequests)) updateEditors(activeEditorsRef.current, data.pendingRequests);
        });

        socket.on('session_ended', ({ reason } = {}) => {
            setHostReconnectSeconds(null);
            clearRoom();
            Object.values(peersRef.current).forEach((e) => { try { e.pc.close(); } catch (_) { } });
            peersRef.current = {};
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            toast(reason || 'Host ended the session', 'error');
            navigate('/');
        });
        socket.on('host_disconnected_grace', ({ graceSeconds }) => {
            setHostReconnectSeconds(graceSeconds ?? 15);
        });

        // WebRTC signaling — answer when we have stream; queue offer if stream not ready yet
        socket.on('webrtc_offer', ({ fromSocketId, offer, fromUserId, fromUserName }) => {
            const stream = localStreamRef.current;
            if (stream) {
                answerPeerRef.current?.(fromSocketId, offer, stream, fromUserId, fromUserName);
            } else {
                pendingOffersRef.current.push({ fromSocketId, offer, fromUserId, fromUserName });
            }
        });
        socket.on('webrtc_answer', ({ fromSocketId, answer }) => {
            const entry = Object.values(peersRef.current).find((e) => e.socketId === fromSocketId);
            if (entry?.pc) entry.pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => { });
        });
        socket.on('webrtc_ice', ({ fromSocketId, candidate }) => {
            const entry = Object.values(peersRef.current).find((e) => e.socketId === fromSocketId);
            if (entry?.pc && candidate) entry.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => { });
        });

        socket.on('host_turned_off_your_camera', () => {
            localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = false; });
            setHostForcedCameraOff(true);
            toast('Host turned off your camera', 'info');
        });
        socket.on('host_turned_off_your_mic', () => {
            localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
            setHostForcedMicOff(true);
            toast('Host turned off your microphone', 'info');
        });

        socket.on('participant_media_state', ({ userId: uid, micMuted, cameraOff }) => {
            setPeerMediaState(prev => ({ ...prev, [String(uid)]: { micMuted: !!micMuted, cameraOff: !!cameraOff } }));
        });

        return () => {
            joinedRef.current = false;
            // Clear any pending leave message timers
            Object.values(pendingLeaveMessagesRef.current).forEach(timeoutId => clearTimeout(timeoutId));
            pendingLeaveMessagesRef.current = {};
            seenParticipantsRef.current.clear();
            socket.off('connect', handleReconnect);
            socket.off('room_state'); socket.off('chat_message'); socket.off('participant_joined'); socket.off('participant_left');
            socket.off('editor_updated'); socket.off('board_locked'); socket.off('board_photos'); socket.off('board_photos_transform');
            socket.off('draw_access_approved'); socket.off('draw_access_rejected');
            socket.off('draw_access_revoked'); socket.off('draw_request_sent'); socket.off('draw_request_received');
            socket.off('session_ended'); socket.off('host_disconnected_grace');
            socket.off('webrtc_offer'); socket.off('webrtc_answer'); socket.off('webrtc_ice');
            socket.off('host_turned_off_your_camera'); socket.off('host_turned_off_your_mic');
            socket.off('participant_media_state');
        };
    }, [socket, normalizedRoomId, userId]);

    // Countdown for "host reconnecting" grace period (participants only)
    useEffect(() => {
        if (hostReconnectSeconds == null || hostReconnectSeconds <= 0) return;
        const t = setInterval(() => {
            setHostReconnectSeconds((s) => (s == null || s <= 1 ? null : s - 1));
        }, 1000);
        return () => clearInterval(t);
    }, [hostReconnectSeconds]);

    // Host: sync photos/PDF to all participants whenever they change
    useEffect(() => {
        if (myRole !== 'host' || !socket) return;
        socket.emit('board_photos', {
            photos,
            pdfNumPages,
            currentPdfPage,
        });
    }, [myRole, socket, photos, pdfNumPages, currentPdfPage]);

    // Persist chat to localStorage for this room (survives refresh; cleared when user leaves room)
    useEffect(() => {
        if (!normalizedRoomId || chatMessages.length === 0) return;
        try {
            const toSave = chatMessages.slice(-MAX_CHAT_STORED);
            localStorage.setItem(`nb_chat_${normalizedRoomId || 'default'}`, JSON.stringify(toSave));
        } catch (_) { }
    }, [normalizedRoomId, chatMessages]);

    // ── WebRTC setup — get camera/mic, then process any queued offers
    useEffect(() => {
        let cancelled = false;
        const constraints = { video: true, audio: true };

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast('Camera and microphone are not supported in this browser.', 'error');
            return;
        }

        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                if (!stream || stream.getTracks().length === 0) {
                    if (stream) stream.getTracks().forEach((t) => t.stop());
                    toast('Could not get camera or microphone. Please allow access and refresh.', 'error');
                    return;
                }
                let finalStream = stream;
                const hasAudio = stream.getAudioTracks().length > 0;
                if (!hasAudio) {
                    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                        .then((audioStream) => {
                            if (cancelled || !localStreamRef.current) {
                                audioStream.getTracks().forEach(t => t.stop());
                                return;
                            }
                            const audioTrack = audioStream.getAudioTracks()[0];
                            if (audioTrack) {
                                finalStream.addTrack(audioTrack);
                                Object.values(peersRef.current).forEach(({ pc }) => {
                                    try { pc.addTrack(audioTrack, finalStream); } catch (_) { }
                                });
                                const withAudio = new MediaStream(finalStream.getTracks());
                                localStreamRef.current = withAudio;
                                setLocalStream(withAudio);
                            }
                            audioStream.getTracks().forEach(t => { if (t !== audioTrack) t.stop(); });
                        })
                        .catch(() => toast('Microphone not available. Allow mic in browser settings and refresh.', 'error'));
                }
                localStreamRef.current = finalStream;
                setLocalStream(finalStream);
                
                // Add tracks to ANY existing peer connections that were created without the stream
                // This fixes black video when participant joins with delayed media permission
                Object.values(peersRef.current).forEach(({ pc }) => {
                    try {
                        const senders = pc.getSenders();
                        const existingTrackIds = senders.map(s => s.track?.id).filter(Boolean);
                        finalStream.getTracks().forEach((track) => {
                            if (!existingTrackIds.includes(track.id)) {
                                pc.addTrack(track, finalStream);
                            }
                        });
                    } catch (err) {
                        console.warn('Failed to add track to existing peer:', err);
                    }
                });
                
                const pendingOffers = pendingOffersRef.current.splice(0);
                pendingOffers.forEach(({ fromSocketId, offer, fromUserId, fromUserName }) =>
                    answerPeerRef.current?.(fromSocketId, offer, finalStream, fromUserId, fromUserName));
                const pendingCreations = pendingPeerCreationsRef.current.splice(0);
                pendingCreations.forEach(({ targetSocketId, targetUserId, targetName }) =>
                    createPeerRef.current?.(targetSocketId, targetUserId, targetName, finalStream));
            })
            .catch((err) => {
                if (cancelled) return;
                console.warn('getUserMedia failed:', err);
                localStreamRef.current = null;
                setLocalStream(null);
                
                // Specific error messages based on error type
                let message = 'Camera and microphone access denied';
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    message = '⚠️ Camera/Mic blocked! Click the lock icon in the address bar → Allow Camera and Microphone → Refresh the page';
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    message = 'No camera or microphone found. Please connect a device and refresh.';
                } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    message = 'Camera/mic is in use by another app. Close other apps and refresh.';
                } else if (err.name === 'OverconstrainedError') {
                    message = 'Camera/microphone settings not supported. Try a different device.';
                }
                toast(message, 'error');
            });

        return () => {
            cancelled = true;
            const s = localStreamRef.current;
            if (s) {
                s.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
            }
        };
    }, []);

    const ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ];

    // Always store a new MediaStream clone so React re-renders when tracks are added (fixes black video / no mic when 2nd track arrives)
    const addPeerStream = useCallback((id, name, stream) => {
        if (!stream || typeof stream.getTracks !== 'function') return;
        const tracks = stream.getTracks();
        if (tracks.length === 0) return;
        const streamClone = new MediaStream(tracks);
        setPeers(prev => {
            const existing = prev.find(p => p.userId === id);
            if (existing) return prev.map(p => (p.userId === id ? { ...p, stream: streamClone } : p));
            return [...prev, { userId: id, name, stream: streamClone }];
        });
    }, []);

    const addPeerTrack = useCallback((id, name, track, eventStream) => {
        if (!track) return;
        setPeers(prev => {
            const existing = prev.find(p => p.userId === id);
            const existingTracks = existing?.stream?.getTracks() ?? [];
            if (existingTracks.some(t => t.id === track.id)) return prev;
            const allTracks = existingTracks.length ? [...existingTracks, track] : (eventStream?.getTracks?.()?.length ? [...eventStream.getTracks(), track] : [track]);
            const unique = allTracks.filter((t, i) => allTracks.findIndex(x => x.id === t.id) === i);
            const combined = new MediaStream(unique);
            if (existing) return prev.map(p => p.userId === id ? { ...p, stream: combined } : p);
            return [...prev, { userId: id, name, stream: combined }];
        });
    }, []);

    const createPeer = useCallback((targetSocketId, targetUserId, targetName, stream) => {
        // ── KEY FIX: If a stale peer connection exists for this user (e.g. after refresh),
        // close it first so we can negotiate a fresh connection.
        if (peersRef.current[targetUserId]) {
            const stale = peersRef.current[targetUserId];
            // If the existing PC is still connected and uses the same socket, skip duplicate.
            if (stale.socketId === targetSocketId &&
                (stale.pc.connectionState === 'connected' || stale.pc.connectionState === 'connecting')) {
                return;
            }
            // Otherwise close the stale connection and recreate
            try { stale.pc.close(); } catch (_) { }
            delete peersRef.current[targetUserId];
            setPeers((p) => p.filter((x) => x.userId !== targetUserId));
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        const remoteStream = new MediaStream();

        pc.ontrack = (e) => {
            if (e.track) {
                remoteStream.addTrack(e.track);
                addPeerStream(targetUserId, targetName, remoteStream);
            }
        };
        pc.onicecandidate = (e) => {
            if (e.candidate && socket) socket.emit('webrtc_ice', { targetSocketId, candidate: e.candidate });
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                try {
                    pc.getReceivers().forEach((r) => {
                        if (r.track && !remoteStream.getTracks().some((t) => t.id === r.track.id)) remoteStream.addTrack(r.track);
                    });
                    if (remoteStream.getTracks().length > 0) addPeerStream(targetUserId, targetName, remoteStream);
                } catch (_) { }
            }
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') toast('Video connection issue. Check camera/mic and try again.', 'error');
            if (pc.connectionState === 'closed') {
                delete peersRef.current[targetUserId];
                setPeers((p) => p.filter((x) => x.userId !== targetUserId));
            }
        };

        if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
                if (socket) socket.emit('webrtc_offer', { targetSocketId, offer: pc.localDescription });
            })
            .catch((err) => {
                console.warn('Create offer failed:', err);
                toast('Failed to start video connection', 'error');
            });

        peersRef.current[targetUserId] = { pc, socketId: targetSocketId };
    }, [socket, addPeerStream, toast]);

    const answerPeer = useCallback((fromSocketId, offer, stream, fromUserId, fromUserName) => {
        const remoteUserId = fromUserId || fromSocketId;
        const remoteName = fromUserName || 'Participant';

        // ── KEY FIX: If a stale peer connection exists (e.g. they refreshed and are sending
        // a fresh offer), close it and create a brand-new RTCPeerConnection to answer properly.
        if (peersRef.current[remoteUserId]) {
            const stale = peersRef.current[remoteUserId];
            // If same socket and still alive, just set the remote description (renegotiation)
            if (stale.socketId === fromSocketId &&
                (stale.pc.connectionState === 'connected' || stale.pc.connectionState === 'connecting')) {
                stale.pc.setRemoteDescription(new RTCSessionDescription(offer)).catch(() => { });
                return;
            }
            // Different socket (they refreshed) — close stale and rebuild
            try { stale.pc.close(); } catch (_) { }
            delete peersRef.current[remoteUserId];
            setPeers((p) => p.filter((x) => x.userId !== remoteUserId));
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        const remoteStream = new MediaStream();

        pc.ontrack = (e) => {
            if (e.track) {
                remoteStream.addTrack(e.track);
                addPeerStream(remoteUserId, remoteName, remoteStream);
            }
        };
        pc.onicecandidate = (e) => {
            if (e.candidate && socket) socket.emit('webrtc_ice', { targetSocketId: fromSocketId, candidate: e.candidate });
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                try {
                    pc.getReceivers().forEach((r) => {
                        if (r.track && !remoteStream.getTracks().some((t) => t.id === r.track.id)) remoteStream.addTrack(r.track);
                    });
                    if (remoteStream.getTracks().length > 0) addPeerStream(remoteUserId, remoteName, remoteStream);
                } catch (_) { }
            }
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') toast('Video connection issue. Check camera/mic and try again.', 'error');
            if (pc.connectionState === 'closed') {
                delete peersRef.current[remoteUserId];
                setPeers((p) => p.filter((x) => x.userId !== remoteUserId));
            }
        };

        if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => pc.createAnswer())
            .then((answer) => pc.setLocalDescription(answer))
            .then(() => {
                if (socket) socket.emit('webrtc_answer', { targetSocketId: fromSocketId, answer: pc.localDescription });
            })
            .catch((err) => {
                console.warn('Create answer failed:', err);
                toast('Failed to accept video connection', 'error');
            });

        peersRef.current[remoteUserId] = { pc, socketId: fromSocketId };
    }, [socket, addPeerStream, toast]);

    // Keep stable refs in sync so that once-registered socket handlers always call the latest functions
    createPeerRef.current = createPeer;
    answerPeerRef.current = answerPeer;

    // ── Keyboard shortcuts & paste ────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') undoRef.current?.();
            if (e.key === 'Escape') setFocusMode(false);
            if (e.key === 'f' && !e.ctrlKey) setFocusMode(m => !m);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        const onPaste = (e) => {
            if (myRole !== 'host') return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        const url = URL.createObjectURL(file);
                        pdfDataRef.current = null;
                        setPdfNumPages(0);
                        setCurrentPdfPage(0);
                        setPhotos((prev) => [...prev, { id: `img-${Date.now()}`, url }]);
                        const resetTransform = { offsetX: 0, offsetY: 0, scale: 1 };
                        setPhotosTransform(resetTransform);
                        socket?.emit('board_photos_transform', { transform: resetTransform });
                        toast('Image added as photo', 'success');
                    }
                    return;
                }
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [socket, toast, myRole]);

    const leaveRoom = () => {
        socket?.emit('leave_room');
        clearRoom();
        Object.values(peersRef.current).forEach((e) => { try { e.pc.close(); } catch (_) { } });
        peersRef.current = {};
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        navigate('/');
    };

    const clearBoard = () => {
        socket?.emit('board_clear');
    };

    const handleOpenPdfClick = () => pdfInputRef.current?.click();

    const handlePdfFile = useCallback(async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        const isPdf = (file?.type?.toLowerCase().includes('pdf')) || (file?.name?.toLowerCase().endsWith('.pdf'));
        if (!file) return;
        if (!isPdf) {
            toast('Please choose a .pdf file', 'info');
            return;
        }
        if (file.size === 0) {
            toast('PDF file is empty', 'error');
            return;
        }
        try {
            const buf = await file.arrayBuffer();
            if (!buf || buf.byteLength === 0) {
                toast('Could not read PDF file', 'error');
                return;
            }
            // pdfjs can detach the buffer; use copies and keep a master copy for page turns
            const masterCopy = buf.slice(0);
            pdfDataRef.current = masterCopy;
            const numPages = await getPdfNumPages(buf.slice(0));
            setPdfNumPages(numPages);
            setCurrentPdfPage(1);
            const dataUrl = await pdfPageToDataUrl(masterCopy.slice(0), 1);
            setPhotos((prev) => [...prev.filter((p) => p.id !== 'pdf'), { id: 'pdf', url: dataUrl }]);
            const resetTransform = { offsetX: 0, offsetY: 0, scale: 1 };
            setPhotosTransform(resetTransform);
            socket?.emit('board_photos_transform', { transform: resetTransform });
            toast(numPages > 1 ? `PDF page 1 added (${numPages} pages — use arrows for more)` : 'PDF added as photo', 'success');
        } catch (err) {
            console.warn('PDF load failed:', err);
            const msg = err?.message || String(err);
            toast(msg.length > 60 ? `PDF failed: ${msg.slice(0, 57)}…` : `PDF failed: ${msg}`, 'error');
        }
    }, [socket, toast]);

    const handlePasteImage = useCallback(async () => {
        try {
            const items = await navigator.clipboard.read?.();
            if (!items?.length) {
                toast('Clipboard empty or paste not allowed', 'info');
                return;
            }
            for (const item of items) {
                const imageType = item.types?.find(t => t === 'image/png' || t === 'image/jpeg' || t === 'image/webp');
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const url = URL.createObjectURL(blob);
                    pdfDataRef.current = null;
                    setPdfNumPages(0);
                    setCurrentPdfPage(0);
                    setPhotos((prev) => [...prev, { id: `img-${Date.now()}`, url }]);
                    const resetTransform = { offsetX: 0, offsetY: 0, scale: 1 };
                    setPhotosTransform(resetTransform);
                    socket?.emit('board_photos_transform', { transform: resetTransform });
                    toast('Image added as photo', 'success');
                    return;
                }
            }
            toast('No image in clipboard. Copy an image or screenshot first.', 'info');
        } catch (err) {
            console.warn('Paste failed:', err);
            toast('Paste failed. Try pasting with Ctrl+V while focused on the board.', 'error');
        }
    }, [socket, toast]);

    const handleClearPhotos = useCallback(() => {
        pdfDataRef.current = null;
        setPdfNumPages(0);
        setCurrentPdfPage(0);
        setPhotos([]);
        const resetTransform = { offsetX: 0, offsetY: 0, scale: 1 };
        setPhotosTransform(resetTransform);
        socket?.emit('board_photos_transform', { transform: resetTransform });
        toast('All photos removed', 'info');
    }, [socket, toast]);

    const handlePrevPdfPage = useCallback(async () => {
        if (currentPdfPage <= 1 || !pdfDataRef.current) return;
        const newPage = currentPdfPage - 1;
        try {
            const dataUrl = await pdfPageToDataUrl(pdfDataRef.current.slice(0), newPage);
            const updatedPhotos = photos.map((p) => (p.id === 'pdf' ? { ...p, url: dataUrl } : p));
            setPhotos(updatedPhotos);
            setCurrentPdfPage(newPage);
            // Emit to other participants so they see the page change in real-time
            socket?.emit('board_photos', { photos: updatedPhotos, pdfNumPages, currentPdfPage: newPage });
        } catch (err) {
            console.warn('PDF page render failed:', err);
        }
    }, [currentPdfPage, photos, pdfNumPages, socket]);

    const handleNextPdfPage = useCallback(async () => {
        if (currentPdfPage >= pdfNumPages || !pdfDataRef.current) return;
        const newPage = currentPdfPage + 1;
        try {
            const dataUrl = await pdfPageToDataUrl(pdfDataRef.current.slice(0), newPage);
            const updatedPhotos = photos.some((p) => p.id === 'pdf') 
                ? photos.map((p) => (p.id === 'pdf' ? { ...p, url: dataUrl } : p)) 
                : [...photos, { id: 'pdf', url: dataUrl }];
            setPhotos(updatedPhotos);
            setCurrentPdfPage(newPage);
            // Emit to other participants so they see the page change in real-time
            socket?.emit('board_photos', { photos: updatedPhotos, pdfNumPages, currentPdfPage: newPage });
        } catch (err) {
            console.warn('PDF page render failed:', err);
        }
    }, [currentPdfPage, pdfNumPages, photos, socket]);

    const zoomPhotos = useCallback((multiplier) => {
        setPhotosTransform((prev) => {
            const nextScale = Math.min(5, Math.max(0.2, (prev?.scale || 1) * multiplier));
            const next = { ...(prev || { offsetX: 0, offsetY: 0, scale: 1 }), scale: nextScale };
            socket?.emit('board_photos_transform', { transform: next });
            return next;
        });
    }, [socket]);

    const handlePhotosZoomIn = useCallback(() => zoomPhotos(1.15), [zoomPhotos]);
    const handlePhotosZoomOut = useCallback(() => zoomPhotos(1 / 1.15), [zoomPhotos]);
    const handlePhotosReset = useCallback(() => {
        const resetTransform = { offsetX: 0, offsetY: 0, scale: 1 };
        setPhotosTransform(resetTransform);
        socket?.emit('board_photos_transform', { transform: resetTransform });
    }, [socket]);

    const togglePanel = (panel) => {
        setRightPanel(prev => prev === panel ? null : panel);
    };

    return (
        <div className={`room-layout ${focusMode ? 'focus-mode' : ''}`}>
            {/* ── HEADER ────────────────────────────────────────────────────────── */}
            <header style={{
                gridArea: 'header',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 16px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
                zIndex: 100,
            }}>
                {/* Left: logo + room name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <IconLogo size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.2 }}>NexusBoard</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', lineHeight: 1. }}>
                            <code style={{ letterSpacing: '0.08em' }}>{roomId}</code>
                            {myRole === 'host' && <span className="badge badge-blue" style={{ marginLeft: 6, padding: '1px 7px', fontSize: '0.65rem' }}>Host</span>}
                            {myRole === 'editor' && <span className="badge badge-green" style={{ marginLeft: 6, padding: '1px 7px', fontSize: '0.65rem' }}>Editor</span>}
                            {boardLocked && <span className="badge badge-red" style={{ marginLeft: 6, padding: '1px 7px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconLock size={10} /> Locked</span>}
                        </div>
                    </div>
                </div>

                {/* Right: header actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        className={`btn btn-ghost btn-sm ${focusMode ? 'active' : ''}`}
                        title="Focus mode (F)"
                        onClick={() => setFocusMode(m => !m)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {focusMode ? <><IconFocusExit size={16} /> Exit Focus</> : <><IconFocus size={16} /> Focus</>}
                    </button>
                    <button
                        className={`btn btn-secondary btn-sm ${rightPanel === 'participants' ? 'active' : ''}`}
                        onClick={() => togglePanel('participants')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconPeople size={16} /> People
                    </button>
                    <button
                        className={`btn btn-secondary btn-sm ${rightPanel === 'chat' ? 'active' : ''}`}
                        onClick={() => togglePanel('chat')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconChat size={16} /> Chat
                    </button>
                    <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />
                    <button className="btn btn-danger btn-sm" onClick={leaveRoom} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconLogOut size={16} /> Leave</button>
                </div>
            </header>

            {/* Participants: show when host disconnected (grace period) */}
            {myRole !== 'host' && hostReconnectSeconds != null && hostReconnectSeconds > 0 && (
                <div style={{
                    position: 'fixed',
                    top: 'var(--header-h, 60px)',
                    left: 0,
                    right: 0,
                    background: 'var(--color-warning-soft)',
                    borderBottom: '1px solid var(--color-warning)',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    color: 'var(--color-warning)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    zIndex: 90,
                }}>
                    Host reconnecting… Session will end in <strong>{hostReconnectSeconds}s</strong> if they don&apos;t return.
                </div>
            )}

            {/* ── TOOL PALETTE ──────────────────────────────────────────────────── */}
            <input
                type="file"
                ref={pdfInputRef}
                accept="application/pdf"
                onChange={handlePdfFile}
                style={{ display: 'none' }}
                aria-hidden
            />
            <ToolPalette
                tool={tool} setTool={setTool}
                color={color} setColor={setColor}
                strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                onUndo={() => undoRef.current?.()}
                onClear={clearBoard}
                canClear={myRole === 'host'}
                isHost={myRole === 'host'}
                onOpenPdfClick={myRole === 'host' ? handleOpenPdfClick : undefined}
                onPasteImage={myRole === 'host' ? handlePasteImage : undefined}
                onClearPhotos={myRole === 'host' ? handleClearPhotos : undefined}
                photosCount={photos.length}
                pdfPage={currentPdfPage}
                pdfTotalPages={pdfNumPages}
                onPrevPdfPage={myRole === 'host' ? handlePrevPdfPage : undefined}
                onNextPdfPage={myRole === 'host' ? handleNextPdfPage : undefined}
                bgScale={photosTransform?.scale || 1}
                onBgZoomIn={handlePhotosZoomIn}
                onBgZoomOut={handlePhotosZoomOut}
                onBgReset={handlePhotosReset}
            />

            {/* ── CANVAS ────────────────────────────────────────────────────────── */}
            <div style={{ gridArea: 'canvas', position: 'relative', overflow: 'hidden' }}>
                <WhiteboardCanvas
                    tool={tool} color={color} strokeWidth={strokeWidth}
                    onUndoRef={undoRef}
                    photos={photos}
                    photosTransform={photosTransform}
                    onPhotosTransformChange={setPhotosTransform}
                />
            </div>

            {/* ── VIDEO STRIP ───────────────────────────────────────────────────── */}
            <VideoStrip
                localStream={localStream}
                peers={peers}
                peerMediaState={peerMediaState}
                hostForcedCameraOff={hostForcedCameraOff}
                hostForcedMicOff={hostForcedMicOff}
                onCameraTurnedOn={() => setHostForcedCameraOff(false)}
                onMicTurnedOn={() => setHostForcedMicOff(false)}
                onMediaStateChange={(state) => socket?.emit('participant_media_state', { micMuted: state.micMuted, cameraOff: state.cameraOff })}
                onTileClick={(payload) => {
                    if (payload?.stream) {
                        setFocusedVideo(payload);
                        setRightPanel('video');
                    }
                }}
            />

            {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
            {rightPanel === 'participants' && (
                <ParticipantsPanel isOpen={true} onClose={() => setRightPanel(null)} peerMediaState={peerMediaState} />
            )}
            {rightPanel === 'chat' && (
                <ChatPanel isOpen={true} onClose={() => setRightPanel(null)} messages={chatMessages} />
            )}
            {rightPanel === 'video' && focusedVideo && (
                <VideoFocusPanel
                    stream={focusedVideo.stream}
                    name={focusedVideo.name}
                    isLocal={focusedVideo.userId === 'local' || String(focusedVideo.userId) === String(myUserId)}
                    label={focusedVideo.label}
                    onClose={() => { setFocusedVideo(null); setRightPanel('participants'); }}
                />
            )}

            {/* ── DRAW REQUEST POPUP (host only) ─────────────────────────────────── */}
            {myRole === 'host' && drawRequestPopup && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 400,
                        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20,
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setDrawRequestPopup(null); }}
                >
                    <div
                        role="dialog"
                        aria-labelledby="draw-request-title"
                        style={{
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-xl)',
                            border: '1px solid var(--color-border)',
                            padding: 24,
                            maxWidth: 360,
                            width: '100%',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div id="draw-request-title" style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: 8 }}>
                            Drawing access request
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginBottom: 20 }}>
                            <strong>{drawRequestPopup.userName}</strong> wants to draw on the board.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    socket?.emit('reject_draw_access', { targetUserId: drawRequestPopup.userId });
                                    setDrawRequestPopup(null);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                <IconClose size={16} /> Deny
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={() => {
                                    socket?.emit('approve_draw_access', { targetUserId: drawRequestPopup.userId });
                                    setDrawRequestPopup(null);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                <IconCheck size={16} /> Grant access
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MOBILE BOTTOM FAB ─────────────────────────────────────────────── */}
            <div style={{
                display: 'none',
                position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
                boxShadow: 'var(--shadow-float)', border: '1px solid var(--color-border)',
                padding: '8px 16px', gap: 16, zIndex: 300,
                '@media(maxWidth:767px)': { display: 'flex' },
            }}
                className="mobile-fab">
                <button className="btn-icon" style={{ flexDirection: 'column', gap: 2, height: 'auto', padding: '6px 10px' }} onClick={() => togglePanel('participants')}>
                    <IconPeople size={20} />
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>People</span>
                </button>
                <button className="btn-icon" style={{ flexDirection: 'column', gap: 2, height: 'auto', padding: '6px 10px' }} onClick={() => togglePanel('chat')}>
                    <IconChat size={20} />
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>Chat</span>
                </button>
                <button className="btn-icon" style={{ flexDirection: 'column', gap: 2, height: 'auto', padding: '6px 10px' }} onClick={leaveRoom}>
                    <IconLogOut size={20} style={{ color: 'var(--color-danger)' }} />
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-danger)' }}>Leave</span>
                </button>
            </div>
        </div>
    );
}
