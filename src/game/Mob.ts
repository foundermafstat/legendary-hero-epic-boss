import { Container, Graphics } from 'pixi.js';
import { Vec2, vec2, normalize, mul, add, random, angleBetween } from './utils/math';
import { GAME_CONFIG } from './config';

export class Mob {
    public container: Container;
    public graphics: Graphics;
    public position: Vec2;
    public velocity: Vec2;
    public radius: number;

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
        this.graphics = new Graphics();

        this.draw();
        this.container.addChild(this.graphics);
        this.updatePosition();
    }

    private draw(): void {
        this.graphics.clear();

        // Shadow under mob
        this.graphics.ellipse(2, 4, this.radius * 0.9, this.radius * 0.5);
        this.graphics.fill({ color: 0x000000, alpha: 0.3 });

        // Body - main circle
        this.graphics.circle(0, 0, this.radius);
        this.graphics.fill({ color: GAME_CONFIG.MOB_COLOR });

        // Body outline
        this.graphics.circle(0, 0, this.radius);
        this.graphics.stroke({ color: 0x8b0000, width: 2 });

        // Inner body highlight
        this.graphics.circle(-4, -4, this.radius * 0.6);
        this.graphics.fill({ color: 0xff6666, alpha: 0.3 });

        // Angry eyebrows
        this.graphics.moveTo(-10, -10);
        this.graphics.lineTo(-3, -7);
        this.graphics.stroke({ color: 0x000000, width: 2 });

        this.graphics.moveTo(10, -10);
        this.graphics.lineTo(3, -7);
        this.graphics.stroke({ color: 0x000000, width: 2 });

        // Eye whites
        this.graphics.circle(-6, -3, 5);
        this.graphics.circle(6, -3, 5);
        this.graphics.fill({ color: 0xffffff });

        // Eye outline
        this.graphics.circle(-6, -3, 5);
        this.graphics.circle(6, -3, 5);
        this.graphics.stroke({ color: 0x333333, width: 1 });

        // Pupils (red for evil look)
        this.graphics.circle(-5, -2, 2.5);
        this.graphics.circle(7, -2, 2.5);
        this.graphics.fill({ color: 0x660000 });

        // Pupil highlights
        this.graphics.circle(-6, -3, 1);
        this.graphics.circle(6, -3, 1);
        this.graphics.fill({ color: 0xffffff });

        // Mouth (angry frown)
        this.graphics.moveTo(-6, 6);
        this.graphics.quadraticCurveTo(0, 3, 6, 6);
        this.graphics.stroke({ color: 0x000000, width: 2 });

        // Small fangs
        this.graphics.moveTo(-4, 6);
        this.graphics.lineTo(-3, 9);
        this.graphics.lineTo(-2, 6);
        this.graphics.fill({ color: 0xffffff });

        this.graphics.moveTo(2, 6);
        this.graphics.lineTo(3, 9);
        this.graphics.lineTo(4, 6);
        this.graphics.fill({ color: 0xffffff });
    }

    private randomDirection(): Vec2 {
        const angle = random(0, Math.PI * 2);
        return vec2(Math.cos(angle), Math.sin(angle));
    }

    public update(deltaTime: number, deltaMs: number): void {
        this.directionTimer += deltaMs;

        // Change direction periodically
        if (this.directionTimer >= GAME_CONFIG.MOB_DIRECTION_CHANGE_INTERVAL) {
            this.directionTimer = 0;
            this.targetDirection = this.randomDirection();
        }

        // Move towards target direction
        const speed = GAME_CONFIG.MOB_SPEED * deltaTime;
        this.velocity = mul(this.targetDirection, speed);
        this.position = add(this.position, this.velocity);

        // Update facing direction smoothly
        const targetAngle = Math.atan2(this.targetDirection.y, this.targetDirection.x);
        const angleDiff = targetAngle - this.moveAngle;
        this.moveAngle += angleDiff * 0.1;

        // Keep in world bounds
        const margin = this.radius + 50;
        if (this.position.x < margin) {
            this.position.x = margin;
            this.targetDirection.x = Math.abs(this.targetDirection.x);
        }
        if (this.position.x > GAME_CONFIG.WORLD_WIDTH - margin) {
            this.position.x = GAME_CONFIG.WORLD_WIDTH - margin;
            this.targetDirection.x = -Math.abs(this.targetDirection.x);
        }
        if (this.position.y < margin) {
            this.position.y = margin;
            this.targetDirection.y = Math.abs(this.targetDirection.y);
        }
        if (this.position.y > GAME_CONFIG.WORLD_HEIGHT - margin) {
            this.position.y = GAME_CONFIG.WORLD_HEIGHT - margin;
            this.targetDirection.y = -Math.abs(this.targetDirection.y);
        }

        this.updatePosition();
    }

    public updatePosition(): void {
        this.container.x = this.position.x;
        this.container.y = this.position.y;
    }

    public reverseDirection(): void {
        this.targetDirection = mul(this.targetDirection, -1);
    }
}
