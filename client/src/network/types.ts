// Shared types between client and server
export interface Vec2 {
    x: number;
    y: number;
}

export interface PlayerInput {
    moveDir: Vec2;
    aimAngle: number;
    isShooting: boolean;
}

export interface PlayerState {
    id: string;
    position: Vec2;
    velocity: Vec2;
    flashlightAngle: number;
    hp: number;
    equippedFlashlight: string; // tier
}

export interface MobState {
    id: string;
    position: Vec2;
    velocity: Vec2;
    hp: number;
    alive: boolean;
}

export interface BulletState {
    id: string;
    position: Vec2;
    velocity: Vec2;
    ownerId: string;
}

export interface GameState {
    players: Record<string, PlayerState>;
    mobs: MobState[];
    bullets: BulletState[];
    timestamp: number;
}

export interface WorldData {
    walls: Array<{ x: number; y: number; width: number; height: number }>;
    lamps: Array<{ x: number; y: number; range: number }>;
}

export interface ServerToClientEvents {
    gameState: (state: GameState) => void;
    playerJoined: (playerId: string) => void;
    playerLeft: (playerId: string) => void;
    // FX Events
    playerShoot: (playerId: string, x: number, y: number, angle: number) => void;
    mobHit: (mobId: string, x: number, y: number) => void;
    mobDeath: (mobId: string, x: number, y: number) => void;
}

export interface ClientToServerEvents {
    aggroAll: () => void;
}
