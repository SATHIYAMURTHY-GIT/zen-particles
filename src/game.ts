/**
 * Zen Particles: Calming Interactive Experience
 * A high-quality vanilla TypeScript implementation of a relaxing particle physics game.
 */

enum GameState {
    START,
    PLAYING,
    END
}

enum ZenParticleType {
    NORMAL,
    PULSATING,
    RAINBOW,
    SPLITTING
}

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private score: number = 0;
    private timeLeft: number = 90;
    private state: GameState = GameState.START;
    private isMuted: boolean = false;
    private audioCtx: AudioContext | null = null;
    
    // Entity lists
    private zenParticles: ZenParticle[] = [];
    private energyParticles: EnergyParticle[] = [];
    private dustParticles: DustParticle[] = [];
    private ripples: Ripple[] = [];
    
    private lastTime: number = 0;
    private timerInterval: number | null = null;
    private rippleTimer: number = 0;
    private mouse = { x: -1000, y: -1000, active: false };

    // UI Elements
    private gameContainer: HTMLElement;
    private scoreDisplay: HTMLElement;
    private timerDisplay: HTMLElement;
    private startOverlay: HTMLElement;
    private endOverlay: HTMLElement;
    private finalScoreDisplay: HTMLElement;
    private startBtn: HTMLElement;
    private restartBtn: HTMLElement;
    private muteBtn: HTMLElement;

    constructor() {
        this.gameContainer = document.getElementById('game-container')!;
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.scoreDisplay = document.getElementById('score-value')!;
        this.timerDisplay = document.getElementById('timer-value')!;
        this.startOverlay = document.getElementById('start-overlay')!;
        this.endOverlay = document.getElementById('end-overlay')!;
        this.finalScoreDisplay = document.getElementById('final-score-value')!;
        this.startBtn = document.getElementById('start-btn')!;
        this.restartBtn = document.getElementById('restart-btn')!;
        this.muteBtn = document.getElementById('mute-btn')!;

        this.init();
    }

    private init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Event listeners
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        // Interaction listeners
        const updateMouse = (x: number, y: number, active: boolean) => {
            this.mouse.x = x;
            this.mouse.y = y;
            this.mouse.active = active;
        };

        this.gameContainer.addEventListener('mousedown', (e) => {
            updateMouse(e.clientX, e.clientY, true);
            this.handleInteraction(e.clientX, e.clientY);
        });
        this.gameContainer.addEventListener('mouseup', () => updateMouse(this.mouse.x, this.mouse.y, false));
        this.gameContainer.addEventListener('mousemove', (e) => updateMouse(e.clientX, e.clientY, this.mouse.active));

        this.gameContainer.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            updateMouse(touch.clientX, touch.clientY, true);
            this.handleInteraction(touch.clientX, touch.clientY);
        }, { passive: true });
        this.gameContainer.addEventListener('touchend', () => updateMouse(this.mouse.x, this.mouse.y, false));
        this.gameContainer.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            updateMouse(touch.clientX, touch.clientY, true);
        }, { passive: true });

        // Initialize background atmosphere
        this.createDust();
        this.createZenParticles(25);
        
        // Start animation loop
        requestAnimationFrame((t) => this.loop(t));
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private startGame() {
        this.state = GameState.PLAYING;
        this.startOverlay.classList.add('hidden');
        this.endOverlay.classList.add('hidden');
        this.initAudio();
        this.startTimer();
    }

    private resetGame() {
        this.score = 0;
        this.timeLeft = 90;
        this.scoreDisplay.innerText = '0';
        this.timerDisplay.innerText = '90';
        this.startGame();
    }

    private startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = window.setInterval(() => {
            if (this.state !== GameState.PLAYING) return;
            this.timeLeft--;
            this.timerDisplay.innerText = this.timeLeft.toString();
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    private endGame() {
        this.state = GameState.END;
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.finalScoreDisplay.innerText = this.score.toString();
        this.endOverlay.classList.remove('hidden');
    }

    private initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    private playChime(freq: number, volume: number = 0.05) {
        if (this.isMuted || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.5);
    }

    private toggleMute() {
        this.isMuted = !this.isMuted;
        this.muteBtn.innerHTML = this.isMuted ? 
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>' : 
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    }

    private handleInteraction(x: number, y: number) {
        if (this.state !== GameState.PLAYING) return;

        let hit = false;
        const newParticles: ZenParticle[] = [];
        const particlesToRemove: ZenParticle[] = [];

        this.zenParticles.forEach(p => {
            const dx = x - p.x;
            const dy = y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < p.radius + 20) {
                hit = true;
                // Repel strongly
                const angle = Math.atan2(dy, dx);
                p.vx += Math.cos(angle) * 300;
                p.vy += Math.sin(angle) * 300;
                
                // Energy burst
                for (let i = 0; i < 12; i++) {
                    this.energyParticles.push(new EnergyParticle(p.x, p.y, p.isGolden));
                }
                
                // Score
                this.updateScore(p.isGolden ? 50 : 10);
                
                // Ripple
                this.ripples.push(new Ripple(p.x, p.y, p.isGolden));
                
                // Sound
                this.playChime(p.isGolden ? 880 : 440 + Math.random() * 220);

                // Splitting behavior
                if (p.type === ZenParticleType.SPLITTING && p.radius > 10) {
                    particlesToRemove.push(p);
                    // Create two smaller normal particles
                    for (let i = 0; i < 2; i++) {
                        const splitP = new ZenParticle();
                        splitP.x = p.x;
                        splitP.y = p.y;
                        splitP.radius = p.radius * 0.6;
                        splitP.type = ZenParticleType.NORMAL;
                        splitP.vx = (Math.random() - 0.5) * 200;
                        splitP.vy = (Math.random() - 0.5) * 200;
                        newParticles.push(splitP);
                    }
                }
            }
        });

        // Apply splitting changes
        if (particlesToRemove.length > 0) {
            this.zenParticles = this.zenParticles.filter(p => !particlesToRemove.includes(p));
            this.zenParticles.push(...newParticles);
        }

        if (!hit) {
            this.ripples.push(new Ripple(x, y, false));
            this.playChime(220 + Math.random() * 110, 0.02);
        }

        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    private createZenParticles(count: number) {
        for (let i = 0; i < count; i++) {
            this.zenParticles.push(new ZenParticle());
        }
    }

    private createDust() {
        for (let i = 0; i < 80; i++) { // Increased from 50
            this.dustParticles.push(new DustParticle());
        }
    }

    private updateScore(points: number) {
        this.score += points;
        this.scoreDisplay.innerText = this.score.toString();
        
        const container = document.getElementById('score-container')!;
        container.style.transform = 'scale(1.1)';
        setTimeout(() => container.style.transform = 'scale(1)', 100);
    }

    private loop(time: number) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Periodic center ripple
        if (this.state === GameState.PLAYING) {
            this.rippleTimer += dt;
            if (this.rippleTimer > 8) {
                this.ripples.push(new Ripple(window.innerWidth / 2, window.innerHeight / 2, false));
                this.rippleTimer = 0;
            }
        }

        // Background Dust
        this.dustParticles.forEach(d => {
            d.update(dt);
            d.draw(this.ctx);
        });

        // Ripples
        this.ripples = this.ripples.filter(r => r.life > 0);
        this.ripples.forEach(r => {
            r.update(dt);
            r.draw(this.ctx);
        });

        // Zen Particles Physics
        this.zenParticles.forEach((p, i) => {
            p.update(dt, this.mouse, this.zenParticles, i);
            p.draw(this.ctx);
        });

        // Energy Particles
        this.energyParticles = this.energyParticles.filter(p => p.life > 0);
        this.energyParticles.forEach(p => {
            p.update(dt);
            p.draw(this.ctx);
        });

        requestAnimationFrame((t) => this.loop(t));
    }
}

class ZenParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    baseRadius: number;
    isGolden: boolean;
    color: string;
    type: ZenParticleType;
    hue: number = 0;
    pulseTime: number = Math.random() * Math.PI * 2;

    constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.vx = (Math.random() - 0.5) * 40;
        this.vy = (Math.random() - 0.5) * 40;
        this.baseRadius = 15 + Math.random() * 20;
        this.radius = this.baseRadius;
        this.isGolden = Math.random() > 0.85; // Increased probability (15%)
        this.color = this.isGolden ? '#ffd700' : '#ffffff';
        
        // Randomly assign a type
        const rand = Math.random();
        if (rand < 0.4) this.type = ZenParticleType.NORMAL;
        else if (rand < 0.6) this.type = ZenParticleType.PULSATING;
        else if (rand < 0.8) this.type = ZenParticleType.RAINBOW;
        else this.type = ZenParticleType.SPLITTING;

        if (this.type === ZenParticleType.RAINBOW) {
            this.hue = Math.random() * 360;
        }
    }

    update(dt: number, mouse: any, others: ZenParticle[], index: number) {
        // Floating movement
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Friction
        this.vx *= 0.99;
        this.vy *= 0.99;

        // Animation behaviors
        if (this.type === ZenParticleType.PULSATING) {
            this.pulseTime += dt * 3;
            this.radius = this.baseRadius + Math.sin(this.pulseTime) * 5;
        } else if (this.type === ZenParticleType.RAINBOW) {
            this.hue = (this.hue + dt * 50) % 360;
            this.color = `hsl(${this.hue}, 70%, 80%)`;
        }

        // Boundary bounce
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -0.5; }
        if (this.x > window.innerWidth - this.radius) { this.x = window.innerWidth - this.radius; this.vx *= -0.5; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -0.5; }
        if (this.y > window.innerHeight - this.radius) { this.y = window.innerHeight - this.radius; this.vy *= -0.5; }

        // Attraction to mouse
        if (mouse.active) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 400) {
                const force = (400 - dist) * 0.5;
                const angle = Math.atan2(dy, dx);
                this.vx += Math.cos(angle) * force * dt;
                this.vy += Math.sin(angle) * force * dt;
            }
        }

        // Particle-Particle Collision
        for (let i = index + 1; i < others.length; i++) {
            const other = others[i];
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = this.radius + other.radius;

            if (dist < minDist) {
                const angle = Math.atan2(dy, dx);
                const targetX = this.x + Math.cos(angle) * minDist;
                const targetY = this.y + Math.sin(angle) * minDist;
                const ax = (targetX - other.x) * 0.1;
                const ay = (targetY - other.y) * 0.1;
                
                this.vx -= ax;
                this.vy -= ay;
                other.vx += ax;
                other.vy += ay;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.shadowBlur = this.isGolden ? 25 : 12;
        ctx.shadowColor = this.color;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Type-specific visual cues
        if (this.type === ZenParticleType.SPLITTING) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (this.type === ZenParticleType.PULSATING) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Inner glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.2, this.y - this.radius * 0.2, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class EnergyParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number = 1.0;
    color: string;
    size: number;

    constructor(x: number, y: number, isGolden: boolean) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 150 + 50;
        this.vx = Math.cos(angle) * force;
        this.vy = Math.sin(angle) * force;
        this.color = isGolden ? '#ffd700' : '#ffffff';
        this.size = Math.random() * 3 + 1;
    }

    update(dt: number) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= 1.5 * dt;
        this.vx *= 0.95;
        this.vy *= 0.95;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class DustParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;

    constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.vx = (Math.random() - 0.5) * 5; // Even slower
        this.vy = (Math.random() - 0.5) * 5;
        this.size = Math.random() * 1.0 + 0.3; // Slightly smaller
        this.opacity = Math.random() * 0.08 + 0.02; // More subtle
    }

    update(dt: number) {
        // Gentle drift with slight oscillation
        const time = performance.now() * 0.001;
        const driftX = Math.sin(time + this.x * 0.01) * 2;
        const driftY = Math.cos(time + this.y * 0.01) * 2;
        
        this.x += (this.vx + driftX) * dt;
        this.y += (this.vy + driftY) * dt;
        
        if (this.x < 0) this.x = window.innerWidth;
        if (this.x > window.innerWidth) this.x = 0;
        if (this.y < 0) this.y = window.innerHeight;
        if (this.y > window.innerHeight) this.y = 0;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Ripple {
    x: number;
    y: number;
    radius: number = 0;
    life: number = 1.0;
    color: string;

    constructor(x: number, y: number, isGolden: boolean) {
        this.x = x;
        this.y = y;
        this.color = isGolden ? '#ffd700' : '#ffffff';
    }

    update(dt: number) {
        this.radius += 180 * dt;
        this.life -= 1.0 * dt;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = this.life * 0.15; // Reduced from 0.2
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5; // Thinner lines
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

window.addEventListener('load', () => {
    new Game();
});
