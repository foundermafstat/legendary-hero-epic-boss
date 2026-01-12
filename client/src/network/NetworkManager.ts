import { io, Socket } from 'socket.io-client';
import { GameState, PlayerInput, WorldData } from './types';

type GameStateCallback = (state: GameState) => void;
type WorldDataCallback = (data: WorldData) => void;
type PlayerShootCallback = (playerId: string, x: number, y: number, angle: number) => void;
type MobHitCallback = (mobId: string, x: number, y: number) => void;
type MobDeathCallback = (mobId: string, x: number, y: number) => void;


export class NetworkManager {
    private socket: Socket | null = null;
    private gameStateCallback: GameStateCallback | null = null;
    private worldDataCallback: WorldDataCallback | null = null;
    private playerShootCallback: PlayerShootCallback | null = null;
    private mobHitCallback: MobHitCallback | null = null;
    private mobDeathCallback: MobDeathCallback | null = null;
    private connected: boolean = false;
    private connectCallbacks: (() => void)[] = [];

    constructor(private serverUrl: string = 'http://localhost:3001') { }

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

