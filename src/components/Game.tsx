'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { World } from '@/game/World';
import { Player } from '@/game/Player';
import { Mob } from '@/game/Mob';
import { LightingSystem } from '@/game/lighting/LightingSystem';
import { GAME_CONFIG } from '@/game/config';
import { circleRectCollision, circleCircleCollision } from '@/game/physics/Collision';
import { add, vec2 } from '@/game/utils/math';
import { Flashlight, Crosshair } from 'lucide-react';

export default function Game() {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fps, setFps] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        let mounted = true;

        const init = async () => {
            // Create PixiJS application
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

            // Create world
            const world = new World();

            // Create game container (camera) - this moves to follow player
            const gameContainer = new Container();

            // Layer 1: Floor and grid (bottom)
            gameContainer.addChild(world.container);

            // Layer 2: Create lighting system (renders fog with light cutouts)
            const lighting = new LightingSystem(app);

            // Layer 3: Entities container (mobs + player) - rendered BEFORE lighting
            const entitiesContainer = new Container();

            // Create player at spawn
            const spawnPos = world.getSpawnPosition();
            const player = new Player(spawnPos.x, spawnPos.y);

            // Create mobs
            const mobs: Mob[] = [];
            for (let i = 0; i < GAME_CONFIG.MOB_COUNT; i++) {
                const mobPos = world.getRandomSpawnPosition();
                const mob = new Mob(mobPos.x, mobPos.y);
                mobs.push(mob);
                entitiesContainer.addChild(mob.container);
            }

            // Add player to entities
            entitiesContainer.addChild(player.container);

            // Add entities BEFORE lighting so they're visible
            gameContainer.addChild(entitiesContainer);

            // Add lighting AFTER entities (fog covers everything, lights cut through)
            gameContainer.addChild(lighting.getContainer());

            // Layer 4: Top overlay for walls (so they appear solid above fog)
            const wallsOverlay = new Container();
            for (const wall of world.walls) {
                const wallGraphic = new Graphics();
                wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
                wallGraphic.fill({ color: GAME_CONFIG.WALL_COLOR });

                // Highlights
                wallGraphic.rect(wall.x, wall.y, wall.width, 3);
                wallGraphic.fill({ color: 0x777777 });
                wallGraphic.rect(wall.x, wall.y, 3, wall.height);
                wallGraphic.fill({ color: 0x666666 });

                // Shadows
                wallGraphic.rect(wall.x, wall.y + wall.height - 3, wall.width, 3);
                wallGraphic.fill({ color: 0x333333 });
                wallGraphic.rect(wall.x + wall.width - 3, wall.y, 3, wall.height);
                wallGraphic.fill({ color: 0x444444 });

                wallsOverlay.addChild(wallGraphic);
            }
            gameContainer.addChild(wallsOverlay);

            // Layer 5: Entities overlay on top of fog (so player/mobs are visible)
            const entitiesOverlay = new Container();

            // Clone player graphics for overlay
            const playerOverlay = new Graphics();
            playerOverlay.circle(0, 0, player.radius);
            playerOverlay.fill({ color: GAME_CONFIG.PLAYER_COLOR });
            playerOverlay.circle(player.radius * 0.5, 0, 5);
            playerOverlay.fill({ color: 0xffffff });

            entitiesOverlay.addChild(playerOverlay);

            // Create mob overlays
            const mobOverlays: Graphics[] = [];
            for (const mob of mobs) {
                const mobOverlay = new Graphics();
                // Body
                mobOverlay.circle(0, 0, mob.radius);
                mobOverlay.fill({ color: GAME_CONFIG.MOB_COLOR });
                mobOverlay.circle(0, 0, mob.radius);
                mobOverlay.stroke({ color: 0x8b0000, width: 2 });
                // Eyes
                mobOverlay.circle(-6, -3, 5);
                mobOverlay.circle(6, -3, 5);
                mobOverlay.fill({ color: 0xffffff });
                mobOverlay.circle(-5, -2, 2.5);
                mobOverlay.circle(7, -2, 2.5);
                mobOverlay.fill({ color: 0x660000 });

                mobOverlays.push(mobOverlay);
                entitiesOverlay.addChild(mobOverlay);
            }

            gameContainer.addChild(entitiesOverlay);

            // Add to stage
            app.stage.addChild(gameContainer);

            // Mouse tracking
            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;

            const onMouseMove = (e: MouseEvent) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            };
            window.addEventListener('mousemove', onMouseMove);

            // Get wall data for collisions
            const wallDatas = world.getWallDatas();

            // FPS counter
            let frameCount = 0;
            let lastFpsUpdate = performance.now();

            // Game loop
            app.ticker.add((ticker) => {
                const deltaTime = ticker.deltaTime;
                const deltaMs = ticker.deltaMS;

                // FPS calculation
                frameCount++;
                const now = performance.now();
                if (now - lastFpsUpdate >= 1000) {
                    setFps(frameCount);
                    frameCount = 0;
                    lastFpsUpdate = now;
                }

                // Update player
                player.update(deltaTime);

                // Player-wall collisions
                for (const wallData of wallDatas) {
                    const push = circleRectCollision(player, wallData);
                    if (push) {
                        player.position = add(player.position, push);
                        player.updatePosition();
                    }
                }

                // Update mobs
                for (let i = 0; i < mobs.length; i++) {
                    const mob = mobs[i];
                    mob.update(deltaTime, deltaMs);

                    // Mob-wall collisions
                    for (const wallData of wallDatas) {
                        const push = circleRectCollision(mob, wallData);
                        if (push) {
                            mob.position = add(mob.position, push);
                            mob.updatePosition();
                            mob.reverseDirection();
                        }
                    }

                    // Player-mob collision
                    const playerMobCollision = circleCircleCollision(player, mob);
                    if (playerMobCollision) {
                        player.position = add(player.position, playerMobCollision.push1);
                        mob.position = add(mob.position, playerMobCollision.push2);
                        player.updatePosition();
                        mob.updatePosition();
                    }

                    // Update mob overlay position
                    if (mobOverlays[i]) {
                        mobOverlays[i].x = mob.position.x;
                        mobOverlays[i].y = mob.position.y;
                    }
                }

                // Mob-mob collisions
                for (let i = 0; i < mobs.length; i++) {
                    for (let j = i + 1; j < mobs.length; j++) {
                        const collision = circleCircleCollision(mobs[i], mobs[j]);
                        if (collision) {
                            mobs[i].position = add(mobs[i].position, collision.push1);
                            mobs[j].position = add(mobs[j].position, collision.push2);
                            mobs[i].updatePosition();
                            mobs[j].updatePosition();
                        }
                    }
                }

                // Camera follows player (player stays centered)
                const screenCenterX = app.screen.width / 2;
                const screenCenterY = app.screen.height / 2;

                gameContainer.x = screenCenterX - player.position.x;
                gameContainer.y = screenCenterY - player.position.y;

                // Calculate world mouse position
                const worldMouseX = mouseX - gameContainer.x;
                const worldMouseY = mouseY - gameContainer.y;

                // Update player flashlight direction
                player.updateMousePosition(worldMouseX, worldMouseY);

                // Update player overlay
                playerOverlay.x = player.position.x;
                playerOverlay.y = player.position.y;
                playerOverlay.rotation = player.flashlightAngle;

                // Update lighting
                const mobCircles = mobs.map(m => ({
                    position: m.position,
                    radius: m.radius,
                }));

                lighting.update(
                    player.position,
                    player.flashlightAngle,
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

            // Cleanup function
            return () => {
                window.removeEventListener('mousemove', onMouseMove);
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
            <div className="absolute top-4 left-4 flex flex-col gap-2 text-white font-mono text-sm">
                <div className="bg-black/50 px-3 py-1 rounded">
                    FPS: {fps}
                </div>
                <div className="bg-black/50 px-3 py-1 rounded">
                    WASD - Move
                </div>
                <div className="bg-black/50 px-3 py-1 rounded">
                    Mouse - Aim flashlight
                </div>
            </div>
        </div>
    );
}
