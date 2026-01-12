import { Vec2, BulletState } from '../shared/types';
import { vec2, add, mul } from '../utils/math';
import { GAME_CONFIG } from '../shared/config';

export class ServerBullet {
    public id: string;
    public position: Vec2;
    public velocity: Vec2;
    public ownerId: string;
    public active: boolean;
    public createdAt: number;

    constructor(id: string, position: Vec2, angle: number, ownerId: string, createdAt: number) {
        this.id = id;
        this.position = position;
        this.ownerId = ownerId;
        this.active = true;
        this.createdAt = createdAt;

        const direction = vec2(Math.cos(angle), Math.sin(angle));
        this.velocity = mul(direction, GAME_CONFIG.BULLET_SPEED);
    }

    update(deltaTime: number): void {
        if (!this.active) return;

        const movement = mul(this.velocity, deltaTime);
        this.position = add(this.position, movement);

        // Check bounds
        if (
            this.position.x < 0 ||
            this.position.x > GAME_CONFIG.WORLD_WIDTH ||
            this.position.y < 0 ||
            this.position.y > GAME_CONFIG.WORLD_HEIGHT
        ) {
            this.active = false;
        }
    }

    isExpired(currentTime: number): boolean {
        return currentTime - this.createdAt > GAME_CONFIG.BULLET_LIFETIME;
    }

    toState(): BulletState {
        return {
            id: this.id,
            position: this.position,
            velocity: this.velocity,
            ownerId: this.ownerId,
        };
    }
}
