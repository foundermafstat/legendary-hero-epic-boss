import { Graphics } from 'pixi.js';
import { Vec2 } from './utils/math';

export interface WallData {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class Wall {
    public graphics: Graphics;
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    constructor(x: number, y: number, width: number, height: number, color: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.graphics = new Graphics();
        this.draw(color);
    }

    private draw(color: number): void {
        this.graphics.rect(this.x, this.y, this.width, this.height);
        this.graphics.fill({ color });

        // Add highlight on top and left
        this.graphics.rect(this.x, this.y, this.width, 3);
        this.graphics.fill({ color: 0x777777 });

        this.graphics.rect(this.x, this.y, 3, this.height);
        this.graphics.fill({ color: 0x666666 });

        // Add shadow on bottom and right
        this.graphics.rect(this.x, this.y + this.height - 3, this.width, 3);
        this.graphics.fill({ color: 0x333333 });

        this.graphics.rect(this.x + this.width - 3, this.y, 3, this.height);
        this.graphics.fill({ color: 0x444444 });
    }

    public getData(): WallData {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }

    public containsPoint(point: Vec2): boolean {
        return (
            point.x >= this.x &&
            point.x <= this.x + this.width &&
            point.y >= this.y &&
            point.y <= this.y + this.height
        );
    }
}
