import { GAME_CONFIG } from '../config';

export enum FlashlightTier {
    COMMON = 'Common',
    UNCOMMON = 'Uncommon',
    RARE = 'Rare',
    EPIC = 'Epic',
    LEGENDARY = 'Legendary',
}

export interface FlashlightStats {
    tier: FlashlightTier;
    color: string;
    range: number;
    angle: number; // Half-angle in radians
    intensity: number;
    name: string;
}

export const FLASHLIGHT_TIERS: Record<FlashlightTier, FlashlightStats> = {
    [FlashlightTier.COMMON]: {
        tier: FlashlightTier.COMMON,
        color: '#CCCCCC', // Dim white
        range: GAME_CONFIG.FLASHLIGHT_RANGE * 0.8,
        angle: GAME_CONFIG.FLASHLIGHT_ANGLE * 0.8,
        intensity: 0.6,
        name: 'Rusty Flashlight'
    },
    [FlashlightTier.UNCOMMON]: {
        tier: FlashlightTier.UNCOMMON,
        color: '#88FF88', // Greenish
        range: GAME_CONFIG.FLASHLIGHT_RANGE,
        angle: GAME_CONFIG.FLASHLIGHT_ANGLE,
        intensity: 0.8,
        name: 'Standard Flashlight'
    },
    [FlashlightTier.RARE]: {
        tier: FlashlightTier.RARE,
        color: '#8888FF', // Blueish
        range: GAME_CONFIG.FLASHLIGHT_RANGE * 1.2,
        angle: GAME_CONFIG.FLASHLIGHT_ANGLE * 1.1,
        intensity: 1.0,
        name: 'Tactical Flashlight'
    },
    [FlashlightTier.EPIC]: {
        tier: FlashlightTier.EPIC,
        color: '#A020F0', // Purple
        range: GAME_CONFIG.FLASHLIGHT_RANGE * 1.5,
        angle: GAME_CONFIG.FLASHLIGHT_ANGLE * 1.25,
        intensity: 1.2,
        name: 'Military Flashlight'
    },
    [FlashlightTier.LEGENDARY]: {
        tier: FlashlightTier.LEGENDARY,
        color: '#FFA500', // Orange/Gold
        range: GAME_CONFIG.FLASHLIGHT_RANGE * 2.0,
        angle: GAME_CONFIG.FLASHLIGHT_ANGLE * 1.5,
        intensity: 1.5,
        name: 'Sun God\'s Lantern'
    },
};
