// Animation configuration for player character sprites

export enum WeaponType {
    FLASHLIGHT = 'flashlight',
    KNIFE = 'knife',
    HANDGUN = 'handgun',
    RIFLE = 'rifle',
    SHOTGUN = 'shotgun',
}

export enum BodyAnimation {
    IDLE = 'idle',
    MOVE = 'move',
    SHOOT = 'shoot',
    RELOAD = 'reload',
    MELEE_ATTACK = 'meleeattack',
}

export enum FeetAnimation {
    IDLE = 'idle',
    WALK = 'walk',
    RUN = 'run',
    STRAFE_LEFT = 'strafe_left',
    STRAFE_RIGHT = 'strafe_right',
}

// Frame counts for each animation by weapon/layer
export const BODY_FRAME_COUNTS: Record<WeaponType, Record<BodyAnimation, number>> = {
    [WeaponType.FLASHLIGHT]: {
        [BodyAnimation.IDLE]: 20,
        [BodyAnimation.MOVE]: 20,
        [BodyAnimation.SHOOT]: 0, // Flashlight doesn't shoot
        [BodyAnimation.RELOAD]: 0,
        [BodyAnimation.MELEE_ATTACK]: 15,
    },
    [WeaponType.KNIFE]: {
        [BodyAnimation.IDLE]: 20,
        [BodyAnimation.MOVE]: 20,
        [BodyAnimation.SHOOT]: 0,
        [BodyAnimation.RELOAD]: 0,
        [BodyAnimation.MELEE_ATTACK]: 15,
    },
    [WeaponType.HANDGUN]: {
        [BodyAnimation.IDLE]: 20,
        [BodyAnimation.MOVE]: 20,
        [BodyAnimation.SHOOT]: 3,
        [BodyAnimation.RELOAD]: 15,
        [BodyAnimation.MELEE_ATTACK]: 15,
    },
    [WeaponType.RIFLE]: {
        [BodyAnimation.IDLE]: 20,
        [BodyAnimation.MOVE]: 20,
        [BodyAnimation.SHOOT]: 3,
        [BodyAnimation.RELOAD]: 15,
        [BodyAnimation.MELEE_ATTACK]: 15,
    },
    [WeaponType.SHOTGUN]: {
        [BodyAnimation.IDLE]: 20,
        [BodyAnimation.MOVE]: 20,
        [BodyAnimation.SHOOT]: 3,
        [BodyAnimation.RELOAD]: 15,
        [BodyAnimation.MELEE_ATTACK]: 15,
    },
};

export const FEET_FRAME_COUNTS: Record<FeetAnimation, number> = {
    [FeetAnimation.IDLE]: 1,
    [FeetAnimation.WALK]: 20,
    [FeetAnimation.RUN]: 20,
    [FeetAnimation.STRAFE_LEFT]: 20,
    [FeetAnimation.STRAFE_RIGHT]: 20,
};

// Animation playback speed (frames per second)
export const ANIMATION_FPS = {
    BODY_IDLE: 12,
    BODY_MOVE: 15,
    BODY_SHOOT: 20,
    BODY_RELOAD: 12,
    BODY_MELEE: 18,
    FEET_WALK: 15,
    FEET_RUN: 20,
    FEET_STRAFE: 15,
};

// Speed thresholds for animation selection
export const MOVEMENT_THRESHOLDS = {
    IDLE: 0.1,      // Below this = idle
    WALK: 0.5,      // Below this = walk, above = run
    STRAFE: 0.5,    // Cross product threshold for strafe detection
};

/**
 * Build sprite path for body animation
 * @example getBodySpritePath('flashlight', 'idle', 0) -> '/player/flashlight/idle/survivor-idle_flashlight_0.png'
 */
export function getBodySpritePath(weapon: WeaponType, animation: BodyAnimation, frame: number): string {
    return `/player/${weapon}/${animation}/survivor-${animation}_${weapon}_${frame}.png`;
}

/**
 * Build sprite path for feet animation
 * @example getFeetSpritePath('walk', 5) -> '/player/feet/walk/survivor-walk_5.png'
 */
export function getFeetSpritePath(animation: FeetAnimation, frame: number): string {
    const animationName = animation.replace('_', ' ').split(' ').map((part, idx) =>
        idx === 0 ? part : part
    ).join('_');

    // Handle naming convention: strafe_left -> strafe_left, walk -> walk
    const fileName = animation === FeetAnimation.IDLE
        ? `survivor-idle_${frame}.png`
        : `survivor-${animationName}_${frame}.png`;

    return `/player/feet/${animation}/${fileName}`;
}

/**
 * Get all frame paths for a body animation
 */
export function getBodyAnimationFrames(weapon: WeaponType, animation: BodyAnimation): string[] {
    const frameCount = BODY_FRAME_COUNTS[weapon][animation];
    const frames: string[] = [];

    for (let i = 0; i < frameCount; i++) {
        frames.push(getBodySpritePath(weapon, animation, i));
    }

    return frames;
}

/**
 * Get all frame paths for a feet animation
 */
export function getFeetAnimationFrames(animation: FeetAnimation): string[] {
    const frameCount = FEET_FRAME_COUNTS[animation];
    const frames: string[] = [];

    for (let i = 0; i < frameCount; i++) {
        frames.push(getFeetSpritePath(animation, i));
    }

    return frames;
}
