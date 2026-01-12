import { Vec2, PlayerState } from '../shared/types';
import { GAME_CONFIG } from '../shared/config';
import { vec2, add, mul, normalize, length } from '../utils/math';

export class ServerPlayer {
    public id: string;
    public position: Vec2;
    public velocity: Vec2;
    public flashlightAngle: number;
    public hp: number;
    public equippedFlashlight: string;
    public lastShotTime: number;

    constructor(id: string, spawnPos: Vec2) {
        this.id = id;
        this.position = spawnPos;
        this.velocity = vec2(0, 0);
        this.flashlightAngle = 0;
        this.hp = GAME_CONFIG.PLAYER_HP;
        this.equippedFlashlight = 'Common'; // Common tier
        this.lastShotTime = 0;
    }

    update(
        deltaTime: number,
        moveDir: Vec2,
        aimAngle: number
    ): void {
        this.flashlightAngle = aimAngle;

        // Apply movement
        if (moveDir.x !== 0 || moveDir.y !== 0) {
            const normalizedMove = normalize(moveDir);

            // Tactical movement speed modifier
            const aimDir = vec2(Math.cos(aimAngle), Math.sin(aimAngle));
            const dot = normalizedMove.x * aimDir.x + normalizedMove.y * aimDir.y;
            const speedModifier = 0.7 + 0.3 * dot;

            const speed = GAME_CONFIG.PLAYER_SPEED * speedModifier * deltaTime;
            this.velocity = mul(normalizedMove, speed);
            this.position = add(this.position, this.velocity);

            // Keep in world bounds
            const margin = GAME_CONFIG.PLAYER_RADIUS + 10;
            this.position.x = Math.max(margin, Math.min(GAME_CONFIG.WORLD_WIDTH - margin, this.position.x));
            this.position.y = Math.max(margin, Math.min(GAME_CONFIG.WORLD_HEIGHT - margin, this.position.y));
        } else {
            this.velocity = vec2(0, 0);
        }
    }

    canShoot(currentTime: number): boolean {
        return currentTime - this.lastShotTime >= GAME_CONFIG.FIRE_RATE;
    }

    shoot(currentTime: number): void {
        this.lastShotTime = currentTime;
    }

    takeDamage(amount: number): boolean {
        this.hp -= amount;
        return this.hp <= 0;
    }

    toState(): PlayerState {
        return {
            id: this.id,
            position: this.position,
            velocity: this.velocity,
            flashlightAngle: this.flashlightAngle,
            hp: this.hp,
            equippedFlashlight: this.equippedFlashlight,
        };
    }
}
