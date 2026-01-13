import { Vec2 } from './types';

export function vec2(x: number, y: number): Vec2 {
    return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(v: Vec2, scalar: number): Vec2 {
    return { x: v.x * scalar, y: v.y * scalar };
}

export function length(v: Vec2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Vec2): Vec2 {
    const len = length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

export function distance(a: Vec2, b: Vec2): number {
    return length(sub(a, b));
}

export function random(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export function circleCircleCollision(
    pos1: Vec2,
    radius1: number,
    pos2: Vec2,
    radius2: number
): boolean {
    return distance(pos1, pos2) < radius1 + radius2;
}

export function getCircleCollisionPush(
    pos1: Vec2,
    radius1: number,
    pos2: Vec2,
    radius2: number
): Vec2 | null {
    const dist = distance(pos1, pos2);
    const minDist = radius1 + radius2;

    if (dist < minDist) {
        if (dist === 0) {
            return vec2(1, 0);
        }
        const pushDistance = minDist - dist;
        return mul(normalize(sub(pos1, pos2)), pushDistance);
    }

    return null;
}

export function circleRectCollision(
    circlePos: Vec2,
    circleRadius: number,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number
): Vec2 | null {
    const closestX = Math.max(rectX, Math.min(circlePos.x, rectX + rectWidth));
    const closestY = Math.max(rectY, Math.min(circlePos.y, rectY + rectHeight));

    const distX = circlePos.x - closestX;
    const distY = circlePos.y - closestY;
    const distSquared = distX * distX + distY * distY;

    if (distSquared < circleRadius * circleRadius) {
        const dist = Math.sqrt(distSquared);
        if (dist === 0) {
            return vec2(1, 0);
        }
        const pushDistance = circleRadius - dist;
        return mul(normalize(vec2(distX, distY)), pushDistance);
    }

    return null;
}
