import { useEffect } from 'react';
import { getSocket } from '../lib/socket.js';

/**
 * Subscribe to a Socket.io event for the lifetime of the component.
 *
 * Usage:
 *   useSocketEvent('donor:created', (donor) => {
 *     setDonors(prev => [donor, ...prev]);
 *   });
 *
 * If the socket isn't connected yet, the listener is attached as soon as
 * a connection exists.
 */
export function useSocketEvent(event, handler) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [event, handler]);
}
