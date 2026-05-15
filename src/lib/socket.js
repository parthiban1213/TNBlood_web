// ──────────────────────────────────────────────────────────────
// Socket.io client — real-time updates layer
// ──────────────────────────────────────────────────────────────
// This is *new* in the React migration. It connects to the same
// Express server (Socket.io is added on top of the existing HTTP
// server — see backend-patch/SOCKETIO_PATCH.md).

import { io } from 'socket.io-client';
import { SOCKET_URL } from './config.js';

let socket = null;

export function connectSocket(token) {
  // Tear down any existing connection first (e.g. after re-login).
  if (socket) {
    try { socket.disconnect(); } catch (e) { /* ignore */ }
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },                  // server reads from socket.handshake.auth.token
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    if (import.meta.env.DEV) console.log('🔌 Socket connected:', socket.id);
  });
  socket.on('disconnect', (reason) => {
    if (import.meta.env.DEV) console.log('🔌 Socket disconnected:', reason);
  });
  socket.on('connect_error', (err) => {
    // Don't spam — only log in dev. In prod, the backend may not have
    // Socket.io enabled yet (additive feature).
    if (import.meta.env.DEV) console.warn('🔌 Socket error:', err.message);
  });

  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
