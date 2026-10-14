import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gamepad2, 
  Swords, 
  Trophy, 
  Sparkles, 
  Clock, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  X, 
  Check, 
  Users, 
  Bot, 
  ChevronLeft,
  Zap,
  Target,
  Flame,
  Brain,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { GameType, TicTacToeState } from "./types";

// ==========================================
// SOUND SYNTHESIZER (Web Audio API)
// ==========================================
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq: number, duration: number, type: OscillatorType = "sine", gainVal: number = 0.12) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  laser() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {}
  }

  hit() {
    this.playTone(180, 0.12, "square", 0.14);
  }

  boost() {
    this.playTone(550, 0.08, "sine", 0.1);
    setTimeout(() => this.playTone(780, 0.12, "sine", 0.12), 60);
  }

  pong() {
    this.playTone(480, 0.04, "triangle", 0.1);
  }

  correct() {
    this.playTone(523.25, 0.08, "sine", 0.12);
    setTimeout(() => this.playTone(659.25, 0.1, "sine", 0.15), 70);
    setTimeout(() => this.playTone(783.99, 0.18, "sine", 0.18), 140);
  }

  wrong() {
    this.playTone(220, 0.15, "sawtooth", 0.1);
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.22, "sine", 0.18), i * 95);
    });
  }

  move() {
    this.playTone(400, 0.04, "sine", 0.08);
  }
}

export const soundFX = new SoundFX();

// ==========================================
// CONFETTI CANVAS EFFECT
// ==========================================
export function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#7C3AED", "#10B981", "#3B82F6", "#F59E0B", "#EC4899"];
    const particles = Array.from({ length: 80 }).map(() => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 280,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 10,
      alpha: 1
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rotation += p.vr;
        p.alpha -= 0.01;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (!active) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}

