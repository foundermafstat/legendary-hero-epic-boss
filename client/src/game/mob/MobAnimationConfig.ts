export enum MobAnimation {
    IDLE = 'idle',
    MOVE = 'move',
    ATTACK = 'attack',
}

// Frame counts based on file listings:
// idle: 17 files (0-16)
// move: 17 files (0-16)
// attack: 9 files (0-8)
export const MOB_FRAME_COUNTS: Record<MobAnimation, number> = {
    [MobAnimation.IDLE]: 17,
    [MobAnimation.MOVE]: 17,
    [MobAnimation.ATTACK]: 9,
};

export const MOB_ANIMATION_FPS = {
    IDLE: 12,
    MOVE: 15,
    ATTACK: 12,
};

// Base path for zombie assets
const BASE_PATH = '/zombie';

export function getMobSpritePath(animation: MobAnimation, frame: number): string {
    // Files are named like: skeleton-idle_0.png, skeleton-move_1.png, skeleton-attack_0.png
    return `${BASE_PATH}/${animation}/skeleton-${animation}_${frame}.png`;
}

export function getMobAnimationFrames(animation: MobAnimation): string[] {
    const frameCount = MOB_FRAME_COUNTS[animation];
    const frames: string[] = [];

    for (let i = 0; i < frameCount; i++) {
        frames.push(getMobSpritePath(animation, i));
    }

    return frames;
}
