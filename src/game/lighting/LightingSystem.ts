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
import { FlashlightStats } from '../items/Flashlight';

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
        flashlightStats: FlashlightStats,
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

        // 1. Player Ambient Light (Fog of War)
        // A weak 360 light around player to see surroundings
        const ambientRange = 350;
        const ambientPoints = castRays(playerPos, walls, mobs, ambientRange);
        if (ambientPoints.length > 2) {
            const screenX = playerPos.x + cameraX;
            const screenY = playerPos.y + cameraY;

            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, ambientRange);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); // Center visibility
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)'); // Falloff
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            for (const point of ambientPoints) {
                ctx.lineTo(point.x + cameraX, point.y + cameraY);
            }
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // 2. Flashlight
        this.drawFlashlight(
            ctx,
            playerPos,
            flashlightAngle,
            flashlightStats,
            walls,
            mobs,
            cameraX,
            cameraY
        );

        // 3. Lamps
        const viewRadius = Math.max(screenWidth, screenHeight) * 0.7;

        for (const lamp of lamps) {
            const lampPos = vec2(lamp.x, lamp.y);
            const distToPlayer = length(sub(lampPos, playerPos));

            // View culling
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
        stats: FlashlightStats,
        walls: WallData[],
        mobs: Circle[],
        cameraX: number,
        cameraY: number
    ): void {
        const range = stats.range;
        const coneAngle = stats.angle;

        const screenX = origin.x + cameraX;
        const screenY = origin.y + cameraY;

        // OPTIMIZATION: Reduced layers from 5 to 3
        const layers = 3;
        const edgeSoftness = coneAngle * 0.2;

        for (let i = 0; i < layers; i++) {
            const t = i / (layers - 1); // 0 to 1
            const layerConeAngle = coneAngle + edgeSoftness * (1 - t);

            // Adjust alpha based on stats.intensity
            const baseAlpha = 0.3 * stats.intensity;
            const layerAlpha = baseAlpha + (1 - baseAlpha) * t;

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

            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, range);
            // Use stats color? Canvas needs string.
            // Actually this is destination-out (erasing fog), so color must be WHITE (alpha matters).
            // Color tinting should happen in a separate pass if we want colored lights.
            // For now, we are just cutting holes in the black fog.

            gradient.addColorStop(0, `rgba(255, 255, 255, ${layerAlpha})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${layerAlpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

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

        const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, range);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

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
