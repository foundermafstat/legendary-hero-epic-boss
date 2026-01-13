import { Server as SocketIOServer } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

interface SocketServer extends HTTPServer {
    io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
    server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
    socket: SocketWithIO;
}

// This is a WebSocket proxy that forwards connections to the game server
export default function handler(
    req: NextApiRequest,
    res: NextApiResponseWithSocket
) {
    if (res.socket.server.io) {
        // Socket.IO server already running
        res.end();
        return;
    }

    console.log('[Socket Proxy] Initializing Socket.IO proxy...');

    const io = new SocketIOServer(res.socket.server, {
        path: '/api/socket',
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
        console.log('[Socket Proxy] Client connected:', socket.id);

        // Forward all events to/from the actual game server
        // This is a simple echo for now - we'll enhance it
        socket.on('disconnect', () => {
            console.log('[Socket Proxy] Client disconnected:', socket.id);
        });
    });

    console.log('[Socket Proxy] Socket.IO server initialized');
    res.end();
}
