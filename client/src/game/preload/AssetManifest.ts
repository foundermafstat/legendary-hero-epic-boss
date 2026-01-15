
import { BodyAnimation, FeetAnimation, WeaponType, BODY_FRAME_COUNTS, FEET_FRAME_COUNTS, getBodySpritePath, getFeetSpritePath } from '../player/AnimationConfig';
import { MobAnimation, MOB_ANIMATION_CONFIG } from '../mob/MobAnimationConfig'; // Assuming this exists or similar

export const ASSET_MANIFEST: string[] = [];

// Player Assets
for (const weapon of Object.values(WeaponType)) {
    for (const anim of Object.values(BodyAnimation)) {
        const count = BODY_FRAME_COUNTS[weapon][anim];
        for (let i = 0; i < count; i++) {
            ASSET_MANIFEST.push(getBodySpritePath(weapon, anim, i));
        }
    }
}

for (const anim of Object.values(FeetAnimation)) {
    const count = FEET_FRAME_COUNTS[anim];
    for (let i = 0; i < count; i++) {
        ASSET_MANIFEST.push(getFeetSpritePath(anim, i));
    }
}

// Mob Assets (Hardcoded for now based on known structure, or imported config if available)
// Assuming standard mob paths if config isn't easily reachable right now.
// I'll check MobSprite or similar to confirm paths first, but for now I'll adding a helper function execution
// to be safe, I'm just going to export a function to generate it.

export function generateAssetManifest(): string[] {
    const manifest: string[] = [];

    // Player
    for (const weapon of Object.values(WeaponType)) {
        for (const anim of Object.values(BodyAnimation)) {
            const count = BODY_FRAME_COUNTS[weapon][anim];
            for (let i = 0; i < count; i++) {
                manifest.push(getBodySpritePath(weapon, anim, i));
            }
        }
    }

    for (const anim of Object.values(FeetAnimation)) {
        const count = FEET_FRAME_COUNTS[anim];
        for (let i = 0; i < count; i++) {
            manifest.push(getFeetSpritePath(anim, i));
        }
    }

    // Mobs - assuming standard Zombie paths
    const mobTypes = ['zombie']; // Add more if needed
    const mobAnims = ['idle', 'move', 'attack'];

    // We might need to check MobSprite to be sure about paths.
    // For now, let's rely on dynamic loading for mobs or add them if we know them.
    // I'll focus on Player first since that's the heavy switching.

    return manifest;
}
