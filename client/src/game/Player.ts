import { Container } from 'pixi.js';
import { Vec2, vec2, normalize, add, mul, sub } from './utils/math';
import { GAME_CONFIG } from './config';
import { FlashlightStats, FLASHLIGHT_TIERS, FlashlightTier } from './items/Flashlight';

export class Player {
    public position: Vec2;
    public velocity: Vec2;
    public radius: number = GAME_CONFIG.PLAYER_RADIUS;
    public baseSpeed: number = GAME_CONFIG.PLAYER_SPEED;
    public container: Container;

    public flashlightAngle: number = 0;
    public equippedFlashlight: FlashlightStats;

    private keys: Set<string> = new Set();

    constructor(x: number, y: number) {
        this.position = vec2(x, y);
        this.velocity = vec2(0, 0);
        this.container = new Container();

        // Default loadout
        this.equippedFlashlight = FLASHLIGHT_TIERS[FlashlightTier.COMMON];

        // Setup input listeners
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => this.keys.add(e.code));
            window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        }

        this.updatePosition();
    }

    update(delta: number) {
        // Reset velocity
        let moveDir = vec2(0, 0);

        // WASD movement
        if (this.keys.has('KeyW')) moveDir.y -= 1;
        if (this.keys.has('KeyS')) moveDir.y += 1;
        if (this.keys.has('KeyA')) moveDir.x -= 1;
        if (this.keys.has('KeyD')) moveDir.x += 1;

        // Normalize and scale
        if (moveDir.x !== 0 || moveDir.y !== 0) {
            moveDir = normalize(moveDir);

            // Tactical movement speed modifier
            // Calculate dot product between movement direction and aim direction
            const aimDir = vec2(Math.cos(this.flashlightAngle), Math.sin(this.flashlightAngle));
            const dot = moveDir.x * aimDir.x + moveDir.y * aimDir.y;

            // Formula: Forward (+1) -> 1.0, Side (0) -> 0.7, Back (-1) -> 0.4
            // Range map: [-1, 1] -> [0.4, 1.0]
            // Scale: 1 unit of dot = 0.3 speed diff?
            // dot=1 -> 0.7 + 0.3 = 1.0
            // dot=0 -> 0.7
            // dot=-1 -> 0.7 - 0.3 = 0.4
            const speedModifier = 0.7 + 0.3 * dot;

            const currentSpeed = this.baseSpeed * speedModifier;

            this.velocity = mul(moveDir, currentSpeed * delta);
            this.position = add(this.position, this.velocity);

            // Keep in world bounds
            const margin = this.radius + 10;
            this.position.x = Math.max(margin, Math.min(GAME_CONFIG.WORLD_WIDTH - margin, this.position.x));
            this.position.y = Math.max(margin, Math.min(GAME_CONFIG.WORLD_HEIGHT - margin, this.position.y));

            this.updatePosition();
        } else {
            this.velocity = vec2(0, 0);
        }
    }

    updateMousePosition(mouseX: number, mouseY: number) {
        this.flashlightAngle = Math.atan2(
            mouseY - this.position.y,
            mouseX - this.position.x
        );
    }

    updatePosition() {
        this.container.x = this.position.x;
        this.container.y = this.position.y;
    }

    destroy() {
        // Cleanup listeners could go here
    }

    equipFlashlight(tier: FlashlightTier) {
        this.equippedFlashlight = FLASHLIGHT_TIERS[tier];
    }

    // Get world position for weapon muzzle (Right side offset)
    getWeaponPosition(): Vec2 {
        // Forward 25, Right 10
        const forward = vec2(Math.cos(this.flashlightAngle), Math.sin(this.flashlightAngle));
        const right = vec2(-Math.sin(this.flashlightAngle), Math.cos(this.flashlightAngle)); // Perpendicular

        // Pos + Forward*25 + Right*10
        const offset = add(mul(forward, 25), mul(right, 10));
        return add(this.position, offset);
    }

    // Get local position for muzzle flash (relative to container)
    getWeaponLocalPosition(): Vec2 {
        const forward = vec2(Math.cos(this.flashlightAngle), Math.sin(this.flashlightAngle));
        const right = vec2(-Math.sin(this.flashlightAngle), Math.cos(this.flashlightAngle));
        return add(mul(forward, 25), mul(right, 10));
    }

    // Get world position for flashlight beam origin (Left side offset)
    getFlashlightPosition(): Vec2 {
        // Forward 25, Left 10
        const forward = vec2(Math.cos(this.flashlightAngle), Math.sin(this.flashlightAngle));
        const right = vec2(-Math.sin(this.flashlightAngle), Math.cos(this.flashlightAngle));

        // Pos + Forward*25 - Right*10
        const offset = sub(mul(forward, 25), mul(right, 10));
        return add(this.position, offset);
    }
}
