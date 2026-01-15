import { io, Socket } from 'socket.io-client';
import { GameState, PlayerInput, WorldData } from './types';

type GameStateCallback = (state: GameState) => void;
type WorldDataCallback = (data: WorldData) => void;
type PlayerShootCallback = (playerId: string, x: number, y: number, angle: number) => void;
type MobHitCallback = (mobId: string, x: number, y: number) => void;
type MobDeathCallback = (mobId: string, x: number, y: number) => void;
type MobAttackCallback = (mobId: string, x: number, y: number) => void;

/**
 * Determines the WebSocket server URL based on the current environment.
 * - For local development (localhost): connects to localhost:3001
 * - For proxied connections (ngrok, etc.): uses NEXT_PUBLIC_WS_URL env variable
 *   or falls back to the same origin (requires server proxy setup)
 */
function getServerUrl(): string {
    // Check if running in browser
    if (typeof window === 'undefined') {
        return 'http://localhost:3001';
    }

    const hostname = window.location.hostname;

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    // For proxied connections (ngrok, etc.):
    // Option 1: Use environment variable for explicit WebSocket server URL
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (wsUrl) {
        return wsUrl;
    }

    // Option 2: Use same origin with /api/socket path (requires Next.js proxy)
    // This is a fallback - the server needs to be proxied through Next.js
    return window.location.origin;
}

export class NetworkManager {
    private socket: Socket | null = null;
    private gameStateCallback: GameStateCallback | null = null;
    private worldDataCallback: WorldDataCallback | null = null;
    private playerShootCallback: PlayerShootCallback | null = null;
    private mobHitCallback: MobHitCallback | null = null;
    private mobDeathCallback: MobDeathCallback | null = null;
    private mobAttackCallback: MobAttackCallback | null = null;
    private connected: boolean = false;
    private connectCallbacks: (() => void)[] = [];

    constructor(private serverUrl: string = getServerUrl()) {
        console.log('[NetworkManager] Using server URL:', this.serverUrl);
    }

    connect(): void {
        if (this.socket) return;

        this.socket = io(this.serverUrl, {
            transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket?.id);
            this.connected = true;
            this.connectCallbacks.forEach(cb => cb());
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
        });

        this.socket.on('gameState', (state: GameState) => {
            if (this.gameStateCallback) {
                this.gameStateCallback(state);
            }
        });

        this.socket.on('worldData' as any, (data: WorldData) => {
            if (this.worldDataCallback) {
                this.worldDataCallback(data);
            }
        });

        this.socket.on('playerJoined', (playerId: string) => {
            console.log('Player joined:', playerId);
        });

        this.socket.on('playerLeft', (playerId: string) => {
            console.log('Player left:', playerId);
        });

        // FX Events
        this.socket.on('playerShoot', (playerId: string, x: number, y: number, angle: number) => {
            if (this.playerShootCallback) this.playerShootCallback(playerId, x, y, angle);
        });

        this.socket.on('mobHit', (mobId: string, x: number, y: number) => {
            if (this.mobHitCallback) this.mobHitCallback(mobId, x, y);
        });

        this.socket.on('mobDeath', (mobId: string, x: number, y: number) => {
            if (this.mobDeathCallback) this.mobDeathCallback(mobId, x, y);
        });

        this.socket.on('mobAttack', (mobId: string, x: number, y: number) => {
            if (this.mobAttackCallback) this.mobAttackCallback(mobId, x, y);
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    public sendInput(input: PlayerInput): void {
        if (!this.socket) return;
        this.socket.emit('playerInput', input);
    }

    public aggroAll(): void {
        if (!this.socket) return;
        this.socket.emit('aggroAll');
    }

    public requestWorldData(): void {
        if (!this.socket) return;
        this.socket.emit('requestWorldData');
    }

    onGameState(callback: GameStateCallback): void {
        this.gameStateCallback = callback;
    }

    onWorldData(callback: WorldDataCallback): void {
        this.worldDataCallback = callback;
    }

    onPlayerShoot(callback: PlayerShootCallback): void {
        this.playerShootCallback = callback;
    }

    onMobHit(callback: MobHitCallback): void {
        this.mobHitCallback = callback;
    }

    onMobDeath(callback: MobDeathCallback): void {
        this.mobDeathCallback = callback;
    }

    onMobAttack(callback: MobAttackCallback): void {
        this.mobAttackCallback = callback;
    }

    getPlayerId(): string | undefined {
        return this.socket?.id;
    }

    isConnected(): boolean {
        return this.connected;
    }

    public onConnect(callback: () => void): void {
        this.connectCallbacks.push(callback);
    }
}

