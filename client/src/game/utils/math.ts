// Math utility functions for the game

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

export function distanceSq(a: Vec2, b: Vec2): number {
  return lengthSq(sub(a, b));
}

export function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function angle(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

export function angleBetween(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Line segment intersection
export interface Segment {
  p1: Vec2;
  p2: Vec2;
}

export function lineIntersection(
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  p4: Vec2
): Vec2 | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }
  return null;
}

// Ray-segment intersection - returns distance T along ray
export function raySegmentIntersection(
  rayOrigin: Vec2,
  rayDir: Vec2,
  segStart: Vec2,
  segEnd: Vec2
): number | null {
  const v1 = sub(rayOrigin, segStart);
  const v2 = sub(segEnd, segStart);
  const v3 = { x: -rayDir.y, y: rayDir.x };

  const dotV2V3 = dot(v2, v3);
  if (Math.abs(dotV2V3) < 0.0001) return null;

  const t1 = (v2.x * v1.y - v2.y * v1.x) / dotV2V3;
  const t2 = dot(v1, v3) / dotV2V3;

  if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
    return t1;
  }
  return null;
}

// Calculate tangent points from external point to circle
// Used for anti-jitter shadow calculation
export function circleTangentPoints(
  circleCenter: Vec2,
  radius: number,
  externalPoint: Vec2
): [Vec2, Vec2] | null {
  const d = distance(externalPoint, circleCenter);
  if (d <= radius) return null; // Point inside or on circle

  const a = Math.asin(radius / d);
  const b = angleBetween(externalPoint, circleCenter);

  const tangentDist = Math.sqrt(d * d - radius * radius);

  const t1: Vec2 = {
    x: externalPoint.x + tangentDist * Math.cos(b - a),
    y: externalPoint.y + tangentDist * Math.sin(b - a),
  };

  const t2: Vec2 = {
    x: externalPoint.x + tangentDist * Math.cos(b + a),
    y: externalPoint.y + tangentDist * Math.sin(b + a),
  };

  return [t1, t2];
}

// Get rectangle corners
export function getRectCorners(
  x: number,
  y: number,
  width: number,
  height: number
): Vec2[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

// Get rectangle edges as segments
export function getRectSegments(
  x: number,
  y: number,
  width: number,
  height: number
): Segment[] {
  const corners = getRectCorners(x, y, width, height);
  return [
    { p1: corners[0], p2: corners[1] },
    { p1: corners[1], p2: corners[2] },
    { p1: corners[2], p2: corners[3] },
    { p1: corners[3], p2: corners[0] },
  ];
}

// Random number in range
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}