// ==========================================
// 1. LASER CANNON DUEL (Shooting Game)
// ==========================================
interface ShooterGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function ShooterGame({ mode, onWin }: ShooterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Hp, setP1Hp] = useState(3);
  const [p2Hp, setP2Hp] = useState(3);
  const [status, setStatus] = useState<"playing" | "finished">("playing");

  const stateRef = useRef({
    p1: { y: 150, vy: 0, cooldown: 0 },
    p2: { y: 150, vy: 0, cooldown: 0 },
    bullets: [] as Array<{ x: number; y: number; vx: number; color: string; owner: "p1" | "p2" }>,
    obstacles: [
      { y: 70, vy: 1.2, height: 60, x: 290 },
      { y: 200, vy: -1.2, height: 60, x: 290 }
    ],
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    keys: {} as Record<string, boolean>,
    animId: 0
  });

  const fireP1 = useCallback(() => {
    const s = stateRef.current;
    if (s.p1.cooldown > 0 || status !== "playing") return;
    soundFX.laser();
    s.bullets.push({ x: 45, y: s.p1.y, vx: 9, color: "#7C3AED", owner: "p1" });
    s.p1.cooldown = 18;
  }, [status]);

  const fireP2 = useCallback(() => {
    const s = stateRef.current;
    if (s.p2.cooldown > 0 || status !== "playing") return;
    soundFX.laser();
    s.bullets.push({ x: 555, y: s.p2.y, vx: -9, color: "#10B981", owner: "p2" });
    s.p2.cooldown = 18;
  }, [status]);

  // Handle keyboard inputs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === "Space") {
        e.preventDefault();
        fireP1();
      }
      if (e.code === "Enter" && mode === "pass_and_play") {
        e.preventDefault();
        fireP2();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [fireP1, fireP2, mode]);

  // Main 60fps game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localP1Hp = 3;
    let localP2Hp = 3;

    const loop = () => {
      const s = stateRef.current;
      const w = 600;
      const h = 320;

      // Handle P1 movement
      if (s.keys["KeyW"]) s.p1.y = Math.max(25, s.p1.y - 4.5);
      if (s.keys["KeyS"]) s.p1.y = Math.min(h - 25, s.p1.y + 4.5);

      // Handle P2 movement
      if (mode === "pass_and_play") {
        if (s.keys["ArrowUp"]) s.p2.y = Math.max(25, s.p2.y - 4.5);
        if (s.keys["ArrowDown"]) s.p2.y = Math.min(h - 25, s.p2.y + 4.5);
      } else {
        // AI Tracking logic
        const targetY = s.p1.y + (Math.sin(Date.now() / 350) * 40);
        if (s.p2.y < targetY - 6) s.p2.y += 2.8;
        else if (s.p2.y > targetY + 6) s.p2.y -= 2.8;
        s.p2.y = Math.max(25, Math.min(h - 25, s.p2.y));

        // AI shooting
        if (s.p2.cooldown === 0 && Math.random() < 0.04) {
          s.bullets.push({ x: 555, y: s.p2.y, vx: -8.5, color: "#10B981", owner: "p2" });
          s.p2.cooldown = 32;
        }
      }

      if (s.p1.cooldown > 0) s.p1.cooldown--;
      if (s.p2.cooldown > 0) s.p2.cooldown--;

      // Update obstacles
      s.obstacles.forEach((obs) => {
        obs.y += obs.vy;
        if (obs.y < 30 || obs.y > h - obs.height - 30) obs.vy *= -1;
      });

      // Update bullets
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.x += b.vx;

        // Check obstacle collision
        let hitObs = false;
        for (const obs of s.obstacles) {
          if (b.x >= obs.x && b.x <= obs.x + 18 && b.y >= obs.y && b.y <= obs.y + obs.height) {
            hitObs = true;
            break;
          }
        }
        if (hitObs) {
          s.bullets.splice(i, 1);
          continue;
        }

        // Check hit on P2
        if (b.owner === "p1" && b.x >= 555 && Math.abs(b.y - s.p2.y) < 26) {
          s.bullets.splice(i, 1);
          soundFX.hit();
          localP2Hp = Math.max(0, localP2Hp - 1);
          setP2Hp(localP2Hp);
          // Spawn sparks
          for (let k = 0; k < 12; k++) {
            s.particles.push({
              x: 560,
              y: s.p2.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: "#10B981",
              life: 1
            });
          }
          if (localP2Hp === 0) {
            setStatus("finished");
            soundFX.win();
            onWin("p1");
            return;
          }
          continue;
        }

        // Check hit on P1
        if (b.owner === "p2" && b.x <= 45 && Math.abs(b.y - s.p1.y) < 26) {
          s.bullets.splice(i, 1);
          soundFX.hit();
          localP1Hp = Math.max(0, localP1Hp - 1);
          setP1Hp(localP1Hp);
          for (let k = 0; k < 12; k++) {
            s.particles.push({
              x: 40,
              y: s.p1.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: "#7C3AED",
              life: 1
            });
          }
          if (localP1Hp === 0) {
            setStatus("finished");
            soundFX.win();
            onWin("p2");
            return;
          }
          continue;
        }

        // Out of bounds
        if (b.x < 0 || b.x > w) {
          s.bullets.splice(i, 1);
        }
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // ---------------- RENDER ----------------
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, w, h);

      // Arena Grid lines
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Center Divider Barrier
      s.obstacles.forEach((obs) => {
        ctx.fillStyle = "#CBD5E1";
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, 18, obs.height, 6);
        ctx.fill();
        ctx.strokeStyle = "#94A3B8";
        ctx.stroke();
      });

      // P1 Cannon (Violet)
      ctx.fillStyle = "#7C3AED";
      ctx.beginPath();
      ctx.roundRect(15, s.p1.y - 18, 24, 36, 8);
      ctx.fill();
      // Barrel
      ctx.fillStyle = "#6D28D9";
      ctx.fillRect(39, s.p1.y - 4, 14, 8);

      // P2 Cannon (Emerald)
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(w - 39, s.p2.y - 18, 24, 36, 8);
      ctx.fill();
      // Barrel
      ctx.fillStyle = "#059669";
      ctx.fillRect(w - 53, s.p2.y - 4, 14, 8);

      // Bullets
      s.bullets.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(b.x - 7, b.y - 3, 14, 6, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Sparks
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [mode, onWin]);

  const resetGame = () => {
    setP1Hp(3);
    setP2Hp(3);
    setStatus("playing");
    stateRef.current.p1.y = 150;
    stateRef.current.p2.y = 150;
    stateRef.current.bullets = [];
    stateRef.current.particles = [];
  };

  return (
    <div className="space-y-3">
      {/* HUD Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-600" />
          <span className="text-slate-900">P1 (Violet):</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((h) => (
              <span key={h} className={h <= p1Hp ? "text-rose-500 font-black text-sm" : "text-slate-200 text-sm"}>
                ♥
              </span>
            ))}
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-md">
          {status === "playing" ? "Laser Duel Active" : "Round Finished"}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3].map((h) => (
              <span key={h} className={h <= p2Hp ? "text-rose-500 font-black text-sm" : "text-slate-200 text-sm"}>
                ♥
              </span>
            ))}
          </div>
          <span className="text-slate-900">{mode === "ai_rival" ? "AI Rival:" : "P2 (Emerald):"}</span>
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Arena Canvas */}
      <div className="w-full h-72 sm:h-80 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs relative bg-slate-50 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={320} className="w-full h-full" />
      </div>

      {/* Controls & Touch Actions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
        {/* P1 Controls */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-[10px] uppercase font-black text-violet-600 mr-1">P1:</span>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyW"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyW"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyW"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyW"] = false; }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
            title="Move Up (W)"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyS"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyS"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyS"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyS"] = false; }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
            title="Move Down (S)"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={fireP1}
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
          >
            <Target size={13} /> Fire
          </button>
        </div>

        {/* Center Hint / Reset */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 hidden md:inline">
            Desktop: [W/S] + [Space] vs [Arrows] + [Enter]
          </span>
          <button
            onClick={resetGame}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs"
            title="Reset Match"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        {/* P2 Controls if Pass and play */}
        {mode === "pass_and_play" && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <span className="text-[10px] uppercase font-black text-emerald-600 mr-1">P2:</span>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowUp"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowUp"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowUp"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowUp"] = false; }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
              title="Move Up (ArrowUp)"
            >
              <ArrowUp size={14} />
            </button>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowDown"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowDown"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowDown"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowDown"] = false; }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
              title="Move Down (ArrowDown)"
            >
              <ArrowDown size={14} />
            </button>
            <button
              onClick={fireP2}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
            >
              <Target size={13} /> Fire
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. TURBO SPEED DRIFT (Racing Game)
// ==========================================
interface RacingGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function RacingGame({ mode, onWin }: RacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Lap, setP1Lap] = useState(1);
  const [p2Lap, setP2Lap] = useState(1);
  const [winner, setWinner] = useState<string | null>(null);

  const stateRef = useRef({
    p1: { x: 300, y: 260, angle: 0, speed: 0, lap: 1, checkpoint: 0 },
    p2: { x: 300, y: 282, angle: 0, speed: 0, lap: 1, checkpoint: 0 },
    keys: {} as Record<string, boolean>,
    animId: 0,
    checkpoints: [
      { x: 490, y: 160, r: 40 }, // Right turn
      { x: 300, y: 60, r: 40 },  // Top straight
      { x: 110, y: 160, r: 40 }, // Left turn
      { x: 300, y: 270, r: 40 }  // Finish line
    ]
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { stateRef.current.keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { stateRef.current.keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 600;
    const h = 340;

    const loop = () => {
      const s = stateRef.current;
      const { p1, p2, keys, checkpoints } = s;

      // P1 Driving Physics
      if (keys["KeyA"]) p1.angle -= 0.06;
      if (keys["KeyD"]) p1.angle += 0.06;
      if (keys["KeyW"]) p1.speed = Math.min(4.8, p1.speed + 0.15);
      else p1.speed = Math.max(0, p1.speed - 0.05);

      p1.x += Math.cos(p1.angle) * p1.speed;
      p1.y += Math.sin(p1.angle) * p1.speed;

      // P2 Driving Physics
      if (mode === "pass_and_play") {
        if (keys["ArrowLeft"]) p2.angle -= 0.06;
        if (keys["ArrowRight"]) p2.angle += 0.06;
        if (keys["ArrowUp"]) p2.speed = Math.min(4.8, p2.speed + 0.15);
        else p2.speed = Math.max(0, p2.speed - 0.05);
      } else {
        // AI Pathfinding to next checkpoint
        const targetCp = checkpoints[p2.checkpoint];
        const targetAngle = Math.atan2(targetCp.y - p2.y, targetCp.x - p2.x);
        let diff = targetAngle - p2.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        p2.angle += Math.max(-0.055, Math.min(0.055, diff));
        p2.speed = Math.min(4.2, p2.speed + 0.1);
      }

      p2.x += Math.cos(p2.angle) * p2.speed;
      p2.y += Math.sin(p2.angle) * p2.speed;

      // Checkpoint tracking for P1
      const cp1 = checkpoints[p1.checkpoint];
      if (Math.hypot(p1.x - cp1.x, p1.y - cp1.y) < cp1.r) {
        if (p1.checkpoint === 3) {
          p1.lap++;
          setP1Lap(p1.lap);
          soundFX.boost();
          p1.checkpoint = 0;
          if (p1.lap > 3) {
            setWinner("p1");
            soundFX.win();
            onWin("p1");
            return;
          }
        } else {
          p1.checkpoint++;
        }
      }

      // Checkpoint tracking for P2
      const cp2 = checkpoints[p2.checkpoint];
      if (Math.hypot(p2.x - cp2.x, p2.y - cp2.y) < cp2.r) {
        if (p2.checkpoint === 3) {
          p2.lap++;
          setP2Lap(p2.lap);
          p2.checkpoint = 0;
          if (p2.lap > 3) {
            setWinner("p2");
            soundFX.win();
            onWin("p2");
            return;
          }
        } else {
          p2.checkpoint++;
        }
      }

      // ---------------- RENDER ----------------
      ctx.fillStyle = "#E2E8F0"; // Infield ground
      ctx.fillRect(0, 0, w, h);

      // Track Asphalt (rounded oval circuit)
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 64;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.roundRect(85, 55, 430, 230, 90);
      ctx.stroke();

      // Track White Curb Lines
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 14]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start/Finish Line
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(296, 238, 8, 64);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(300, 238, 4, 32);
      ctx.fillRect(296, 270, 4, 32);

      // Boost Pad on top straight
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(280, 24, 40, 62);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(">>>", 286, 60);

      // Car 1 (Violet)
      ctx.save();
      ctx.translate(p1.x, p1.y);
      ctx.rotate(p1.angle);
      ctx.fillStyle = "#7C3AED";
      ctx.beginPath();
      ctx.roundRect(-12, -7, 24, 14, 4);
      ctx.fill();
      ctx.fillStyle = "#C8F53A"; // Windshield
      ctx.fillRect(2, -4, 5, 8);
      ctx.restore();

      // Car 2 (Emerald)
      ctx.save();
      ctx.translate(p2.x, p2.y);
      ctx.rotate(p2.angle);
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(-12, -7, 24, 14, 4);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(2, -4, 5, 8);
      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [mode, onWin]);

  const restartRace = () => {
    setP1Lap(1);
    setP2Lap(1);
    setWinner(null);
    stateRef.current.p1 = { x: 300, y: 260, angle: 0, speed: 0, lap: 1, checkpoint: 0 };
    stateRef.current.p2 = { x: 300, y: 282, angle: 0, speed: 0, lap: 1, checkpoint: 0 };
  };

  return (
    <div className="space-y-3">
      {/* Race Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2 text-violet-700">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
          <span>P1 (Violet): Lap {Math.min(3, p1Lap)}/3</span>
        </div>

        <div className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
          {winner ? (winner === "p1" ? "🏆 P1 Finished 1st!" : "🏆 P2 Finished 1st!") : "🏁 3-Lap Grand Prix"}
        </div>

        <div className="flex items-center gap-2 text-emerald-700">
          <span>{mode === "ai_rival" ? "AI Rival:" : "P2 (Emerald):"} Lap {Math.min(3, p2Lap)}/3</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full h-72 sm:h-80 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs relative bg-slate-100 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={340} className="w-full h-full" />
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-black text-violet-600 mr-1">P1 Steer:</span>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyA"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyA"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyA"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyA"] = false; }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyD"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyD"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyD"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyD"] = false; }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
          >
            <ArrowRight size={14} />
          </button>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyW"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyW"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyW"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyW"] = false; }}
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
          >
            <Flame size={13} /> Gas
          </button>
        </div>

        <button
          onClick={restartRace}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs"
        >
          <RotateCcw size={13} /> Restart Race
        </button>

        {mode === "pass_and_play" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-black text-emerald-600 mr-1">P2 Steer:</span>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowLeft"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowLeft"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowLeft"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowLeft"] = false; }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowRight"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowRight"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowRight"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowRight"] = false; }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
            >
              <ArrowRight size={14} />
            </button>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowUp"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowUp"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowUp"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowUp"] = false; }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
            >
              <Flame size={13} /> Gas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. MIND RUSH (Puzzle Solving Game)
// ==========================================
interface PuzzleQuestion {
  prompt: string;
  subPrompt: string;
  options: string[];
  answer: string;
  type: "math" | "stroop" | "sequence";
  colorWord?: string;
  fontColorClass?: string;
}

const SAMPLE_PUZZLES: PuzzleQuestion[] = [
  {
    prompt: "24 × 3 - 18 = ?",
    subPrompt: "Quick Mental Arithmetic",
    options: ["54", "48", "56", "62"],
    answer: "54",
    type: "math"
  },
  {
    prompt: "YELLOW",
    subPrompt: "Pick the INK color of the word!",
    options: ["Blue", "Yellow", "Red", "Green"],
    answer: "Blue",
    type: "stroop",
    fontColorClass: "text-blue-600"
  },
  {
    prompt: "2, 6, 18, 54, ?",
    subPrompt: "Find the next pattern number",
    options: ["162", "148", "108", "180"],
    answer: "162",
    type: "sequence"
  },
  {
    prompt: "65 - 28 + 15 = ?",
    subPrompt: "Quick Mental Arithmetic",
    options: ["52", "48", "54", "50"],
    answer: "52",
    type: "math"
  },
  {
    prompt: "RED",
    subPrompt: "Pick the INK color of the word!",
    options: ["Green", "Red", "Blue", "Purple"],
    answer: "Green",
    type: "stroop",
    fontColorClass: "text-emerald-600"
  },
  {
    prompt: "5, 10, 20, 40, ?",
    subPrompt: "Find the next pattern number",
    options: ["80", "60", "75", "100"],
    answer: "80",
    type: "sequence"
  },
  {
    prompt: "12 × 12 - 44 = ?",
    subPrompt: "Quick Mental Arithmetic",
    options: ["100", "96", "110", "104"],
    answer: "100",
    type: "math"
  }
];

interface PuzzleGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function PuzzleGame({ mode, onWin }: PuzzleGameProps) {
  const [qIndex, setQIndex] = useState(0);
  const [p1Stars, setP1Stars] = useState(0);
  const [p2Stars, setP2Stars] = useState(0);
  const [turn, setTurn] = useState<"p1" | "p2">("p1");
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentQ = SAMPLE_PUZZLES[qIndex % SAMPLE_PUZZLES.length];

  // AI solving interval in ai_rival mode
  useEffect(() => {
    if (mode !== "ai_rival" || p1Stars >= 5 || p2Stars >= 5) return;
    const aiTimer = setInterval(() => {
      // AI solves a question occasionally
      if (Math.random() < 0.65) {
        setP2Stars((s) => {
          const next = s + 1;
          if (next >= 5) {
            soundFX.win();
            onWin("p2");
          } else {
            soundFX.correct();
          }
          return next;
        });
      }
    }, 3800);

    return () => clearInterval(aiTimer);
  }, [mode, p1Stars, p2Stars, onWin]);

  const handleSelect = (option: string) => {
    const isCorrect = option === currentQ.answer;

    if (isCorrect) {
      soundFX.correct();
      setFeedback("✨ Correct!");

      if (turn === "p1") {
        const next = p1Stars + 1;
        setP1Stars(next);
        if (next >= 5) {
          soundFX.win();
          onWin("p1");
          return;
        }
      } else {
        const next = p2Stars + 1;
        setP2Stars(next);
        if (next >= 5) {
          soundFX.win();
          onWin("p2");
          return;
        }
      }

      setTimeout(() => {
        setFeedback(null);
        setQIndex((i) => i + 1);
        if (mode === "pass_and_play") {
          setTurn((t) => (t === "p1" ? "p2" : "p1"));
        }
      }, 500);
    } else {
      soundFX.wrong();
      setFeedback("❌ Try again!");
      setTimeout(() => setFeedback(null), 500);
    }
  };

  const restartPuzzle = () => {
    setP1Stars(0);
    setP2Stars(0);
    setQIndex(0);
    setTurn("p1");
    setFeedback(null);
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Score Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div>
          <span className="text-[10px] uppercase font-black text-violet-600">P1 Score</span>
          <div className="text-base text-violet-700 font-mono">
            {"★".repeat(p1Stars) + "☆".repeat(Math.max(0, 5 - p1Stars))}
          </div>
        </div>

        <div className="text-center">
          <span className="text-[10px] text-slate-400 uppercase font-black">First to 5</span>
          <div className="text-slate-800 text-xs">
            {turn === "p1" ? "Player 1's Turn" : (mode === "ai_rival" ? "Your Turn vs AI" : "Player 2's Turn")}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-black text-emerald-600">{mode === "ai_rival" ? "AI Rival" : "P2 Score"}</span>
          <div className="text-base text-emerald-700 font-mono">
            {"★".repeat(p2Stars) + "☆".repeat(Math.max(0, 5 - p2Stars))}
          </div>
        </div>
      </div>

      {/* Puzzle Card */}
      <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 shadow-sm text-center space-y-4 relative overflow-hidden">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            {currentQ.subPrompt}
          </span>
          <h3 className={`text-3xl sm:text-4xl font-black mt-3 font-['Fredoka',sans-serif] ${currentQ.fontColorClass || "text-slate-900"}`}>
            {currentQ.prompt}
          </h3>
        </div>

        {/* 4 Answer Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              className="py-3.5 px-4 bg-slate-50 hover:bg-violet-50 hover:border-violet-300 border border-slate-200 rounded-2xl font-black text-base sm:text-lg text-slate-800 hover:text-violet-700 transition-all active:scale-95 shadow-xs"
            >
              {opt}
            </button>
          ))}
        </div>

        {feedback && (
          <div className="text-xs font-black animate-pulse text-indigo-600">
            {feedback}
          </div>
        )}
      </div>

      {/* Restart */}
      <div className="flex justify-center">
        <button
          onClick={restartPuzzle}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs font-bold"
        >
          <RotateCcw size={13} /> Reset Puzzle Match
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 4. CYBER PONG RALLY (Table Tennis)
// ==========================================
interface PongGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function PongGame({ mode, onWin }: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const stateRef = useRef({
    p1Y: 130,
    p2Y: 130,
    ballX: 300,
    ballY: 160,
    ballVx: 4.5,
    ballVy: 2.2,
    keys: {} as Record<string, boolean>,
    animId: 0
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { stateRef.current.keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { stateRef.current.keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 600;
    const h = 320;
    let s1 = 0;
    let s2 = 0;

    const loop = () => {
      const s = stateRef.current;

      // Move P1 paddle
      if (s.keys["KeyW"]) s.p1Y = Math.max(30, s.p1Y - 5);
      if (s.keys["KeyS"]) s.p1Y = Math.min(h - 30, s.p1Y + 5);

      // Move P2 paddle
      if (mode === "pass_and_play") {
        if (s.keys["ArrowUp"]) s.p2Y = Math.max(30, s.p2Y - 5);
        if (s.keys["ArrowDown"]) s.p2Y = Math.min(h - 30, s.p2Y + 5);
      } else {
        // AI Paddle
        if (s.p2Y < s.ballY - 10) s.p2Y += 3.8;
        else if (s.p2Y > s.ballY + 10) s.p2Y -= 3.8;
        s.p2Y = Math.max(30, Math.min(h - 30, s.p2Y));
      }

      // Ball Movement
      s.ballX += s.ballVx;
      s.ballY += s.ballVy;

      // Top/Bottom bounce
      if (s.ballY <= 10 || s.ballY >= h - 10) {
        s.ballVy *= -1;
        soundFX.pong();
      }

      // P1 Paddle Collision (x ~ 30)
      if (s.ballX <= 38 && s.ballX >= 22 && Math.abs(s.ballY - s.p1Y) < 36) {
        s.ballVx = Math.abs(s.ballVx) * 1.05;
        const delta = (s.ballY - s.p1Y) / 36;
        s.ballVy = delta * 5.5;
        soundFX.pong();
      }

      // P2 Paddle Collision (x ~ 570)
      if (s.ballX >= 562 && s.ballX <= 578 && Math.abs(s.ballY - s.p2Y) < 36) {
        s.ballVx = -Math.abs(s.ballVx) * 1.05;
        const delta = (s.ballY - s.p2Y) / 36;
        s.ballVy = delta * 5.5;
        soundFX.pong();
      }

      // Score for P2
      if (s.ballX < 0) {
        s2++;
        setP2Score(s2);
        soundFX.hit();
        s.ballX = 300;
        s.ballY = 160;
        s.ballVx = 4.5;
        s.ballVy = (Math.random() - 0.5) * 4;
        if (s2 >= 5) {
          soundFX.win();
          onWin("p2");
          return;
        }
      }

      // Score for P1
      if (s.ballX > w) {
        s1++;
        setP1Score(s1);
        soundFX.hit();
        s.ballX = 300;
        s.ballY = 160;
        s.ballVx = -4.5;
        s.ballVy = (Math.random() - 0.5) * 4;
        if (s1 >= 5) {
          soundFX.win();
          onWin("p1");
          return;
        }
      }

      // ---------------- RENDER ----------------
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, w, h);

      // Center net
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // P1 Paddle
      ctx.fillStyle = "#7C3AED";
      ctx.beginPath();
      ctx.roundRect(20, s.p1Y - 32, 12, 64, 4);
      ctx.fill();

      // P2 Paddle
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(w - 32, s.p2Y - 32, 12, 64, 4);
      ctx.fill();

      // Ball
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, 7, 0, Math.PI * 2);
      ctx.fill();

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [mode, onWin]);

  const resetPong = () => {
    setP1Score(0);
    setP2Score(0);
    stateRef.current.ballX = 300;
    stateRef.current.ballY = 160;
    stateRef.current.ballVx = 4.5;
  };

  return (
    <div className="space-y-3">
      {/* Score Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="text-violet-700">
          Player 1 (Left): <span className="text-lg font-black">{p1Score}</span>
        </div>

        <div className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
          First to 5 Points
        </div>

        <div className="text-emerald-700">
          <span className="text-lg font-black">{p2Score}</span> :{mode === "ai_rival" ? " AI Rival (Right)" : " Player 2 (Right)"}
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full h-72 sm:h-80 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs relative bg-slate-900 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={320} className="w-full h-full" />
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-black text-violet-600 mr-1">P1 (W/S):</span>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyW"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyW"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyW"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyW"] = false; }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyS"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyS"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyS"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyS"] = false; }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
          >
            <ArrowDown size={14} />
          </button>
        </div>

        <button
          onClick={resetPong}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs"
        >
          <RotateCcw size={13} /> Reset Rally
        </button>

        {mode === "pass_and_play" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-black text-emerald-600 mr-1">P2 (Arrows):</span>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowUp"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowUp"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowUp"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowUp"] = false; }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
            >
              <ArrowUp size={14} />
            </button>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowDown"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowDown"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowDown"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowDown"] = false; }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. TIC-TAC-TOE GRID
// ==========================================
interface TicTacToeGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function TicTacToeGame({ mode, onWin }: TicTacToeGameProps) {
  const [ttt, setTtt] = useState<TicTacToeState>({
    board: Array(9).fill(null),
    currentTurn: "p1",
    winningLine: null,
    status: "playing",
    winnerId: undefined,
    p1Wins: 0,
    p2Wins: 0,
    draws: 0
  });

  const checkWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: [a, b, c] };
      }
    }
    if (board.every((c) => c !== null)) return { winner: "draw", line: null };
    return null;
  };

  const handleClick = (idx: number) => {
    if (ttt.status !== "playing" || ttt.board[idx] !== null) return;
    soundFX.move();
    const mark = ttt.currentTurn === "p1" ? "X" : "O";
    const next = [...ttt.board];
    next[idx] = mark;

    const res = checkWinner(next);
    if (res) {
      if (res.winner === "draw") {
        setTtt((prev) => ({ ...prev, board: next, status: "finished", winnerId: "draw", draws: prev.draws + 1 }));
      } else {
        const isP1 = res.winner === "X";
        soundFX.win();
        onWin(isP1 ? "p1" : "p2");
        setTtt((prev) => ({
          ...prev,
          board: next,
          status: "finished",
          winnerId: isP1 ? "p1" : "p2",
          p1Wins: isP1 ? prev.p1Wins + 1 : prev.p1Wins,
          p2Wins: !isP1 ? prev.p2Wins + 1 : prev.p2Wins,
          winningLine: res.line
        }));
      }
      return;
    }

    const nextTurn = ttt.currentTurn === "p1" ? "p2" : "p1";
    setTtt((prev) => ({ ...prev, board: next, currentTurn: nextTurn }));

    if (mode === "ai_rival" && nextTurn === "p2") {
      setTimeout(() => {
        makeAiMove(next);
      }, 350);
    }
  };

  const makeAiMove = (b: (string | null)[]) => {
    const empty = b.map((val, i) => (val === null ? i : null)).filter((v): v is number => v !== null);
    if (empty.length === 0) return;

    let chosen = empty[0];
    if (b[4] === null) chosen = 4;
    else chosen = empty[Math.floor(Math.random() * empty.length)];

    const next = [...b];
    next[chosen] = "O";
    soundFX.move();

    const res = checkWinner(next);
    if (res) {
      if (res.winner === "draw") {
        setTtt((prev) => ({ ...prev, board: next, status: "finished", winnerId: "draw", draws: prev.draws + 1 }));
      } else {
        soundFX.win();
        onWin("p2");
        setTtt((prev) => ({
          ...prev,
          board: next,
          status: "finished",
          winnerId: "p2",
          p2Wins: prev.p2Wins + 1,
          winningLine: res.line
        }));
      }
    } else {
      setTtt((prev) => ({ ...prev, board: next, currentTurn: "p1" }));
    }
  };

  const restartTtt = () => {
    soundFX.move();
    setTtt((prev) => ({
      ...prev,
      board: Array(9).fill(null),
      currentTurn: "p1",
      winningLine: null,
      status: "playing",
      winnerId: undefined
    }));
  };

  return (
    <div className="flex flex-col items-center max-w-sm mx-auto space-y-4">
      <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center justify-around shadow-xs text-center">
        <div>
          <div className="text-[10px] font-black uppercase text-violet-600">Player 1 (X)</div>
          <div className="text-lg font-black text-slate-900">{ttt.p1Wins}</div>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <div className="text-[10px] font-black uppercase text-slate-400">Ties</div>
          <div className="text-lg font-black text-slate-600">{ttt.draws}</div>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <div className="text-[10px] font-black uppercase text-emerald-600">
            {mode === "ai_rival" ? "AI (O)" : "Player 2 (O)"}
          </div>
          <div className="text-lg font-black text-slate-900">{ttt.p2Wins}</div>
        </div>
      </div>

      <div className="text-xs font-bold text-slate-600">
        {ttt.status === "playing" ? (
          <span>
            Current Turn:{" "}
            <span className={ttt.currentTurn === "p1" ? "text-violet-600 font-black" : "text-emerald-600 font-black"}>
              {ttt.currentTurn === "p1" ? "Player 1 (X)" : (mode === "ai_rival" ? "AI Rival (O)" : "Player 2 (O)")}
            </span>
          </span>
        ) : ttt.winnerId === "draw" ? (
          <span className="text-slate-600 font-black">🤝 It's a Tie! Well Played!</span>
        ) : (
          <span className="text-emerald-600 font-black">
            🏆 {ttt.winnerId === "p1" ? "Player 1 (X)" : (mode === "ai_rival" ? "AI Rival" : "Player 2 (O)")} Wins!
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 bg-slate-200/80 p-2.5 rounded-2xl shadow-inner w-64 h-64 sm:w-72 sm:h-72">
        {ttt.board.map((cell, idx) => {
          const isWinning = ttt.winningLine?.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              disabled={cell !== null || ttt.status !== "playing"}
              className={`rounded-xl font-black text-3xl sm:text-4xl flex items-center justify-center transition-all shadow-xs ${
                isWinning
                  ? "bg-emerald-500 text-white animate-pulse"
                  : cell === null
                  ? "bg-white hover:bg-slate-50 text-slate-300"
                  : cell === "X"
                  ? "bg-white text-violet-600"
                  : "bg-white text-emerald-600"
              }`}
            >
              {cell}
            </button>
          );
        })}
      </div>

      <button
        onClick={restartTtt}
        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
      >
        <RotateCcw size={13} /> {ttt.status === "finished" ? "Play Again" : "Reset Grid"}
      </button>
    </div>
  );
}

// ==========================================
// MAIN HOMESCREEN ARENA MODAL
// ==========================================
export interface DuoGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGame?: GameType | null;
  username?: string;
}

export function DuoGamesArena({
  isOpen,
  onClose,
  initialGame = null,
  username = "Player"
}: DuoGamesModalProps) {
  const [activeGame, setActiveGame] = useState<GameType | null>(initialGame);
  const [gameMode, setGameMode] = useState<"pass_and_play" | "ai_rival">("pass_and_play");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (initialGame) setActiveGame(initialGame);
  }, [initialGame]);

  const handleGameWin = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md">
      <ConfettiCanvas active={showConfetti} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            {activeGame && (
              <button
                onClick={() => setActiveGame(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-95"
                title="Back to all games"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Gamepad2 size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {activeGame === "shooter" && "🎯 Laser Cannon Duel"}
                  {activeGame === "racing" && "🏎️ Turbo Speed Drift"}
                  {activeGame === "puzzle" && "🧩 Mind Rush: Dual Matrix"}
                  {activeGame === "pong" && "🏓 Cyber Pong Rally"}
                  {activeGame === "tictactoe" && "⭕ Tic-Tac-Toe Grid"}
                  {!activeGame && "Duo Competitive Arena"}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  {!activeGame 
                    ? "Challenging reflex, racing, shooting & puzzle games" 
                    : `${gameMode === "pass_and_play" ? "2-Player Pass & Play" : "Singleplayer vs AI Rival"}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold text-slate-600">
              <button
                onClick={() => setGameMode("pass_and_play")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  gameMode === "pass_and_play" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                }`}
                title="2 Players on this device"
              >
                <Users size={12} />
                <span className="hidden xs:inline">Duo</span>
              </button>
              <button
                onClick={() => setGameMode("ai_rival")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  gameMode === "ai_rival" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Play vs AI Bot"
              >
                <Bot size={12} />
                <span className="hidden xs:inline">vs AI</span>
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center transition-all"
              title={soundEnabled ? "Mute sound" : "Unmute sound"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-400 flex items-center justify-center transition-all active:scale-95"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">

          {/* ------------------------------------------ */}
          {/* MENU VIEW (ALL GAMES)                      */}
          {/* ------------------------------------------ */}
          {!activeGame && (
            <div className="space-y-4">
              <div className="text-center max-w-sm mx-auto space-y-1 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
                  Instant Duo Battle
                </span>
                <h4 className="text-lg font-black text-slate-900 font-['Fredoka',sans-serif]">
                  Select a Competitive Challenge
                </h4>
                <p className="text-xs text-slate-500">
                  Challenge a friend on this device or test your reflexes against the AI Rival!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. SHOOTING */}
                <div 
                  onClick={() => setActiveGame("shooter")}
                  className="bg-white border border-slate-200/90 hover:border-violet-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Target size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50/80 px-2 py-0.5 rounded-md">
                        Shooter Duel
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                        🎯 Laser Cannon Duel
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Aim and fire glowing laser beams past moving energy barriers. 3 hearts each!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Shooting Duel</span> →
                  </div>
                </div>

                {/* 2. RACING */}
                <div 
                  onClick={() => setActiveGame("racing")}
                  className="bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Flame size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50/80 px-2 py-0.5 rounded-md">
                        Speed Racing
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                        🏎️ Turbo Track Sprint
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        3-lap grand prix drift circuit with boost pads, smooth cornering, and top speed!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Racing Sprint</span> →
                  </div>
                </div>

                {/* 3. PUZZLE */}
                <div 
                  onClick={() => setActiveGame("puzzle")}
                  className="bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Brain size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded-md">
                        Brain Battle
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        🧩 Mind Rush: Dual Matrix
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Speed math, Stroop color clash, and number sequence puzzles. First to 5 stars wins!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Puzzle Rush</span> →
                  </div>
                </div>

                {/* 4. PONG */}
                <div 
                  onClick={() => setActiveGame("pong")}
                  className="bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Zap size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                        Reflex Rally
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        🏓 Cyber Pong Rally
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        High-speed paddle tennis with accelerating ball physics and spin deflection!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Pong Rally</span> →
                  </div>
                </div>

                {/* 5. TIC-TAC-TOE */}
                <div 
                  onClick={() => setActiveGame("tictactoe")}
                  className="bg-white border border-slate-200/90 hover:border-violet-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99] sm:col-span-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Trophy size={18} />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                          ⭕ Tactical Tic-Tac-Toe Grid
                        </h5>
                        <p className="text-xs text-slate-500">
                          Classic 3×3 grid duel with smart AI rival and match streak tracker.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-violet-600 flex items-center gap-1">Play →</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE GAME VIEWS */}
          {activeGame === "shooter" && <ShooterGame mode={gameMode} onWin={handleGameWin} />}
          {activeGame === "racing" && <RacingGame mode={gameMode} onWin={handleGameWin} />}
          {activeGame === "puzzle" && <PuzzleGame mode={gameMode} onWin={handleGameWin} />}
          {activeGame === "pong" && <PongGame mode={gameMode} onWin={handleGameWin} />}
          {activeGame === "tictactoe" && <TicTacToeGame mode={gameMode} onWin={handleGameWin} />}

        </div>
      </motion.div>
    </div>
  );
}
