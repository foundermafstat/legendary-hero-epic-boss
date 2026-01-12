'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { World } from '@/game/World';
import { Player } from '@/game/Player';
import { Mob } from '@/game/Mob';
import { LightingSystem } from '@/game/lighting/LightingSystem';
import { GAME_CONFIG } from '@/game/config';
import { circleRectCollision, circleCircleCollision } from '@/game/physics/Collision';
import { add, vec2, length, sub, mul } from '@/game/utils/math';
import { Flashlight, Crosshair, Zap, RotateCw } from 'lucide-react';
import { FXManager } from '@/game/fx/FXManager';
import { FlashlightTier } from '@/game/items/Flashlight';
import { FlashlightPickup } from '@/game/items/FlashlightPickup';
import { soundManager } from '@/game/audio/SoundManager';

export default function Game() {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fps, setFps] = useState(0);
    const [autoFire, setAutoFire] = useState(false);
    // Move currentflashlight to a callback to avoid stale closure issues in the ticker?
    // Actually, HUD is updated via state, loop uses references.
    const [currentFlashlight, setCurrentFlashlight] = useState<string>('Rusty Flashlight');

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

            const world = new World();
            // Pass app to FXManager for texture generation
            const fxManager = new FXManager(app);
            const gameContainer = new Container();

            // Layer 1: Floor
            gameContainer.addChild(world.container);

            // Layer 1.5: FX (Corpses, Blood, Shells) on floor
            gameContainer.addChild(fxManager.container);

            // Layer 2: Flashlight pickups
            const pickupsContainer = new Container();
            gameContainer.addChild(pickupsContainer);

            // Spawn flashlight pickups
            const flashlightPickups: FlashlightPickup[] = [];
            const tiers = [FlashlightTier.UNCOMMON, FlashlightTier.RARE, FlashlightTier.EPIC, FlashlightTier.LEGENDARY];
            for (let i = 0; i < 8; i++) {
                const pos = world.getRandomSpawnPosition();
                const tier = tiers[Math.floor(Math.random() * tiers.length)];
                const pickup = new FlashlightPickup(pos.x, pos.y, tier);
                flashlightPickups.push(pickup);
                pickupsContainer.addChild(pickup.container);
            }

            // Layer 3: Lighting
            const lighting = new LightingSystem(app);

            // Layer 4: Entities
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
            gameContainer.addChild(lighting.getContainer());

            // Layer 5: Walls overlay
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

            // Input
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

            let frameCount = 0;
            let lastFpsUpdate = performance.now();

            // Game loop
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

                // Player update
                const wasMoving = length(player.velocity) > 0.1;
                player.update(deltaTime);

                // Footstep sounds
                if (wasMoving && now - lastFootstepTime > footstepInterval) {
                    soundManager.playFootstep();
                    lastFootstepTime = now;
                }

                // Shooting
                const shouldShoot = isMouseDown || (window as any).isAutoFire;

                if (shouldShoot && now - lastShotTime > fireRate) {
                    const bulletStart = add(player.position, mul(vec2(Math.cos(player.flashlightAngle), Math.sin(player.flashlightAngle)), 20));
                    fxManager.spawnBullet(bulletStart.x, bulletStart.y, player.flashlightAngle);
                    fxManager.createMuzzleFlash(bulletStart.x, bulletStart.y, player.flashlightAngle);
                    fxManager.spawnShell(player.position.x, player.position.y, player.flashlightAngle);
                    soundManager.playGunshot();
                    lastShotTime = now;
                }

                fxManager.update(deltaTime, deltaMs);

                // Bullet collisions
                for (let i = fxManager.bullets.length - 1; i >= 0; i--) {
                    const bullet = fxManager.bullets[i];

                    // Wall hit
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

                    // Mob hit
                    for (let j = mobs.length - 1; j >= 0; j--) {
                        const mob = mobs[j];
                        if (!mob.alive) continue;

                        const dist = length(sub(bullet.position, mob.position));
                        if (dist < mob.radius + bullet.radius) {
                            bullet.active = false;
                            soundManager.playMobHit();

                            const result = mob.takeDamage();

                            // Create blood splatter on ground
                            fxManager.createBloodSplatter(result.bloodPos.x, result.bloodPos.y);

                            if (result.died) {
                                // Spawn corpse
                                fxManager.spawnCorpse(mob.container, mob.position.x, mob.position.y);

                                mob.container.destroy();
                                mobs.splice(j, 1);

                                // Respawn
                                const newPos = world.getRandomSpawnPosition();
                                const newMob = new Mob(newPos.x, newPos.y);
                                mobs.push(newMob);
                                entitiesContainer.addChild(newMob.container);
                            }
                            break;
                        }
                    }
                }

                // Player-wall collisions
                for (const wallData of wallDatas) {
                    const push = circleRectCollision(player, wallData);
                    if (push) {
                        player.position = add(player.position, push);
                        player.updatePosition();
                    }
                }

                // Flashlight pickup collision
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

                // Update mobs
                for (let i = 0; i < mobs.length; i++) {
                    const mob = mobs[i];
                    mob.update(deltaTime, deltaMs);

                    for (const wallData of wallDatas) {
                        const push = circleRectCollision(mob, wallData);
                        if (push) {
                            mob.position = add(mob.position, push);
                            mob.updatePosition();
                            mob.reverseDirection();
                        }
                    }
                }

                // Camera
                const screenCenterX = app.screen.width / 2;
                const screenCenterY = app.screen.height / 2;

                gameContainer.x = screenCenterX - player.position.x;
                gameContainer.y = screenCenterY - player.position.y;

                const worldMouseX = mouseX - gameContainer.x;
                const worldMouseY = mouseY - gameContainer.y;

                player.updateMousePosition(worldMouseX, worldMouseY);

                // Lighting
                const mobCircles = mobs.map(m => ({
                    position: m.position,
                    radius: m.radius,
                }));

                lighting.update(
                    player.position,
                    player.flashlightAngle,
                    player.equippedFlashlight, // Pass dynamic stats
                    wallDatas,
                    mobCircles,
                    world.lamps,
                    app.screen.width,
                    app.screen.height,
                    gameContainer.x,
                    gameContainer.y
                );
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
                    <div className="flex flex-col items-center gap-4">
                        <Flashlight className="w-16 h-16 text-yellow-400 animate-pulse" />
                        <p className="text-white text-xl font-mono">Loading...</p>
                    </div>
                </div>
            )}

            {/* Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Crosshair className="w-8 h-8 text-white/30" />
            </div>

            {/* HUD */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 text-white font-mono text-sm pointer-events-none">
                <div className="bg-black/50 px-3 py-1 rounded">
                    FPS: {fps}
                </div>
                <div className="bg-black/50 px-3 py-1 rounded">
                    🔦 {currentFlashlight}
                </div>
                <div className="bg-black/50 px-3 py-1 rounded text-xs">
                    WASD Move | LMB Shoot | Pick up flashlights!
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                <button
                    onClick={() => setAutoFire(!autoFire)}
                    className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition-all ${autoFire ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'bg-gray-800 text-gray-400'
                        }`}
                >
                    <Zap className="w-5 h-5" />
                    AUTO-FIRE: {autoFire ? 'ON' : 'OFF'}
                </button>
            </div>
        </div>
    );
}
