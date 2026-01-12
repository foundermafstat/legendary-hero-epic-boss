'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { World } from '@/game/World';
import { Player } from '@/game/Player';
import { Mob } from '@/game/Mob';
import { LightingSystem } from '@/game/lighting/LightingSystem';
import { GAME_CONFIG } from '@/game/config';
import { circleRectCollision, circleCircleCollision } from '@/game/physics/Collision';
import { add, vec2, length, sub, mul, normalize } from '@/game/utils/math';
import { Flashlight, Crosshair, Zap, RotateCw, Skull } from 'lucide-react';
import { FXManager } from '@/game/fx/FXManager';
import { FlashlightTier } from '@/game/items/Flashlight';
import { FlashlightPickup } from '@/game/items/FlashlightPickup';
import { soundManager } from '@/game/audio/SoundManager';
import { Joystick } from '@/game/ui/Joystick';
import { hasLineOfSight } from '@/game/lighting/Raycaster';

export default function Game() {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fps, setFps] = useState(0);
    const [autoFire, setAutoFire] = useState(false);
    const [currentFlashlight, setCurrentFlashlight] = useState<string>('Rusty Flashlight');

    const gameLogic = useRef<{
        triggerAggro: () => void;
    } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let mounted = true;

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

            appRef.current = app;
            containerRef.current?.appendChild(app.canvas);

            // Layers
            const world = new World();
            const fxManager = new FXManager(app);
            const gameContainer = new Container();

            gameContainer.addChild(world.container);
            gameContainer.addChild(fxManager.container);

            const pickupsContainer = new Container();
            gameContainer.addChild(pickupsContainer);

            const flashlightPickups: FlashlightPickup[] = [];
            const tiers = [FlashlightTier.UNCOMMON, FlashlightTier.RARE, FlashlightTier.EPIC, FlashlightTier.LEGENDARY];
            for (let i = 0; i < 8; i++) {
                const pos = world.getRandomSpawnPosition();
                const tier = tiers[Math.floor(Math.random() * tiers.length)];
                const pickup = new FlashlightPickup(pos.x, pos.y, tier);
                flashlightPickups.push(pickup);
                pickupsContainer.addChild(pickup.container);
            }

            const lighting = new LightingSystem(app);
            gameContainer.addChild(lighting.getContainer());

            // Entities ON TOP of Fog
            const entitiesContainer = new Container();

            const spawnPos = world.getSpawnPosition();
            const player = new Player(spawnPos.x, spawnPos.y);

            let mobs: Mob[] = [];
            const respawnMob = () => {
                const mobPos = world.getRandomSpawnPosition();
                const mob = new Mob(mobPos.x, mobPos.y);
                mobs.push(mob);
                entitiesContainer.addChild(mob.container);
            };

            for (let i = 0; i < GAME_CONFIG.MOB_COUNT; i++) {
                respawnMob();
            }

            entitiesContainer.addChild(player.container);
            gameContainer.addChild(entitiesContainer);

            // Walls Overlay
            const wallsOverlay = new Container();
            for (const wall of world.walls) {
                const wallGraphic = new Graphics();
                wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
                wallGraphic.fill({ color: 0x000000 });
                wallGraphic.stroke({ color: 0x333333, width: 1 });
                wallsOverlay.addChild(wallGraphic);
            }
            gameContainer.addChild(wallsOverlay);

            app.stage.addChild(gameContainer);

            // Joystick UI
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

            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let isMouseDown = false;

            const onMouseMove = (e: MouseEvent) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            };
            const onMouseDown = () => isMouseDown = true;
            const onMouseUp = () => isMouseDown = false;

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mousedown', onMouseDown);
            window.addEventListener('mouseup', onMouseUp);

            const wallDatas = world.getWallDatas();
            let lastShotTime = 0;
            const fireRate = 120;
            let lastFootstepTime = 0;
            const footstepInterval = 300;

            // Audio Growl Logic
            let lastGrowlTime = performance.now();
            let nextGrowlInterval = 3000 + Math.random() * 5000;

            let frameCount = 0;
            let lastFpsUpdate = performance.now();

            gameLogic.current = {
                triggerAggro: () => {
                    fxManager.createShockwave(player.position.x, player.position.y);
                    mobs.forEach(mob => {
                        if (mob.alive) mob.setAggro(player.position);
                    });
                }
            };

            app.ticker.add((ticker) => {
                const deltaTime = ticker.deltaTime;
                const deltaMs = ticker.deltaMS;

                frameCount++;
                const now = performance.now();
                if (now - lastFpsUpdate >= 1000) {
                    setFps(frameCount);
                    frameCount = 0;
                    lastFpsUpdate = now;
                }

                // Controls
                const joyDir = leftJoystick.value;
                let isJoystickMoving = length(joyDir) > 0.1;

                player.update(deltaTime);

                if (isJoystickMoving) {
                    const aimDir = vec2(Math.cos(player.flashlightAngle), Math.sin(player.flashlightAngle));
                    const dot = joyDir.x * aimDir.x + joyDir.y * aimDir.y;
                    const speedModifier = 0.7 + 0.3 * dot;
                    const speed = player.baseSpeed * speedModifier;

                    const joyVel = mul(joyDir, speed * deltaTime);
                    player.position = add(player.position, joyVel);
                    player.updatePosition();
                }

                const wasMoving = length(player.velocity) > 0.1 || isJoystickMoving;

                const aimJoyDir = rightJoystick.value;
                if (length(aimJoyDir) > 0.1) {
                    player.flashlightAngle = Math.atan2(aimJoyDir.y, aimJoyDir.x);
                }

                // Camera
                const screenCenterX = app.screen.width / 2;
                const screenCenterY = app.screen.height / 2;
                gameContainer.x = screenCenterX - player.position.x;
                gameContainer.y = screenCenterY - player.position.y;

                if (length(aimJoyDir) < 0.1) {
                    const worldMouseX = mouseX - gameContainer.x;
                    const worldMouseY = mouseY - gameContainer.y;
                    player.updateMousePosition(worldMouseX, worldMouseY);
                }

                // Audio
                if (wasMoving && now - lastFootstepTime > footstepInterval) {
                    soundManager.playFootstep();
                    lastFootstepTime = now;
                }

                // Random Growls
                if (now - lastGrowlTime > nextGrowlInterval) {
                    const livingMobs = mobs.filter(m => m.alive);
                    if (livingMobs.length > 0) {
                        const randomMob = livingMobs[Math.floor(Math.random() * livingMobs.length)];
                        const dist = length(sub(player.position, randomMob.position));
                        const vol = Math.max(0, 1 - dist / 800);
                        if (vol > 0) {
                            soundManager.playGrowl(vol);
                        }
                    }
                    lastGrowlTime = now;
                    nextGrowlInterval = 2000 + Math.random() * 6000;
                }

                // Shooting
                const shouldShoot = isMouseDown || (window as any).isAutoFire;
                if (shouldShoot && now - lastShotTime > fireRate) {
                    const weaponPos = player.getWeaponPosition();
                    const weaponLocalPos = player.getWeaponLocalPosition();

                    fxManager.spawnBullet(weaponPos.x, weaponPos.y, player.flashlightAngle);
                    fxManager.createMuzzleFlash(weaponLocalPos.x, weaponLocalPos.y, player.flashlightAngle, player.container);
                    fxManager.spawnShell(weaponPos.x, weaponPos.y, player.flashlightAngle);
                    soundManager.playGunshot();
                    lastShotTime = now;
                }

                fxManager.update(deltaTime, deltaMs);

                // Aggro
                mobs.forEach(mob => {
                    if (mob.target) {
                        mob.setAggro(player.position);
                    }
                });

                // Bullets
                for (let i = fxManager.bullets.length - 1; i >= 0; i--) {
                    const bullet = fxManager.bullets[i];
                    let hitWall = false;
                    for (const wall of wallDatas) {
                        if (bullet.position.x >= wall.x && bullet.position.x <= wall.x + wall.width &&
                            bullet.position.y >= wall.y && bullet.position.y <= wall.y + wall.height) {
                            hitWall = true;
                            break;
                        }
                    }
                    if (hitWall) {
                        bullet.active = false;
                        continue;
                    }
                    for (let j = mobs.length - 1; j >= 0; j--) {
                        const mob = mobs[j];
                        if (!mob.alive) continue;
                        const dist = length(sub(bullet.position, mob.position));
                        if (dist < mob.radius + bullet.radius) {
                            bullet.active = false;
                            soundManager.playMobHit();
                            const result = mob.takeDamage();
                            fxManager.createBloodSplatter(result.bloodPos.x, result.bloodPos.y);
                            if (result.died) {
                                fxManager.spawnCorpse(mob.container, mob.position.x, mob.position.y);
                                mob.container.destroy();
                                mobs.splice(j, 1);
                                const newPos = world.getRandomSpawnPosition();
                                const newMob = new Mob(newPos.x, newPos.y);
                                mobs.push(newMob);
                                entitiesContainer.addChild(newMob.container);
                            }
                            break;
                        }
                    }
                }

                // Player Collisions
                for (const wallData of wallDatas) {
                    const push = circleRectCollision(player, wallData);
                    if (push) {
                        player.position = add(player.position, push);
                        player.updatePosition();
                    }
                }

                // Flashlight Pickups
                for (let i = flashlightPickups.length - 1; i >= 0; i--) {
                    const pickup = flashlightPickups[i];
                    if (pickup.collected) continue;
                    pickup.update(deltaMs);
                    const dist = length(sub(player.position, pickup.position));
                    if (dist < player.radius + pickup.radius) {
                        pickup.collected = true;
                        pickup.container.visible = false;
                        player.equipFlashlight(pickup.stats.tier);
                        setCurrentFlashlight(pickup.stats.name);
                    }
                }

                // Lighting
                const mobCircles = mobs.map(m => ({
                    position: m.position,
                    radius: m.radius,
                }));

                const playerObstacle = { position: player.position, radius: player.radius };

                const stats = player.equippedFlashlight;
                const flashlightPos = player.getFlashlightPosition();

                lighting.update(
                    flashlightPos,
                    player.flashlightAngle,
                    stats,
                    wallDatas,
                    mobCircles,
                    playerObstacle,
                    world.lamps,
                    app.screen.width,
                    app.screen.height,
                    gameContainer.x,
                    gameContainer.y
                );

                // Mob Visibility Logic (Manual Fade)
                mobs.forEach(mob => {
                    if (!mob.alive) return;

                    const toMob = sub(mob.position, player.position);
                    const dist = length(toMob);
                    let visibility = 0; // Default dark

                    // 1. Check Player LOS (Flashlight & Ambient)
                    if (hasLineOfSight(player.position, mob.position, wallDatas)) {
                        // Ambient
                        const ambientRange = 350;
                        if (dist < ambientRange) {
                            visibility = Math.max(visibility, 0.5 * (1 - dist / ambientRange));
                        }

                        // Flashlight
                        const flashRange = stats.range;
                        if (dist < flashRange) {
                            const angleToMob = Math.atan2(toMob.y, toMob.x);
                            let angleDiff = Math.abs(angleToMob - player.flashlightAngle);
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                            angleDiff = Math.abs(angleDiff);

                            if (angleDiff < stats.angle) {
                                visibility = Math.max(visibility, 1.0 * (1 - dist / flashRange));
                            }
                        }
                    }

                    // 2. Check Static Lamps
                    for (const lamp of world.lamps) {
                        const lampPos = vec2(lamp.x, lamp.y);
                        const toLamp = sub(mob.position, lampPos);
                        const lampDist = length(toLamp);

                        if (lampDist < lamp.range) {
                            if (hasLineOfSight(lampPos, mob.position, wallDatas)) {
                                // Visible in lamp light
                                visibility = Math.max(visibility, 0.8 * (1 - lampDist / lamp.range));
                            }
                        }
                    }

                    mob.container.alpha = Math.max(0, Math.min(1, visibility));
                });

                // Mobs movement
                for (let i = 0; i < mobs.length; i++) {
                    const mob = mobs[i];
                    mob.update(deltaTime, deltaMs);

                    for (const wallData of wallDatas) {
                        const push = circleRectCollision(mob, wallData);
                        if (push) {
                            mob.position = add(mob.position, push);
                            mob.updatePosition();
                            if (!mob.target) mob.reverseDirection();
                        }
                    }
                }
            });

            setIsLoading(false);

            return () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mousedown', onMouseDown);
                window.removeEventListener('mouseup', onMouseUp);
                player.destroy();
                lighting.destroy();
                app.destroy(true);
            };
        };

        const cleanup = init();

        return () => {
            mounted = false;
            cleanup.then(fn => fn?.());
        };
    }, []);

    useEffect(() => {
        (window as any).isAutoFire = autoFire;
    }, [autoFire]);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            <div ref={containerRef} className="w-full h-full" />

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <p className="text-white">Loading...</p>
                </div>
            )}

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <Crosshair className="w-8 h-8 text-white" />
            </div>

            <div className="absolute top-4 left-4 text-white font-mono text-sm pointer-events-none">
                <div className="bg-black/50 px-3 py-1 rounded mb-2">FPS: {fps}</div>
                <div className="bg-black/50 px-3 py-1 rounded">🔦 {currentFlashlight}</div>
            </div>

            <div className="absolute top-4 right-4">
                <button
                    onClick={() => gameLogic.current?.triggerAggro()}
                    className="bg-red-900/80 hover:bg-red-700 text-white p-3 rounded-full border-2 border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.5)] active:scale-95 transition-all"
                    title="Aggro All Mobs"
                >
                    <Skull className="w-8 h-8" />
                </button>
            </div>

            <div className="absolute bottom-[180px] right-[40px] pointer-events-auto">
                <button
                    onClick={() => setAutoFire(!autoFire)}
                    className={`p-4 rounded-full border-2 transition-all ${autoFire ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_20px_rgba(250,204,21,0.6)]' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                >
                    <Zap className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
