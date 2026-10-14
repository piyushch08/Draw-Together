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
  Shield,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Smile
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
    setTimeout(() => this.playTone(780, 0.14, "sine", 0.14), 60);
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

  taunt() {
    this.playTone(660, 0.08, "sine", 0.15);
    setTimeout(() => this.playTone(880, 0.1, "sine", 0.15), 80);
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
// INTERACTIVE TAUNT REACTION SYSTEM
// ==========================================
interface FloatingTaunt {
  id: string;
  emoji: string;
  sender: "p1" | "p2";
}

function TauntBar({
  onSendTaunt,
  sender,
  label
}: {
  onSendTaunt: (emoji: string, sender: "p1" | "p2") => void;
  sender: "p1" | "p2";
  label: string;
}) {
  const taunts = ["🔥", "😂", "💀", "⚡", "👑", "👀"];
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
      <span className="text-[9px] uppercase font-black text-slate-400 px-1">{label}:</span>
      {taunts.map((t) => (
        <button
          key={t}
          onClick={() => {
            soundFX.taunt();
            onSendTaunt(t, sender);
          }}
          className="text-sm hover:scale-125 transition-transform active:scale-95 px-1 py-0.5"
          title={`Taunt with ${t}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ==========================================
// 1. LASER CANNON DUEL (Shooting with Power-ups & Shields)
// ==========================================
interface ShooterGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function ShooterGame({ mode, onWin }: ShooterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Hp, setP1Hp] = useState(3);
  const [p2Hp, setP2Hp] = useState(3);
  const [p1Shield, setP1Shield] = useState(false);
  const [p2Shield, setP2Shield] = useState(false);
  const [status, setStatus] = useState<"playing" | "finished">("playing");
  const [taunts, setTaunts] = useState<FloatingTaunt[]>([]);

  const stateRef = useRef({
    p1: { y: 150, vy: 0, cooldown: 0, shield: false, triple: 0 },
    p2: { y: 150, vy: 0, cooldown: 0, shield: false, triple: 0 },
    bullets: [] as Array<{ x: number; y: number; vx: number; vy?: number; color: string; owner: "p1" | "p2" }>,
    obstacles: [
      { y: 50, vy: 1.1, height: 50, x: 290, hp: 4 },
      { y: 140, vy: -1.0, height: 50, x: 290, hp: 4 },
      { y: 230, vy: 0.9, height: 50, x: 290, hp: 4 }
    ],
    powerUps: [] as Array<{ x: number; y: number; type: "shield" | "triple"; icon: string }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    keys: {} as Record<string, boolean>,
    animId: 0,
    shake: 0
  });

  const triggerTaunt = (emoji: string, sender: "p1" | "p2") => {
    const newT = { id: Math.random().toString(), emoji, sender };
    setTaunts((prev) => [...prev, newT]);
    setTimeout(() => {
      setTaunts((prev) => prev.filter((t) => t.id !== newT.id));
    }, 1800);
  };

  const fireP1 = useCallback(() => {
    const s = stateRef.current;
    if (s.p1.cooldown > 0 || status !== "playing") return;
    soundFX.laser();
    if (s.p1.triple > 0) {
      s.bullets.push({ x: 45, y: s.p1.y, vx: 9, vy: -1.5, color: "#7C3AED", owner: "p1" });
      s.bullets.push({ x: 45, y: s.p1.y, vx: 9, vy: 0, color: "#7C3AED", owner: "p1" });
      s.bullets.push({ x: 45, y: s.p1.y, vx: 9, vy: 1.5, color: "#7C3AED", owner: "p1" });
      s.p1.triple--;
    } else {
      s.bullets.push({ x: 45, y: s.p1.y, vx: 9, vy: 0, color: "#7C3AED", owner: "p1" });
    }
    s.p1.cooldown = 16;
  }, [status]);

  const fireP2 = useCallback(() => {
    const s = stateRef.current;
    if (s.p2.cooldown > 0 || status !== "playing") return;
    soundFX.laser();
    if (s.p2.triple > 0) {
      s.bullets.push({ x: 555, y: s.p2.y, vx: -9, vy: -1.5, color: "#10B981", owner: "p2" });
      s.bullets.push({ x: 555, y: s.p2.y, vx: -9, vy: 0, color: "#10B981", owner: "p2" });
      s.bullets.push({ x: 555, y: s.p2.y, vx: -9, vy: 1.5, color: "#10B981", owner: "p2" });
      s.p2.triple--;
    } else {
      s.bullets.push({ x: 555, y: s.p2.y, vx: -9, vy: 0, color: "#10B981", owner: "p2" });
    }
    s.p2.cooldown = 16;
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
    let powerUpTimer = 0;

    const loop = () => {
      const s = stateRef.current;
      const w = 600;
      const h = 320;

      // Handle P1 movement
      if (s.keys["KeyW"]) s.p1.y = Math.max(25, s.p1.y - 4.8);
      if (s.keys["KeyS"]) s.p1.y = Math.min(h - 25, s.p1.y + 4.8);

      // Handle P2 movement
      if (mode === "pass_and_play") {
        if (s.keys["ArrowUp"]) s.p2.y = Math.max(25, s.p2.y - 4.8);
        if (s.keys["ArrowDown"]) s.p2.y = Math.min(h - 25, s.p2.y + 4.8);
      } else {
        // AI Tracking logic with predictive dodging
        const targetY = s.p1.y + Math.sin(Date.now() / 320) * 45;
        if (s.p2.y < targetY - 5) s.p2.y += 3.2;
        else if (s.p2.y > targetY + 5) s.p2.y -= 3.2;
        s.p2.y = Math.max(25, Math.min(h - 25, s.p2.y));

        // AI shooting
        if (s.p2.cooldown === 0 && Math.random() < 0.045) {
          s.bullets.push({ x: 555, y: s.p2.y, vx: -8.8, vy: 0, color: "#10B981", owner: "p2" });
          s.p2.cooldown = 28;
        }
      }

      if (s.p1.cooldown > 0) s.p1.cooldown--;
      if (s.p2.cooldown > 0) s.p2.cooldown--;

      // Spawn periodic Power-Ups
      powerUpTimer++;
      if (powerUpTimer > 320 && s.powerUps.length < 2) {
        powerUpTimer = 0;
        const type = Math.random() > 0.5 ? "shield" : "triple";
        s.powerUps.push({
          x: 200 + Math.random() * 200,
          y: 50 + Math.random() * 220,
          type,
          icon: type === "shield" ? "🛡️" : "⚡"
        });
      }

      // Update obstacles
      s.obstacles.forEach((obs) => {
        obs.y += obs.vy;
        if (obs.y < 25 || obs.y > h - obs.height - 25) obs.vy *= -1;
      });

      // Update bullets
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.x += b.vx;
        b.y += (b.vy || 0);

        // Check power-up collection
        for (let pIdx = s.powerUps.length - 1; pIdx >= 0; pIdx--) {
          const pu = s.powerUps[pIdx];
          if (Math.hypot(b.x - pu.x, b.y - pu.y) < 18) {
            soundFX.boost();
            if (b.owner === "p1") {
              if (pu.type === "shield") { s.p1.shield = true; setP1Shield(true); }
              else { s.p1.triple = 4; }
            } else {
              if (pu.type === "shield") { s.p2.shield = true; setP2Shield(true); }
              else { s.p2.triple = 4; }
            }
            s.powerUps.splice(pIdx, 1);
            break;
          }
        }

        // Check obstacle collision (damage barrier)
        let hitObs = false;
        for (const obs of s.obstacles) {
          if (obs.hp > 0 && b.x >= obs.x && b.x <= obs.x + 18 && b.y >= obs.y && b.y <= obs.y + obs.height) {
            hitObs = true;
            obs.hp -= 1;
            soundFX.hit();
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
          s.shake = 8;
          if (s.p2.shield) {
            s.p2.shield = false;
            setP2Shield(false);
            soundFX.boost();
          } else {
            soundFX.hit();
            if (window.navigator?.vibrate) window.navigator.vibrate(30);
            localP2Hp = Math.max(0, localP2Hp - 1);
            setP2Hp(localP2Hp);
            for (let k = 0; k < 14; k++) {
              s.particles.push({
                x: 560,
                y: s.p2.y,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
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
          }
          continue;
        }

        // Check hit on P1
        if (b.owner === "p2" && b.x <= 45 && Math.abs(b.y - s.p1.y) < 26) {
          s.bullets.splice(i, 1);
          s.shake = 8;
          if (s.p1.shield) {
            s.p1.shield = false;
            setP1Shield(false);
            soundFX.boost();
          } else {
            soundFX.hit();
            if (window.navigator?.vibrate) window.navigator.vibrate(30);
            localP1Hp = Math.max(0, localP1Hp - 1);
            setP1Hp(localP1Hp);
            for (let k = 0; k < 14; k++) {
              s.particles.push({
                x: 40,
                y: s.p1.y,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
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
          }
          continue;
        }

        // Out of bounds
        if (b.x < 0 || b.x > w) s.bullets.splice(i, 1);
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
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.85;
        if (s.shake < 0.5) s.shake = 0;
      }

      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, w, h);

      // Arena Grid
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Destructible Barriers
      s.obstacles.forEach((obs) => {
        if (obs.hp <= 0) return;
        ctx.fillStyle = obs.hp >= 3 ? "#94A3B8" : obs.hp === 2 ? "#CBD5E1" : "#E2E8F0";
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, 18, obs.height, 6);
        ctx.fill();
        ctx.strokeStyle = "#64748B";
        ctx.stroke();
      });

      // Power-Up Orbs
      s.powerUps.forEach((pu) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = pu.type === "shield" ? "#38BDF8" : "#F59E0B";
        ctx.shadowColor = pu.type === "shield" ? "#0284C7" : "#D97706";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pu.icon, pu.x, pu.y);
        ctx.restore();
      });

      // P1 Cannon (Violet)
      ctx.fillStyle = "#7C3AED";
      ctx.beginPath();
      ctx.roundRect(15, s.p1.y - 18, 24, 36, 8);
      ctx.fill();
      ctx.fillStyle = "#6D28D9";
      ctx.fillRect(39, s.p1.y - 4, 14, 8);
      // P1 Shield Aura
      if (s.p1.shield) {
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(27, s.p1.y, 24, 0, Math.PI * 2);
        ctx.stroke();
      }

      // P2 Cannon (Emerald)
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(w - 39, s.p2.y - 18, 24, 36, 8);
      ctx.fill();
      ctx.fillStyle = "#059669";
      ctx.fillRect(w - 53, s.p2.y - 4, 14, 8);
      // P2 Shield Aura
      if (s.p2.shield) {
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w - 27, s.p2.y, 24, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Lasers
      s.bullets.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(b.x - 7, b.y - 3, 14, 6, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Spark particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      ctx.restore();
      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [mode, onWin]);

  const resetGame = () => {
    setP1Hp(3);
    setP2Hp(3);
    setP1Shield(false);
    setP2Shield(false);
    setStatus("playing");
    stateRef.current.p1.y = 150;
    stateRef.current.p2.y = 150;
    stateRef.current.p1.shield = false;
    stateRef.current.p2.shield = false;
    stateRef.current.bullets = [];
    stateRef.current.powerUps = [];
    stateRef.current.particles = [];
  };

  return (
    <div className="space-y-3">
      {/* HUD Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-600" />
          <span className="text-slate-900">P1:</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((h) => (
              <span key={h} className={h <= p1Hp ? "text-rose-500 font-black text-sm" : "text-slate-200 text-sm"}>
                ♥
              </span>
            ))}
          </div>
          {p1Shield && <span className="text-sky-500 text-[10px] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">Shield</span>}
        </div>

        <div className="flex items-center gap-2">
          <TauntBar onSendTaunt={triggerTaunt} sender="p1" label="P1" />
          {mode === "pass_and_play" && <TauntBar onSendTaunt={triggerTaunt} sender="p2" label="P2" />}
        </div>

        <div className="flex items-center gap-2">
          {p2Shield && <span className="text-sky-500 text-[10px] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">Shield</span>}
          <div className="flex gap-1">
            {[1, 2, 3].map((h) => (
              <span key={h} className={h <= p2Hp ? "text-rose-500 font-black text-sm" : "text-slate-200 text-sm"}>
                ♥
              </span>
            ))}
          </div>
          <span className="text-slate-900">{mode === "ai_rival" ? "AI:" : "P2:"}</span>
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Arena Canvas with floating taunts */}
      <div className="w-full h-72 sm:h-80 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs relative bg-slate-50 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={320} className="w-full h-full" />

        {/* Floating Taunt Overlay */}
        <AnimatePresence>
          {taunts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15, scale: 0.5 }}
              animate={{ opacity: 1, y: -20, scale: 1.4 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute top-1/2 text-2xl sm:text-3xl pointer-events-none drop-shadow-md ${
                t.sender === "p1" ? "left-12" : "right-12"
              }`}
            >
              {t.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Controls & Actions */}
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
            title="Up (W)"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onMouseDown={() => { stateRef.current.keys["KeyS"] = true; }}
            onMouseUp={() => { stateRef.current.keys["KeyS"] = false; }}
            onTouchStart={() => { stateRef.current.keys["KeyS"] = true; }}
            onTouchEnd={() => { stateRef.current.keys["KeyS"] = false; }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
            title="Down (S)"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={fireP1}
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1 font-black"
          >
            <Target size={13} /> Fire
          </button>
        </div>

        {/* Center Hint / Reset */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 hidden md:inline">
            Power-ups: 🛡️ Shield | ⚡ Triple-Shot
          </span>
          <button
            onClick={resetGame}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs"
            title="Reset Match"
          >
            <RotateCcw size={13} /> Rematch
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
              title="Up (ArrowUp)"
            >
              <ArrowUp size={14} />
            </button>
            <button
              onMouseDown={() => { stateRef.current.keys["ArrowDown"] = true; }}
              onMouseUp={() => { stateRef.current.keys["ArrowDown"] = false; }}
              onTouchStart={() => { stateRef.current.keys["ArrowDown"] = true; }}
              onTouchEnd={() => { stateRef.current.keys["ArrowDown"] = false; }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 text-slate-700"
              title="Down (ArrowDown)"
            >
              <ArrowDown size={14} />
            </button>
            <button
              onClick={fireP2}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1 font-black"
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
// 2. TURBO SPEED DRIFT (Racing with Bumper Bumping & Nitro)
// ==========================================
interface RacingGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function RacingGame({ mode, onWin }: RacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Lap, setP1Lap] = useState(1);
  const [p2Lap, setP2Lap] = useState(1);
  const [p1Nitro, setP1Nitro] = useState(100);
  const [p2Nitro, setP2Nitro] = useState(100);
  const [winner, setWinner] = useState<string | null>(null);

  const stateRef = useRef({
    p1: { x: 300, y: 260, angle: 0, speed: 0, lap: 1, checkpoint: 0, nitro: 100 },
    p2: { x: 300, y: 284, angle: 0, speed: 0, lap: 1, checkpoint: 0, nitro: 100 },
    keys: {} as Record<string, boolean>,
    animId: 0,
    checkpoints: [
      { x: 490, y: 160, r: 42 },
      { x: 300, y: 60, r: 42 },
      { x: 110, y: 160, r: 42 },
      { x: 300, y: 270, r: 42 }
    ]
  });

  const triggerNitroP1 = () => {
    const s = stateRef.current;
    if (s.p1.nitro > 20) {
      s.p1.speed = 6.2;
      s.p1.nitro -= 25;
      setP1Nitro(s.p1.nitro);
      soundFX.boost();
    }
  };

  const triggerNitroP2 = () => {
    const s = stateRef.current;
    if (s.p2.nitro > 20) {
      s.p2.speed = 6.2;
      s.p2.nitro -= 25;
      setP2Nitro(s.p2.nitro);
      soundFX.boost();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === "KeyE") triggerNitroP1();
      if (e.code === "ControlRight") triggerNitroP2();
    };
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

      // P1 Steering & Acceleration
      if (keys["KeyA"]) p1.angle -= 0.065;
      if (keys["KeyD"]) p1.angle += 0.065;
      if (keys["KeyW"]) p1.speed = Math.min(5.0, p1.speed + 0.16);
      else p1.speed = Math.max(0, p1.speed - 0.06);

      p1.x += Math.cos(p1.angle) * p1.speed;
      p1.y += Math.sin(p1.angle) * p1.speed;

      // Slowly recharge Nitro
      p1.nitro = Math.min(100, p1.nitro + 0.08);
      p2.nitro = Math.min(100, p2.nitro + 0.08);

      // P2 Steering & Acceleration
      if (mode === "pass_and_play") {
        if (keys["ArrowLeft"]) p2.angle -= 0.065;
        if (keys["ArrowRight"]) p2.angle += 0.065;
        if (keys["ArrowUp"]) p2.speed = Math.min(5.0, p2.speed + 0.16);
        else p2.speed = Math.max(0, p2.speed - 0.06);
      } else {
        // AI Pathfinding with dynamic overtaking
        const targetCp = checkpoints[p2.checkpoint];
        const targetAngle = Math.atan2(targetCp.y - p2.y, targetCp.x - p2.x);
        let diff = targetAngle - p2.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        p2.angle += Math.max(-0.06, Math.min(0.06, diff));
        p2.speed = Math.min(4.4, p2.speed + 0.12);

        // AI auto-nitro on straightaways
        if (p2.checkpoint === 1 && p2.nitro > 40 && Math.random() < 0.03) {
          p2.speed = 5.8;
          p2.nitro -= 25;
        }
      }

      p2.x += Math.cos(p2.angle) * p2.speed;
      p2.y += Math.sin(p2.angle) * p2.speed;

      // Bumper Car Collisions (Bump friends away!)
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (dist < 22) {
        soundFX.hit();
        if (window.navigator?.vibrate) window.navigator.vibrate(20);
        const bumpAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        p1.x -= Math.cos(bumpAngle) * 3;
        p1.y -= Math.sin(bumpAngle) * 3;
        p2.x += Math.cos(bumpAngle) * 3;
        p2.y += Math.sin(bumpAngle) * 3;
        p1.speed *= 0.8;
        p2.speed *= 0.8;
      }

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
      ctx.fillStyle = "#E2E8F0";
      ctx.fillRect(0, 0, w, h);

      // Asphalt Track
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 66;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.roundRect(85, 55, 430, 230, 90);
      ctx.stroke();

      // Curb Lines
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 14]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start/Finish Line Checkered
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(296, 238, 8, 66);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(300, 238, 4, 33);
      ctx.fillRect(296, 271, 4, 33);

      // Boost Pad
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(280, 22, 40, 66);
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
      ctx.fillStyle = "#C8F53A";
      ctx.fillRect(2, -4, 5, 8);
      // Flame trail on high speed
      if (p1.speed > 5) {
        ctx.fillStyle = "#F97316";
        ctx.fillRect(-18, -3, 6, 6);
      }
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
      if (p2.speed > 5) {
        ctx.fillStyle = "#F97316";
        ctx.fillRect(-18, -3, 6, 6);
      }
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
    stateRef.current.p1 = { x: 300, y: 260, angle: 0, speed: 0, lap: 1, checkpoint: 0, nitro: 100 };
    stateRef.current.p2 = { x: 300, y: 284, angle: 0, speed: 0, lap: 1, checkpoint: 0, nitro: 100 };
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
          {winner ? (winner === "p1" ? "🏆 P1 Crossed Finish Line!" : "🏆 P2 Crossed Finish Line!") : "🏁 3-Lap Bumper Sprint"}
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
          <button
            onClick={triggerNitroP1}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
            title="Nitro Boost"
          >
            <Zap size={13} /> Nitro
          </button>
        </div>

        <button
          onClick={restartRace}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs"
        >
          <RotateCcw size={13} /> Rematch
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
            <button
              onClick={triggerNitroP2}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
              title="Nitro Boost"
            >
              <Zap size={13} /> Nitro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. MIND RUSH: DUAL BUZZER CLASH (Simultaneous Puzzle Race!)
// ==========================================
interface PuzzleQuestion {
  prompt: string;
  subPrompt: string;
  options: string[];
  answer: string;
  fontColorClass?: string;
}

const SAMPLE_PUZZLES: PuzzleQuestion[] = [
  { prompt: "24 × 3 - 18 = ?", subPrompt: "Quick Mental Math", options: ["54", "48", "56", "62"], answer: "54" },
  { prompt: "YELLOW", subPrompt: "Pick the INK color of the word!", options: ["Blue", "Yellow", "Red", "Green"], answer: "Blue", fontColorClass: "text-blue-600" },
  { prompt: "2, 6, 18, 54, ?", subPrompt: "Find next pattern number", options: ["162", "148", "108", "180"], answer: "162" },
  { prompt: "65 - 28 + 15 = ?", subPrompt: "Quick Mental Math", options: ["52", "48", "54", "50"], answer: "52" },
  { prompt: "RED", subPrompt: "Pick the INK color of the word!", options: ["Green", "Red", "Blue", "Purple"], answer: "Green", fontColorClass: "text-emerald-600" },
  { prompt: "5, 10, 20, 40, ?", subPrompt: "Find next pattern number", options: ["80", "60", "75", "100"], answer: "80" },
  { prompt: "12 × 12 - 44 = ?", subPrompt: "Quick Mental Math", options: ["100", "96", "110", "104"], answer: "100" },
  { prompt: "7 × 8 + 14 = ?", subPrompt: "Quick Mental Math", options: ["70", "68", "72", "74"], answer: "70" }
];

interface PuzzleGameProps {
  mode: "pass_and_play" | "ai_rival";
  onWin: (winner: "p1" | "p2") => void;
}

function PuzzleGame({ mode, onWin }: PuzzleGameProps) {
  const [qIndex, setQIndex] = useState(0);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Frozen, setP1Frozen] = useState(false);
  const [p2Frozen, setP2Frozen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentQ = SAMPLE_PUZZLES[qIndex % SAMPLE_PUZZLES.length];

  // AI solving in ai_rival mode
  useEffect(() => {
    if (mode !== "ai_rival" || p1Score >= 5 || p2Score >= 5) return;
    const aiTimer = setTimeout(() => {
      // AI buzzes in with correct answer if player didn't answer in time
      if (!p2Frozen) {
        soundFX.correct();
        setP2Score((s) => {
          const next = s + 1;
          if (next >= 5) {
            soundFX.win();
            onWin("p2");
          }
          return next;
        });
        setFeedback("🤖 AI Rival answered first!");
        setTimeout(() => {
          setFeedback(null);
          setQIndex((i) => i + 1);
        }, 600);
      }
    }, 3600);

    return () => clearTimeout(aiTimer);
  }, [mode, p1Score, p2Score, p2Frozen, qIndex, onWin]);

  const handleP1Choice = (choice: string) => {
    if (p1Frozen) return;
    if (choice === currentQ.answer) {
      soundFX.correct();
      setFeedback("✨ Player 1 Won the Question!");
      const next = p1Score + 1;
      setP1Score(next);
      if (next >= 5) {
        soundFX.win();
        onWin("p1");
        return;
      }
      setTimeout(() => {
        setFeedback(null);
        setQIndex((i) => i + 1);
      }, 500);
    } else {
      soundFX.wrong();
      setP1Frozen(true);
      setTimeout(() => setP1Frozen(false), 1400);
    }
  };

  const handleP2Choice = (choice: string) => {
    if (p2Frozen) return;
    if (choice === currentQ.answer) {
      soundFX.correct();
      setFeedback("✨ Player 2 Won the Question!");
      const next = p2Score + 1;
      setP2Score(next);
      if (next >= 5) {
        soundFX.win();
        onWin("p2");
        return;
      }
      setTimeout(() => {
        setFeedback(null);
        setQIndex((i) => i + 1);
      }, 500);
    } else {
      soundFX.wrong();
      setP2Frozen(true);
      setTimeout(() => setP2Frozen(false), 1400);
    }
  };

  const restartPuzzle = () => {
    setP1Score(0);
    setP2Score(0);
    setQIndex(0);
    setP1Frozen(false);
    setP2Frozen(false);
    setFeedback(null);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Score Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div>
          <span className="text-[10px] uppercase font-black text-violet-600">Player 1</span>
          <div className="text-base text-violet-700 font-mono">
            {"★".repeat(p1Score) + "☆".repeat(Math.max(0, 5 - p1Score))}
          </div>
        </div>

        <div className="text-center">
          <span className="text-[10px] text-slate-400 uppercase font-black">Simultaneous Race</span>
          <div className="text-slate-800 text-xs font-extrabold">First to 5 Stars Wins!</div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-black text-emerald-600">{mode === "ai_rival" ? "AI Rival" : "Player 2"}</span>
          <div className="text-base text-emerald-700 font-mono">
            {"★".repeat(p2Score) + "☆".repeat(Math.max(0, 5 - p2Score))}
          </div>
        </div>
      </div>

      {/* Main Question Card in Center */}
      <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-5 shadow-sm text-center space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          {currentQ.subPrompt}
        </span>
        <h3 className={`text-3xl sm:text-4xl font-black font-['Fredoka',sans-serif] ${currentQ.fontColorClass || "text-slate-900"}`}>
          {currentQ.prompt}
        </h3>
        {feedback && <div className="text-xs font-black text-violet-600 animate-pulse">{feedback}</div>}
      </div>

      {/* Dual Split Buzzers for 2-Player */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* P1 Keypad */}
        <div className={`p-4 rounded-3xl border-2 transition-all ${
          p1Frozen ? "bg-rose-50 border-rose-300 opacity-60" : "bg-white border-violet-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-violet-700 uppercase">P1 Buzzers</span>
            {p1Frozen && <span className="text-[10px] text-rose-600 font-black">⚠️ Frozen!</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleP1Choice(opt)}
                disabled={p1Frozen}
                className="py-3 px-3 rounded-2xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-900 font-black text-sm active:scale-95 transition-all shadow-xs"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* P2 Keypad */}
        <div className={`p-4 rounded-3xl border-2 transition-all ${
          p2Frozen ? "bg-rose-50 border-rose-300 opacity-60" : "bg-white border-emerald-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-emerald-700 uppercase">
              {mode === "ai_rival" ? "AI Auto-Buzzer" : "P2 Buzzers"}
            </span>
            {p2Frozen && <span className="text-[10px] text-rose-600 font-black">⚠️ Frozen!</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleP2Choice(opt)}
                disabled={p2Frozen || mode === "ai_rival"}
                className={`py-3 px-3 rounded-2xl border font-black text-sm transition-all shadow-xs ${
                  mode === "ai_rival" 
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900 active:scale-95"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={restartPuzzle}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs font-bold"
        >
          <RotateCcw size={13} /> Reset Match
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 4. CYBER PONG RALLY (Paddle Tennis with Spin)
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
    ballVx: 4.8,
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

      // P1 Paddle
      if (s.keys["KeyW"]) s.p1Y = Math.max(32, s.p1Y - 5.2);
      if (s.keys["KeyS"]) s.p1Y = Math.min(h - 32, s.p1Y + 5.2);

      // P2 Paddle
      if (mode === "pass_and_play") {
        if (s.keys["ArrowUp"]) s.p2Y = Math.max(32, s.p2Y - 5.2);
        if (s.keys["ArrowDown"]) s.p2Y = Math.min(h - 32, s.p2Y + 5.2);
      } else {
        if (s.p2Y < s.ballY - 8) s.p2Y += 4.0;
        else if (s.p2Y > s.ballY + 8) s.p2Y -= 4.0;
        s.p2Y = Math.max(32, Math.min(h - 32, s.p2Y));
      }

      s.ballX += s.ballVx;
      s.ballY += s.ballVy;

      // Wall reflections
      if (s.ballY <= 10 || s.ballY >= h - 10) {
        s.ballVy *= -1;
        soundFX.pong();
      }

      // P1 Paddle Collision
      if (s.ballX <= 38 && s.ballX >= 20 && Math.abs(s.ballY - s.p1Y) < 38) {
        s.ballVx = Math.abs(s.ballVx) * 1.05;
        const delta = (s.ballY - s.p1Y) / 38;
        s.ballVy = delta * 5.8;
        soundFX.pong();
        if (window.navigator?.vibrate) window.navigator.vibrate(15);
      }

      // P2 Paddle Collision
      if (s.ballX >= 562 && s.ballX <= 580 && Math.abs(s.ballY - s.p2Y) < 38) {
        s.ballVx = -Math.abs(s.ballVx) * 1.05;
        const delta = (s.ballY - s.p2Y) / 38;
        s.ballVy = delta * 5.8;
        soundFX.pong();
        if (window.navigator?.vibrate) window.navigator.vibrate(15);
      }

      // Point P2
      if (s.ballX < 0) {
        s2++;
        setP2Score(s2);
        soundFX.hit();
        s.ballX = 300;
        s.ballY = 160;
        s.ballVx = 4.8;
        s.ballVy = (Math.random() - 0.5) * 4;
        if (s2 >= 5) {
          soundFX.win();
          onWin("p2");
          return;
        }
      }

      // Point P1
      if (s.ballX > w) {
        s1++;
        setP1Score(s1);
        soundFX.hit();
        s.ballX = 300;
        s.ballY = 160;
        s.ballVx = -4.8;
        s.ballVy = (Math.random() - 0.5) * 4;
        if (s1 >= 5) {
          soundFX.win();
          onWin("p1");
          return;
        }
      }

      // RENDER
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, w, h);

      // Net
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
      ctx.shadowColor = "#FFFFFF";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

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
    stateRef.current.ballVx = 4.8;
  };

  return (
    <div className="space-y-3">
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

      <div className="w-full h-72 sm:h-80 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs relative bg-slate-900 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={320} className="w-full h-full" />
      </div>

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
          <RotateCcw size={13} /> Rematch
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
// 5. BLITZ TIC-TAC-TOE (5s Blitz Timer)
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

  const [blitzTimer, setBlitzTimer] = useState(5);

  // Blitz countdown clock per turn
  useEffect(() => {
    if (ttt.status !== "playing") return;
    const timer = setInterval(() => {
      setBlitzTimer((prev) => {
        if (prev <= 1) {
          // Timeout: switch turn automatically!
          soundFX.wrong();
          const nextTurn = ttt.currentTurn === "p1" ? "p2" : "p1";
          setTtt((t) => ({ ...t, currentTurn: nextTurn }));
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ttt.status, ttt.currentTurn]);

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
    setBlitzTimer(5);

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
      setBlitzTimer(5);
    }
  };

  const restartTtt = () => {
    soundFX.move();
    setBlitzTimer(5);
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

      <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-slate-600">
        <div>
          Turn:{" "}
          <span className={ttt.currentTurn === "p1" ? "text-violet-600 font-black" : "text-emerald-600 font-black"}>
            {ttt.currentTurn === "p1" ? "Player 1 (X)" : (mode === "ai_rival" ? "AI Rival (O)" : "Player 2 (O)")}
          </span>
        </div>
        {ttt.status === "playing" && (
          <div className="flex items-center gap-1 font-mono text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
            <Clock size={11} /> {blitzTimer}s Blitz
          </div>
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
  const [matchSeries, setMatchSeries] = useState({ p1: 0, p2: 0 });

  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (initialGame) setActiveGame(initialGame);
  }, [initialGame]);

  const handleGameWin = (winner: "p1" | "p2") => {
    setShowConfetti(true);
    setMatchSeries((prev) => ({
      ...prev,
      [winner]: prev[winner] + 1
    }));
    setTimeout(() => setShowConfetti(false), 3800);
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
                  {activeGame === "tictactoe" && "⭕ Blitz Tic-Tac-Toe"}
                  {!activeGame && "Duo Competitive Arena"}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  {!activeGame 
                    ? "Interactive reflex, racing, shooting & puzzle duels" 
                    : `Match Series: P1 (${matchSeries.p1}) — P2 (${matchSeries.p2})`}
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

          {/* MENU VIEW */}
          {!activeGame && (
            <div className="space-y-4">
              <div className="text-center max-w-sm mx-auto space-y-1 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
                  Competitive Duo Arena
                </span>
                <h4 className="text-lg font-black text-slate-900 font-['Fredoka',sans-serif]">
                  Select a Challenge to Play
                </h4>
                <p className="text-xs text-slate-500">
                  Play head-to-head with a friend on this device or challenge the AI Rival!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. SHOOTER */}
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
                        Power-Ups & Shields
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                        🎯 Laser Cannon Duel
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Collect shield orbs and triple-laser power-ups past destructible barriers! 3 HP combat.
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
                        Bumping & Nitro
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                        🏎️ Turbo Speed Drift
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Ram into opponents, trigger nitro boosts, and conquer 3-lap grand prix circuits!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Racing Drift</span> →
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
                        Dual Buzzers
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        🧩 Mind Rush: Dual Matrix
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Simultaneous buzzer race! Math, Stroop color clash & patterns. Wrong answer freezes you!
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
                        Accelerating ball physics and curve spins. First to 5 points takes the set!
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
                          ⭕ Blitz Tic-Tac-Toe Grid
                        </h5>
                        <p className="text-xs text-slate-500">
                          Rapid 5-second blitz turns with timeout penalties and series win streaks!
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
