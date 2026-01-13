'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { LightingSystem } from '@/game/lighting/LightingSystem';
import { FXManager } from '@/game/fx/FXManager';
import { Crosshair, Zap, Skull } from 'lucide-react';
import { soundManager } from '@/game/audio/SoundManager';
import { Joystick } from '@/game/ui/Joystick';
import { NetworkManager } from '@/network/NetworkManager';
import { GameState, PlayerInput, WorldData, Vec2 } from '@/network/types';
import { GAME_CONFIG } from '@/network/config';
import { vec2, length, sub, lerp } from '@/game/utils/math';
import { FLASHLIGHT_TIERS } from '@/game/items/Flashlight';
import { PlayerSprite } from '@/game/player/PlayerSprite';
import { MobSprite } from '@/game/mob/MobSprite';
import { MobAnimation } from '@/game/mob/MobAnimationConfig';
import { hasLineOfSight } from '@/game/lighting/Raycaster';

export default function GameMultiplayer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const [autoFire, setAutoFire] = useState(false);
    const autoFireRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [fps, setFps] = useState(0);
    const [connected, setConnected] = useState(false);
    const [playerId, setPlayerId] = useState<string>('');
    const [debugWorldData, setDebugWorldData] = useState<WorldData | null>(null);

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

            appRef.current = app;
            containerRef.current?.appendChild(app.canvas);

            // Game container
            const gameContainer = new Container();
            const worldContainer = new Container();

            // Separate entity layers for proper z-order
            const corpsesContainer = new Container();
            const mobsAndBulletsContainer = new Container();
            const playersContainer = new Container();

            gameContainer.addChild(worldContainer);

            // FX Manager (corpses, blood, shells)
            const fxManager = new FXManager(app);
            gameContainer.addChild(fxManager.container);

            // Lighting system
            const lighting = new LightingSystem(app);
            const lightingContainer = lighting.getContainer();
            gameContainer.addChild(lightingContainer);

            // Mobs and bullets layer
            gameContainer.addChild(mobsAndBulletsContainer);

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
            const onKeyDown = (e: KeyboardEvent) => keys.add(e.code);
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
                    if (!sprite) {
                        sprite = new PlayerSprite();
                        playerSprites.set(id, sprite);
                        playersContainer.addChild(sprite);
                        sprite.preloadTextures().catch(err => console.warn('Failed to preload player textures:', err));
                    }
                    sprite.x = playerState.position.x;
                    sprite.y = playerState.position.y;
                    sprite.setAimAngle(playerState.flashlightAngle);
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
                        shadow.y = GAME_CONFIG.MOB_RADIUS + 5;
                        container.addChild(shadow);

                        sprite = new MobSprite();
                        sprite.preload();
                        container.addChild(sprite);

                        mobContainers.set(mobState.id, container);
                        mobAnimSprites.set(mobState.id, sprite);
                        mobAngles.set(mobState.id, 0);
                        mobLightLevels.set(mobState.id, 0); // Start dark
                        mobsAndBulletsContainer.addChild(container);
                    }

                    container.x = mobState.position.x;
                    container.y = mobState.position.y;

                    const speed = length(mobState.velocity);
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
                        sprite.play(MobAnimation.MOVE);
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
                        sprite.circle(0, 0, GAME_CONFIG.BULLET_RADIUS);
                        sprite.fill({ color: 0xffff00 });
                        bulletSprites.set(bulletState.id, sprite);
                        mobsAndBulletsContainer.addChild(sprite);
                    }
                    sprite.x = bulletState.position.x;
                    sprite.y = bulletState.position.y;
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
                        for (const [pid, p] of Object.entries(state.players)) {
                            const tier = p.equippedFlashlight as any;
                            const stats = FLASHLIGHT_TIERS[tier] || FLASHLIGHT_TIERS['Common' as any];
                            const flashlightOffset = 47;
                            const offsetX = p.position.x + Math.cos(p.flashlightAngle) * flashlightOffset;
                            const offsetY = p.position.y + Math.sin(p.flashlightAngle) * flashlightOffset;

                            flashlights.push({
                                position: { x: offsetX, y: offsetY },
                                angle: p.flashlightAngle,
                                stats: stats,
                                ownerId: pid
                            });

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
            network.onPlayerShoot((id, x, y, angle) => {
                soundManager.playSound('shoot', { volume: 0.4 });
                fxManager.createMuzzleFlash(x, y, angle);
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
                        const targetVisibility = maxIntensity / checkPoints.length;

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

                const input: PlayerInput = {
                    moveDir,
                    aimAngle,
                    isShooting: isMouseDown || autoFireRef.current,
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

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <p className="text-white">Connecting to server...</p>
                </div>
            )}

            {/* Crosshair removed - was blocking player sprite */}

            <div className="absolute top-4 left-4 text-white font-mono text-sm pointer-events-none">
                <div className="bg-black/50 px-3 py-1 rounded mb-2">FPS: {fps}</div>
                <div className={`bg-black/50 px-3 py-1 rounded mb-2 ${connected ? 'text-green-400' : 'text-red-400'}`}>
                    {connected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
                <div className="bg-black/50 px-3 py-1 rounded text-xs">
                    ID: {playerId.slice(0, 8)}...
                </div>
                <div className="bg-black/50 px-3 py-1 rounded text-xs mt-2">
                    Walls: {debugWorldData ? debugWorldData.walls.length : 'NULL'} | Lamps: {debugWorldData ? debugWorldData.lamps.length : 'NULL'}
                </div>
            </div>

            {/* Debug/Cheat Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
                <button
                    onClick={toggleAutoFire}
                    className={`px-4 py-2 rounded font-bold text-white transition-colors ${autoFire ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                >
                    {autoFire ? 'AUTO-FIRE: ON' : 'AUTO-FIRE: OFF'}
                </button>
                <button
                    onClick={handleAggroAll}
                    className="px-4 py-2 rounded font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                >
                    AGGRO ALL
                </button>
            </div>
        </div>
    );
}
