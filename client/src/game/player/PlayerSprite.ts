import { Container, Sprite, Texture, Assets, Graphics } from 'pixi.js';
import { Vec2, vec2, length, normalize } from '../utils/math';
import {
    WeaponType,
    BodyAnimation,
    FeetAnimation,
    BODY_FRAME_COUNTS,
    FEET_FRAME_COUNTS,
    ANIMATION_FPS,
    MOVEMENT_THRESHOLDS,
    getBodyAnimationFrames,
    getFeetAnimationFrames,
} from './AnimationConfig';

interface AnimationState {
    frames: Texture[];
    currentFrame: number;
    frameTime: number;
    fps: number;
    loop: boolean;
}

/**
 * PlayerSprite - Animated player character with two-layer rendering
 * 
 * - Body layer: Torso + weapon, rotates to aim direction
 * - Feet layer: Legs, animates based on movement relative to aim
 */
export class PlayerSprite extends Container {
    // Sprite layers
    private feetSprite: Sprite;
    private bodySprite: Sprite;
    private hpBar: Graphics;

    // Current state
    private currentWeapon: WeaponType = WeaponType.FLASHLIGHT;
    private currentBodyAnimation: BodyAnimation = BodyAnimation.IDLE;
    private currentFeetAnimation: FeetAnimation = FeetAnimation.IDLE;

    // Animation state
    private bodyAnimState: AnimationState | null = null;
    private feetAnimState: AnimationState | null = null;

    // Cached textures
    private bodyTextures: Map<string, Texture[]> = new Map();
    private feetTextures: Map<string, Texture[]> = new Map();

    // Movement tracking
    private aimAngle: number = 0;
    private moveDir: Vec2 = vec2(0, 0);
    private isMoving: boolean = false;

    // Scale for the sprites (adjust based on visual requirements)
    private spriteScale: number = 0.315;

    get isPlayingOneShot(): boolean {
        return this.bodyAnimState?.loop === false;
    }

    constructor() {
        super();

        // Create sprite placeholders
        this.feetSprite = new Sprite();
        this.bodySprite = new Sprite();
        this.hpBar = new Graphics();

        // Set anchors for proper rotation
        // Feet: center rotation
        this.feetSprite.anchor.set(0.5, 0.5);
        // Body: rotate around shoulders (1/3 from top) to prevent gap with feet
        this.bodySprite.anchor.set(0.4, 0.5);

        // Scale sprites
        this.feetSprite.scale.set(this.spriteScale);
        this.bodySprite.scale.set(this.spriteScale);

        // Position feet sprite for better visual alignment
        // Move left (15px) and back (20px) relative to body
        this.feetSprite.x = -5;
        this.feetSprite.y = 5;

        // Feet layer is below body
        this.addChild(this.feetSprite);
        this.addChild(this.bodySprite);
        this.addChild(this.hpBar);

        // Initial HP Draw (full)
        this.setHp(100, 100);
    }

    public setHp(hp: number, maxHp: number) {
        this.hpBar.clear();

        // Hide HP bar if maxHp is 0 (local player uses HUD)
        if (maxHp <= 0) {
            this.hpBar.visible = false;
            return;
        }

        this.hpBar.visible = true;

        // Background
        this.hpBar.rect(-20, -50, 40, 6);
        this.hpBar.fill({ color: 0x333333 });

        // Foreground
        const pct = Math.max(0, hp / maxHp);
        const width = 40 * pct;
        const color = pct > 0.5 ? 0x00ff00 : (pct > 0.25 ? 0xffff00 : 0xff0000);

        this.hpBar.rect(-20, -50, width, 6);
        this.hpBar.fill({ color: color });
    }


    /**
     * Preload all textures for a given weapon
     */
    async preloadTextures(weapon: WeaponType = WeaponType.FLASHLIGHT): Promise<void> {
        // Set the current weapon first
        this.currentWeapon = weapon;

        // Preload body animations
        for (const anim of Object.values(BodyAnimation)) {
            const frameCount = BODY_FRAME_COUNTS[weapon][anim];
            if (frameCount > 0) {
                const frames = getBodyAnimationFrames(weapon, anim);
                const textures = await this.loadFrames(frames);
                this.bodyTextures.set(`${weapon}_${anim}`, textures);
            }
        }

        // Preload feet animations
        for (const anim of Object.values(FeetAnimation)) {
            const frames = getFeetAnimationFrames(anim);
            const textures = await this.loadFrames(frames);
            this.feetTextures.set(anim, textures);
        }

        // Set initial animation with the loaded weapon
        this.setBodyAnimation(BodyAnimation.IDLE);
        this.setFeetAnimation(FeetAnimation.IDLE);
    }

    private async loadFrames(paths: string[]): Promise<Texture[]> {
        const textures: Texture[] = [];

        for (const path of paths) {
            try {
                const texture = await Assets.load(path);
                textures.push(texture);
            } catch (e) {
                console.warn(`Failed to load texture: ${path}`);
                // Use empty texture as fallback
                textures.push(Texture.EMPTY);
            }
        }

        return textures;
    }

