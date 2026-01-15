import { GameState, PlayerInput, Vec2 } from '../shared/types';
import { GAME_CONFIG } from '../shared/config';
import { ServerPlayer } from '../entities/ServerPlayer';
import { ServerMob } from '../entities/ServerMob';
import { ServerBullet } from '../entities/ServerBullet';
import { ServerWorld } from '../world/ServerWorld';
import { vec2, circleCircleCollision, circleRectCollision, distance, add, sub, mul, getCircleCollisionPush } from '../utils/math';

export class GameManager {
    private players: Map<string, ServerPlayer> = new Map();
    private playerInputs: Map<string, PlayerInput> = new Map();
    private mobs: ServerMob[] = [];
    private bullets: ServerBullet[] = [];
    private world: ServerWorld;
    private nextMobId: number = 0;
    private nextBulletId: number = 0;
    private eventCallback: ((name: string, ...args: any[]) => void) | null = null;

    constructor() {
        this.world = new ServerWorld();
        this.initializeMobs();
    }

    public onEvent(callback: (name: string, ...args: any[]) => void) {
        this.eventCallback = callback;
    }

    private triggerEvent(name: string, ...args: any[]) {
        if (this.eventCallback) {
            this.eventCallback(name, ...args);
        }
    }

    private initializeMobs(): void {
        for (let i = 0; i < GAME_CONFIG.MOB_COUNT; i++) {
            this.spawnMob();
        }
    }

    private spawnMob(): void {
        const pos = this.world.getRandomSpawnPosition();
        const mob = new ServerMob(`mob_${this.nextMobId++}`, pos);
        this.mobs.push(mob);
    }

    public addPlayer(id: string): void {
        const spawnPos = this.world.getSpawnPosition();
        const player = new ServerPlayer(id, spawnPos);
        this.players.set(id, player);
        this.playerInputs.set(id, {
            moveDir: vec2(0, 0),
            aimAngle: 0,
            isShooting: false,
        });
    }

    public removePlayer(id: string): void {
        this.players.delete(id);
        this.playerInputs.delete(id);
    }

    public updatePlayerInput(id: string, input: PlayerInput): void {
        this.playerInputs.set(id, input);
    }

    public tick(deltaTime: number, deltaMs: number, currentTime: number): void {
        // Update players
        for (const [id, player] of this.players) {
            const input = this.playerInputs.get(id);
            if (input) {
                player.update(deltaTime, input.moveDir, input.aimAngle);

                // Handle shooting
                if (input.isShooting && player.canShoot(currentTime)) {
                    this.spawnBullet(player, currentTime);
                    player.shoot(currentTime);
                }
            }
        }

        // Update mobs
        for (const mob of this.mobs) {
            if (!mob.alive) continue;

            // Aggro Logic: Check for nearby players if no target
            if (!mob.targetId) {
                for (const [pid, p] of this.players) {
                    if (distance(mob.position, p.position) < 300) {
                        mob.setAggro(p.position, pid);
                        break;
                    }
                }
            }

            // Update target position if chasing a player
            if (mob.targetId) {
                const targetPlayer = this.players.get(mob.targetId);
                if (targetPlayer) {
                    mob.target = targetPlayer.position;

                    // Attack Logic
                    const dist = distance(mob.position, targetPlayer.position);
                    if (dist <= 40) {
                        const damage = mob.attemptAttack(currentTime);
                        if (damage > 0) {
                            targetPlayer.takeDamage(damage);
                            // Trigger attack event (for animation/sound)
                            this.triggerEvent('mobAttack', mob.id, mob.position.x, mob.position.y);
                        }
                    }

                } else {
                    // Player disconnected or gone
                    mob.targetId = null;
                    mob.target = null;
                }
            }
            mob.update(deltaTime, deltaMs);
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(deltaTime);

            // Check expiration
            if (!bullet.active || bullet.isExpired(currentTime)) {
                this.bullets.splice(i, 1);
                continue;
            }
        }

        // Collision detection
        this.handleCollisions();
    }

    public aggroAll(targetId: string): void {
        const player = this.players.get(targetId);
        if (!player) return;

        for (const mob of this.mobs) {
            if (mob.alive) {
                mob.setAggro(player.position, targetId);
            }
        }
    }

    private spawnBullet(player: ServerPlayer, currentTime: number): void {
        // Calculate weapon position (similar to client)
        const forward = vec2(
            Math.cos(player.flashlightAngle),
            Math.sin(player.flashlightAngle)
        );
        const right = vec2(
            -Math.sin(player.flashlightAngle),
            Math.cos(player.flashlightAngle)
        );
        const offset = add(
            { x: forward.x * 25, y: forward.y * 25 },
            { x: right.x * 10, y: right.y * 10 }
        );
        const weaponPos = add(player.position, offset);

        const bullet = new ServerBullet(
            `bullet_${this.nextBulletId++}`,
            weaponPos,
            player.flashlightAngle,
            player.id,
            currentTime
        );
        this.bullets.push(bullet);
        this.triggerEvent('playerShoot', player.id, weaponPos.x, weaponPos.y, player.flashlightAngle);
    }

