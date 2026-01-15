import { Container, Sprite, Texture, Assets } from 'pixi.js';
import {
    MobAnimation,
    MOB_ANIMATION_FPS,
    getMobAnimationFrames,
} from './MobAnimationConfig';

interface AnimationState {
    frames: Texture[];
    currentFrame: number;
    frameTime: number;
    fps: number;
    loop: boolean;
}

export class MobSprite extends Container {
    private sprite: Sprite;
    private currentAnimation: MobAnimation = MobAnimation.IDLE;
    private animState: AnimationState | null = null;
    private textures: Map<MobAnimation, Texture[]> = new Map();

    public get isPlayingOneShot(): boolean {
        return !!this.onAnimationComplete;
    }

    // Scale for visual size adjustment
    // Original assets might be large, adjusting to fit ~30-40px radius
    private spriteScale: number = 0.25;

    // Callback when non-looping animation finishes
    public onAnimationComplete?: () => void;

    constructor() {
        super();

        this.sprite = new Sprite();
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.scale.set(this.spriteScale);

        // Shadow will be handled by parent Mob clsss or we can add it here.
        // For now, simple sprite setup.

        this.addChild(this.sprite);
    }

    async preload(): Promise<void> {
        for (const anim of Object.values(MobAnimation)) {
            const frames = getMobAnimationFrames(anim);
            const loadedTextures = await this.loadFrames(frames);
            this.textures.set(anim, loadedTextures);
        }

        // Initialize with Idle
        this.play(MobAnimation.IDLE);
    }

    private async loadFrames(paths: string[]): Promise<Texture[]> {
        const textures: Texture[] = [];
        for (const path of paths) {
            try {
                const texture = await Assets.load(path);
                textures.push(texture);
            } catch (e) {
                console.warn(`Failed to load mob texture: ${path}`);
                textures.push(Texture.EMPTY);
            }
        }
        return textures;
    }

    public play(animation: MobAnimation, loop: boolean = true) {
        if (this.currentAnimation === animation && this.animState) return;

        const textures = this.textures.get(animation);
        if (!textures || textures.length === 0) {
            // If not loaded yet, just set state for when it loads? 
            // Or warn. Preload should be called first.
            return;
        }

        this.currentAnimation = animation;

        let fps = MOB_ANIMATION_FPS.IDLE;
        switch (animation) {
            case MobAnimation.MOVE: fps = MOB_ANIMATION_FPS.MOVE; break;
            case MobAnimation.ATTACK: fps = MOB_ANIMATION_FPS.ATTACK; break;
        }

        this.animState = {
            frames: textures,
            currentFrame: 0,
            frameTime: 0,
            fps,
            loop
        };

        this.sprite.texture = textures[0];
    }

    public update(deltaMs: number) {
        if (!this.animState || this.animState.frames.length <= 1) return;

        this.animState.frameTime += deltaMs;
        const frameDuration = 1000 / this.animState.fps;

        if (this.animState.frameTime >= frameDuration) {
            this.animState.frameTime -= frameDuration;
            this.animState.currentFrame++;

            if (this.animState.currentFrame >= this.animState.frames.length) {
                if (this.animState.loop) {
                    this.animState.currentFrame = 0;
                } else {
                    this.animState.currentFrame = this.animState.frames.length - 1;
                    if (this.onAnimationComplete) {
                        this.onAnimationComplete();
                    }
                }
            }

            this.sprite.texture = this.animState.frames[this.animState.currentFrame];
        }
    }

    public setRotation(angle: number) {
        this.sprite.rotation = angle;
    }

    public setTint(color: number) {
        this.sprite.tint = color;
    }
}