    /**
     * Set body animation
     */
    setBodyAnimation(animation: BodyAnimation): void {
        if (this.currentBodyAnimation === animation && this.bodyAnimState) return;

        const key = `${this.currentWeapon}_${animation}`;
        const textures = this.bodyTextures.get(key);

        if (!textures || textures.length === 0) {
            console.warn(`No textures for body animation: ${key}`);
            return;
        }

        this.currentBodyAnimation = animation;

        // Determine FPS based on animation
        let fps = ANIMATION_FPS.BODY_IDLE;
        switch (animation) {
            case BodyAnimation.MOVE:
                fps = ANIMATION_FPS.BODY_MOVE;
                break;
            case BodyAnimation.SHOOT:
                fps = ANIMATION_FPS.BODY_SHOOT;
                break;
            case BodyAnimation.RELOAD:
                fps = ANIMATION_FPS.BODY_RELOAD;
                break;
            case BodyAnimation.MELEE_ATTACK:
                fps = ANIMATION_FPS.BODY_MELEE;
                break;
        }

        this.bodyAnimState = {
            frames: textures,
            currentFrame: 0,
            frameTime: 0,
            fps,
            loop: true,
        };

        this.bodySprite.texture = textures[0];
    }

    /**
     * Set feet animation
     */
    setFeetAnimation(animation: FeetAnimation): void {
        if (this.currentFeetAnimation === animation && this.feetAnimState) return;

        const textures = this.feetTextures.get(animation);

        if (!textures || textures.length === 0) {
            console.warn(`No textures for feet animation: ${animation}`);
            return;
        }

        this.currentFeetAnimation = animation;

        // Determine FPS based on animation
        let fps = ANIMATION_FPS.FEET_WALK;
        switch (animation) {
            case FeetAnimation.RUN:
                fps = ANIMATION_FPS.FEET_RUN;
                break;
            case FeetAnimation.STRAFE_LEFT:
            case FeetAnimation.STRAFE_RIGHT:
                fps = ANIMATION_FPS.FEET_STRAFE;
                break;
        }

        this.feetAnimState = {
            frames: textures,
            currentFrame: 0,
            frameTime: 0,
            fps,
            loop: true,
        };

        this.feetSprite.texture = textures[0];
    }

    /**
     * Update aim angle (body rotation)
     */
    setAimAngle(angle: number): void {
        this.aimAngle = angle;
        this.bodySprite.rotation = angle;
    }

    /**
     * Play shoot animation (one-shot)
     */
    playShoot(): void {
        if (!this.bodyAnimState) return;
        // Only play if not already shooting/reloading/meleeing
        if (this.bodyAnimState.loop === false) return;

        const frameCount = BODY_FRAME_COUNTS[this.currentWeapon][BodyAnimation.SHOOT];
        if (frameCount > 0) {
            this.setBodyAnimation(BodyAnimation.SHOOT);
            this.bodyAnimState.loop = false;
            // Return to move/idle after shoot animation completes
        }
    }

    /**
     * Play reload animation (one-shot)
     */
    playReload(): void {
        if (!this.bodyAnimState) return;
        if (this.bodyAnimState.loop === false) return;

        const frameCount = BODY_FRAME_COUNTS[this.currentWeapon][BodyAnimation.RELOAD];
        if (frameCount > 0) {
            this.setBodyAnimation(BodyAnimation.RELOAD);
            this.bodyAnimState.loop = false;
        }
    }

    /**
     * Play melee attack animation (one-shot)
     */
    playMeleeAttack(): void {
        if (!this.bodyAnimState) return;
        if (this.bodyAnimState.loop === false) return;

        const frameCount = BODY_FRAME_COUNTS[this.currentWeapon][BodyAnimation.MELEE_ATTACK];
        if (frameCount > 0) {
            this.setBodyAnimation(BodyAnimation.MELEE_ATTACK);
            this.bodyAnimState.loop = false;
        }
    }

    /**
     * Update movement direction and select appropriate animations
     * Only updates if not playing a one-shot animation
     */
    setMoveDirection(moveDir: Vec2): void {
        this.moveDir = moveDir;
        const speed = length(moveDir);
        this.isMoving = speed > MOVEMENT_THRESHOLDS.IDLE;

        // Don't override one-shot animations (shoot, reload, melee)
        if (this.bodyAnimState && !this.bodyAnimState.loop) {
            // Still update feet though
            this.updateFeetAnimation(speed);
            return;
        }

        // Update body animation
        if (this.isMoving) {
            if (this.currentBodyAnimation !== BodyAnimation.MOVE) {
                this.setBodyAnimation(BodyAnimation.MOVE);
            }
        } else {
            if (this.currentBodyAnimation !== BodyAnimation.IDLE) {
                this.setBodyAnimation(BodyAnimation.IDLE);
            }
        }

        this.updateFeetAnimation(speed);
    }

