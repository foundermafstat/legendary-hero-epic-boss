import { Container, Graphics } from 'pixi.js';
import { Vec2, vec2 } from '../utils/math';
import { FlashlightStats, FLASHLIGHT_TIERS, FlashlightTier } from './Flashlight';

export class FlashlightPickup {
    public container: Container;
    public position: Vec2;
    public stats: FlashlightStats;
    public collected: boolean = false;
    public radius: number = 15;

    private graphics: Graphics;
    private glowPhase: number = 0;

    constructor(x: number, y: number, tier: FlashlightTier) {
        this.position = vec2(x, y);
        this.stats = FLASHLIGHT_TIERS[tier];

        this.container = new Container();
        this.graphics = new Graphics();

        this.draw();
        this.container.addChild(this.graphics);
        this.updatePosition();
    }

    private getTierColor(): number {
        switch (this.stats.tier) {
            case FlashlightTier.COMMON: return 0xCCCCCC;
            case FlashlightTier.UNCOMMON: return 0x00FF00;
            case FlashlightTier.RARE: return 0x0088FF;
            case FlashlightTier.EPIC: return 0xA020F0;
            case FlashlightTier.LEGENDARY: return 0xFFA500;
            default: return 0xFFFFFF;
        }
    }

    private draw(): void {
        this.graphics.clear();

        const color = this.getTierColor();

        // Glow effect
        this.graphics.circle(0, 0, this.radius + 5);
        this.graphics.fill({ color: color, alpha: 0.2 });

        // Main body
        this.graphics.circle(0, 0, this.radius);
        this.graphics.fill({ color: 0x333333 });
        this.graphics.stroke({ color: color, width: 3 });

        // Flashlight icon
        this.graphics.rect(-4, -8, 8, 12);
        this.graphics.fill({ color: 0x666666 });
        this.graphics.circle(0, 6, 4);
        this.graphics.fill({ color: color });
    }

    public update(deltaMs: number): void {
        if (this.collected) return;

        // Pulsing glow animation
        this.glowPhase += deltaMs * 0.003;
        const scale = 1 + Math.sin(this.glowPhase) * 0.1;
        this.container.scale.set(scale);
    }

    public updatePosition(): void {
        this.container.x = this.position.x;
        this.container.y = this.position.y;
    }
}