    private handleCollisions(): void {
        // Player-Wall collisions
        for (const player of this.players.values()) {
            for (const wall of this.world.walls) {
                const push = circleRectCollision(
                    player.position,
                    GAME_CONFIG.PLAYER_RADIUS,
                    wall.x,
                    wall.y,
                    wall.width,
                    wall.height
                );
                if (push) {
                    player.position = add(player.position, push);
                }
            }
        }

        // Mob-Wall collisions
        for (const mob of this.mobs) {
            for (const wall of this.world.walls) {
                const push = circleRectCollision(
                    mob.position,
                    GAME_CONFIG.MOB_RADIUS,
                    wall.x,
                    wall.y,
                    wall.width,
                    wall.height
                );
                if (push) {
                    mob.position = add(mob.position, push);
                    if (!mob.target) mob.reverseDirection();
                }
            }
        }

        // Bullet-Wall collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            for (const wall of this.world.walls) {
                if (
                    bullet.position.x >= wall.x &&
                    bullet.position.x <= wall.x + wall.width &&
                    bullet.position.y >= wall.y &&
                    bullet.position.y <= wall.y + wall.height
                ) {
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }

        // Bullet-Mob collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.active) continue;

            for (let j = this.mobs.length - 1; j >= 0; j--) {
                const mob = this.mobs[j];
                if (!mob.alive) continue;

                if (
                    circleCircleCollision(
                        bullet.position,
                        GAME_CONFIG.BULLET_RADIUS,
                        mob.position,
                        GAME_CONFIG.MOB_RADIUS
                    )
                ) {
                    bullet.active = false;
                    this.bullets.splice(i, 1);

                    const died = mob.takeDamage();
                    if (died) {
                        this.triggerEvent('mobDeath', mob.id, mob.position.x, mob.position.y);
                        this.mobs.splice(j, 1);
                        this.spawnMob(); // Respawn
                    } else {
                        this.triggerEvent('mobHit', mob.id, mob.position.x, mob.position.y);
                    }
                    break;
                }
            }
        }


        // Entity-Entity Collisions (Prevent overlap)

        // Player-Player
        const playerIds = Array.from(this.players.keys());
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1 = this.players.get(playerIds[i])!;
                const p2 = this.players.get(playerIds[j])!;

                const push = getCircleCollisionPush(
                    p1.position,
                    GAME_CONFIG.PLAYER_RADIUS,
                    p2.position,
                    GAME_CONFIG.PLAYER_RADIUS
                );

                if (push) {
                    const halfPush = mul(push, 0.5);
                    p1.position = add(p1.position, halfPush);
                    p2.position = sub(p2.position, halfPush);
                }
            }
        }

        // Mob-Mob
        for (let i = 0; i < this.mobs.length; i++) {
            for (let j = i + 1; j < this.mobs.length; j++) {
                const m1 = this.mobs[i];
                const m2 = this.mobs[j];

                if (!m1.alive || !m2.alive) continue;

                const push = getCircleCollisionPush(
                    m1.position,
                    GAME_CONFIG.MOB_RADIUS,
                    m2.position,
                    GAME_CONFIG.MOB_RADIUS
                );

                if (push) {
                    const halfPush = mul(push, 0.5);
                    m1.position = add(m1.position, halfPush);
                    m2.position = sub(m2.position, halfPush);
                }
            }
        }

        // Player-Mob
        for (const player of this.players.values()) {
            for (const mob of this.mobs) {
                if (!mob.alive) continue;

                const push = getCircleCollisionPush(
                    player.position,
                    GAME_CONFIG.PLAYER_RADIUS,
                    mob.position,
                    GAME_CONFIG.MOB_RADIUS
                );

                if (push) {
                    const halfPush = mul(push, 0.5);
                    player.position = add(player.position, halfPush);
                    mob.position = sub(mob.position, halfPush);
                }
            }
        }
    }

    public getGameState(): GameState {
        const playerStates: Record<string, any> = {};
        for (const [id, player] of this.players) {
            playerStates[id] = player.toState();
        }

        return {
            players: playerStates,
            mobs: this.mobs.map((mob) => mob.toState()),
            bullets: this.bullets.map((bullet) => bullet.toState()),
            timestamp: Date.now(),
        };
    }

    public getWorldData() {
        return {
            walls: this.world.walls,
            lamps: this.world.lamps,
        };
    }
}
