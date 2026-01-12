import { Container, Sprite, Texture } from 'pixi.js';
import { Vec2, vec2, add, mul } from '../utils/math';

export class Shell {
    public position: Vec2;
    public velocity: Vec2;
    public container: Container;
    public active: boolean = true;

    private sprite: Sprite;
    private lifetime: number = 3000; // ms
    private rotationSpeed: number;
    private friction: number = 0.95;

    constructor(x: number, y: number, angle: number, texture: Texture) {
        this.position = vec2(x, y);

        // Eject mostly in shooting direction (forward-right diagonal)
        // User requested: "mostly in the direction the player is shooting"
        // Let's add small random spread to the shooting angle
        const spread = (Math.random() - 0.5) * 0.5;
        const ejectAngle = angle + spread;

        const speed = 0.1 + Math.random() * 0.15;

        this.velocity = mul(vec2(Math.cos(ejectAngle), Math.sin(ejectAngle)), speed);
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;

        this.container = new Container();
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.rotation = Math.random() * Math.PI * 2;

        this.container.addChild(this.sprite);
        this.updatePosition();
    }

    update(delta: number, deltaMs: number) {
        if (!this.active) return;

        // Apply friction
        this.velocity = mul(this.velocity, this.friction);

        this.position = add(this.position, mul(this.velocity, deltaMs));
        this.sprite.rotation += this.rotationSpeed * delta;

        this.rotationSpeed *= this.friction;

        this.updatePosition();

        this.lifetime -= deltaMs;
        if (this.lifetime < 1000) {
            this.sprite.alpha = this.lifetime / 1000;
        }

        if (this.lifetime <= 0) {
            this.active = false;
        }
    }

    private updatePosition() {
        this.container.x = this.position.x;
        this.container.y = this.position.y;
    }
}
