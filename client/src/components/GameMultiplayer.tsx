'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Container, Graphics, Assets } from 'pixi.js';
import { LightingSystem } from '@/game/lighting/LightingSystem';
import { FXManager } from '@/game/fx/FXManager';
import { soundManager } from '@/game/audio/SoundManager';
import { Joystick } from '@/game/ui/Joystick';
import { NetworkManager } from '@/network/NetworkManager';
import { GameState, PlayerInput, WorldData, Vec2 } from '@/network/types';
import { GAME_CONFIG } from '@/network/config';
import { vec2, length, sub, lerp } from '@/game/utils/math';
import { FLASHLIGHT_TIERS } from '@/game/items/Flashlight';
import { PlayerSprite } from '@/game/player/PlayerSprite';
import { WeaponType } from '@/game/player/AnimationConfig';
import { MobSprite } from '@/game/mob/MobSprite';
import { MobAnimation } from '@/game/mob/MobAnimationConfig';
import { hasLineOfSight } from '@/game/lighting/Raycaster';
import { WEAPON_STATS, WEAPON_KEYBINDS } from '@/game/items/WeaponConfig';
import GameHUD from './GameHUD';
import { LoadingScreen } from './LoadingScreen';
import { generateAssetManifest } from '@/game/preload/AssetManifest';

