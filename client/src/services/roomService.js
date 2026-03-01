import api from './api';

export const createRoom = (data, config = {}) =>
    api.post('/rooms', data, config);
export const getRoom = (roomId) => api.get(`/rooms/${roomId}`);
export const joinRoom = (roomId, data) => api.post(`/rooms/${roomId}/join`, data);
export const endRoom = (roomId, data) => api.post(`/rooms/${roomId}/end`, data);
