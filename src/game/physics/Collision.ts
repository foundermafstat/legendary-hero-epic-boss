import { Vec2, vec2, sub, add, mul, normalize, length, lengthSq } from '../utils/math';
import { WallData } from '../Wall';

export interface Circle {
    position: Vec2;
    radius: number;
}

// Circle-Rectangle collision detection and resolution
export function circleRectCollision(
    circle: { position: Vec2; radius: number },
    rect: WallData
): Vec2 | null {
    // Find closest point on rectangle to circle center
    const closestX = Math.max(rect.x, Math.min(circle.position.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.position.y, rect.y + rect.height));

    const closest = vec2(closestX, closestY);
    const diff = sub(circle.position, closest);
    const distSq = lengthSq(diff);

    if (distSq < circle.radius * circle.radius) {
        const dist = Math.sqrt(distSq);

        if (dist === 0) {
            // Circle center is inside rectangle, push out in shortest direction
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;

            const dx = circle.position.x - centerX;
            const dy = circle.position.y - centerY;

            const halfW = rect.width / 2;
            const halfH = rect.height / 2;

            const overlapX = halfW - Math.abs(dx) + circle.radius;
            const overlapY = halfH - Math.abs(dy) + circle.radius;

            if (overlapX < overlapY) {
                return vec2(dx > 0 ? overlapX : -overlapX, 0);
            } else {
                return vec2(0, dy > 0 ? overlapY : -overlapY);
            }
        }

        const overlap = circle.radius - dist;
        const normal = normalize(diff);
        return mul(normal, overlap);
    }

    return null;
}

// Circle-Circle collision detection and resolution
export function circleCircleCollision(
    c1: { position: Vec2; radius: number },
    c2: { position: Vec2; radius: number }
): { push1: Vec2; push2: Vec2 } | null {
    const diff = sub(c1.position, c2.position);
    const distSq = lengthSq(diff);
    const minDist = c1.radius + c2.radius;

    if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const normal = normalize(diff);

        // Push both circles apart (equal and opposite)
        const push = mul(normal, overlap / 2);
        return {
            push1: push,
            push2: mul(push, -1),
        };
    }

    return null;
}

// Check if a point would spawn inside a wall
export function pointInWalls(point: Vec2, walls: WallData[], padding: number = 0): boolean {
    for (const wall of walls) {
        if (
            point.x >= wall.x - padding &&
            point.x <= wall.x + wall.width + padding &&
            point.y >= wall.y - padding &&
            point.y <= wall.y + wall.height + padding
        ) {
            return true;
        }
    }
    return false;
}

// Check if two rectangles overlap
export function rectsOverlap(
    r1: WallData,
    r2: WallData,
    padding: number = 0
): boolean {
    return !(
        r1.x + r1.width + padding < r2.x ||
        r2.x + r2.width + padding < r1.x ||
        r1.y + r1.height + padding < r2.y ||
        r2.y + r2.height + padding < r1.y
    );
}
