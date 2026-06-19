'use client';

import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Connect to the /chat namespace, authenticated via the JWT handshake. */
export function connectChat(): Socket {
  return io(`${API_URL}/chat`, {
    auth: { token: getToken() },
    transports: ['websocket'],
  });
}
