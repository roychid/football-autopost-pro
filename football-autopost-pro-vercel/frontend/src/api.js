import axios from 'axios';

// In production on Vercel, frontend and backend share the same domain.
// In local dev, Vite proxies /api → localhost:4000
const api = axios.create({ baseURL: '/api' });

// Matches
export const getLiveMatches = () => api.get('/matches/live').then(r => r.data);
export const getTodayMatches = () => api.get('/matches/today').then(r => r.data);
export const getMatchEvents = (id) => api.get(`/matches/${id}/events`).then(r => r.data);
export const getMatchLineups = (id) => api.get(`/matches/${id}/lineups`).then(r => r.data);
export const getStandings = (leagueId) => api.get(`/matches/standings/${leagueId}`).then(r => r.data);
export const getActiveLeagues = () => api.get('/matches/leagues/active').then(r => r.data);
export const searchLeagues = (q) => api.get('/matches/leagues/search', { params: { q } }).then(r => r.data);
export const addLeague = (data) => api.post('/matches/leagues', data).then(r => r.data);
export const removeLeague = (id) => api.delete(`/matches/leagues/${id}`).then(r => r.data);

// Channels
export const getChannels = () => api.get('/channels').then(r => r.data);
export const createChannel = (data) => api.post('/channels', data).then(r => r.data);
export const updateChannel = (id, data) => api.patch(`/channels/${id}`, data).then(r => r.data);
export const deleteChannel = (id) => api.delete(`/channels/${id}`).then(r => r.data);

// Posts
export const getPosts = (limit = 50) => api.get('/posts', { params: { limit } }).then(r => r.data);
export const getPostStats = () => api.get('/posts/stats').then(r => r.data);
export const sendPost = (data) => api.post('/posts/send', data).then(r => r.data);
export const deletePost = (id) => api.delete(`/posts/${id}`).then(r => r.data);

export default api;
