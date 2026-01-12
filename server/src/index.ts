import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './game/GameManager';
import { ClientToServerEvents, ServerToClientEvents } from './shared/types';
import { GAME_CONFIG } from './shared/config';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const gameManager = new GameManager();
gameManager.onEvent((name, ...args) => {
    io.emit(name as any, ...args);
});

// Game loop
let lastTickTime = Date.now();
setInterval(() => {
    const currentTime = Date.now();
    const deltaMs = currentTime - lastTickTime;
    const deltaTime = deltaMs / 16.67; // Normalized to 60fps
    lastTickTime = currentTime;

    gameManager.tick(deltaTime, deltaMs, currentTime);

    // Broadcast game state to all clients
    const gameState = gameManager.getGameState();
    io.emit('gameState', gameState);
}, GAME_CONFIG.TICK_INTERVAL);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Add player to game
    gameManager.addPlayer(socket.id);

    // Send world data to new player (static data sent once)
    socket.emit('worldData' as any, gameManager.getWorldData());

    socket.on('requestWorldData', () => {
        socket.emit('worldData' as any, gameManager.getWorldData());
    });

    // Broadcast to all clients that a player joined
    io.emit('playerJoined', socket.id);

    // Handle player input
    socket.on('playerInput', (input) => {
        gameManager.updatePlayerInput(socket.id, input);
    });

    socket.on('aggroAll', () => {
        gameManager.aggroAll(socket.id);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        gameManager.removePlayer(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', players: gameManager.getGameState().players });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Tick rate: ${GAME_CONFIG.TICK_RATE} TPS`);
});
