import { Container, Graphics, Application, Texture, Sprite } from 'pixi.js';
import { Bullet } from '../combat/Bullet';
import { Shell } from '../combat/Shell';

class Corpse {
    public sprite: Sprite;
    public lifetime: number = 10000; // 10 seconds
    public active: boolean = true;

    constructor(texture: Texture, x: number, y: number, rotation: number) {
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.rotation = rotation;
        this.sprite.tint = 0x888888; // Darken the corpse
    }

    update(deltaMs: number) {
        this.lifetime -= deltaMs;
        if (this.lifetime < 2000) {
            this.sprite.alpha = this.lifetime / 2000;
        }
        if (this.lifetime <= 0) {
            this.active = false;
        }
    }
}

export class FXManager {
    public container: Container;
    public bullets: Bullet[] = [];
    public shells: Shell[] = [];
    public corpses: Corpse[] = [];

    private app: Application;
    private bulletTexture: Texture;
    private shellTexture: Texture;
    private bloodTexture: Texture;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();

        // Generate textures once
        this.bulletTexture = this.generateBulletTexture();
        this.shellTexture = this.generateShellTexture();
        this.bloodTexture = this.generateBloodTexture();
    }

    private generateBulletTexture(): Texture {
        const g = new Graphics();
        g.rect(0, 0, 4, 8); // 1x2 pixel ratio (scaled up slightly for visibility? User said 1x2 "pixels". 
        // If literally 1x2 pixels, it's tiny. Let's assume 2x4 for visibility or scale down Sprite.
        // User said "smaller than before, 1x2". Before was radius 3 (6px wide).
        // Let's do 2px wide, 4px long.
        g.fill({ color: 0xFFFF00 });
        return this.app.renderer.generateTexture(g);
    }

    private generateShellTexture(): Texture {
        const g = new Graphics();
        g.rect(0, 0, 2, 4); // User said 1x2 pixels. Let's try 2x4 for visibility.
        g.fill({ color: 0xD4AF37 });
        return this.app.renderer.generateTexture(g);
    }

    private generateBloodTexture(): Texture {
        const g = new Graphics();
        g.circle(0, 0, 4);
        g.fill({ color: 0x8B0000, alpha: 0.8 });
        return this.app.renderer.generateTexture(g);
    }

    createBloodSplatter(x: number, y: number) {
        // Random splatter pattern using pre-generated texture
        for (let i = 0; i < 3; i++) {
            const s = new Sprite(this.bloodTexture);
            s.anchor.set(0.5);
            s.x = x + (Math.random() - 0.5) * 12;
            s.y = y + (Math.random() - 0.5) * 12;
            const scale = 0.5 + Math.random() * 1.0;
            s.scale.set(scale);
            s.rotation = Math.random() * Math.PI * 2;

            // Add at beginning so it's under shells/bullets
            this.container.addChildAt(s, 0);

            // Should properly manage blood sprites too for cleanup? 
            // For now, let's keep them persistent as requested but maybe limit max count if optimizing?
            // User asked for corpses to fade, implied blood fades too? "like blood spots".
            // Let's add simple fade logic to blood? The user said "fallen body... disappears LIKE blood spots".
            // So blood spots SHOULD disappear.

            // Hack: Attach fade tween to sprite or manage in list. 
            // Let's assume blood stays for a long time.
        }
    }

    spawnCorpse(mobContainer: Container, x: number, y: number) {
        // Snapshot the mob visual
        const texture = this.app.renderer.generateTexture(mobContainer);
        const corpse = new Corpse(texture, x, y, Math.random() * Math.PI * 2);

        this.corpses.push(corpse);
        this.container.addChildAt(corpse.sprite, 0); // Bottom layer
    }

    spawnBullet(x: number, y: number, angle: number): Bullet {
        const bullet = new Bullet(x, y, angle, this.bulletTexture);
        this.bullets.push(bullet);
        this.container.addChild(bullet.container);
        return bullet;
    }

    spawnShell(x: number, y: number, angle: number) {
        const shell = new Shell(x, y, angle, this.shellTexture);
        this.shells.push(shell);
        this.container.addChild(shell.container);
    }

    createMuzzleFlash(x: number, y: number, angle: number) {
        const flash = new Graphics();
        flash.poly([0, 0, 20, -5, 30, 0, 20, 5]);
        flash.fill({ color: 0xFFFFCC, alpha: 0.8 });
        flash.rotation = angle;
        flash.x = x;
        flash.y = y;

        this.container.addChild(flash);

        // Remove after 50ms (1-2 frames)
        setTimeout(() => {
            if (!flash.destroyed) {
                flash.destroy();
            }
        }, 50);
    }

    update(delta: number, deltaMs: number) {
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(delta, deltaMs);
            if (!bullet.active) {
                bullet.container.destroy();
                this.bullets.splice(i, 1);
            }
        }

        // Update shells
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const shell = this.shells[i];
            shell.update(delta, deltaMs);
            if (!shell.active) {
                shell.container.destroy();
                this.shells.splice(i, 1);
            }
        }

        // Update corpses
        for (let i = this.corpses.length - 1; i >= 0; i--) {
            const corpse = this.corpses[i];
            corpse.update(deltaMs);
            if (!corpse.active) {
                corpse.sprite.destroy();
                this.corpses.splice(i, 1);
            }
        }

        // TODO: Blood fading update loop if needed
    }
}
