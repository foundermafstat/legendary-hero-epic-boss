import { Container, Graphics } from 'pixi.js';
import { Vec2, vec2, normalize, mul, add, random } from './utils/math';
import { GAME_CONFIG } from './config';

export class Mob {
    public container: Container;
    public position: Vec2;
    public velocity: Vec2;
    public radius: number;
    public hp: number = 5;
    public alive: boolean = true;

    private bodyGraphics: Graphics;
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

        // Create shadow - offset down and right for 3D effect
        this.shadowGraphics = new Graphics();
        this.shadowGraphics.ellipse(0, 0, this.radius * 0.85, this.radius * 0.4);
        this.shadowGraphics.fill({ color: 0x000000, alpha: 0.35 });
        this.shadowGraphics.y = this.radius * 0.6; // Position BELOW body center

        // Create body
        this.bodyGraphics = new Graphics();
        this.drawBody();

        // Add in correct order: shadow FIRST, then body ON TOP
        this.container.addChild(this.shadowGraphics);
        this.container.addChild(this.bodyGraphics);

        this.updatePosition();
    }

    private drawBody(): void {
        const g = this.bodyGraphics;
        g.clear();

        // Body - main circle
        g.circle(0, 0, this.radius);
        g.fill({ color: GAME_CONFIG.MOB_COLOR });

        // Body outline
        g.circle(0, 0, this.radius);
        g.stroke({ color: 0x8b0000, width: 2 });

        // Inner body highlight
        g.circle(-4, -4, this.radius * 0.6);
        g.fill({ color: 0xff6666, alpha: 0.3 });

        // Angry eyebrows
        g.moveTo(-10, -10);
        g.lineTo(-3, -7);
        g.stroke({ color: 0x000000, width: 2 });

        g.moveTo(10, -10);
        g.lineTo(3, -7);
        g.stroke({ color: 0x000000, width: 2 });

        // Eye whites
        g.circle(-6, -3, 5);
        g.circle(6, -3, 5);
        g.fill({ color: 0xffffff });

        // Eye outline
        g.circle(-6, -3, 5);
        g.circle(6, -3, 5);
        g.stroke({ color: 0x333333, width: 1 });

        // Pupils (red for evil look)
        g.circle(-5, -2, 2.5);
        g.circle(7, -2, 2.5);
        g.fill({ color: 0x660000 });

        // Pupil highlights
        g.circle(-6, -3, 1);
        g.circle(6, -3, 1);
        g.fill({ color: 0xffffff });

        // Mouth (angry frown)
        g.moveTo(-6, 6);
        g.quadraticCurveTo(0, 3, 6, 6);
        g.stroke({ color: 0x000000, width: 2 });

        // Small fangs
        g.moveTo(-4, 6);
        g.lineTo(-3, 9);
        g.lineTo(-2, 6);
        g.fill({ color: 0xffffff });

        g.moveTo(2, 6);
        g.lineTo(3, 9);
        g.lineTo(4, 6);
        g.fill({ color: 0xffffff });
    }

    private randomDirection(): Vec2 {
        const angle = random(0, Math.PI * 2);
        return vec2(Math.cos(angle), Math.sin(angle));
    }

    // Returns world position for blood splatter (caller should add to world layer)
    public takeDamage(): { died: boolean; bloodPos: Vec2 } {
        this.hp--;

        // Calculate blood position in world coordinates
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

    public update(deltaTime: number, deltaMs: number): void {
        if (!this.alive) return;

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
