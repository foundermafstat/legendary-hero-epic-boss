import { Container, Graphics } from 'pixi.js';
import { Vec2, vec2, normalize, mul, add, angleBetween } from './utils/math';
import { GAME_CONFIG } from './config';

export class Player {
    public container: Container;
    public graphics: Graphics;
    public position: Vec2;
    public velocity: Vec2;
    public radius: number;
    public flashlightAngle: number = 0;

    private keys: Set<string> = new Set();

    constructor(x: number, y: number) {
        this.position = vec2(x, y);
        this.velocity = vec2(0, 0);
        this.radius = GAME_CONFIG.PLAYER_RADIUS;

        this.container = new Container();
        this.graphics = new Graphics();

        this.draw();
        this.container.addChild(this.graphics);
        this.updatePosition();

        this.setupInput();
    }

    private draw(): void {
        this.graphics.clear();

        // Body
        this.graphics.circle(0, 0, this.radius);
        this.graphics.fill({ color: GAME_CONFIG.PLAYER_COLOR });

        // Direction indicator
        this.graphics.circle(this.radius * 0.5, 0, 5);
        this.graphics.fill({ color: 0xffffff });
    }

    private setupInput(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });
    }

    public updateMousePosition(worldMouseX: number, worldMouseY: number): void {
        this.flashlightAngle = angleBetween(this.position, vec2(worldMouseX, worldMouseY));
        this.graphics.rotation = this.flashlightAngle;
    }

    public update(deltaTime: number): void {
        let dx = 0;
        let dy = 0;

        if (this.keys.has('w') || this.keys.has('ц')) dy -= 1;
        if (this.keys.has('s') || this.keys.has('ы')) dy += 1;
        if (this.keys.has('a') || this.keys.has('ф')) dx -= 1;
        if (this.keys.has('d') || this.keys.has('в')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const dir = normalize(vec2(dx, dy));
            const speed = GAME_CONFIG.PLAYER_SPEED * deltaTime;
            this.velocity = mul(dir, speed);
            this.position = add(this.position, this.velocity);
        } else {
            this.velocity = vec2(0, 0);
        }

        // Keep in world bounds
        const margin = this.radius + 10;
        this.position.x = Math.max(margin, Math.min(GAME_CONFIG.WORLD_WIDTH - margin, this.position.x));
        this.position.y = Math.max(margin, Math.min(GAME_CONFIG.WORLD_HEIGHT - margin, this.position.y));

        this.updatePosition();
    }

    public updatePosition(): void {
        this.container.x = this.position.x;
        this.container.y = this.position.y;
    }

    public destroy(): void {
        // Clean up event listeners if needed
    }
}
