// Server-side shared types (copied from server/src/shared/types.ts)
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
    equippedFlashlight: string;
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

export interface WallData {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface LampData {
    x: number;
    y: number;
    range: number;
}

export interface WorldData {
    walls: WallData[];
    lamps: LampData[];
}
