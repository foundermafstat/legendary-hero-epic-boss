import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import { Vec2, vec2, length, normalize, mul } from '../utils/math';

export class Joystick extends Container {
    public value: Vec2 = vec2(0, 0); // Normalized direction (-1 to 1)
    public isDragging: boolean = false;

    private outerRadius: number;
    private innerRadius: number;
    private knob: Graphics;
    private base: Graphics;
    private touchId: number | null = null;
    private startPos: Vec2 = vec2(0, 0);

    constructor(outerRadius: number = 60, innerRadius: number = 30) {
        super();
        this.outerRadius = outerRadius;
        this.innerRadius = innerRadius;

        this.base = new Graphics();
        this.base.circle(0, 0, outerRadius);
        this.base.fill({ color: 0x222222, alpha: 0.5 });
        this.base.stroke({ color: 0x555555, width: 2 });
        this.addChild(this.base);

        this.knob = new Graphics();
        this.knob.circle(0, 0, innerRadius);
        this.knob.fill({ color: 0x888888, alpha: 0.8 });
        this.addChild(this.knob);

        // Interactive
        this.base.eventMode = 'static';
        this.base.cursor = 'pointer';

        this.base.on('pointerdown', this.onPointerDown.bind(this));

        // Listen globally for move/up to handle dragging outside
        // We need to attach these to the stage or window, but 'this.base' context is local.
        // Pixi v8 handles this via stage usually?
        // Let's bind 'onPointerMove' to the base but capture events even if outside?
        // Actually, best practice for joysticks is binding move/up to window or stage when dragging.
    }

    // We need to pass the stage or app to register global listeners? 
    // Or just use 'global' events on the interaction manager.
    // For simplicity, let's use the object events and assume standard Pixi behavior (capture).

    private onPointerDown(e: FederatedPointerEvent) {
        if (this.isDragging) return;
        this.isDragging = true;
        this.touchId = e.pointerId;
        this.startPos = vec2(e.global.x, e.global.y);
        this.knob.alpha = 1.0;

        const stage = this.parent.parent; // Assuming Game -> HUD -> Joystick?
        // Better: Listen on main app stage if possible. 
        // For now, let's listen on 'window' for moves to be robust, 
        // but we need to convert to local space.

        // Pixi way:
        const target = e.target;
        target.on('pointermove', this.onPointerMove, this);
        target.on('pointerup', this.onPointerUp, this);
        target.on('pointerupoutside', this.onPointerUp, this);

        // Initial move calculation
        this.updateKnob(e.global.x, e.global.y);
    }

    private onPointerMove(e: FederatedPointerEvent) {
        if (!this.isDragging || e.pointerId !== this.touchId) return;
        this.updateKnob(e.global.x, e.global.y);
    }

    private onPointerUp(e: FederatedPointerEvent) {
        if (!this.isDragging || e.pointerId !== this.touchId) return;
        this.isDragging = false;
        this.touchId = null;
        this.value = vec2(0, 0);
        this.knob.position.set(0, 0);
        this.knob.alpha = 0.8;

        const target = e.target;
        target.off('pointermove', this.onPointerMove, this);
        target.off('pointerup', this.onPointerUp, this);
        target.off('pointerupoutside', this.onPointerUp, this);
    }

    private updateKnob(globalX: number, globalY: number) {
        // Convert global to local (relative to base center which is 0,0 in this container)
        // Container world transform?
        const local = this.toLocal({ x: globalX, y: globalY });

        let delta = vec2(local.x, local.y);
        const dist = length(delta);

        if (dist > this.outerRadius) {
            delta = mul(normalize(delta), this.outerRadius);
        }

        this.knob.position.set(delta.x, delta.y);

        // Update value (-1 to 1)
        this.value = vec2(delta.x / this.outerRadius, delta.y / this.outerRadius);
    }
}
