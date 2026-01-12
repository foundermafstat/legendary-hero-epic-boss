import { Vec2 } from '../shared/types';
import { GAME_CONFIG } from '../shared/config';
import { vec2, random } from '../utils/math';

export interface WallData {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface LampData {
    x: number;
    y: number;
    range: number;
}

export class ServerWorld {
    public walls: WallData[] = [];
    public lamps: LampData[] = [];

    constructor() {
        this.generateWalls();
        this.generateLamps();
    }

    private generateWalls(): void {
        const margin = 100;
        const center = {
            x: GAME_CONFIG.WORLD_WIDTH / 2,
            y: GAME_CONFIG.WORLD_HEIGHT / 2,
        };
        const spawnZone = 400;

        for (let i = 0; i < GAME_CONFIG.WALL_COUNT; i++) {
            let x: number, y: number, width: number, height: number;
            let attempts = 0;
            const maxAttempts = 50;

            do {
                x = random(margin, GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.WALL_MAX_SIZE - margin);
                y = random(margin, GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.WALL_MAX_SIZE - margin);
                width = random(GAME_CONFIG.WALL_MIN_SIZE, GAME_CONFIG.WALL_MAX_SIZE);
                height = random(GAME_CONFIG.WALL_MIN_SIZE, GAME_CONFIG.WALL_MAX_SIZE);
                attempts++;
            } while (
                attempts < maxAttempts &&
                this.overlapsSpawnZone(x, y, width, height, center, spawnZone)
            );

            this.walls.push({ x, y, width, height });
        }
    }

    private overlapsSpawnZone(
        x: number,
        y: number,
        width: number,
        height: number,
        center: { x: number; y: number },
        spawnZone: number
    ): boolean {
        const closestX = Math.max(x, Math.min(center.x, x + width));
        const closestY = Math.max(y, Math.min(center.y, y + height));
        const distX = center.x - closestX;
        const distY = center.y - closestY;
        return distX * distX + distY * distY < spawnZone * spawnZone;
    }

    private generateLamps(): void {
        for (let i = 0; i < GAME_CONFIG.LAMP_COUNT; i++) {
            const x = random(200, GAME_CONFIG.WORLD_WIDTH - 200);
            const y = random(200, GAME_CONFIG.WORLD_HEIGHT - 200);
            this.lamps.push({ x, y, range: 200 });
        }
    }

    public getSpawnPosition(): Vec2 {
        return vec2(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2);
    }

    public getRandomSpawnPosition(): Vec2 {
        let x: number, y: number;
        let attempts = 0;
        const maxAttempts = 100;
        const center = {
            x: GAME_CONFIG.WORLD_WIDTH / 2,
            y: GAME_CONFIG.WORLD_HEIGHT / 2,
        };
        const spawnZone = 500;

        do {
            x = random(100, GAME_CONFIG.WORLD_WIDTH - 100);
            y = random(100, GAME_CONFIG.WORLD_HEIGHT - 100);
            attempts++;
        } while (
            attempts < maxAttempts &&
            this.isInSpawnZone(x, y, center, spawnZone)
        );

        return vec2(x, y);
    }

    private isInSpawnZone(
        x: number,
        y: number,
        center: { x: number; y: number },
        spawnZone: number
    ): boolean {
        const distX = x - center.x;
        const distY = y - center.y;
        return distX * distX + distY * distY < spawnZone * spawnZone;
    }
}
