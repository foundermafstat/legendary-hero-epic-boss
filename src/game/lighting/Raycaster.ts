import {
    Vec2,
    vec2,
    sub,
    add,
    mul,
    length,
    getRectSegments,
    Segment,
    raySegmentIntersection,
} from '../utils/math';
import { WallData } from '../Wall';

interface Circle {
    position: Vec2;
    radius: number;
}

// Optimized raycasting - cast rays and return visibility polygon
export function castRays(
    origin: Vec2,
    walls: WallData[],
    mobs: Circle[],
    range: number,
    coneAngle?: number,
    coneDirection?: number
): Vec2[] {
    // Collect segments from nearby walls only
    const segments: Segment[] = [];

    for (const wall of walls) {
        // Skip walls that are too far
        const wallCenterX = wall.x + wall.width / 2;
        const wallCenterY = wall.y + wall.height / 2;
        const dist = length(sub(vec2(wallCenterX, wallCenterY), origin));
        const wallRadius = length(vec2(wall.width, wall.height)) / 2;

        if (dist - wallRadius <= range) {
            segments.push(...getRectSegments(wall.x, wall.y, wall.width, wall.height));
        }
    }

    // Determine ray count and angle range
    const isFullCircle = coneAngle === undefined || coneDirection === undefined;

    let startAngle: number;
    let endAngle: number;
    let rayCount: number;

    if (isFullCircle) {
        startAngle = 0;
        endAngle = Math.PI * 2;
        rayCount = 90; // 4 degrees per ray - good balance of quality/performance
    } else {
        startAngle = coneDirection - coneAngle;
        endAngle = coneDirection + coneAngle;
        rayCount = 45; // More rays within the cone for quality
    }

    const points: Vec2[] = [];
    const angleStep = (endAngle - startAngle) / rayCount;

    // Cast evenly-spaced rays
    for (let i = 0; i <= rayCount; i++) {
        const angle = startAngle + i * angleStep;
        const rayDir = vec2(Math.cos(angle), Math.sin(angle));

        let closestDist = range;

        // Check wall segments
        for (const seg of segments) {
            const dist = raySegmentIntersection(origin, rayDir, seg.p1, seg.p2);
            if (dist !== null && dist > 0.5 && dist < closestDist) {
                closestDist = dist;
            }
        }

        // Check mob circles (simplified - just check distance to center for occlusion)
        for (const mob of mobs) {
            const toMob = sub(mob.position, origin);
            const mobDist = length(toMob);

            if (mobDist <= range && mobDist > mob.radius) {
                // Check if ray passes through mob circle
                const mobAngle = Math.atan2(toMob.y, toMob.x);
                const angularRadius = Math.asin(mob.radius / mobDist);

                let angleDiff = angle - mobAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) < angularRadius) {
                    // Ray hits mob
                    const hitDist = mobDist - mob.radius * 0.9;
                    if (hitDist > 0.5 && hitDist < closestDist) {
                        closestDist = hitDist;
                    }
                }
            }
        }

        // Add point at closest intersection
        points.push(add(origin, mul(rayDir, closestDist)));
    }

    return points;
}
