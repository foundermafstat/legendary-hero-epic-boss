import { Container, Graphics } from 'pixi.js';
import { Vec2, vec2, normalize, mul, add, random, sub, length } from './utils/math';
import { GAME_CONFIG } from './config';
import { MobSprite } from './mob/MobSprite';
import { MobAnimation } from './mob/MobAnimationConfig';

export class Mob {
    public container: Container;
    public position: Vec2;
    public velocity: Vec2;
    public radius: number;
    public hp: number = 5;
    public alive: boolean = true;
    public target: Vec2 | null = null; // Aggro target

    private sprite: MobSprite;
    private shadowGraphics: Graphics;
    private directionTimer: number = 0;
    private targetDirection: Vec2;
    private moveAngle: number = 0;

    constructor(x: number, y: number) {
        this.position = vec2(x, y);
        this.velocity = vec2(0, 0);
        this.radius = GAME_CONFIG.MOB_RADIUS;
        this.targetDirection = this.randomDirection();
        this.moveAngle = Math.atan2(this.targetDirection.y, this.targetDirection.x);

        this.container = new Container();

        // Create shadow
        this.shadowGraphics = new Graphics();
        this.shadowGraphics.ellipse(0, 0, this.radius * 0.85, this.radius * 0.4);
        this.shadowGraphics.fill({ color: 0x000000, alpha: 0.35 });
        // The user requested shadow below sprites. 
        // In Pixi, order of addition determines z-index (painters algo).
        // Adding shadow first puts it at the bottom.
        // We also move it slightly down to look like it's under the feet.
        this.shadowGraphics.y = this.radius + 5;

        // Create animated sprite
        this.sprite = new MobSprite();

        // Start loading
        this.sprite.preload();

        this.container.addChild(this.shadowGraphics);
        this.container.addChild(this.sprite);

        this.updatePosition();
    }

    private randomDirection(): Vec2 {
        const angle = random(0, Math.PI * 2);
        return vec2(Math.cos(angle), Math.sin(angle));
    }

    public takeDamage(): { died: boolean; bloodPos: Vec2 } {
        this.hp--;

        const bloodPos = vec2(
            this.position.x + (Math.random() - 0.5) * this.radius * 2,
            this.position.y + (Math.random() - 0.5) * this.radius * 2
        );

        if (this.hp <= 0) {
            this.alive = false;
            return { died: true, bloodPos };
        }
        return { died: false, bloodPos };
    }

    public setAggro(targetPos: Vec2) {
        this.target = targetPos;
    }

    public update(deltaTime: number, deltaMs: number): void {
        if (!this.alive) return;

        this.directionTimer += deltaMs;

        if (this.target) {
            // Chase logic
            const diff = sub(this.target, this.position);
            const dist = length(diff);

            if (dist > 10) {
                this.targetDirection = normalize(diff);
            }
        } else {
            // Random movement logic
            if (this.directionTimer >= GAME_CONFIG.MOB_DIRECTION_CHANGE_INTERVAL) {
                this.directionTimer = 0;
                this.targetDirection = this.randomDirection();
            }
        }

        // Move towards target direction
        const speed = GAME_CONFIG.MOB_SPEED * deltaTime;
        this.velocity = mul(this.targetDirection, speed);
        this.position = add(this.position, this.velocity);

        // Update facing direction smoothly
        const targetAngle = Math.atan2(this.targetDirection.y, this.targetDirection.x);
        const angleDiff = targetAngle - this.moveAngle;

        let adjustedDiff = angleDiff;
        if (adjustedDiff > Math.PI) adjustedDiff -= Math.PI * 2;
        if (adjustedDiff < -Math.PI) adjustedDiff += Math.PI * 2;

        this.moveAngle += adjustedDiff * 0.1;

        // Update sprite rotation
        this.sprite.setRotation(this.moveAngle);

        // Update animations
        // Simple logic: if moving, play move.
        // (For now, mobs always move roughly, so maybe always move? 
        // Or check speed. `speed` is constant here unless we stop them.)

        // If we wanted them to stop near target:
        // if (dist < 10) velocity = 0... 
        // But currently they just push.

        this.sprite.play(MobAnimation.MOVE);
        this.sprite.update(deltaMs);

        // Keep in world bounds
        const margin = this.radius + 50;
        this.position.x = Math.max(margin, Math.min(GAME_CONFIG.WORLD_WIDTH - margin, this.position.x));
        this.position.y = Math.max(margin, Math.min(GAME_CONFIG.WORLD_HEIGHT - margin, this.position.y));

        this.updatePosition();
    }

    public updatePosition(): void {
        this.container.x = this.position.x;
        this.container.y = this.position.y;
    }

    public reverseDirection(): void {
        if (!this.target) {
            this.targetDirection = mul(this.targetDirection, -1);
        }
    }
}

