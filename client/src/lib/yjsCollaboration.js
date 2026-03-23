/**
 * Yjs Collaboration Layer
 *
 * Provides lightweight shared-state syncing for the NexusBoard whiteboard.
 * Uses y-webrtc as the primary transport with the existing Socket.IO connection
 * as a fallback signaling channel.
 *
 * Design constraints:
 * - Does NOT replace existing socket/WebRTC logic (additive only)
 * - Modular: import only where needed
 * - Cross-browser safe (Chrome, Safari, Edge, Firefox)
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

/** Map of roomId -> { doc, provider } so we don't create duplicates */
const instances = new Map();

/**
 * Initialize or return existing Yjs doc + WebRTC provider for a room.
 *
 * @param {string} roomId   The NexusBoard room ID (used as y-webrtc room name)
 * @param {string} userName The local user's display name (shown in awareness)
 * @returns {{ doc: Y.Doc, provider: WebrtcProvider, awareness: import('y-protocols/awareness').Awareness }}
 */
export function getYjsRoom(roomId, userName) {
    if (instances.has(roomId)) return instances.get(roomId);

    const doc = new Y.Doc();

    // y-webrtc uses public signaling servers by default.
    // It discovers peers via signaling then communicates P2P — minimal server load.
    // Resolve our custom signaling server WebSocket URL
    const rawApiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    // Keep 'localhost' vs '127.0.0.1' consistent based on what is used
    let signalingUrl = rawApiUrl.replace(/^http/, 'ws') + '/ywebrtc-signaling';
    
    // Fallback if VITE_API_URL isn't set (e.g., local dev)
    if (signalingUrl.startsWith('ws://localhost:517')) signalingUrl = 'ws://localhost:5000/ywebrtc-signaling';

    const provider = new WebrtcProvider(
        `nexusboard-${roomId}`, // unique room name scoped to NexusBoard
        doc,
        {
            // Use our self-hosted WebSocket signaling server
            signaling: [signalingUrl],
            // Use same STUN servers as the main WebRTC layer
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
            maxConns: 20,
            filterBcConns: true, // reduces duplicate connections
        }
    );

    // Set local awareness (who is in the room, their cursor/color)
    provider.awareness.setLocalStateField('user', {
        name: userName || 'Anonymous',
        color: randomColor(),
    });

    const instance = { doc, provider, awareness: provider.awareness };
    instances.set(roomId, instance);

    console.log(`[Yjs] Initialized collaboration for room: ${roomId}`);
    return instance;
}

/**
 * Destroy the Yjs instance for a room (call on room leave/unmount).
 * @param {string} roomId
 */
export function destroyYjsRoom(roomId) {
    if (!instances.has(roomId)) return;
    const { doc, provider } = instances.get(roomId);
    try {
        provider.disconnect();
        provider.destroy();
        doc.destroy();
    } catch (err) {
        console.warn('[Yjs] Error destroying room:', err);
    }
    instances.delete(roomId);
    console.log(`[Yjs] Destroyed collaboration for room: ${roomId}`);
}

/**
 * Get the shared board state map for a room.
 * Keys are arbitrary strings; values are Y.js-compatible types.
 *
 * @param {Y.Doc} doc
 * @returns {Y.Map}
 */
export function getBoardState(doc) {
    return doc.getMap('boardState');
}

/**
 * Get the shared strokes array for collaborative drawing.
 * Each item is a plain object matching the existing stroke format.
 *
 * @param {Y.Doc} doc
 * @returns {Y.Array}
 */
export function getSharedStrokes(doc) {
    return doc.getArray('strokes');
}

/** Generate a random pastel color for user awareness */
function randomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
}