export default function GameMultiplayer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const [autoFire, setAutoFire] = useState(false);
    const autoFireRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true); // Network loading
    const [fps, setFps] = useState(0);
    const [connected, setConnected] = useState(false);
    const [playerId, setPlayerId] = useState<string>('');
    const [debugWorldData, setDebugWorldData] = useState<WorldData | null>(null);

    // Asset Loading State
    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const gameStartedRef = useRef(false);

    // Weapon & Combat State
    const [currentWeapon, setCurrentWeapon] = useState<WeaponType>(WeaponType.RIFLE);
    const [ammo, setAmmo] = useState(30);
    const [isReloading, setIsReloading] = useState(false);
    const [playerHp, setPlayerHp] = useState(100);
    const currentWeaponRef = useRef<WeaponType>(WeaponType.RIFLE);
    const ammoRef = useRef(30);
    const isReloadingRef = useRef(false);
    const lastShotTimeRef = useRef(0);
    const lastMeleeTimeRef = useRef(0);
    const localPlayerSpriteRef = useRef<PlayerSprite | null>(null);

    const networkRef = useRef<NetworkManager>(new NetworkManager());
    const inputRef = useRef<PlayerInput>({
        moveDir: vec2(0, 0),
        aimAngle: 0,
        isShooting: false,
    });

    const toggleAutoFire = () => {
        const newVal = !autoFireRef.current;
        autoFireRef.current = newVal;
        setAutoFire(newVal);
    };

    const handleAggroAll = () => {
        networkRef.current.aggroAll();
    };

    const handleWeaponSelect = useCallback((weapon: WeaponType) => {
        if (isReloadingRef.current) return; // Can't switch while reloading
        const stats = WEAPON_STATS[weapon];
        setCurrentWeapon(weapon);
        currentWeaponRef.current = weapon;
        setAmmo(stats.magazineSize || 0);
        ammoRef.current = stats.magazineSize || 0;

        // Update player sprite to use new weapon animations
        if (localPlayerSpriteRef.current) {
            localPlayerSpriteRef.current.setWeapon(weapon);
        }
    }, []);

    const startReload = useCallback(() => {
        const stats = WEAPON_STATS[currentWeaponRef.current];
        if (!stats.canShoot || stats.magazineSize === 0) return;
        if (isReloadingRef.current) return;
        if (ammoRef.current >= stats.magazineSize) return;
        if (localPlayerSpriteRef.current?.isPlayingOneShot) return; // Prevent reload if busy

        isReloadingRef.current = true;
        setIsReloading(true);

        // Play reload animation
        if (localPlayerSpriteRef.current) {
            localPlayerSpriteRef.current.playReload();
        }

        setTimeout(() => {
            ammoRef.current = stats.magazineSize;
            setAmmo(stats.magazineSize);
            isReloadingRef.current = false;
            setIsReloading(false);
        }, stats.reloadTime);
    }, []);



    useEffect(() => {
        if (!containerRef.current) return;

        let mounted = true;
        const network = networkRef.current;

        const init = async () => {
            const app = new Application();

            await app.init({
                background: 0x000000,
                resizeTo: window,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });

            if (!mounted) {
                app.destroy(true);
                return;
            }

            // Asset Loading
            const manifest = generateAssetManifest();
            const totalAssets = manifest.length;
            let loadedCount = 0;

            if (totalAssets > 0) {
                // Ensure we don't try to load same asset twice if strict
                const uniqueManifest = [...new Set(manifest)];

                // Load assets in chunks or one by one to track progress
                // Pixi Assets.load handles caching, so calling it individually is fine for progress bar
                for (const url of uniqueManifest) {
                    try {
                        await Assets.load(url);
                        loadedCount++;
                        setLoadingProgress((loadedCount / uniqueManifest.length) * 100);
                    } catch (e) {
                        console.error(`Failed to load asset: ${url}`, e);
                    }
                }
            }

            setLoadingProgress(100);
            setAssetsLoaded(true);

            // Wait for user to start game
            // We'll attach the canvas but maybe hide it or just overlay the loading screen
            appRef.current = app;
            containerRef.current?.appendChild(app.canvas);

            // Game container
            const gameContainer = new Container();
            app.stage.addChild(gameContainer); // FIX: Add to stage!

            const worldContainer = new Container();

            // Separate entity layers for proper z-order
            const bulletsContainer = new Container();
            const mobsContainer = new Container();
            const playersContainer = new Container();

            gameContainer.addChild(worldContainer);

            // FX Manager (corpses, blood, shells)
            const fxManager = new FXManager(app);
            gameContainer.addChild(fxManager.container);

            // Bullets layer (BELOW lighting so they get hidden in dark)
            gameContainer.addChild(bulletsContainer);

            // Lighting system
            const lighting = new LightingSystem(app);
            const lightingContainer = lighting.getContainer();
            gameContainer.addChild(lightingContainer);

            // Mobs layer (Above lighting, seemingly for manual tinting)
            gameContainer.addChild(mobsContainer);

            // Players on top
            gameContainer.addChild(playersContainer);

            // Player sprites
            const playerSprites = new Map<string, PlayerSprite>();
            const playerVelocities = new Map<string, Vec2>();
            const mobContainers = new Map<string, Container>();
            const mobAnimSprites = new Map<string, MobSprite>();
            const mobAngles = new Map<string, number>();
            const mobLightLevels = new Map<string, number>(); // Tracking current visibility (0 to 1)
            const bulletSprites = new Map<string, Graphics>();

            let worldData: WorldData | null = null;
            let lastState: GameState | null = null;

            // Receive world data
            network.onWorldData((data) => {
                worldData = data;
                setDebugWorldData(data);
                console.log('Received world data:', data);

                // Clear world container
                worldContainer.removeChildren();

                // Draw floor
                const floor = new Graphics();
                floor.rect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
                floor.fill({ color: GAME_CONFIG.FLOOR_COLOR });

                // Grid lines
                for (let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += GAME_CONFIG.TILE_SIZE) {
                    floor.moveTo(x, 0);
                    floor.lineTo(x, GAME_CONFIG.WORLD_HEIGHT);
                }
                for (let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += GAME_CONFIG.TILE_SIZE) {
                    floor.moveTo(0, y);
                    floor.lineTo(GAME_CONFIG.WORLD_WIDTH, y);
                }
                floor.stroke({ color: GAME_CONFIG.GRID_COLOR, width: 1 });
                worldContainer.addChild(floor);

                // Draw walls
                for (const wall of data.walls) {
                    const wallGraphic = new Graphics();
                    wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
                    wallGraphic.fill({ color: 0x000000 });
                    wallGraphic.stroke({ color: 0x111111, width: 1 });
                    worldContainer.addChild(wallGraphic);
                }

                // Draw lamps
                for (const lamp of data.lamps) {
                    const lampGraphic = new Graphics();
                    lampGraphic.circle(lamp.x, lamp.y, 8);
                    lampGraphic.fill({ color: 0xffaa00 });
                    worldContainer.addChild(lampGraphic);
                }
            });

            // Input Stage
            const inputStage = new Container();
            inputStage.hitArea = app.screen;
            inputStage.eventMode = 'static';

            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let isMouseDown = false;

            inputStage.on('pointerdown', () => (isMouseDown = true));
            inputStage.on('pointerup', () => (isMouseDown = false));
            inputStage.on('pointerupoutside', () => (isMouseDown = false));
            inputStage.on('globalmousemove', (e) => {
                mouseX = e.global.x;
                mouseY = e.global.y;
            });

            app.stage.addChild(inputStage);
            app.stage.addChild(gameContainer);

            // UI Layer
            const uiContainer = new Container();
            app.stage.addChild(uiContainer);

            const leftJoystick = new Joystick(60, 30);
            const rightJoystick = new Joystick(60, 30);

            const margin = 100;
            leftJoystick.x = margin;
            leftJoystick.y = app.screen.height - margin;
            rightJoystick.x = app.screen.width - margin;
            rightJoystick.y = app.screen.height - margin;

            uiContainer.addChild(leftJoystick);
            uiContainer.addChild(rightJoystick);

            // Keyboard input
            const keys = new Set<string>();
            const onKeyDown = (e: KeyboardEvent) => {
                keys.add(e.code);

                // Weapon switching (1-5)
                if (e.key in WEAPON_KEYBINDS) {
                    handleWeaponSelect(WEAPON_KEYBINDS[e.key]);
                }

                // Reload (R)
                if (e.code === 'KeyR') {
                    startReload();
                }
            };
            const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);

            // Game state update from server
            network.onGameState((state: GameState) => {
                lastState = state;
                const myId = network.getPlayerId();
                if (!myId) return;

                // Update/create player sprites
                for (const [id, playerState] of Object.entries(state.players)) {
                    let sprite = playerSprites.get(id);
                    const isLocalPlayer = id === myId;

                    if (!sprite) {
                        sprite = new PlayerSprite();
                        playerSprites.set(id, sprite);
                        playersContainer.addChild(sprite);

                        // For local player, set ref and load current weapon textures
                        if (isLocalPlayer) {
                            localPlayerSpriteRef.current = sprite;
                            sprite.preloadTextures(currentWeaponRef.current).catch(err =>
                                console.warn('Failed to preload player textures:', err)
                            );
                        } else {
                            sprite.preloadTextures().catch(err =>
                                console.warn('Failed to preload player textures:', err)
                            );
                        }
                    }
                    sprite.x = playerState.position.x;
                    sprite.y = playerState.position.y;
                    sprite.setAimAngle(playerState.flashlightAngle);

                    // For local player, update HP state for HUD (hide sprite HP bar)
                    if (isLocalPlayer) {
                        setPlayerHp(playerState.hp);
                        sprite.setHp(0, 0); // Hide sprite HP bar for local player
                    } else {
                        sprite.setHp(playerState.hp, GAME_CONFIG.PLAYER_HP);
                    }

                    playerVelocities.set(id, playerState.velocity);
                    sprite.setMoveDirection(playerState.velocity);
                }

                // Remove disconnected players
                for (const [id, sprite] of playerSprites) {
                    if (!state.players[id]) {
                        sprite.destroy();
                        playerSprites.delete(id);
                    }
                }

                // Update/create mobs
                for (const mobState of state.mobs) {
                    if (!mobState.alive) continue;
                    let container = mobContainers.get(mobState.id);
                    let sprite = mobAnimSprites.get(mobState.id);

                    if (!container || !sprite) {
                        container = new Container();
                        const shadow = new Graphics();
                        shadow.ellipse(0, 0, GAME_CONFIG.MOB_RADIUS * 0.85, GAME_CONFIG.MOB_RADIUS * 0.4);
                        shadow.fill({ color: 0x000000, alpha: 0.35 });
                        shadow.y = 10; // Moved back/up slightly
                        container.addChild(shadow);

                        sprite = new MobSprite();
                        sprite.preload();
                        container.addChild(sprite);

                        mobContainers.set(mobState.id, container);
                        mobAnimSprites.set(mobState.id, sprite);
                        mobAngles.set(mobState.id, 0);
                        mobLightLevels.set(mobState.id, 0); // Start dark
                        mobsContainer.addChild(container);
                    }

                    container.x = mobState.position.x;
                    container.y = mobState.position.y;

                    const speed = length(mobState.velocity);

                    // Don't override one-shot animations (like attack)
                    if (!sprite.isPlayingOneShot) {
                        if (speed > 0.1) {
                            const targetAngle = Math.atan2(mobState.velocity.y, mobState.velocity.x);
                            let currentAngle = mobAngles.get(mobState.id) || 0;
                            let angleDiff = targetAngle - currentAngle;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                            currentAngle += angleDiff * 0.1;
                            mobAngles.set(mobState.id, currentAngle);
                            sprite.setRotation(currentAngle);
                            sprite.play(MobAnimation.MOVE);
                        } else {
                            sprite.play(MobAnimation.IDLE);
                        }
                    } else {
                        // Even if attacking, we might want to rotate if they move? 
                        // But usually attacks lock rotation too. Let's keep it simple.
                    }
                }

                // Cleanup missing mobs
                const currentMobIds = new Set(state.mobs.map(m => m.id));
                for (const [id, container] of mobContainers) {
                    if (!currentMobIds.has(id)) {
                        container.destroy();
                        mobContainers.delete(id);
                        mobAnimSprites.delete(id);
                        mobAngles.delete(id);
                        mobLightLevels.delete(id);
                    }
                }

                // Update/create bullets
                const currentBulletIds = new Set(state.bullets.map(b => b.id));
                for (const bulletState of state.bullets) {
                    let sprite = bulletSprites.get(bulletState.id);
                    if (!sprite) {
                        sprite = new Graphics();
                        // Tracer visual - smaller and thinner
                        sprite.rect(-6, -1, 12, 2);
                        sprite.fill({ color: 0xFFFF88 });
                        bulletSprites.set(bulletState.id, sprite);
                        bulletsContainer.addChild(sprite);
                    }
                    sprite.x = bulletState.position.x;
                    sprite.y = bulletState.position.y;

                    // Rotate based on velocity
                    if (bulletState.velocity.x !== 0 || bulletState.velocity.y !== 0) {
                        sprite.rotation = Math.atan2(bulletState.velocity.y, bulletState.velocity.x);
                    }
                }

                // Remove old bullets
                for (const [id, sprite] of bulletSprites) {
                    if (!currentBulletIds.has(id)) {
                        sprite.destroy();
                        bulletSprites.delete(id);
                    }
                }

                // Camera and Lighting
                const myPlayer = state.players[myId];
                if (myPlayer) {
                    gameContainer.x = app.screen.width / 2 - myPlayer.position.x;
                    gameContainer.y = app.screen.height / 2 - myPlayer.position.y;

                    if (worldData) {
                        const flashlights = [];
                        const allPlayersInfo = [];
                        const myPlayerId = network.getPlayerId();

                        for (const [pid, p] of Object.entries(state.players)) {
                            const tier = p.equippedFlashlight as any;
                            const stats = FLASHLIGHT_TIERS[tier] || FLASHLIGHT_TIERS['Common' as any];
                            const flashlightOffset = 47;
                            const offsetX = p.position.x + Math.cos(p.flashlightAngle) * flashlightOffset;
                            const offsetY = p.position.y + Math.sin(p.flashlightAngle) * flashlightOffset;

                            // Only add flashlight if weapon has light (check for local player)
                            const isLocalPlayer = pid === myPlayerId;
                            const weaponHasLight = isLocalPlayer
                                ? WEAPON_STATS[currentWeaponRef.current].hasLight
                                : true; // Assume other players have light (server would need to sync this)

                            if (weaponHasLight) {
                                flashlights.push({
                                    position: { x: offsetX, y: offsetY },
                                    angle: p.flashlightAngle,
                                    stats: stats,
                                    ownerId: pid
                                });
                            }

                            allPlayersInfo.push({
                                id: pid,
                                position: p.position,
                                radius: GAME_CONFIG.PLAYER_RADIUS
                            });
                        }

                        lighting.update(
                            myPlayer.position,
                            flashlights,
                            worldData.walls,
                            state.mobs.map(m => ({ position: m.position, radius: GAME_CONFIG.MOB_RADIUS })),
                            allPlayersInfo,
                            worldData.lamps.map(l => ({ ...l, color: 0xffcc66 })),
                            app.screen.width,
                            app.screen.height,
                            gameContainer.x,
                            gameContainer.y
                        );
                    }
                }
            });

            // Network Events
            // Network Events
            network.onPlayerShoot((id, x, y, angle) => {
                const myId = network.getPlayerId();
                if (id === myId) {
                    // Check if we are doing a melee attack (or other non-shooting action)
                    if (localPlayerSpriteRef.current?.isPlayingOneShot) {
                        // Melee attack: No flash, no shell, no shoot sound
                        // Maybe play swipe sound here if not played elsewhere?
                        return;
                    }
                }

                soundManager.playSound('shoot', { volume: 0.4 });
                // Add to playersContainer to appear above lighting/shadows
                fxManager.createMuzzleFlash(x, y, angle, playersContainer);
                fxManager.spawnShell(x, y, angle);
            });

            network.onMobHit((id, x, y) => {
                soundManager.playSound('hit', { volume: 0.5 });
                fxManager.createBloodSplatter(x, y);
            });

            network.onMobDeath((id, x, y) => {
                const g = new Graphics();
                g.circle(0, 0, GAME_CONFIG.MOB_RADIUS);
                g.fill({ color: 0xd94a4a });
                const tempContainer = new Container();
                tempContainer.addChild(g);
                fxManager.spawnCorpse(tempContainer, x, y);
                soundManager.playSound('die', { volume: 0.6 });
            });

            network.onMobAttack((id, x, y) => {
                // Play attack animation for mob
                const sprite = mobAnimSprites.get(id);
                if (sprite) {
                    sprite.play(MobAnimation.ATTACK, false);
                    // Return to move/idle after attack
                    sprite.onAnimationComplete = () => {
                        sprite.play(MobAnimation.MOVE, true);
                        sprite.onAnimationComplete = undefined;
                    };
                }

                // Play sound
                soundManager.playSound('hit', { volume: 0.5 }); // Impact sound
                soundManager.playSound('die', { volume: 0.3 }); // Growl (reused)

                // Blood FX on player?
                // Visual feedback of damage is good.
                fxManager.createBloodSplatter(x, y);
            });

            network.onConnect(() => {
                console.log('Connected! Requesting world data...');
                network.requestWorldData();
            });

            // Main Ticker
            let frameCount = 0;
            let lastFpsUpdate = performance.now();
            let lastFootstepTime = 0;
            const footstepInterval = 300;


            app.ticker.add((ticker) => {
                // Determine logic update
                if (!gameStartedRef.current) return;

                let autoMeleeTriggered = false;


                const deltaMs = ticker.deltaMS;
                const delta = ticker.deltaTime;

                frameCount++;
                const now = performance.now();
                if (now - lastFpsUpdate >= 1000) {
                    setFps(frameCount);
                    frameCount = 0;
                    lastFpsUpdate = now;
                }

                fxManager.update(delta, deltaMs);
                for (const sprite of playerSprites.values()) sprite.update(deltaMs);
                for (const sprite of mobAnimSprites.values()) sprite.update(deltaMs);

                // Auto-Melee Check
                if (localPlayerSpriteRef.current && lastState) {
                    const myId = network.getPlayerId();
                    const me = lastState.players[myId];
                    // Cooldown check (1 second)
                    if (me && now - lastMeleeTimeRef.current > 1000) {
                        // Check if any mob is close
                        let enemyClose = false;
                        for (const mob of lastState.mobs) {
                            if (!mob.alive) continue;
                            const d = length(sub(me.position, mob.position));
                            if (d < (GAME_CONFIG.MOB_RADIUS + GAME_CONFIG.PLAYER_RADIUS + 30)) {
                                enemyClose = true;
                                break;
                            }
                        }

                        if (enemyClose) {
                            if (!localPlayerSpriteRef.current.isPlayingOneShot) {
                                localPlayerSpriteRef.current.playMeleeAttack();
                                lastMeleeTimeRef.current = now;
                                autoMeleeTriggered = true;
                            }
                        }
                    }
                }

                // Update mob lighting/visibility smoothly
                if (worldData && lastState) {
                    const lightSources: { pos: Vec2, range: number, cone?: { dir: number, angle: number } }[] = [];
                    // Collect Lamps
                    for (const lamp of worldData.lamps) {
                        lightSources.push({ pos: vec2(lamp.x, lamp.y), range: lamp.range });
                    }
                    // Collect Flashlights from state
                    for (const p of Object.values(lastState.players)) {
                        const tier = p.equippedFlashlight as any;
                        const stats = FLASHLIGHT_TIERS[tier] || FLASHLIGHT_TIERS['Common' as any];
                        const offset = 40;
                        const lx = p.position.x + Math.cos(p.flashlightAngle) * offset;
                        const ly = p.position.y + Math.sin(p.flashlightAngle) * offset;
                        lightSources.push({
                            pos: vec2(lx, ly),
                            range: stats.range,
                            cone: { dir: p.flashlightAngle, angle: stats.angle }
                        });
                    }

                    // For each mob, check light level at center and 4 points on radius
                    for (const [id, container] of mobContainers) {
                        const sprite = mobAnimSprites.get(id);
                        const shadow = container.children.find(c => c instanceof Graphics) as Graphics;
                        if (!sprite) continue;

                        const mobPos = vec2(container.x, container.y);
                        const checkPoints = [
                            mobPos,
                            { x: mobPos.x + 15, y: mobPos.y },
                            { x: mobPos.x - 15, y: mobPos.y },
                            { x: mobPos.x, y: mobPos.y + 15 },
                            { x: mobPos.x, y: mobPos.y - 15 },
                        ];

                        let maxIntensity = 0;
                        for (const p of checkPoints) {
                            let pointIntensity = 0;
                            for (const source of lightSources) {
                                const dist = length(sub(p, source.pos));
                                if (dist > source.range) continue;

                                let intensity = 1.0;
                                // Simple dist falloff
                                intensity *= (1 - (dist / source.range) * 0.5);

                                if (source.cone) {
                                    const toPoint = sub(p, source.pos);
                                    const angleToPoint = Math.atan2(toPoint.y, toPoint.x);
                                    let diff = angleToPoint - source.cone.dir;
                                    while (diff > Math.PI) diff -= Math.PI * 2;
                                    while (diff < -Math.PI) diff += Math.PI * 2;
                                    const absDiff = Math.abs(diff);
                                    const halfCone = source.cone.angle / 2;
                                    if (absDiff > halfCone) continue;
                                    // Cone edge falloff
                                    intensity *= (1 - (absDiff / halfCone) * 0.8);
                                }

                                if (hasLineOfSight(source.pos, p, worldData.walls)) {
                                    pointIntensity = Math.max(pointIntensity, intensity);
                                }
                            }
                            maxIntensity += pointIntensity;
                        }
                        let targetVisibility = maxIntensity / checkPoints.length;

                        // Check distance to local player for "proximity highlight"
                        const myId = network.getPlayerId();
                        if (myId && lastState.players[myId]) {
                            const myPlayer = lastState.players[myId];
                            const distToMe = length(sub(mobPos, myPlayer.position));
                            // If close (e.g. 80 units), force visibility to at least 0.5
                            if (distToMe < 80) {
                                targetVisibility = Math.max(targetVisibility, 0.5);
                            }
                        }

                        // Lerp current visibility
                        let currentVis = mobLightLevels.get(id) || 0;
                        const lerpSpeed = 0.1 * delta; // Adjust for smoothness
                        currentVis = lerp(currentVis, targetVisibility, Math.min(lerpSpeed, 1.0));
                        mobLightLevels.set(id, currentVis);

                        // Apply tint (gradient from black to white)
                        const c = Math.floor(currentVis * 255);
                        const tint = (c << 16) | (c << 8) | c;
                        sprite.setTint(tint);
                        if (shadow) shadow.alpha = 0.1 + currentVis * 0.25;
                    }
                }

                // Input
                const joyDir = leftJoystick.value;
                let moveDir = vec2(0, 0);
                if (length(joyDir) > 0.1) moveDir = joyDir;
                else {
                    if (keys.has('KeyW')) moveDir.y -= 1;
                    if (keys.has('KeyS')) moveDir.y += 1;
                    if (keys.has('KeyA')) moveDir.x -= 1;
                    if (keys.has('KeyD')) moveDir.x += 1;
                }

                if ((moveDir.x !== 0 || moveDir.y !== 0) && now - lastFootstepTime > footstepInterval) {
                    soundManager.playSound('step', { volume: 0.2, rate: 0.9 + Math.random() * 0.2 });
                    lastFootstepTime = now;
                }

                const aimJoyDir = rightJoystick.value;
                let aimAngle = inputRef.current.aimAngle;
                if (length(aimJoyDir) > 0.1) {
                    aimAngle = Math.atan2(aimJoyDir.y, aimJoyDir.x);
                } else {
                    const myId = network.getPlayerId();
                    if (myId && lastState?.players[myId]) {
                        const worldMouseX = mouseX - gameContainer.x;
                        const worldMouseY = mouseY - gameContainer.y;
                        const p = lastState.players[myId];
                        aimAngle = Math.atan2(worldMouseY - p.position.y, worldMouseX - p.position.x);
                    }
                }

                // Weapon-based shooting logic
                const wantToShoot = isMouseDown || autoFireRef.current;
                const weaponStats = WEAPON_STATS[currentWeaponRef.current];
                const isBusy = localPlayerSpriteRef.current?.isPlayingOneShot;
                let canShoot = false;

                if (wantToShoot && weaponStats.canShoot && !isReloadingRef.current && !isBusy) {
                    const timeSinceLastShot = now - lastShotTimeRef.current;
                    if (timeSinceLastShot >= weaponStats.fireRate) {
                        if (ammoRef.current > 0) {
                            canShoot = true;
                            lastShotTimeRef.current = now;
                            ammoRef.current -= 1;
                            setAmmo(ammoRef.current);

                            // Play shoot animation
                            if (localPlayerSpriteRef.current) {
                                localPlayerSpriteRef.current.playShoot();
                            }

                            // Auto-reload when out of ammo
                            if (ammoRef.current <= 0) {
                                startReload();
                            }
                        } else {
                            // Out of ammo, start reload
                            startReload();
                        }
                    }
                }

                const input: PlayerInput = {
                    moveDir,
                    aimAngle,
                    isShooting: canShoot || autoMeleeTriggered,
                };
                inputRef.current = input;
                network.sendInput(input);
            });

            // Connect
            network.connect();
            setConnected(true);
            setPlayerId(network.getPlayerId() || '');
            setIsLoading(false);

            return () => {
                window.removeEventListener('keydown', onKeyDown);
                window.removeEventListener('keyup', onKeyUp);
                lighting.destroy();
                network.disconnect();
                app.destroy(true);
            };
        };

        const cleanup = init();

        return () => {
            mounted = false;
            cleanup.then((fn) => fn?.());
        };
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            <div ref={containerRef} className="w-full h-full" />

            {/* Loading Screen */}
            {!gameStarted && (
                <LoadingScreen
                    progress={loadingProgress}
                    loaded={assetsLoaded && !isLoading}
                    onStart={() => {
                        setGameStarted(true);
                        gameStartedRef.current = true;
                        // Focus the container if needed
                        containerRef.current?.focus();
                    }}
                />
            )}

            {/* Game UI - Only visible when game started */}
            {gameStarted && (
                <>
                    <GameHUD
                        hp={playerHp}
                        maxHp={GAME_CONFIG.PLAYER_HP}
                        currentWeapon={currentWeapon}
                        ammo={ammo}
                        maxAmmo={WEAPON_STATS[currentWeapon].magazineSize}
                        isReloading={isReloading}
                        onWeaponSelect={handleWeaponSelect}
                    />

                    {/* Status indicators */}
                    <div className="absolute top-4 right-4 text-white font-mono text-xs pointer-events-none">
                        <div className="bg-black/50 px-2 py-1 rounded mb-1">FPS: {fps}</div>
                        <div className={`bg-black/50 px-2 py-1 rounded ${connected ? 'text-green-400' : 'text-red-400'}`}>
                            {connected ? '🟢' : '🔴'}
                        </div>
                    </div>

                    {/* Debug/Cheat Controls */}
                    <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
                        <button
                            onClick={toggleAutoFire}
                            className={`px-3 py-1 rounded text-sm font-bold text-white transition-colors ${autoFire ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {autoFire ? 'AUTO' : 'MANUAL'}
                        </button>
                        <button
                            onClick={handleAggroAll}
                            className="px-3 py-1 rounded text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                        >
                            AGGRO
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
