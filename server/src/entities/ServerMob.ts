import { Vec2, MobState } from '../shared/types';
import { GAME_CONFIG } from '../shared/config';
import { vec2, add, mul, normalize, sub, length, random } from '../utils/math';

export class ServerMob {
    public id: string;
    public position: Vec2;
    public velocity: Vec2;
    public hp: number;
    public alive: boolean;
    public target: Vec2 | null;
    public targetId: string | null = null; // ID of entity to chase

    private directionTimer: number;
    private targetDirection: Vec2;
    private lastAttackTime: number = 0;

    constructor(id: string, spawnPos: Vec2) {
        this.id = id;
        this.position = spawnPos;
        this.velocity = vec2(0, 0);
        this.hp = GAME_CONFIG.MOB_HP;
        this.alive = true;
        this.target = null;
        this.targetId = null;
        this.directionTimer = 0;
        this.targetDirection = this.randomDirection();
        this.lastAttackTime = 0;
    }

    private randomDirection(): Vec2 {
        const angle = random(0, Math.PI * 2);
        return vec2(Math.cos(angle), Math.sin(angle));
    }

    setAggro(targetPos: Vec2, targetId: string | null = null): void {
        this.target = targetPos;
        this.targetId = targetId;
    }

    update(deltaTime: number, deltaMs: number): void {
        if (!this.alive) return;

        this.directionTimer += deltaMs;

        if (this.target) {
            // Chase logic
            const diff = sub(this.target, this.position);
            const dist = length(diff);

            // Stop moving if very close (attacking range)
            if (dist > 35) {
                this.targetDirection = normalize(diff);
                // Move towards target direction
                const speed = GAME_CONFIG.MOB_SPEED * deltaTime;
                this.velocity = mul(this.targetDirection, speed);
                this.position = add(this.position, this.velocity);
            } else {
                this.velocity = vec2(0, 0); // Stop to attack
            }
        } else {
            // Random movement logic
            if (this.directionTimer >= GAME_CONFIG.MOB_DIRECTION_CHANGE_INTERVAL) {
                this.directionTimer = 0;
                this.targetDirection = this.randomDirection();
            }
            // Move towards target direction
            const speed = GAME_CONFIG.MOB_SPEED * deltaTime;
            this.velocity = mul(this.targetDirection, speed);
            this.position = add(this.position, this.velocity);
        }

        // Keep in world bounds
        const margin = GAME_CONFIG.MOB_RADIUS + 50;
        this.position.x = Math.max(margin, Math.min(GAME_CONFIG.WORLD_WIDTH - margin, this.position.x));
        this.position.y = Math.max(margin, Math.min(GAME_CONFIG.WORLD_HEIGHT - margin, this.position.y));
    }

    attemptAttack(currentTime: number): number {
        if (!this.alive) return 0;

        if (currentTime - this.lastAttackTime >= 1000) {
            this.lastAttackTime = currentTime;
            // Damage 7 to 10
            return Math.floor(random(7, 11));
        }
        return 0;
    }

    takeDamage(): boolean {
        this.hp--;
        if (this.hp <= 0) {
            this.alive = false;
            return true; // died
        }
        return false;
    }

    reverseDirection(): void {
        if (!this.target) {
            this.targetDirection = mul(this.targetDirection, -1);
        }
    }

    toState(): MobState {
        return {
            id: this.id,
            position: this.position,
            velocity: this.velocity,
            hp: this.hp,
            alive: this.alive,
        };
    }
}