    /**
     * Update feet animation based on movement
     */
    private updateFeetAnimation(speed: number): void {
        // Update feet animation based on movement relative to aim
        if (!this.isMoving) {
            this.setFeetAnimation(FeetAnimation.IDLE);
            return;
        }

        // Calculate movement type based on aim direction
        const aimDir = vec2(Math.cos(this.aimAngle), Math.sin(this.aimAngle));
        const normalizedMove = normalize(this.moveDir);

        // Dot product: forward/backward detection
        const dot = normalizedMove.x * aimDir.x + normalizedMove.y * aimDir.y;

        // Cross product: left/right strafe detection
        // cross = moveX * aimY - moveY * aimX
        const cross = normalizedMove.x * aimDir.y - normalizedMove.y * aimDir.x;

        // Determine feet animation
        if (Math.abs(cross) > MOVEMENT_THRESHOLDS.STRAFE) {
            // Strafing
            if (cross > 0) {
                this.setFeetAnimation(FeetAnimation.STRAFE_RIGHT);
            } else {
                this.setFeetAnimation(FeetAnimation.STRAFE_LEFT);
            }
            // Feet should rotate to aim direction when strafing
            this.feetSprite.rotation = this.aimAngle;
        } else {
            // Forward/backward movement
            if (speed > MOVEMENT_THRESHOLDS.WALK) {
                this.setFeetAnimation(FeetAnimation.RUN);
            } else {
                this.setFeetAnimation(FeetAnimation.WALK);
            }
            // Feet rotate to movement direction
            const moveAngle = Math.atan2(normalizedMove.y, normalizedMove.x);
            this.feetSprite.rotation = moveAngle;
        }
    }

    /**
     * Update animation frame
     */
    update(deltaMs: number): void {
        // Update body animation
        if (this.bodyAnimState && this.bodyAnimState.frames.length > 1) {
            this.bodyAnimState.frameTime += deltaMs;
            const frameDuration = 1000 / this.bodyAnimState.fps;

            if (this.bodyAnimState.frameTime >= frameDuration) {
                this.bodyAnimState.frameTime -= frameDuration;
                this.bodyAnimState.currentFrame++;

                if (this.bodyAnimState.currentFrame >= this.bodyAnimState.frames.length) {
                    if (this.bodyAnimState.loop) {
                        this.bodyAnimState.currentFrame = 0;
                    } else {
                        // One-shot animation completed, return to idle/move
                        this.bodyAnimState.currentFrame = this.bodyAnimState.frames.length - 1;
                        this.bodyAnimState.loop = true; // Reset loop flag
                        // Return to appropriate animation
                        if (this.isMoving) {
                            this.setBodyAnimation(BodyAnimation.MOVE);
                        } else {
                            this.setBodyAnimation(BodyAnimation.IDLE);
                        }
                    }
                }

                this.bodySprite.texture = this.bodyAnimState.frames[this.bodyAnimState.currentFrame];
            }
        }

        // Update feet animation
        if (this.feetAnimState && this.feetAnimState.frames.length > 1) {
            this.feetAnimState.frameTime += deltaMs;
            const frameDuration = 1000 / this.feetAnimState.fps;

            if (this.feetAnimState.frameTime >= frameDuration) {
                this.feetAnimState.frameTime -= frameDuration;
                this.feetAnimState.currentFrame++;

                if (this.feetAnimState.currentFrame >= this.feetAnimState.frames.length) {
                    if (this.feetAnimState.loop) {
                        this.feetAnimState.currentFrame = 0;
                    } else {
                        this.feetAnimState.currentFrame = this.feetAnimState.frames.length - 1;
                    }
                }

                this.feetSprite.texture = this.feetAnimState.frames[this.feetAnimState.currentFrame];
            }
        }
    }

    /**
     * Set current weapon (changes body animations)
     */
    async setWeapon(weapon: WeaponType): Promise<void> {
        if (this.currentWeapon === weapon) return;

        // Preload new weapon textures if not already loaded
        const testKey = `${weapon}_${BodyAnimation.IDLE}`;
        if (!this.bodyTextures.has(testKey)) {
            for (const anim of Object.values(BodyAnimation)) {
                const frameCount = BODY_FRAME_COUNTS[weapon][anim];
                if (frameCount > 0) {
                    const frames = getBodyAnimationFrames(weapon, anim);
                    const textures = await this.loadFrames(frames);
                    this.bodyTextures.set(`${weapon}_${anim}`, textures);
                }
            }
        }

        this.currentWeapon = weapon;

        // Reset to current animation with new weapon
        const currentAnim = this.currentBodyAnimation;
        this.currentBodyAnimation = BodyAnimation.IDLE; // Force reset
        this.setBodyAnimation(currentAnim);
    }

    /**
     * Destroy and cleanup
     */
    destroy(): void {
        this.bodyTextures.clear();
        this.feetTextures.clear();
        super.destroy({ children: true });
    }
}
