// Weapon configuration and stats

import { WeaponType } from '../player/AnimationConfig';

export interface WeaponStats {
    name: string;
    icon: string;
    hasLight: boolean;
    canShoot: boolean;
    canMelee: boolean;
    magazineSize: number;        // 0 = infinite or N/A
    fireRate: number;            // ms between shots (lower = faster)
    reloadTime: number;          // ms to reload
    damage: number;              // Damage per hit
    spread: number;              // Angle spread in radians (0 = single bullet)
    bulletsPerShot: number;      // How many bullets per shot
    tracerSize: number;          // 0.5-2.0 multiplier for tracer visuals
}

export const WEAPON_STATS: Record<WeaponType, WeaponStats> = {
    [WeaponType.KNIFE]: {
        name: 'Knife',
        icon: '🔪',
        hasLight: false,
        canShoot: false,
        canMelee: true,
        magazineSize: 0,
        fireRate: 500,           // Melee swing cooldown
        reloadTime: 0,
        damage: 25,
        spread: 0,
        bulletsPerShot: 0,
        tracerSize: 0,
    },
    [WeaponType.FLASHLIGHT]: {
        name: 'Flashlight',
        icon: '🔦',
        hasLight: true,
        canShoot: false,
        canMelee: false,
        magazineSize: 0,
        fireRate: 0,
        reloadTime: 0,
        damage: 0,
        spread: 0,
        bulletsPerShot: 0,
        tracerSize: 0,
    },
    [WeaponType.HANDGUN]: {
        name: 'Handgun',
        icon: '🔫',
        hasLight: false,
        canShoot: true,
        canMelee: false,
        magazineSize: 10,
        fireRate: 350,           // Slower than rifle
        reloadTime: 1500,
        damage: 2,
        spread: 0,
        bulletsPerShot: 1,
        tracerSize: 0.7,         // Smaller tracer
    },
    [WeaponType.RIFLE]: {
        name: 'Rifle',
        icon: '🔫',
        hasLight: false,
        canShoot: true,
        canMelee: false,
        magazineSize: 30,
        fireRate: 120,           // Current fast fire rate
        reloadTime: 2000,
        damage: 1,
        spread: 0,
        bulletsPerShot: 1,
        tracerSize: 1.0,
    },
    [WeaponType.SHOTGUN]: {
        name: 'Shotgun',
        icon: '💥',
        hasLight: false,
        canShoot: true,
        canMelee: false,
        magazineSize: 6,
        fireRate: 800,           // Slower
        reloadTime: 2500,
        damage: 3,
        spread: Math.PI / 6,     // 30 degree spread
        bulletsPerShot: 5,       // Pellets
        tracerSize: 0.5,         // Smaller pellet tracers
    },
};

// Key bindings for weapon selection
export const WEAPON_KEYBINDS: Record<string, WeaponType> = {
    '1': WeaponType.KNIFE,
    '2': WeaponType.FLASHLIGHT,
    '3': WeaponType.HANDGUN,
    '4': WeaponType.RIFLE,
    '5': WeaponType.SHOTGUN,
};

// Weapon order for UI display
export const WEAPON_ORDER: WeaponType[] = [
    WeaponType.KNIFE,
    WeaponType.FLASHLIGHT,
    WeaponType.HANDGUN,
    WeaponType.RIFLE,
    WeaponType.SHOTGUN,
];
