// Procedural sound generation using Web Audio API
export class SoundManager {
    private ctx: AudioContext | null = null;

    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        return this.ctx;
    }

    // --- Weapon Sounds ---

    // Handgun: Sharp, quick
    playHandgunShot() {
        const ctx = this.getContext();
        const t = ctx.currentTime;

        // Noise burst
        const noise = ctx.createBufferSource();
        const dur = 0.1;
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
        noise.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, t);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start();

        // Tone for "ping"
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.1, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(oscGain).connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.1);
    }

    // Rifle: Loud, punchy
    playRifleShot() {
        const ctx = this.getContext();
        const t = ctx.currentTime;

        // Main bang
        const noise = ctx.createBufferSource();
        const dur = 0.2; // Longer tail
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
        noise.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.linearRampToValueAtTime(500, t + 0.1);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start();
    }

    // Shotgun: Booom
    playShotgunShot() {
        const ctx = this.getContext();
        const t = ctx.currentTime;

        // Heavy noise
        const noise = ctx.createBufferSource();
        const dur = 0.3;
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1); // Full noise, less decay init
        noise.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.25);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start();

        // Sub-bass kick
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(oscGain).connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.3);
    }

    // Melee Swing (Whoosh)
    playMeleeSwing() {
        const ctx = this.getContext();
        const t = ctx.currentTime;

        const noise = ctx.createBufferSource();
        const dur = 0.15;
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
        noise.buffer = buf;

        // Bandpass sweep for whoosh
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1;
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.linearRampToValueAtTime(1200, t + 0.1);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.07);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);

        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start();
    }

    // Melee Impact (Thud/Meat)
    playMeleeImpact() {
        const ctx = this.getContext();
        const t = ctx.currentTime;

        // Thud
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.1);
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

    // Mob growl: low saw with filter sweep
    playGrowl(volume: number = 0.5) {
        const ctx = this.getContext();

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80 + Math.random() * 40, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5); // pitch drop

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5); // filter closing

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume * 0.4, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.7);
    }
    playSound(sound: string, options?: { volume?: number, rate?: number }) {
        switch (sound) {
            case 'shoot':
                this.playRifleShot(); // Default
                break;
            case 'shoot_handgun':
                this.playHandgunShot();
                break;
            case 'shoot_rifle':
                this.playRifleShot();
                break;
            case 'shoot_shotgun':
                this.playShotgunShot();
                break;
            case 'melee_swing':
                this.playMeleeSwing();
                break;
            case 'melee_hit':
                this.playMeleeImpact();
                break;
            case 'step':
                this.playFootstep();
                break;
            case 'hit':
                // Use impact for mob hit
                this.playMeleeImpact();
                break;
            case 'die':
                this.playGrowl(options?.volume);
                break;
        }
    }
}

// Singleton
export const soundManager = new SoundManager();
