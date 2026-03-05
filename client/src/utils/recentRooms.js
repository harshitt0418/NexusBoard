const KEY = 'nb_recent_rooms';
const MAX = 8;

export function saveRecentRoom({ roomId, name, role }) {
    try {
        const existing = getRecentRooms().filter(r => r.roomId !== roomId);
        const entry = { roomId, name: name || roomId, role, ts: Date.now() };
        localStorage.setItem(KEY, JSON.stringify([entry, ...existing].slice(0, MAX)));
    } catch (_) {}
}

export function getRecentRooms() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
}
