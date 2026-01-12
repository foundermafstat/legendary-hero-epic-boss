'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { LightingSystem } from '@/game/lighting/LightingSystem';
import { FXManager } from '@/game/fx/FXManager';
import { Crosshair, Zap, Skull } from 'lucide-react';
import { soundManager } from '@/game/audio/SoundManager';
import { Joystick } from '@/game/ui/Joystick';
import { NetworkManager } from '@/network/NetworkManager';
import { GameState, PlayerInput, WorldData } from '@/network/types';
import { GAME_CONFIG } from '@/network/config';
import { vec2, length } from '@/game/utils/math';
import { FLASHLIGHT_TIERS } from '@/game/items/Flashlight';

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
            const entitiesContainer = new Container();

            gameContainer.addChild(worldContainer);

            // FX Manager (init early for correct z-order: World -> FX -> Entites)
            const fxManager = new FXManager(app);
            gameContainer.addChild(fxManager.container);

            gameContainer.addChild(entitiesContainer);

            // Player sprites
            const playerSprites = new Map<string, Container>();
            const mobSprites = new Map<string, Graphics>();
            const bulletSprites = new Map<string, Graphics>();

            let worldData: WorldData | null = null;

            // Receive world data
            network.onWorldData((data) => {
                worldData = data;
                setDebugWorldData(data);
                console.log('Received world data:', data);

                // Draw floor
                const floor = new Graphics();

                // Draw Grid
                floor.rect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
                floor.fill({ color: GAME_CONFIG.FLOOR_COLOR }); // 0x2a2a2a

                // Vertical lines
                for (let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += GAME_CONFIG.TILE_SIZE) {
                    floor.moveTo(x, 0);
                    floor.lineTo(x, GAME_CONFIG.WORLD_HEIGHT);
                }
                // Horizontal lines
                for (let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += GAME_CONFIG.TILE_SIZE) {
                    floor.moveTo(0, y);
                    floor.lineTo(GAME_CONFIG.WORLD_WIDTH, y);
                }
                floor.stroke({ color: GAME_CONFIG.GRID_COLOR, width: 1 }); // 0x333333

                worldContainer.addChild(floor);

                // Draw walls
                for (const wall of data.walls) {
                    const wallGraphic = new Graphics();
                    wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
                    wallGraphic.fill({ color: 0x000000 }); // Black
                    wallGraphic.stroke({ color: 0x111111, width: 1 }); // Thin dark grey
                    wallContainer.addChild(wallGraphic);
                }

                // Draw lamps
                for (const lamp of data.lamps) {
                    const lampGraphic = new Graphics();
                    lampGraphic.circle(lamp.x, lamp.y, 8);
                    lampGraphic.fill({ color: 0xffaa00 });
                    worldContainer.addChild(lampGraphic);
                }
            });

            const lighting = new LightingSystem(app);
            gameContainer.addChild(lighting.getContainer());
            // Wall Container (Top layer for visibility)
            // Wall Container (Top layer for visibility)
            const wallContainer = new Container();
            gameContainer.addChild(wallContainer);

            // Input Stage (Background layer for catching clicks)
            const inputStage = new Container();
            inputStage.hitArea = app.screen;
            inputStage.eventMode = 'static';

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

            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let isMouseDown = false;

            const onMouseMove = (e: MouseEvent) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            };
            const onMouseDown = () => (isMouseDown = true);
            const onMouseUp = () => (isMouseDown = false);

            // Keyboard input
            const keys = new Set<string>();
            window.addEventListener('keydown', (e) => keys.add(e.code));
            window.addEventListener('keyup', (e) => keys.delete(e.code));

            let frameCount = 0;
            let lastFpsUpdate = performance.now();

            // Game state update from server
            network.onGameState((state: GameState) => {
                const myId = network.getPlayerId();
                if (!myId) return;

                // Update/create player sprites
                for (const [id, playerState] of Object.entries(state.players)) {
                    let sprite = playerSprites.get(id);

                    if (!sprite) {
                        sprite = new Container();
                        const circle = new Graphics();
                        const isMe = id === myId;
                        circle.circle(0, 0, GAME_CONFIG.PLAYER_RADIUS);
                        circle.fill({ color: isMe ? 0x4a90d9 : 0x9090d9 });
                        sprite.addChild(circle);
                        playerSprites.set(id, sprite);
                        entitiesContainer.addChild(sprite);
                    }

                    sprite.x = playerState.position.x;
                    sprite.y = playerState.position.y;
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

                    let sprite = mobSprites.get(mobState.id);

                    if (!sprite) {
                        sprite = new Graphics();
                        sprite.circle(0, 0, GAME_CONFIG.MOB_RADIUS);
                        sprite.fill({ color: 0xd94a4a });
                        mobSprites.set(mobState.id, sprite);
                        entitiesContainer.addChild(sprite);
                    }

                    sprite.x = mobState.position.x;
                    sprite.y = mobState.position.y;
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
                        entitiesContainer.addChild(sprite);
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

                // Center camera on local player
                const myPlayer = state.players[myId];
                if (myPlayer) {
                    const screenCenterX = app.screen.width / 2;
                    const screenCenterY = app.screen.height / 2;
                    gameContainer.x = screenCenterX - myPlayer.position.x;
                    gameContainer.y = screenCenterY - myPlayer.position.y;

                    // Update lighting for ALL players
                    if (worldData) {
                        const flashlights = [];
                        const allPlayersInfo = [];

                        // Collect shared data
                        for (const [pid, p] of Object.entries(state.players)) {
                            const tier = p.equippedFlashlight as any;
                            const stats = FLASHLIGHT_TIERS[tier] || FLASHLIGHT_TIERS['Common' as any];

                            // Flashlight origin from edge of player
                            const offsetX = p.position.x + Math.cos(p.flashlightAngle) * GAME_CONFIG.PLAYER_RADIUS;
                            const offsetY = p.position.y + Math.sin(p.flashlightAngle) * GAME_CONFIG.PLAYER_RADIUS;

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

            // Main loop - send inputs to server
            app.ticker.add(() => {
                frameCount++;
                const now = performance.now();
                if (now - lastFpsUpdate >= 1000) {
                    setFps(frameCount);
                    frameCount = 0;
                    lastFpsUpdate = now;
                }

                // Gather input
                const joyDir = leftJoystick.value;
                let moveDir = vec2(0, 0);

                if (length(joyDir) > 0.1) {
                    moveDir = joyDir;
                } else {
                    // Keyboard
                    if (keys.has('KeyW')) moveDir.y -= 1;
                    if (keys.has('KeyS')) moveDir.y += 1;
                    if (keys.has('KeyA')) moveDir.x -= 1;
                    if (keys.has('KeyD')) moveDir.x += 1;
                }

                // Aim direction
                const aimJoyDir = rightJoystick.value;
                let aimAngle = inputRef.current.aimAngle;

                if (length(aimJoyDir) > 0.1) {
                    aimAngle = Math.atan2(aimJoyDir.y, aimJoyDir.x);
                } else {
                    const myPlayer = network.getPlayerId();
                    if (myPlayer) {
                        const worldMouseX = mouseX - gameContainer.x;
                        const worldMouseY = mouseY - gameContainer.y;
                        const myId = network.getPlayerId();
                        // We would need player position from state for accurate mouse aim
                        // For now using last known angle
                    }
                }

                const input: PlayerInput = {
                    moveDir,
                    aimAngle,
                    isShooting: isMouseDown,
                };

                inputRef.current = input;
                network.sendInput(input);
            });



            // Audio preloading (ensure loaded)
            // soundManager.load(); // Assuming already handled or auto-loaded

            // Wire up FX events
            network.onPlayerShoot((id, x, y, angle) => {
                const isMe = id === network.getPlayerId();
                // Play sound (vary volume/pan based on distance if possible, simple for now)
                soundManager.playSound('shoot', { volume: 0.4 });

                // Muzzle flash
                fxManager.createMuzzleFlash(x, y, angle);
                // Shell casing
                fxManager.spawnShell(x, y, angle);
            });

            network.onMobHit((id, x, y) => {
                soundManager.playSound('hit', { volume: 0.5 });
                fxManager.createBloodSplatter(x, y);
            });

            network.onMobDeath((id, x, y) => {
                // Find mob sprite to use texture for corpse? 
                // Or just standard green circle corpse for now since we don't have texture atlases set up perfectly
                // Using FXManager's spawnCorpse which needs a container/texture source.
                // We'll create a temporary graphic for now or use the generic corpse logic if possible.
                // Re-using the mob sprite logic from FXManager requires passing a container. 
                // Let's create a generic "dead mob" graphic for the corpse.

                const g = new Graphics();
                g.circle(0, 0, GAME_CONFIG.MOB_RADIUS);
                g.fill({ color: 0xd94a4a });

                // We need to wrap it in a container for spawnCorpse to generate texture?
                // Actually FXManager.spawnCorpse takes a container/displayObject to texture-ize.
                const tempContainer = new Container();
                tempContainer.addChild(g);

                fxManager.spawnCorpse(tempContainer, x, y);
                soundManager.playSound('die', { volume: 0.6 });
            });


            // Connect to server
            network.onConnect(() => {
                console.log('Connected! Requesting world data...');
                network.requestWorldData();
            });
            network.connect();
            setConnected(true);
            setPlayerId(network.getPlayerId() || '');

            setIsLoading(false);

            let lastFootstepTime = 0;
            const footstepInterval = 300; // ms

            // Main loop - send inputs to server and update FX
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

                // Gather input
                const joyDir = leftJoystick.value;
                let moveDir = vec2(0, 0);

                if (length(joyDir) > 0.1) {
                    moveDir = joyDir;
                } else {
                    // Keyboard
                    if (keys.has('KeyW')) moveDir.y -= 1;
                    if (keys.has('KeyS')) moveDir.y += 1;
                    if (keys.has('KeyA')) moveDir.x -= 1;
                    if (keys.has('KeyD')) moveDir.x += 1;
                }

                // Footsteps (local)
                if ((moveDir.x !== 0 || moveDir.y !== 0) && now - lastFootstepTime > footstepInterval) {
                    soundManager.playSound('step', { volume: 0.2, rate: 0.9 + Math.random() * 0.2 });
                    lastFootstepTime = now;
                }

                // Aim direction
                const aimJoyDir = rightJoystick.value;
                let aimAngle = inputRef.current.aimAngle;

                if (length(aimJoyDir) > 0.1) {
                    aimAngle = Math.atan2(aimJoyDir.y, aimJoyDir.x);
                } else {
                    const myPlayer = network.getPlayerId();
                    if (myPlayer) {
                        const worldMouseX = mouseX - gameContainer.x;
                        const worldMouseY = mouseY - gameContainer.y;
                        // We don't have authoritative position here instantly for mouse aim without state...
                        // Actually we have state.players[myId] from the last server update.
                        // But for smooth aim we might want to use client prediction or just use the last known pos.
                        // Let's rely on server state for origin.
                        // const myPos = ... (accessed from variable in scope? we need a ref to state)
                    }
                }

                // Simple mouse aim fix: utilize the latest known player position if possible
                // For now, simpler aim logic (already present somewhat) or just leave as is.

                const input: PlayerInput = {
                    moveDir,
                    aimAngle,
                    isShooting: isMouseDown || autoFireRef.current,
                };

                inputRef.current = input;
                network.sendInput(input);
            });


            return () => {
                // Window mouse listeners are removed (replaced by Pixi events)
                // window.removeEventListener('mousemove', onMouseMove);
                // window.removeEventListener('mousedown', onMouseDown);
                // window.removeEventListener('mouseup', onMouseUp);
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

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <Crosshair className="w-8 h-8 text-white" />
            </div>

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
