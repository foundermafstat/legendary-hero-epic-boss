import { Container, Sprite, Texture } from 'pixi.js';
import { Vec2, vec2, add, mul, normalize } from '../utils/math';

export class Bullet {
    public position: Vec2;
    public velocity: Vec2;
    public container: Container;
    public active: boolean = true;
    public radius: number = 3;

    private sprite: Sprite;
    private lifetime: number = 2000; // ms
    private speed: number = 0.8; // px/ms

    constructor(x: number, y: number, angle: number, texture: Texture) {
        this.position = vec2(x, y);
        this.velocity = mul(vec2(Math.cos(angle), Math.sin(angle)), this.speed);

        this.container = new Container();
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.rotation = angle;

        this.container.addChild(this.sprite);
        this.updatePosition();
    }

    update(delta: number, deltaMs: number) {
        if (!this.active) return;

        this.position = add(this.position, mul(this.velocity, deltaMs));
        this.updatePosition();

        this.lifetime -= deltaMs;
        if (this.lifetime <= 0) {
            this.active = false;
        }
    }

    private updatePosition() {
        this.container.x = this.position.x;
        this.container.y = this.position.y;
    }
}
