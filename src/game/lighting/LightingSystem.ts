import {
    Application,
    Container,
    Graphics,
    Texture,
    Sprite
} from 'pixi.js';
import { Vec2, vec2, sub, length } from '../utils/math';
import { WallData } from '../Wall';
import { GAME_CONFIG } from '../config';
import { Lamp } from '../World';
import { castRays } from './Raycaster';

interface Circle {
    position: Vec2;
    radius: number;
}

export class LightingSystem {
    private app: Application;
    private container: Container;
    private lightCanvas: HTMLCanvasElement;
    private lightCtx: CanvasRenderingContext2D;
    private lightSprite: Sprite;
    private currentTexture: Texture | null = null;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();

        // Create offscreen canvas for light rendering
        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = app.screen.width;
        this.lightCanvas.height = app.screen.height;
        this.lightCtx = this.lightCanvas.getContext('2d')!;

        this.lightSprite = new Sprite();
        this.container.addChild(this.lightSprite);
    }

    public getContainer(): Container {
        return this.container;
    }

    public update(
        playerPos: Vec2,
        flashlightAngle: number,
        walls: WallData[],
        mobs: Circle[],
        lamps: Lamp[],
        screenWidth: number,
        screenHeight: number,
        cameraX: number,
        cameraY: number
    ): void {
        // Resize canvas if needed
        if (this.lightCanvas.width !== screenWidth || this.lightCanvas.height !== screenHeight) {
            this.lightCanvas.width = screenWidth;
            this.lightCanvas.height = screenHeight;
        }

        const ctx = this.lightCtx;

        // Clear and fill with fog color
        ctx.fillStyle = `rgba(0, 0, 0, ${GAME_CONFIG.FOG_ALPHA})`;
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // Use destination-out to cut holes in the fog
        ctx.globalCompositeOperation = 'destination-out';

        // Draw flashlight with soft edges
        this.drawFlashlight(
            ctx,
            playerPos,
            flashlightAngle,
            walls,
            mobs,
            cameraX,
            cameraY
        );

        // Draw visible lamp lights
        const viewRadius = Math.max(screenWidth, screenHeight) * 0.7;

        for (const lamp of lamps) {
            const lampPos = vec2(lamp.x, lamp.y);
            const distToPlayer = length(sub(lampPos, playerPos));

            if (distToPlayer < viewRadius + lamp.range) {
                const lampPoints = castRays(lampPos, walls, mobs, lamp.range);
                this.drawPointLight(ctx, lampPos, lampPoints, lamp.range, cameraX, cameraY);
            }
        }

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';

        // Update sprite texture
        if (this.currentTexture) {
            this.currentTexture.destroy(true);
        }
        this.currentTexture = Texture.from(this.lightCanvas);
        this.lightSprite.texture = this.currentTexture;

        // Position at camera offset
        this.lightSprite.x = -cameraX;
        this.lightSprite.y = -cameraY;
    }

    private drawFlashlight(
        ctx: CanvasRenderingContext2D,
        origin: Vec2,
        direction: number,
        walls: WallData[],
        mobs: Circle[],
        cameraX: number,
        cameraY: number
    ): void {
        const range = GAME_CONFIG.FLASHLIGHT_RANGE;
        const coneAngle = GAME_CONFIG.FLASHLIGHT_ANGLE;

        const screenX = origin.x + cameraX;
        const screenY = origin.y + cameraY;

        // Draw multiple layers with decreasing angles for soft edges
        const layers = 5;
        const edgeSoftness = coneAngle * 0.3; // 30% of cone angle is soft falloff

        for (let i = 0; i < layers; i++) {
            const t = i / (layers - 1); // 0 to 1
            const layerConeAngle = coneAngle + edgeSoftness * (1 - t);
            const layerAlpha = 0.2 + 0.8 * t; // Outer layers are more transparent

            // Cast rays for this layer
            const points = castRays(
                origin,
                walls,
                mobs,
                range,
                layerConeAngle,
                direction
            );

            if (points.length < 2) continue;

            // Create radial gradient
            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, range);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${layerAlpha})`);
            gradient.addColorStop(0.15, `rgba(255, 255, 255, ${layerAlpha * 0.9})`);
            gradient.addColorStop(0.35, `rgba(255, 255, 255, ${layerAlpha * 0.65})`);
            gradient.addColorStop(0.55, `rgba(255, 255, 255, ${layerAlpha * 0.35})`);
            gradient.addColorStop(0.75, `rgba(255, 255, 255, ${layerAlpha * 0.12})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            // Draw visibility polygon
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            for (const point of points) {
                ctx.lineTo(point.x + cameraX, point.y + cameraY);
            }
            ctx.closePath();

            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    private drawPointLight(
        ctx: CanvasRenderingContext2D,
        origin: Vec2,
        points: Vec2[],
        range: number,
        cameraX: number,
        cameraY: number
    ): void {
        if (points.length < 2) return;

        const screenX = origin.x + cameraX;
        const screenY = origin.y + cameraY;

        // Create radial gradient
        const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, range);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.65)');
        gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.35)');
        gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.12)');
        gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.03)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Draw visibility polygon with gradient
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        for (const point of points) {
            ctx.lineTo(point.x + cameraX, point.y + cameraY);
        }
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();
    }

    public destroy(): void {
        if (this.currentTexture) {
            this.currentTexture.destroy(true);
        }
        this.lightSprite.destroy();
    }
}
