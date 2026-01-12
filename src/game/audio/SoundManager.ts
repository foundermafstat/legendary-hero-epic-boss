// Procedural sound generation using Web Audio API
export class SoundManager {
    private ctx: AudioContext | null = null;

    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        return this.ctx;
    }

    // Gunshot: short noise burst with decay
    playGunshot() {
        const ctx = this.getContext();
        const duration = 0.08;

        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.1));
        }

        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        const gain = ctx.createGain();
        gain.gain.value = 0.3;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
    }

    // Footstep: low thump
    playFootstep() {
        const ctx = this.getContext();

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 80 + Math.random() * 40;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    // Hit mob: squelchy impact
    playMobHit() {
        const ctx = this.getContext();
        const duration = 0.12;

        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            data[i] = (Math.random() * 2 - 1) * Math.sin(t * 200) * Math.exp(-t * 30);
        }

        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = ctx.createGain();
        gain.gain.value = 0.25;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
    }

    // Shell casing: metallic ping
    playShellDrop() {
        const ctx = this.getContext();

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 3000 + Math.random() * 2000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.06);
    }
}

// Singleton
export const soundManager = new SoundManager();
