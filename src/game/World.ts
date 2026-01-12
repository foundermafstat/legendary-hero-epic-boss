import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from './config';
import { Wall, WallData } from './Wall';
import { random, randomInt, Vec2, vec2 } from './utils/math';
import { pointInWalls, rectsOverlap } from './physics/Collision';

export interface Lamp {
    x: number;
    y: number;
    range: number;
    color: number;
}

export class World {
    public container: Container;
    public floorGraphics: Graphics;
    public walls: Wall[] = [];
    public lamps: Lamp[] = [];

    constructor() {
        this.container = new Container();
        this.floorGraphics = new Graphics();

        this.generateFloor();
        this.generateWalls();
        this.generateLamps();

        this.container.addChild(this.floorGraphics);

        // Add walls to container
        for (const wall of this.walls) {
            this.container.addChild(wall.graphics);
        }
    }

    private generateFloor(): void {
        // Main floor
        this.floorGraphics.rect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
        this.floorGraphics.fill({ color: GAME_CONFIG.FLOOR_COLOR });

        // Grid lines
        const tileSize = GAME_CONFIG.TILE_SIZE;

        for (let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += tileSize) {
            this.floorGraphics.moveTo(x, 0);
            this.floorGraphics.lineTo(x, GAME_CONFIG.WORLD_HEIGHT);
        }

        for (let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += tileSize) {
            this.floorGraphics.moveTo(0, y);
            this.floorGraphics.lineTo(GAME_CONFIG.WORLD_WIDTH, y);
        }

        this.floorGraphics.stroke({ color: GAME_CONFIG.GRID_COLOR, width: 1 });
    }

    private generateWalls(): void {
        const wallDatas: WallData[] = [];

        // Border walls
        const borderThickness = 30;

        // Top
        this.addWall(0, 0, GAME_CONFIG.WORLD_WIDTH, borderThickness, wallDatas);
        // Bottom
        this.addWall(0, GAME_CONFIG.WORLD_HEIGHT - borderThickness, GAME_CONFIG.WORLD_WIDTH, borderThickness, wallDatas);
        // Left
        this.addWall(0, 0, borderThickness, GAME_CONFIG.WORLD_HEIGHT, wallDatas);
        // Right
        this.addWall(GAME_CONFIG.WORLD_WIDTH - borderThickness, 0, borderThickness, GAME_CONFIG.WORLD_HEIGHT, wallDatas);

        // Random interior walls
        const centerX = GAME_CONFIG.WORLD_WIDTH / 2;
        const centerY = GAME_CONFIG.WORLD_HEIGHT / 2;
        const safeZone = 200; // Keep spawn area clear

        let attempts = 0;
        while (this.walls.length < GAME_CONFIG.WALL_COUNT + 4 && attempts < 500) {
            attempts++;

            const width = randomInt(GAME_CONFIG.WALL_MIN_SIZE, GAME_CONFIG.WALL_MAX_SIZE);
            const height = randomInt(GAME_CONFIG.WALL_MIN_SIZE, GAME_CONFIG.WALL_MAX_SIZE);
            const x = randomInt(borderThickness + 50, GAME_CONFIG.WORLD_WIDTH - borderThickness - width - 50);
            const y = randomInt(borderThickness + 50, GAME_CONFIG.WORLD_HEIGHT - borderThickness - height - 50);

            // Check if too close to center (spawn area)
            if (
                x < centerX + safeZone &&
                x + width > centerX - safeZone &&
                y < centerY + safeZone &&
                y + height > centerY - safeZone
            ) {
                continue;
            }

            const newWall: WallData = { x, y, width, height };

            // Check overlap with existing walls
            let overlaps = false;
            for (const existing of wallDatas) {
                if (rectsOverlap(newWall, existing, 30)) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.addWall(x, y, width, height, wallDatas);
            }
        }
    }

    private addWall(x: number, y: number, width: number, height: number, datas: WallData[]): void {
        const wall = new Wall(x, y, width, height, GAME_CONFIG.WALL_COLOR);
        this.walls.push(wall);
        datas.push(wall.getData());
    }

    private generateLamps(): void {
        const wallDatas = this.walls.map(w => w.getData());

        let attempts = 0;
        while (this.lamps.length < GAME_CONFIG.LAMP_COUNT && attempts < 200) {
            attempts++;

            const x = random(100, GAME_CONFIG.WORLD_WIDTH - 100);
            const y = random(100, GAME_CONFIG.WORLD_HEIGHT - 100);

            // Check if in a wall
            if (pointInWalls(vec2(x, y), wallDatas, 50)) {
                continue;
            }

            // Check distance from other lamps
            let tooClose = false;
            for (const lamp of this.lamps) {
                const dx = x - lamp.x;
                const dy = y - lamp.y;
                if (dx * dx + dy * dy < 250 * 250) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                this.lamps.push({
                    x,
                    y,
                    range: GAME_CONFIG.LAMP_RANGE + random(-30, 30),
                    color: GAME_CONFIG.LAMP_COLOR,
                });

                // Draw lamp indicator on floor
                this.floorGraphics.circle(x, y, 8);
                this.floorGraphics.fill({ color: 0xffaa00 });
                this.floorGraphics.circle(x, y, 12);
                this.floorGraphics.stroke({ color: 0x886600, width: 2 });
            }
        }
    }

    public getWallDatas(): WallData[] {
        return this.walls.map(w => w.getData());
    }

    public getSpawnPosition(): Vec2 {
        return vec2(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2);
    }

    public getRandomSpawnPosition(): Vec2 {
        const wallDatas = this.getWallDatas();
        let attempts = 0;

        while (attempts < 100) {
            attempts++;
            const x = random(100, GAME_CONFIG.WORLD_WIDTH - 100);
            const y = random(100, GAME_CONFIG.WORLD_HEIGHT - 100);

            if (!pointInWalls(vec2(x, y), wallDatas, 50)) {
                return vec2(x, y);
            }
        }

        return vec2(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2);
    }
}
