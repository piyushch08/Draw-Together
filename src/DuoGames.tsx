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
  Smile,
  AlertTriangle,
  Play,
  RotateCw,
  Gauge,
  HelpCircle,
  Bomb,
  Star
} from "lucide-react";
import { GameType, TicTacToeState } from "./types";

// ==========================================
// ADVANCED SOUND SYNTHESIZER (Web Audio API)
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

  laser(pitch = 880) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.14);
    } catch {}
  }

  railgun() {
    this.playTone(1300, 0.22, "sawtooth", 0.16);
    setTimeout(() => this.playTone(160, 0.26, "square", 0.14), 40);
  }

  bomb() {
    this.playTone(100, 0.35, "triangle", 0.22);
    setTimeout(() => this.playTone(65, 0.45, "sawtooth", 0.18), 50);
  }

  dash() {
    this.playTone(520, 0.08, "sine", 0.12);
    setTimeout(() => this.playTone(980, 0.12, "sine", 0.14), 45);
  }

  hit() {
    this.playTone(180, 0.12, "square", 0.14);
  }

  shieldBreak() {
    this.playTone(900, 0.1, "sine", 0.15);
    setTimeout(() => this.playTone(400, 0.18, "triangle", 0.12), 60);
  }

  boost() {
    this.playTone(550, 0.08, "sine", 0.1);
    setTimeout(() => this.playTone(780, 0.14, "sine", 0.14), 60);
  }

  drift() {
    this.playTone(340, 0.06, "triangle", 0.05);
  }

  pong(speedMult = 1) {
    const f = Math.min(850, 440 * speedMult);
    this.playTone(f, 0.045, "triangle", 0.12);
  }

  smash() {
    this.playTone(1050, 0.06, "sawtooth", 0.22);
    setTimeout(() => this.playTone(200, 0.18, "square", 0.22), 25);
  }

  correct() {
    this.playTone(523.25, 0.08, "sine", 0.12);
    setTimeout(() => this.playTone(659.25, 0.1, "sine", 0.15), 70);
    setTimeout(() => this.playTone(783.99, 0.18, "sine", 0.18), 140);
  }

  wrong() {
    this.playTone(220, 0.15, "sawtooth", 0.1);
  }

  freeze() {
    this.playTone(950, 0.08, "sine", 0.14);
    setTimeout(() => this.playTone(1250, 0.15, "triangle", 0.15), 60);
  }

  countdownTick(high = false) {
    this.playTone(high ? 880 : 440, 0.07, "sine", 0.12);
  }

  countdownGo() {
    this.playTone(880, 0.22, "square", 0.16);
    setTimeout(() => this.playTone(1320, 0.35, "sine", 0.18), 70);
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
// DIFFICULTY & GAME SETTINGS TYPES
// ==========================================
export type GameDifficulty = "casual" | "pro" | "insane";

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

    const colors = ["#7C3AED", "#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#F43F5E", "#06B6D4"];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 320,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 6,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      alpha: 1
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
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
  const taunts = ["🔥", "💀", "⚡", "👑", "🥶", "🚀", "🎯", "😂"];
  return (
    <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/80 p-1 rounded-xl shadow-xs">
      <span className="text-[9px] uppercase font-black text-slate-400 px-1">{label}:</span>
      {taunts.map((t) => (
        <button
          key={t}
          onClick={() => {
            soundFX.taunt();
            onSendTaunt(t, sender);
          }}
          className="text-sm hover:scale-130 transition-transform active:scale-95 px-1 py-0.5"
          title={`Taunt with ${t}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ==========================================
// 1. LASER CANNON DUEL (RICOCHET, DASH & ARSENAL)
// ==========================================
interface ShooterGameProps {
  mode: "pass_and_play" | "ai_rival";
  difficulty: GameDifficulty;
  onWin: (winner: "p1" | "p2") => void;
}

function ShooterGame({ mode, difficulty, onWin }: ShooterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Hp, setP1Hp] = useState(3);
  const [p2Hp, setP2Hp] = useState(3);
  const [p1Shield, setP1Shield] = useState(false);
  const [p2Shield, setP2Shield] = useState(false);
  const [p1DashCd, setP1DashCd] = useState(0);
  const [p2DashCd, setP2DashCd] = useState(0);
  const [p1Weapon, setP1Weapon] = useState<"laser" | "triple" | "railgun" | "bomb">("laser");
  const [p2Weapon, setP2Weapon] = useState<"laser" | "triple" | "railgun" | "bomb">("laser");
  const [status, setStatus] = useState<"playing" | "finished">("playing");
  const [taunts, setTaunts] = useState<FloatingTaunt[]>([]);

  const stateRef = useRef({
    p1: { y: 160, vy: 0, cooldown: 0, shield: false, weapon: "laser", ammo: 0, dashCd: 0, invuln: 0 },
    p2: { y: 160, vy: 0, cooldown: 0, shield: false, weapon: "laser", ammo: 0, dashCd: 0, invuln: 0 },
    bullets: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      bounces: number;
      type: "laser" | "railgun" | "bomb";
      color: string;
      owner: "p1" | "p2";
      size?: number;
    }>,
    obstacles: [
      { y: 40, vy: 1.2, height: 50, x: 260, hp: 4 },
      { y: 140, vy: -1.3, height: 55, x: 300, hp: 5 },
      { y: 220, vy: 1.1, height: 50, x: 340, hp: 4 }
    ],
    vortex: { y: 160, vy: 0.8, pulse: 0, active: difficulty !== "casual" },
    powerUps: [] as Array<{ x: number; y: number; type: "shield" | "triple" | "railgun" | "bomb"; icon: string }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number; size?: number }>,
    ghosts: [] as Array<{ x: number; y: number; color: string; alpha: number }>,
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

  // P1 Dash / Roll
  const dashP1 = useCallback(() => {
    const s = stateRef.current;
    if (s.p1.dashCd > 0 || status !== "playing") return;
    soundFX.dash();
    s.p1.invuln = 24;
    s.p1.dashCd = 180; // 3 seconds at 60fps
    setP1DashCd(3);

    // Instant dash impulse
    const dir = s.keys["KeyW"] ? -1 : s.keys["KeyS"] ? 1 : (Math.random() > 0.5 ? 1 : -1);
    s.p1.y = Math.max(30, Math.min(290, s.p1.y + dir * 65));

    // Ghost particles
    for (let k = 0; k < 3; k++) {
      s.ghosts.push({ x: 25, y: s.p1.y - dir * (k * 20), color: "#7C3AED", alpha: 0.6 });
    }
  }, [status]);

  // P2 Dash / Roll
  const dashP2 = useCallback(() => {
    const s = stateRef.current;
    if (s.p2.dashCd > 0 || status !== "playing") return;
    soundFX.dash();
    s.p2.invuln = 24;
    s.p2.dashCd = 180;
    setP2DashCd(3);

    const dir = s.keys["ArrowUp"] ? -1 : s.keys["ArrowDown"] ? 1 : (Math.random() > 0.5 ? 1 : -1);
    s.p2.y = Math.max(30, Math.min(290, s.p2.y + dir * 65));

    for (let k = 0; k < 3; k++) {
      s.ghosts.push({ x: 575, y: s.p2.y - dir * (k * 20), color: "#10B981", alpha: 0.6 });
    }
  }, [status]);

  const fireP1 = useCallback(() => {
    const s = stateRef.current;
    if (s.p1.cooldown > 0 || status !== "playing") return;

    if (s.p1.weapon === "railgun" && s.p1.ammo > 0) {
      soundFX.railgun();
      s.bullets.push({ x: 45, y: s.p1.y, vx: 18, vy: 0, bounces: 0, type: "railgun", color: "#EC4899", owner: "p1", size: 18 });
      s.p1.ammo--;
      if (s.p1.ammo <= 0) { s.p1.weapon = "laser"; setP1Weapon("laser"); }
      s.p1.cooldown = 28;
    } else if (s.p1.weapon === "bomb" && s.p1.ammo > 0) {
      soundFX.bomb();
      s.bullets.push({ x: 45, y: s.p1.y, vx: 6.5, vy: 0, bounces: 1, type: "bomb", color: "#F59E0B", owner: "p1", size: 9 });
      s.p1.ammo--;
      if (s.p1.ammo <= 0) { s.p1.weapon = "laser"; setP1Weapon("laser"); }
      s.p1.cooldown = 32;
    } else if (s.p1.weapon === "triple" && s.p1.ammo > 0) {
      soundFX.laser(1050);
      s.bullets.push({ x: 45, y: s.p1.y, vx: 10, vy: -2.2, bounces: 1, type: "laser", color: "#8B5CF6", owner: "p1" });
      s.bullets.push({ x: 45, y: s.p1.y, vx: 10, vy: 0, bounces: 1, type: "laser", color: "#7C3AED", owner: "p1" });
      s.bullets.push({ x: 45, y: s.p1.y, vx: 10, vy: 2.2, bounces: 1, type: "laser", color: "#8B5CF6", owner: "p1" });
      s.p1.ammo--;
      if (s.p1.ammo <= 0) { s.p1.weapon = "laser"; setP1Weapon("laser"); }
      s.p1.cooldown = 18;
    } else {
      soundFX.laser();
      const angle = (Math.random() - 0.5) * 0.4;
      s.bullets.push({ x: 45, y: s.p1.y, vx: 9.5, vy: angle, bounces: 1, type: "laser", color: "#7C3AED", owner: "p1" });
      s.p1.cooldown = 15;
    }
  }, [status]);

  const fireP2 = useCallback(() => {
    const s = stateRef.current;
    if (s.p2.cooldown > 0 || status !== "playing") return;

    if (s.p2.weapon === "railgun" && s.p2.ammo > 0) {
      soundFX.railgun();
      s.bullets.push({ x: 555, y: s.p2.y, vx: -18, vy: 0, bounces: 0, type: "railgun", color: "#EC4899", owner: "p2", size: 18 });
      s.p2.ammo--;
      if (s.p2.ammo <= 0) { s.p2.weapon = "laser"; setP2Weapon("laser"); }
      s.p2.cooldown = 28;
    } else if (s.p2.weapon === "bomb" && s.p2.ammo > 0) {
      soundFX.bomb();
      s.bullets.push({ x: 555, y: s.p2.y, vx: -6.5, vy: 0, bounces: 1, type: "bomb", color: "#F59E0B", owner: "p2", size: 9 });
      s.p2.ammo--;
      if (s.p2.ammo <= 0) { s.p2.weapon = "laser"; setP2Weapon("laser"); }
      s.p2.cooldown = 32;
    } else if (s.p2.weapon === "triple" && s.p2.ammo > 0) {
      soundFX.laser(1050);
      s.bullets.push({ x: 555, y: s.p2.y, vx: -10, vy: -2.2, bounces: 1, type: "laser", color: "#34D399", owner: "p2" });
      s.bullets.push({ x: 555, y: s.p2.y, vx: -10, vy: 0, bounces: 1, type: "laser", color: "#10B981", owner: "p2" });
      s.bullets.push({ x: 555, y: s.p2.y, vx: -10, vy: 2.2, bounces: 1, type: "laser", color: "#34D399", owner: "p2" });
      s.p2.ammo--;
      if (s.p2.ammo <= 0) { s.p2.weapon = "laser"; setP2Weapon("laser"); }
      s.p2.cooldown = 18;
    } else {
      soundFX.laser();
      const angle = (Math.random() - 0.5) * 0.4;
      s.bullets.push({ x: 555, y: s.p2.y, vx: -9.5, vy: angle, bounces: 1, type: "laser", color: "#10B981", owner: "p2" });
      s.p2.cooldown = 15;
    }
  }, [status]);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === "Space") { e.preventDefault(); fireP1(); }
      if (e.code === "ShiftLeft" || e.code === "KeyC") { e.preventDefault(); dashP1(); }
      if (mode === "pass_and_play") {
        if (e.code === "Enter") { e.preventDefault(); fireP2(); }
        if (e.code === "ControlRight" || e.code === "Slash") { e.preventDefault(); dashP2(); }
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
  }, [fireP1, fireP2, dashP1, dashP2, mode]);

  // Countdown timer for dash UI
  useEffect(() => {
    const t = setInterval(() => {
      const s = stateRef.current;
      if (s.p1.dashCd > 0) setP1DashCd(Math.ceil(s.p1.dashCd / 60));
      else setP1DashCd(0);

      if (s.p2.dashCd > 0) setP2DashCd(Math.ceil(s.p2.dashCd / 60));
      else setP2DashCd(0);
    }, 200);
    return () => clearInterval(t);
  }, []);

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localP1Hp = 3;
    let localP2Hp = 3;
    let powerUpTimer = 0;

    const w = 600;
    const h = 320;

    const loop = () => {
      const s = stateRef.current;

      // Handle P1 movement
      const speedP1 = 5.2;
      if (s.keys["KeyW"]) s.p1.y = Math.max(25, s.p1.y - speedP1);
      if (s.keys["KeyS"]) s.p1.y = Math.min(h - 25, s.p1.y + speedP1);

      // Handle P2 movement
      if (mode === "pass_and_play") {
        const speedP2 = 5.2;
        if (s.keys["ArrowUp"]) s.p2.y = Math.max(25, s.p2.y - speedP2);
        if (s.keys["ArrowDown"]) s.p2.y = Math.min(h - 25, s.p2.y + speedP2);
      } else {
        // AI Logic according to difficulty
        const aiSpeed = difficulty === "insane" ? 4.8 : difficulty === "pro" ? 3.8 : 2.8;
        let targetY = s.p1.y;

        // Predictive dodge: check incoming bullets
        const threat = s.bullets.find((b) => b.owner === "p1" && b.x > 320 && Math.abs(b.y - s.p2.y) < 40);
        if (threat) {
          if (threat.y < s.p2.y) targetY = Math.min(h - 30, s.p2.y + 45);
          else targetY = Math.max(30, s.p2.y - 45);

          // AI Dash on Insane difficulty
          if (difficulty === "insane" && s.p2.dashCd === 0 && Math.abs(threat.x - 550) < 90) {
            dashP2();
          }
        } else if (s.powerUps.length > 0 && difficulty !== "casual") {
          targetY = s.powerUps[0].y;
        }

        if (s.p2.y < targetY - 4) s.p2.y += aiSpeed;
        else if (s.p2.y > targetY + 4) s.p2.y -= aiSpeed;
        s.p2.y = Math.max(25, Math.min(h - 25, s.p2.y));

        // AI shooting cadence
        const shootChance = difficulty === "insane" ? 0.07 : difficulty === "pro" ? 0.05 : 0.035;
        if (s.p2.cooldown === 0 && Math.random() < shootChance) {
          fireP2();
        }
      }

      if (s.p1.cooldown > 0) s.p1.cooldown--;
      if (s.p2.cooldown > 0) s.p2.cooldown--;
      if (s.p1.dashCd > 0) s.p1.dashCd--;
      if (s.p2.dashCd > 0) s.p2.dashCd--;
      if (s.p1.invuln > 0) s.p1.invuln--;
      if (s.p2.invuln > 0) s.p2.invuln--;

      // Update Center Vortex Hazard
      if (s.vortex.active) {
        s.vortex.y += s.vortex.vy;
        if (s.vortex.y < 50 || s.vortex.y > h - 50) s.vortex.vy *= -1;
        s.vortex.pulse += 0.05;
      }

      // Spawn periodic Power-Ups
      powerUpTimer++;
      const spawnInterval = difficulty === "insane" ? 240 : 340;
      if (powerUpTimer > spawnInterval && s.powerUps.length < 2) {
        powerUpTimer = 0;
        const types: Array<"shield" | "triple" | "railgun" | "bomb"> = ["shield", "triple", "railgun", "bomb"];
        const selected = types[Math.floor(Math.random() * types.length)];
        const icons = { shield: "🛡️", triple: "⚡", railgun: "🚀", bomb: "💣" };
        s.powerUps.push({
          x: 210 + Math.random() * 180,
          y: 40 + Math.random() * 240,
          type: selected,
          icon: icons[selected]
        });
      }

      // Update moving obstacles
      s.obstacles.forEach((obs) => {
        obs.y += obs.vy;
        if (obs.y < 20 || obs.y > h - obs.height - 20) obs.vy *= -1;
      });

      // Update bullets
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // Wall Ricochet (Bouncing lasers)
        if (b.y <= 8 || b.y >= h - 8) {
          if (b.bounces > 0) {
            b.vy *= -1;
            b.bounces--;
            soundFX.playTone(650, 0.04, "sine", 0.08);
          } else {
            s.bullets.splice(i, 1);
            continue;
          }
        }

        // Out of bounds
        if (b.x < 0 || b.x > w) {
          s.bullets.splice(i, 1);
          continue;
        }

        // Vortex anomaly collision (deflects regular lasers)
        if (s.vortex.active && Math.hypot(b.x - 300, b.y - s.vortex.y) < 26) {
          if (b.type !== "railgun") {
            b.vy = (Math.random() - 0.5) * 6;
            b.vx *= -0.8;
            soundFX.hit();
            continue;
          }
        }

        // Check power-up collection
        let collected = false;
        for (let pIdx = s.powerUps.length - 1; pIdx >= 0; pIdx--) {
          const pu = s.powerUps[pIdx];
          if (Math.hypot(b.x - pu.x, b.y - pu.y) < 20) {
            soundFX.boost();
            collected = true;
            if (b.owner === "p1") {
              if (pu.type === "shield") { s.p1.shield = true; setP1Shield(true); }
              else { s.p1.weapon = pu.type; s.p1.ammo = pu.type === "railgun" ? 2 : pu.type === "bomb" ? 3 : 5; setP1Weapon(pu.type); }
            } else {
              if (pu.type === "shield") { s.p2.shield = true; setP2Shield(true); }
              else { s.p2.weapon = pu.type; s.p2.ammo = pu.type === "railgun" ? 2 : pu.type === "bomb" ? 3 : 5; setP2Weapon(pu.type); }
            }
            s.powerUps.splice(pIdx, 1);
            break;
          }
        }
        if (collected && b.type !== "railgun") {
          s.bullets.splice(i, 1);
          continue;
        }

        // Check obstacle collision
        if (b.type !== "railgun") {
          let hitObs = false;
          for (const obs of s.obstacles) {
            if (obs.hp > 0 && b.x >= obs.x && b.x <= obs.x + 18 && b.y >= obs.y && b.y <= obs.y + obs.height) {
              hitObs = true;
              obs.hp -= b.type === "bomb" ? 3 : 1;
              soundFX.hit();

              // Bomb shrapnel blast
              if (b.type === "bomb") {
                soundFX.bomb();
                s.shake = 10;
                for (let k = 0; k < 6; k++) {
                  const ang = (k * Math.PI) / 3;
                  s.bullets.push({
                    x: b.x,
                    y: b.y,
                    vx: Math.cos(ang) * 6,
                    vy: Math.sin(ang) * 6,
                    bounces: 0,
                    type: "laser",
                    color: "#F59E0B",
                    owner: b.owner
                  });
                }
              }
              break;
            }
          }
          if (hitObs) {
            s.bullets.splice(i, 1);
            continue;
          }
        }

        // Hit P2
        if (b.owner === "p1" && b.x >= 550 && Math.abs(b.y - s.p2.y) < 28) {
          s.bullets.splice(i, 1);
          if (s.p2.invuln > 0) continue;

          s.shake = 10;
          if (s.p2.shield) {
            s.p2.shield = false;
            setP2Shield(false);
            soundFX.shieldBreak();
          } else {
            soundFX.hit();
            if (window.navigator?.vibrate) window.navigator.vibrate(30);
            localP2Hp = Math.max(0, localP2Hp - (b.type === "bomb" ? 2 : 1));
            setP2Hp(localP2Hp);

            for (let k = 0; k < 16; k++) {
              s.particles.push({
                x: 560,
                y: s.p2.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: "#10B981",
                life: 1,
                size: Math.random() * 4 + 2
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

        // Hit P1
        if (b.owner === "p2" && b.x <= 50 && Math.abs(b.y - s.p1.y) < 28) {
          s.bullets.splice(i, 1);
          if (s.p1.invuln > 0) continue;

          s.shake = 10;
          if (s.p1.shield) {
            s.p1.shield = false;
            setP1Shield(false);
            soundFX.shieldBreak();
          } else {
            soundFX.hit();
            if (window.navigator?.vibrate) window.navigator.vibrate(30);
            localP1Hp = Math.max(0, localP1Hp - (b.type === "bomb" ? 2 : 1));
            setP1Hp(localP1Hp);

            for (let k = 0; k < 16; k++) {
              s.particles.push({
                x: 40,
                y: s.p1.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: "#7C3AED",
                life: 1,
                size: Math.random() * 4 + 2
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
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // Update ghosts
      for (let i = s.ghosts.length - 1; i >= 0; i--) {
        const g = s.ghosts[i];
        g.alpha -= 0.05;
        if (g.alpha <= 0) s.ghosts.splice(i, 1);
      }

      // ---------------- RENDER CANVAS ----------------
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.85;
        if (s.shake < 0.5) s.shake = 0;
      }

      // Arena background
      ctx.fillStyle = "#0B0F19";
      ctx.fillRect(0, 0, w, h);

      // Sci-fi Neon Grid lines
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 1;
      for (let x = 30; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 30; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Top & Bottom glowing rails
      ctx.fillStyle = "#38BDF8";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 8;
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
      ctx.shadowBlur = 0;

      // Destructible Barriers
      s.obstacles.forEach((obs) => {
        if (obs.hp <= 0) return;
        ctx.fillStyle = obs.hp >= 3 ? "#475569" : obs.hp === 2 ? "#64748B" : "#94A3B8";
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, 16, obs.height, 5);
        ctx.fill();
        ctx.strokeStyle = "#94A3B8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Center Vortex Anomaly
      if (s.vortex.active) {
        ctx.save();
        ctx.translate(300, s.vortex.y);
        ctx.beginPath();
        ctx.arc(0, 0, 18 + Math.sin(s.vortex.pulse) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = "#818CF8";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#6366F1";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
        ctx.fill();
        ctx.restore();
      }

      // Power-Up Orbs
      s.powerUps.forEach((pu) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = pu.type === "shield" ? "#0284C7" : pu.type === "railgun" ? "#DB2777" : pu.type === "bomb" ? "#D97706" : "#7C3AED";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pu.icon, pu.x, pu.y);
        ctx.restore();
      });

      // Ghost trail shadows
      s.ghosts.forEach((g) => {
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.fillStyle = g.color;
        ctx.fillRect(g.x, g.y - 18, 24, 36);
        ctx.restore();
      });

      // P1 Cannon (Violet)
      ctx.save();
      if (s.p1.invuln > 0 && Math.floor(Date.now() / 60) % 2 === 0) ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#8B5CF6";
      ctx.beginPath();
      ctx.roundRect(14, s.p1.y - 18, 26, 36, 8);
      ctx.fill();
      ctx.fillStyle = "#A78BFA";
      ctx.fillRect(40, s.p1.y - 4, 14, 8);
      // P1 Shield Aura
      if (s.p1.shield) {
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#38BDF8";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(27, s.p1.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // P2 Cannon (Emerald)
      ctx.save();
      if (s.p2.invuln > 0 && Math.floor(Date.now() / 60) % 2 === 0) ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(w - 40, s.p2.y - 18, 26, 36, 8);
      ctx.fill();
      ctx.fillStyle = "#34D399";
      ctx.fillRect(w - 54, s.p2.y - 4, 14, 8);
      // P2 Shield Aura
      if (s.p2.shield) {
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#38BDF8";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(w - 27, s.p2.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Lasers & Projectiles
      s.bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        if (b.type === "railgun") {
          ctx.beginPath();
          ctx.roundRect(b.x - 14, b.y - 4, 28, 8, 4);
          ctx.fill();
        } else if (b.type === "bomb") {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size || 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(b.x - 8, b.y - 3, 16, 6, 3);
          ctx.fill();
        }
        ctx.restore();
      });

      // Particles
      s.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size || 3, p.size || 3);
        ctx.restore();
      });

      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [difficulty, mode, onWin]);

  const resetGame = () => {
    setP1Hp(3);
    setP2Hp(3);
    setP1Shield(false);
    setP2Shield(false);
    setP1Weapon("laser");
    setP2Weapon("laser");
    setStatus("playing");
    stateRef.current.p1.y = 160;
    stateRef.current.p2.y = 160;
    stateRef.current.p1.shield = false;
    stateRef.current.p2.shield = false;
    stateRef.current.p1.weapon = "laser";
    stateRef.current.p2.weapon = "laser";
    stateRef.current.bullets = [];
    stateRef.current.obstacles.forEach((obs) => { obs.hp = 4; });
  };

  return (
    <div className="space-y-3">
      {/* Top Status Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        {/* P1 Stats */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black text-violet-600">Player 1</span>
              {p1Shield && <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 rounded-sm">🛡️ Shield</span>}
              {p1Weapon !== "laser" && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded-sm uppercase font-black">⚡ {p1Weapon}</span>}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-base ${i < p1Hp ? "text-rose-500" : "text-slate-200"}`}>❤️</span>
              ))}
            </div>
          </div>
        </div>

        {/* Center Taunt Display */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider font-black text-slate-400">
            {difficulty.toUpperCase()} COMBAT
          </span>
          <div className="flex items-center gap-2 h-6">
            <AnimatePresence>
              {taunts.map((t) => (
                <motion.span
                  key={t.id}
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1.4, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-lg"
                >
                  {t.emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* P2 Stats */}
        <div className="flex items-center gap-3 justify-end text-right">
          <div>
            <div className="flex items-center justify-end gap-1.5">
              {p2Shield && <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 rounded-sm">🛡️ Shield</span>}
              {p2Weapon !== "laser" && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded-sm uppercase font-black">⚡ {p2Weapon}</span>}
              <span className="text-[10px] uppercase font-black text-emerald-600">
                {mode === "ai_rival" ? `AI (${difficulty})` : "Player 2"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-base ${i < p2Hp ? "text-rose-500" : "text-slate-200"}`}>❤️</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Arena */}
      <div className="w-full h-72 sm:h-80 border-2 border-slate-900 rounded-2xl overflow-hidden shadow-md relative bg-slate-950 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={320} className="w-full h-full" />
      </div>

      {/* Bottom Interactive Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
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
          <button
            onClick={dashP1}
            disabled={p1DashCd > 0}
            className={`px-3 py-2 rounded-xl active:scale-95 text-xs font-black flex items-center gap-1 transition-all ${
              p1DashCd > 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
            title="Dodge Roll (Shift/C)"
          >
            <Zap size={13} /> {p1DashCd > 0 ? `${p1DashCd}s` : "Dash"}
          </button>
        </div>

        {/* Center Hint / Reset */}
        <div className="flex items-center gap-2">
          <TauntBar onSendTaunt={triggerTaunt} sender="p1" label="Taunt" />
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
            <button
              onClick={dashP2}
              disabled={p2DashCd > 0}
              className={`px-3 py-2 rounded-xl active:scale-95 text-xs font-black flex items-center gap-1 transition-all ${
                p2DashCd > 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-700 text-white hover:bg-emerald-800"
              }`}
              title="Dodge Roll (Ctrl/Slash)"
            >
              <Zap size={13} /> {p2DashCd > 0 ? `${p2DashCd}s` : "Dash"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. TURBO SPEED DRIFT (SPARKS, HAZARDS & DRAFTING)
// ==========================================
interface RacingGameProps {
  mode: "pass_and_play" | "ai_rival";
  difficulty: GameDifficulty;
  onWin: (winner: "p1" | "p2") => void;
}

function RacingGame({ mode, difficulty, onWin }: RacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [trackType, setTrackType] = useState<"speedway" | "chicanes">("speedway");
  const [countdown, setCountdown] = useState<number | null>(3);
  const [p1Lap, setP1Lap] = useState(1);
  const [p2Lap, setP2Lap] = useState(1);
  const [p1Speedometer, setP1Speedometer] = useState(0);
  const [p1Nitro, setP1Nitro] = useState(100);
  const [p2Nitro, setP2Nitro] = useState(100);
  const [winner, setWinner] = useState<string | null>(null);

  const stateRef = useRef({
    p1: { x: 300, y: 260, angle: 0, speed: 0, lap: 1, checkpoint: 0, nitro: 100, drift: false, driftCharge: 0, spinTimer: 0 },
    p2: { x: 300, y: 284, angle: 0, speed: 0, lap: 1, checkpoint: 0, nitro: 100, drift: false, driftCharge: 0, spinTimer: 0 },
    skidmarks: [] as Array<{ x: number; y: number; alpha: number }>,
    oilSlicks: [
      { x: 480, y: 150, r: 22 },
      { x: 120, y: 150, r: 22 }
    ],
    boostPads: [
      { x: 280, y: 24, w: 45, h: 60 }
    ],
    keys: {} as Record<string, boolean>,
    animId: 0,
    checkpoints: [
      { x: 490, y: 160, r: 48 },
      { x: 300, y: 55, r: 48 },
      { x: 110, y: 160, r: 48 },
      { x: 300, y: 270, r: 48 }
    ],
    countdownRunning: true
  });

  // Countdown 3-2-1-GO
  useEffect(() => {
    stateRef.current.countdownRunning = true;
    setCountdown(3);
    soundFX.countdownTick(false);

    const t1 = setTimeout(() => {
      setCountdown(2);
      soundFX.countdownTick(false);
    }, 1000);

    const t2 = setTimeout(() => {
      setCountdown(1);
      soundFX.countdownTick(false);
    }, 2000);

    const t3 = setTimeout(() => {
      setCountdown(0);
      soundFX.countdownGo();
      stateRef.current.countdownRunning = false;
      setTimeout(() => setCountdown(null), 900);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [trackType]);

  const triggerNitroP1 = () => {
    const s = stateRef.current;
    if (s.countdownRunning) return;
    if (s.p1.nitro > 20) {
      s.p1.speed = 6.8;
      s.p1.nitro -= 25;
      setP1Nitro(s.p1.nitro);
      soundFX.boost();
    }
  };

  const triggerNitroP2 = () => {
    const s = stateRef.current;
    if (s.countdownRunning) return;
    if (s.p2.nitro > 20) {
      s.p2.speed = 6.8;
      s.p2.nitro -= 25;
      setP2Nitro(s.p2.nitro);
      soundFX.boost();
    }
  };

  // Keyboard handlers
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

  // Main 60fps loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 600;
    const h = 340;

    const loop = () => {
      const s = stateRef.current;
      const { p1, p2, keys, checkpoints, oilSlicks, boostPads } = s;

      if (!s.countdownRunning) {
        // P1 DRIFT & STEERING
        const isDriftingP1 = keys["Space"];
        p1.drift = isDriftingP1;
        const turnSpeedP1 = isDriftingP1 ? 0.085 : 0.065;

        if (p1.spinTimer > 0) {
          p1.spinTimer--;
          p1.angle += 0.25;
          p1.speed *= 0.95;
        } else {
          if (keys["KeyA"]) p1.angle -= turnSpeedP1;
          if (keys["KeyD"]) p1.angle += turnSpeedP1;

          if (isDriftingP1 && p1.speed > 2.5) {
            p1.driftCharge++;
            s.skidmarks.push({ x: p1.x, y: p1.y, alpha: 0.6 });
            soundFX.drift();
          } else if (p1.driftCharge > 20) {
            p1.speed = Math.min(7.2, p1.speed + 2.2);
            p1.driftCharge = 0;
            soundFX.boost();
          } else {
            p1.driftCharge = 0;
          }

          if (keys["KeyW"]) p1.speed = Math.min(5.2, p1.speed + 0.16);
          else p1.speed = Math.max(0, p1.speed - 0.06);
        }

        p1.x += Math.cos(p1.angle) * p1.speed;
        p1.y += Math.sin(p1.angle) * p1.speed;

        // P2 DRIFT & STEERING
        if (mode === "pass_and_play") {
          const isDriftingP2 = keys["Enter"] || keys["ShiftRight"];
          p2.drift = isDriftingP2;
          const turnSpeedP2 = isDriftingP2 ? 0.085 : 0.065;

          if (p2.spinTimer > 0) {
            p2.spinTimer--;
            p2.angle += 0.25;
            p2.speed *= 0.95;
          } else {
            if (keys["ArrowLeft"]) p2.angle -= turnSpeedP2;
            if (keys["ArrowRight"]) p2.angle += turnSpeedP2;

            if (isDriftingP2 && p2.speed > 2.5) {
              p2.driftCharge++;
              s.skidmarks.push({ x: p2.x, y: p2.y, alpha: 0.6 });
              soundFX.drift();
            } else if (p2.driftCharge > 20) {
              p2.speed = Math.min(7.2, p2.speed + 2.2);
              p2.driftCharge = 0;
              soundFX.boost();
            } else {
              p2.driftCharge = 0;
            }

            if (keys["ArrowUp"]) p2.speed = Math.min(5.2, p2.speed + 0.16);
            else p2.speed = Math.max(0, p2.speed - 0.06);
          }
        } else {
          // AI Navigation
          const aiMaxSpeed = difficulty === "insane" ? 5.1 : difficulty === "pro" ? 4.5 : 3.8;
          const targetCp = checkpoints[p2.checkpoint];
          const targetAngle = Math.atan2(targetCp.y - p2.y, targetCp.x - p2.x);
          let diff = targetAngle - p2.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          p2.angle += Math.max(-0.07, Math.min(0.07, diff));
          p2.speed = Math.min(aiMaxSpeed, p2.speed + 0.14);

          // AI smart nitro
          if (p2.checkpoint === 1 && p2.nitro > 35 && Math.random() < 0.04) {
            p2.speed = 6.4;
            p2.nitro -= 25;
            soundFX.boost();
          }
        }

        p2.x += Math.cos(p2.angle) * p2.speed;
        p2.y += Math.sin(p2.angle) * p2.speed;

        // Slowly recharge Nitro
        p1.nitro = Math.min(100, p1.nitro + 0.08);
        p2.nitro = Math.min(100, p2.nitro + 0.08);

        // Check Oil Slicks Hazards
        oilSlicks.forEach((slick) => {
          if (Math.hypot(p1.x - slick.x, p1.y - slick.y) < slick.r && p1.spinTimer === 0) {
            p1.spinTimer = 35;
            soundFX.wrong();
          }
          if (Math.hypot(p2.x - slick.x, p2.y - slick.y) < slick.r && p2.spinTimer === 0) {
            p2.spinTimer = 35;
            soundFX.wrong();
          }
        });

        // Check Boost Pads
        boostPads.forEach((pad) => {
          if (p1.x >= pad.x && p1.x <= pad.x + pad.w && p1.y >= pad.y && p1.y <= pad.y + pad.h) {
            p1.speed = 7.0;
            soundFX.boost();
          }
          if (p2.x >= pad.x && p2.x <= pad.x + pad.w && p2.y >= pad.y && p2.y <= pad.y + pad.h) {
            p2.speed = 7.0;
            soundFX.boost();
          }
        });

        // Bumper Car Collisions
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < 24) {
          soundFX.hit();
          if (window.navigator?.vibrate) window.navigator.vibrate(25);
          const bumpAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          p1.x -= Math.cos(bumpAngle) * 4;
          p1.y -= Math.sin(bumpAngle) * 4;
          p2.x += Math.cos(bumpAngle) * 4;
          p2.y += Math.sin(bumpAngle) * 4;
          p1.speed *= 0.82;
          p2.speed *= 0.82;
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
      }

      setP1Speedometer(Math.round(p1.speed * 28));

      // Skidmarks fading
      for (let i = s.skidmarks.length - 1; i >= 0; i--) {
        s.skidmarks[i].alpha -= 0.015;
        if (s.skidmarks[i].alpha <= 0) s.skidmarks.splice(i, 1);
      }

      // ---------------- RENDER ----------------
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, w, h);

      // Track Asphalt
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 70;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.roundRect(85, 55, 430, 230, 90);
      ctx.stroke();

      // Curb Stripes
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([16, 16]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Skidmarks
      s.skidmarks.forEach((sm) => {
        ctx.fillStyle = `rgba(15, 23, 42, ${sm.alpha})`;
        ctx.fillRect(sm.x - 2, sm.y - 2, 4, 4);
      });

      // Oil Slicks Hazards
      oilSlicks.forEach((slick) => {
        ctx.beginPath();
        ctx.arc(slick.x, slick.y, slick.r, 0, Math.PI * 2);
        ctx.fillStyle = "#334155";
        ctx.fill();
        ctx.strokeStyle = "#64748B";
        ctx.stroke();
        ctx.fillStyle = "#94A3B8";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("💧 OIL", slick.x, slick.y + 3);
      });

      // Boost Pad
      boostPads.forEach((pad) => {
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(">>>", pad.x + 8, pad.y + 35);
      });

      // Start/Finish Line
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(296, 235, 8, 70);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(300, 235, 4, 35);
      ctx.fillRect(296, 270, 4, 35);

      // Car 1 (Violet)
      ctx.save();
      ctx.translate(p1.x, p1.y);
      ctx.rotate(p1.angle);
      ctx.fillStyle = "#8B5CF6";
      ctx.beginPath();
      ctx.roundRect(-13, -7, 26, 14, 4);
      ctx.fill();
      ctx.fillStyle = "#C084FC";
      ctx.fillRect(2, -4, 5, 8);
      if (p1.speed > 5) {
        ctx.fillStyle = "#F97316";
        ctx.fillRect(-20, -3, 7, 6);
      }
      ctx.restore();

      // Car 2 (Emerald)
      ctx.save();
      ctx.translate(p2.x, p2.y);
      ctx.rotate(p2.angle);
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(-13, -7, 26, 14, 4);
      ctx.fill();
      ctx.fillStyle = "#6EE7B7";
      ctx.fillRect(2, -4, 5, 8);
      if (p2.speed > 5) {
        ctx.fillStyle = "#F97316";
        ctx.fillRect(-20, -3, 7, 6);
      }
      ctx.restore();

      // Countdown Overlay
      if (countdown !== null) {
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
        ctx.fillRect(0, 0, w, h);
        ctx.font = "bold 56px Fredoka, sans-serif";
        ctx.fillStyle = countdown === 0 ? "#10B981" : "#F59E0B";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(countdown === 0 ? "GO! 🚀" : countdown.toString(), w / 2, h / 2);
        ctx.restore();
      }

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [difficulty, mode, onWin, countdown]);

  const resetRace = () => {
    stateRef.current.p1.x = 300;
    stateRef.current.p1.y = 260;
    stateRef.current.p1.angle = 0;
    stateRef.current.p1.speed = 0;
    stateRef.current.p1.lap = 1;
    stateRef.current.p1.checkpoint = 0;

    stateRef.current.p2.x = 300;
    stateRef.current.p2.y = 284;
    stateRef.current.p2.angle = 0;
    stateRef.current.p2.speed = 0;
    stateRef.current.p2.lap = 1;
    stateRef.current.p2.checkpoint = 0;

    setP1Lap(1);
    setP2Lap(1);
    setWinner(null);
    setCountdown(3);
    stateRef.current.countdownRunning = true;
  };

  return (
    <div className="space-y-3">
      {/* Top HUD */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div>
          <span className="text-[10px] uppercase font-black text-violet-600">Player 1</span>
          <div className="text-sm font-black text-slate-800">
            Lap <span className="text-violet-600 text-base">{Math.min(3, p1Lap)}</span>/3
          </div>
        </div>

        <div className="text-center font-mono bg-slate-100 px-3 py-1 rounded-xl">
          <span className="text-[10px] text-slate-400 font-black uppercase">Speedometer</span>
          <div className="text-base font-black text-slate-800">{p1Speedometer} km/h</div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-black text-emerald-600">
            {mode === "ai_rival" ? `AI (${difficulty})` : "Player 2"}
          </span>
          <div className="text-sm font-black text-slate-800">
            Lap <span className="text-emerald-600 text-base">{Math.min(3, p2Lap)}</span>/3
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full h-72 sm:h-80 border-2 border-slate-900 rounded-2xl overflow-hidden shadow-md relative bg-slate-950 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={340} className="w-full h-full" />
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
        {/* P1 Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-black text-violet-600 mr-1">P1 (A/D/W):</span>
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
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
          >
            <Flame size={13} /> Gas
          </button>
          <button
            onClick={triggerNitroP1}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
            title="Nitro Boost (E)"
          >
            <Zap size={13} /> Nitro
          </button>
        </div>

        <button
          onClick={resetRace}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs"
        >
          <RotateCcw size={13} /> Restart
        </button>

        {/* P2 Controls if Pass and play */}
        {mode === "pass_and_play" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-black text-emerald-600 mr-1">P2 (Arrows):</span>
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
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
            >
              <Flame size={13} /> Gas
            </button>
            <button
              onClick={triggerNitroP2}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1"
              title="Nitro Boost (Ctrl)"
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
// 3. MIND RUSH: PROCEDURAL DUAL PUZZLE CLASH
// ==========================================
interface PuzzleQuestion {
  prompt: string;
  subPrompt: string;
  options: string[];
  answer: string;
  fontColorClass?: string;
}

function generateProceduralQuestion(): PuzzleQuestion {
  const category = Math.floor(Math.random() * 4);

  if (category === 0) {
    // 1. Quick Math Matrix
    const a = Math.floor(Math.random() * 18) + 7;
    const b = Math.floor(Math.random() * 8) + 3;
    const c = Math.floor(Math.random() * 25) + 5;
    const ansVal = a * b - c;
    const ans = ansVal.toString();
    const wrong1 = (ansVal + (Math.random() > 0.5 ? 4 : -4)).toString();
    const wrong2 = (ansVal + (Math.random() > 0.5 ? 10 : -10)).toString();
    const wrong3 = (ansVal + (Math.random() > 0.5 ? 6 : -6)).toString();
    const options = [ans, wrong1, wrong2, wrong3].sort(() => Math.random() - 0.5);
    return {
      prompt: `${a} × ${b} - ${c} = ?`,
      subPrompt: "⚡ Mental Math Sprint",
      options,
      answer: ans
    };
  } else if (category === 1) {
    // 2. Stroop Color Clash
    const colorNames = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE"];
    const colorClasses = [
      { name: "Red", cls: "text-rose-600" },
      { name: "Blue", cls: "text-blue-600" },
      { name: "Green", cls: "text-emerald-600" },
      { name: "Yellow", cls: "text-amber-500" },
      { name: "Purple", cls: "text-purple-600" }
    ];
    const wordIdx = Math.floor(Math.random() * colorNames.length);
    let inkIdx = Math.floor(Math.random() * colorClasses.length);
    while (inkIdx === wordIdx) inkIdx = Math.floor(Math.random() * colorClasses.length);

    const askInk = Math.random() > 0.5;
    const target = askInk ? colorClasses[inkIdx].name : colorNames[wordIdx];
    const pool = ["Red", "Blue", "Green", "Yellow", "Purple"];
    const options = [target, ...pool.filter((c) => c.toLowerCase() !== target.toLowerCase()).slice(0, 3)].sort(() => Math.random() - 0.5);

    return {
      prompt: colorNames[wordIdx],
      subPrompt: askInk ? "🎨 Pick the INK color!" : "📖 Pick the WRITTEN word!",
      options,
      answer: target,
      fontColorClass: colorClasses[inkIdx].cls
    };
  } else if (category === 2) {
    // 3. Pattern Sequences
    const base = Math.floor(Math.random() * 5) + 2;
    const step = Math.floor(Math.random() * 4) + 2;
    const s1 = base;
    const s2 = base * step;
    const s3 = base * step * step;
    const s4 = base * step * step * step;
    const ans = (s4 * step).toString();
    const options = [
      ans,
      (s4 * step + 12).toString(),
      (s4 * step - 8).toString(),
      (s4 * 2).toString()
    ].sort(() => Math.random() - 0.5);

    return {
      prompt: `${s1}, ${s2}, ${s3}, ${s4}, ?`,
      subPrompt: "🧩 Pattern Sequence",
      options,
      answer: ans
    };
  } else {
    // 4. Emoji Quick Scan
    const emojis = ["🔥", "⚡", "💎", "⭐"];
    const targetEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const count = Math.floor(Math.random() * 4) + 2;
    const arr: string[] = [];
    for (let i = 0; i < count; i++) arr.push(targetEmoji);
    for (let i = 0; i < 4; i++) {
      const other = emojis.filter((e) => e !== targetEmoji);
      arr.push(other[Math.floor(Math.random() * other.length)]);
    }
    const shuffledStr = arr.sort(() => Math.random() - 0.5).join(" ");
    const ans = count.toString();
    const options = [ans, (count + 1).toString(), (Math.max(1, count - 1)).toString(), (count + 2).toString()].sort(() => Math.random() - 0.5);

    return {
      prompt: shuffledStr,
      subPrompt: `👀 Count the ${targetEmoji} symbols!`,
      options,
      answer: ans
    };
  }
}

interface PuzzleGameProps {
  mode: "pass_and_play" | "ai_rival";
  difficulty: GameDifficulty;
  onWin: (winner: "p1" | "p2") => void;
}

function PuzzleGame({ mode, difficulty, onWin }: PuzzleGameProps) {
  const [currentQ, setCurrentQ] = useState<PuzzleQuestion>(generateProceduralQuestion());
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Frozen, setP1Frozen] = useState(false);
  const [p2Frozen, setP2Frozen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(7);

  // Blitz Countdown Clock for each puzzle question
  useEffect(() => {
    if (p1Score >= 5 || p2Score >= 5) return;
    const maxSec = difficulty === "insane" ? 4 : difficulty === "pro" ? 6 : 8;
    setTimerSeconds(maxSec);

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          soundFX.wrong();
          setFeedback("⏰ Time expired! Next question!");
          setTimeout(() => {
            setFeedback(null);
            setCurrentQ(generateProceduralQuestion());
          }, 600);
          return maxSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQ, difficulty, p1Score, p2Score]);

  // AI solving logic
  useEffect(() => {
    if (mode !== "ai_rival" || p1Score >= 5 || p2Score >= 5 || p2Frozen) return;
    const aiSpeed = difficulty === "insane" ? 1700 : difficulty === "pro" ? 2500 : 3800;

    const timer = setTimeout(() => {
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
        setCurrentQ(generateProceduralQuestion());
      }, 500);
    }, aiSpeed);

    return () => clearTimeout(timer);
  }, [mode, difficulty, currentQ, p2Frozen, p1Score, p2Score, onWin]);

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
        setCurrentQ(generateProceduralQuestion());
      }, 450);
    } else {
      soundFX.wrong();
      setP1Frozen(true);
      setTimeout(() => setP1Frozen(false), 1600);
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
        setCurrentQ(generateProceduralQuestion());
      }, 450);
    } else {
      soundFX.wrong();
      setP2Frozen(true);
      setTimeout(() => setP2Frozen(false), 1600);
    }
  };

  // Keyboard shortcut keys for answers (1-4 for P1, 7-0 for P2)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const keysP1 = ["Digit1", "Digit2", "Digit3", "Digit4", "KeyQ", "KeyW", "KeyE", "KeyR"];
      const keysP2 = ["Digit7", "Digit8", "Digit9", "Digit0", "KeyU", "KeyI", "KeyO", "KeyP"];

      const idxP1 = keysP1.indexOf(e.code);
      if (idxP1 !== -1) {
        handleP1Choice(currentQ.options[idxP1 % 4]);
      }

      if (mode === "pass_and_play") {
        const idxP2 = keysP2.indexOf(e.code);
        if (idxP2 !== -1) {
          handleP2Choice(currentQ.options[idxP2 % 4]);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentQ, mode]);

  const restartPuzzle = () => {
    setP1Score(0);
    setP2Score(0);
    setP1Frozen(false);
    setP2Frozen(false);
    setFeedback(null);
    setCurrentQ(generateProceduralQuestion());
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
          <div className="flex items-center gap-1 justify-center text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 font-mono text-[11px] font-black">
            <Clock size={12} /> {timerSeconds}s
          </div>
          <div className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">First to 5 Stars</div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-black text-emerald-600">
            {mode === "ai_rival" ? `AI (${difficulty})` : "Player 2"}
          </span>
          <div className="text-base text-emerald-700 font-mono">
            {"★".repeat(p2Score) + "☆".repeat(Math.max(0, 5 - p2Score))}
          </div>
        </div>
      </div>

      {/* Main Question Card in Center */}
      <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-5 shadow-sm text-center space-y-2 relative overflow-hidden">
        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          {currentQ.subPrompt}
        </span>
        <h3 className={`text-2xl sm:text-3xl font-black font-['Fredoka',sans-serif] ${currentQ.fontColorClass || "text-slate-900"}`}>
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
            <span className="text-xs font-black text-violet-700 uppercase">P1 (Keys: 1, 2, 3, 4)</span>
            {p1Frozen && <span className="text-[10px] text-rose-600 font-black">⚠️ Frozen!</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                disabled={p1Frozen}
                onClick={() => handleP1Choice(opt)}
                className="py-3 px-2 rounded-xl bg-violet-50 hover:bg-violet-600 hover:text-white text-violet-900 font-black text-sm active:scale-95 transition-all shadow-xs border border-violet-100 text-center"
              >
                <span className="text-[10px] opacity-60 mr-1">[{i + 1}]</span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* P2 Keypad */}
        {mode === "pass_and_play" ? (
          <div className={`p-4 rounded-3xl border-2 transition-all ${
            p2Frozen ? "bg-rose-50 border-rose-300 opacity-60" : "bg-white border-emerald-200 shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-emerald-700 uppercase">P2 (Keys: 7, 8, 9, 0)</span>
              {p2Frozen && <span className="text-[10px] text-rose-600 font-black">⚠️ Frozen!</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  disabled={p2Frozen}
                  onClick={() => handleP2Choice(opt)}
                  className="py-3 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-900 font-black text-sm active:scale-95 transition-all shadow-xs border border-emerald-100 text-center"
                >
                  <span className="text-[10px] opacity-60 mr-1">[{i + 7}]</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-3xl border-2 border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
            <Bot size={28} className="text-slate-400 mb-1" />
            <div className="text-xs font-bold text-slate-600">AI Rival Answering</div>
            <p className="text-[10px] text-slate-400 mt-1">Race to click the correct answer before the AI buzzes!</p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={restartPuzzle}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs font-bold"
        >
          <RotateCcw size={13} /> Reset Puzzle
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 4. CYBER PONG RALLY (CURVE SPINS, SMASH & BUMPERS)
// ==========================================
interface PongGameProps {
  mode: "pass_and_play" | "ai_rival";
  difficulty: GameDifficulty;
  onWin: (winner: "p1" | "p2") => void;
}

function PongGame({ mode, difficulty, onWin }: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [rallyCount, setRallyCount] = useState(0);

  const stateRef = useRef({
    p1Y: 140,
    p2Y: 140,
    p1PaddleH: 64,
    p2PaddleH: 64,
    balls: [
      { x: 300, y: 160, vx: 5.0, vy: 2.2, spin: 0, flaming: false }
    ],
    bumpers: [
      { x: 300, y: 80, r: 16 },
      { x: 300, y: 240, r: 16 }
    ],
    powerUps: [] as Array<{ x: number; y: number; type: "mega" | "multiball"; icon: string }>,
    keys: {} as Record<string, boolean>,
    rally: 0,
    animId: 0
  });

  const triggerSmashP1 = useCallback(() => {
    const s = stateRef.current;
    const b = s.balls[0];
    if (b && b.x < 80 && Math.abs(b.y - s.p1Y) < s.p1PaddleH / 2) {
      b.vx = Math.abs(b.vx) * 1.6;
      b.flaming = true;
      soundFX.smash();
      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    }
  }, []);

  const triggerSmashP2 = useCallback(() => {
    const s = stateRef.current;
    const b = s.balls[0];
    if (b && b.x > 520 && Math.abs(b.y - s.p2Y) < s.p2PaddleH / 2) {
      b.vx = -Math.abs(b.vx) * 1.6;
      b.flaming = true;
      soundFX.smash();
      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === "Space") triggerSmashP1();
      if (e.code === "Enter" && mode === "pass_and_play") triggerSmashP2();
    };
    const onKeyUp = (e: KeyboardEvent) => { stateRef.current.keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [triggerSmashP1, triggerSmashP2, mode]);

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
      const paddleSpeed = 5.6;
      if (s.keys["KeyW"]) s.p1Y = Math.max(s.p1PaddleH / 2, s.p1Y - paddleSpeed);
      if (s.keys["KeyS"]) s.p1Y = Math.min(h - s.p1PaddleH / 2, s.p1Y + paddleSpeed);

      // P2 Paddle
      if (mode === "pass_and_play") {
        if (s.keys["ArrowUp"]) s.p2Y = Math.max(s.p2PaddleH / 2, s.p2Y - paddleSpeed);
        if (s.keys["ArrowDown"]) s.p2Y = Math.min(h - s.p2PaddleH / 2, s.p2Y + paddleSpeed);
      } else {
        const aiSpeed = difficulty === "insane" ? 5.2 : difficulty === "pro" ? 4.3 : 3.4;
        const targetBall = s.balls[0] || { y: 160 };
        if (s.p2Y < targetBall.y - 8) s.p2Y += aiSpeed;
        else if (s.p2Y > targetBall.y + 8) s.p2Y -= aiSpeed;
        s.p2Y = Math.max(s.p2PaddleH / 2, Math.min(h - s.p2PaddleH / 2, s.p2Y));
      }

      // Update balls
      for (let bIdx = s.balls.length - 1; bIdx >= 0; bIdx--) {
        const b = s.balls[bIdx];
        b.x += b.vx;
        b.y += b.vy + b.spin;
        b.spin *= 0.98;

        // Top / Bottom wall bounce
        if (b.y <= 10 || b.y >= h - 10) {
          b.vy *= -1;
          soundFX.pong(1.1);
        }

        // Bumper collisions in middle
        if (difficulty !== "casual") {
          s.bumpers.forEach((bmp) => {
            if (Math.hypot(b.x - bmp.x, b.y - bmp.y) < bmp.r + 7) {
              b.vx *= -1.1;
              b.vy = (Math.random() - 0.5) * 6;
              soundFX.smash();
            }
          });
        }

        // P1 Paddle Hit
        if (b.x <= 38 && b.x >= 20 && Math.abs(b.y - s.p1Y) < s.p1PaddleH / 2) {
          b.vx = Math.abs(b.vx) * 1.04;
          const delta = (b.y - s.p1Y) / (s.p1PaddleH / 2);
          b.vy = delta * 5.8;
          b.spin = s.keys["KeyW"] ? -1.5 : s.keys["KeyS"] ? 1.5 : 0;
          b.flaming = false;
          s.rally++;
          setRallyCount(s.rally);
          soundFX.pong(1.2);
          if (window.navigator?.vibrate) window.navigator.vibrate(15);
        }

        // P2 Paddle Hit
        if (b.x >= 562 && b.x <= 580 && Math.abs(b.y - s.p2Y) < s.p2PaddleH / 2) {
          b.vx = -Math.abs(b.vx) * 1.04;
          const delta = (b.y - s.p2Y) / (s.p2PaddleH / 2);
          b.vy = delta * 5.8;
          b.flaming = false;
          s.rally++;
          setRallyCount(s.rally);
          soundFX.pong(1.2);
          if (window.navigator?.vibrate) window.navigator.vibrate(15);
        }

        // Goal P2
        if (b.x < 0) {
          s2++;
          setP2Score(s2);
          soundFX.hit();
          s.rally = 0;
          setRallyCount(0);
          b.x = 300;
          b.y = 160;
          b.vx = 5.0;
          b.vy = (Math.random() - 0.5) * 4;
          b.flaming = false;
          if (s2 >= 5) {
            soundFX.win();
            onWin("p2");
            return;
          }
        }

        // Goal P1
        if (b.x > w) {
          s1++;
          setP1Score(s1);
          soundFX.hit();
          s.rally = 0;
          setRallyCount(0);
          b.x = 300;
          b.y = 160;
          b.vx = -5.0;
          b.vy = (Math.random() - 0.5) * 4;
          b.flaming = false;
          if (s1 >= 5) {
            soundFX.win();
            onWin("p1");
            return;
          }
        }
      }

      // ---------------- RENDER ----------------
      ctx.fillStyle = "#090D16";
      ctx.fillRect(0, 0, w, h);

      // Court Net
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Bumpers
      if (difficulty !== "casual") {
        s.bumpers.forEach((bmp) => {
          ctx.beginPath();
          ctx.arc(bmp.x, bmp.y, bmp.r, 0, Math.PI * 2);
          ctx.fillStyle = "#38BDF8";
          ctx.shadowColor = "#38BDF8";
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // P1 Paddle
      ctx.fillStyle = "#8B5CF6";
      ctx.beginPath();
      ctx.roundRect(20, s.p1Y - s.p1PaddleH / 2, 12, s.p1PaddleH, 4);
      ctx.fill();

      // P2 Paddle
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(w - 32, s.p2Y - s.p2PaddleH / 2, 12, s.p2PaddleH, 4);
      ctx.fill();

      // Balls
      s.balls.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.flaming ? "#F97316" : "#FFFFFF";
        ctx.shadowColor = b.flaming ? "#EA580C" : "#FFFFFF";
        ctx.shadowBlur = b.flaming ? 16 : 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.flaming ? 9 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [difficulty, mode, onWin]);

  const resetPong = () => {
    setP1Score(0);
    setP2Score(0);
    setRallyCount(0);
    stateRef.current.rally = 0;
    stateRef.current.balls = [{ x: 300, y: 160, vx: 5.0, vy: 2.2, spin: 0, flaming: false }];
  };

  return (
    <div className="space-y-3">
      {/* Score Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="text-violet-700">
          Player 1: <span className="text-lg font-black">{p1Score}</span>
        </div>
        <div className="text-[11px] font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-xl flex items-center gap-1.5">
          <span>⚡ Rally:</span>
          <span className="font-black text-violet-600 text-sm">{rallyCount}</span>
        </div>
        <div className="text-emerald-700">
          <span className="text-lg font-black">{p2Score}</span> :{mode === "ai_rival" ? ` AI (${difficulty})` : " Player 2"}
        </div>
      </div>

      <div className="w-full h-72 sm:h-80 border-2 border-slate-900 rounded-2xl overflow-hidden shadow-md relative bg-slate-950 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={320} className="w-full h-full" />
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
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
          <button
            onClick={triggerSmashP1}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1 font-black"
            title="Smash Spike (Space)"
          >
            <Zap size={13} /> Smash
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
            <button
              onClick={triggerSmashP2}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 shadow-xs flex items-center gap-1 font-black"
              title="Smash Spike (Enter)"
            >
              <Zap size={13} /> Smash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. QUANTUM BLITZ TIC-TAC-TOE (GHOST 3-PIECE & BOMBS)
// ==========================================
interface TicTacToeGameProps {
  mode: "pass_and_play" | "ai_rival";
  difficulty: GameDifficulty;
  onWin: (winner: "p1" | "p2") => void;
}

function TicTacToeGame({ mode, difficulty, onWin }: TicTacToeGameProps) {
  const [tttMode, setTttMode] = useState<"ghost" | "blitz">("ghost");
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [p1History, setP1History] = useState<number[]>([]);
  const [p2History, setP2History] = useState<number[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"p1" | "p2">("p1");
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [status, setStatus] = useState<"playing" | "finished">("playing");
  const [blitzTimer, setBlitzTimer] = useState(5);
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);

  // Blitz countdown
  useEffect(() => {
    if (status !== "playing") return;
    const maxT = difficulty === "insane" ? 3 : 5;
    const timer = setInterval(() => {
      setBlitzTimer((prev) => {
        if (prev <= 1) {
          soundFX.wrong();
          setCurrentTurn((t) => (t === "p1" ? "p2" : "p1"));
          return maxT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, currentTurn, difficulty]);

  const checkWinner = (b: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, bIdx, c] of lines) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
        return { winner: b[a], line: [a, bIdx, c] };
      }
    }
    if (tttMode === "blitz" && b.every((c) => c !== null)) return { winner: "draw", line: null };
    return null;
  };

  const makeMove = (idx: number, player: "p1" | "p2") => {
    soundFX.move();
    const mark = player === "p1" ? "X" : "O";
    const nextBoard = [...board];
    let nextP1Hist = [...p1History];
    let nextP2Hist = [...p2History];

    if (tttMode === "ghost") {
      // Disappearing 3-piece rule
      if (player === "p1") {
        if (nextP1Hist.length >= 3) {
          const oldest = nextP1Hist.shift()!;
          nextBoard[oldest] = null;
        }
        nextP1Hist.push(idx);
      } else {
        if (nextP2Hist.length >= 3) {
          const oldest = nextP2Hist.shift()!;
          nextBoard[oldest] = null;
        }
        nextP2Hist.push(idx);
      }
    }

    nextBoard[idx] = mark;
    setBoard(nextBoard);
    setP1History(nextP1Hist);
    setP2History(nextP2Hist);

    const res = checkWinner(nextBoard);
    if (res) {
      if (res.winner === "draw") {
        setStatus("finished");
      } else {
        const isP1 = res.winner === "X";
        soundFX.win();
        setStatus("finished");
        setWinningLine(res.line);
        if (isP1) setP1Wins((w) => w + 1);
        else setP2Wins((w) => w + 1);
        onWin(isP1 ? "p1" : "p2");
      }
      return;
    }

    const nextTurn = player === "p1" ? "p2" : "p1";
    setCurrentTurn(nextTurn);
    setBlitzTimer(difficulty === "insane" ? 3 : 5);

    if (mode === "ai_rival" && nextTurn === "p2") {
      setTimeout(() => {
        executeAiMove(nextBoard, nextP1Hist, nextP2Hist);
      }, 350);
    }
  };

  const handleClick = (idx: number) => {
    if (status !== "playing" || board[idx] !== null) return;
    if (currentTurn !== "p1" && mode === "ai_rival") return;
    makeMove(idx, currentTurn);
  };

  const executeAiMove = (b: (string | null)[], p1H: number[], p2H: number[]) => {
    const empty = b.map((val, i) => (val === null ? i : null)).filter((v): v is number => v !== null);
    if (empty.length === 0) return;

    let chosen = empty[0];
    if (difficulty !== "casual") {
      for (const idx of empty) {
        const testB = [...b];
        testB[idx] = "O";
        if (checkWinner(testB)) { chosen = idx; break; }
      }
      for (const idx of empty) {
        const testB = [...b];
        testB[idx] = "X";
        if (checkWinner(testB)) { chosen = idx; break; }
      }
    }

    if (b[4] === null) chosen = 4;
    makeMove(chosen, "p2");
  };

  const restartTtt = () => {
    soundFX.move();
    setBoard(Array(9).fill(null));
    setP1History([]);
    setP2History([]);
    setCurrentTurn("p1");
    setWinningLine(null);
    setStatus("playing");
    setBlitzTimer(difficulty === "insane" ? 3 : 5);
  };

  return (
    <div className="flex flex-col items-center max-w-sm mx-auto space-y-4">
      {/* Mode Switcher */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-black text-slate-600 w-full justify-around">
        <button
          onClick={() => { setTttMode("ghost"); restartTtt(); }}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
            tttMode === "ghost" ? "bg-white text-violet-700 shadow-xs" : "text-slate-400"
          }`}
        >
          <Sparkles size={13} /> Ghost 3-Piece
        </button>
        <button
          onClick={() => { setTttMode("blitz"); restartTtt(); }}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
            tttMode === "blitz" ? "bg-white text-violet-700 shadow-xs" : "text-slate-400"
          }`}
        >
          <Clock size={13} /> Classic Blitz
        </button>
      </div>

      <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center justify-around shadow-xs text-center">
        <div>
          <div className="text-[10px] font-black uppercase text-violet-600">Player 1 (X)</div>
          <div className="text-lg font-black text-slate-900">{p1Wins}</div>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div className="text-[10px] text-slate-400 font-bold max-w-[120px] text-center">
          {tttMode === "ghost" ? "4th move removes oldest!" : "5s Blitz timer"}
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <div className="text-[10px] font-black uppercase text-emerald-600">
            {mode === "ai_rival" ? `AI (${difficulty})` : "Player 2 (O)"}
          </div>
          <div className="text-lg font-black text-slate-900">{p2Wins}</div>
        </div>
      </div>

      <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-slate-600">
        <div>
          Turn:{" "}
          <span className={currentTurn === "p1" ? "text-violet-600 font-black" : "text-emerald-600 font-black"}>
            {currentTurn === "p1" ? "Player 1 (X)" : (mode === "ai_rival" ? "AI Rival (O)" : "Player 2 (O)")}
          </span>
        </div>
        {status === "playing" && (
          <div className="flex items-center gap-1 font-mono text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
            <Clock size={11} /> {blitzTimer}s
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 bg-slate-200/80 p-2.5 rounded-2xl shadow-inner w-64 h-64 sm:w-72 sm:h-72">
        {board.map((cell, idx) => {
          const isWinning = winningLine?.includes(idx);
          const isP1Oldest = tttMode === "ghost" && p1History.length >= 3 && p1History[0] === idx;
          const isP2Oldest = tttMode === "ghost" && p2History.length >= 3 && p2History[0] === idx;

          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              disabled={cell !== null || status !== "playing"}
              className={`rounded-xl font-black text-3xl sm:text-4xl flex items-center justify-center transition-all shadow-xs relative ${
                isWinning
                  ? "bg-emerald-500 text-white animate-pulse"
                  : cell === null
                  ? "bg-white hover:bg-slate-50 text-slate-300"
                  : cell === "X"
                  ? "bg-white text-violet-600"
                  : "bg-white text-emerald-600"
              } ${isP1Oldest || isP2Oldest ? "border-2 border-rose-400 opacity-60 animate-pulse" : ""}`}
            >
              {cell}
              {(isP1Oldest || isP2Oldest) && (
                <span className="absolute bottom-1 right-1 text-[9px] text-rose-500 font-bold uppercase tracking-tighter">
                  Fading
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={restartTtt}
        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
      >
        <RotateCcw size={13} /> {status === "finished" ? "Play Again" : "Reset Grid"}
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
  const [difficulty, setDifficulty] = useState<GameDifficulty>("pro");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [matchSeries, setMatchSeries] = useState({ p1: 0, p2: 0 });
  const [winStreak, setWinStreak] = useState(0);

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
    if (winner === "p1") {
      setWinStreak((s) => s + 1);
    } else {
      setWinStreak(0);
    }
    setTimeout(() => setShowConfetti(false), 3800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md">
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
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  {activeGame === "shooter" && "🎯 Laser Cannon Duel"}
                  {activeGame === "racing" && "🏎️ Turbo Speed Drift"}
                  {activeGame === "puzzle" && "🧩 Mind Rush: Dual Matrix"}
                  {activeGame === "pong" && "🏓 Cyber Pong Rally"}
                  {activeGame === "tictactoe" && "⭕ Quantum Blitz Tic-Tac-Toe"}
                  {!activeGame && "Duo Competitive Arena"}
                  {winStreak > 1 && (
                    <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      🔥 {winStreak} Streak!
                    </span>
                  )}
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
            {/* Difficulty Toggle */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold text-slate-600">
              {(["casual", "pro", "insane"] as GameDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-2 py-1 rounded-lg capitalize transition-all ${
                    difficulty === d ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

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
                  Enhanced with ricochets, nitro drifts, procedural puzzles & ghost tic-tac-toe!
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
                        Ricochets & Dash
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                        🎯 Laser Cannon Duel
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Bouncing wall ricochets, dodge roll dash, railguns, plasma bombs & center vortex hazard!
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
                        Drifting & Oil Slicks
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                        🏎️ Turbo Speed Drift
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Charge drift sparks for turbo bursts, dodge oil slicks, launch with 3-2-1-GO rocket starts!
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
                        Procedural Brain Race
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        🧩 Mind Rush: Dual Matrix
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Infinite dynamic math, Stroop color illusion, pattern sequences & emoji scanning with speed clocks!
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
                        Smash Spikes & Bumpers
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        🏓 Cyber Pong Rally
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Paddle curve spin, supersonic smash spikes, mid-court deflect bumpers and escalating rallies!
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
                          ⭕ Quantum Blitz Tic-Tac-Toe
                        </h5>
                        <p className="text-xs text-slate-500">
                          Disappearing 3-piece memory rule (eliminates all draws!) plus blitz timers and strategic removals!
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
          {activeGame === "shooter" && <ShooterGame mode={gameMode} difficulty={difficulty} onWin={handleGameWin} />}
          {activeGame === "racing" && <RacingGame mode={gameMode} difficulty={difficulty} onWin={handleGameWin} />}
          {activeGame === "puzzle" && <PuzzleGame mode={gameMode} difficulty={difficulty} onWin={handleGameWin} />}
          {activeGame === "pong" && <PongGame mode={gameMode} difficulty={difficulty} onWin={handleGameWin} />}
          {activeGame === "tictactoe" && <TicTacToeGame mode={gameMode} difficulty={difficulty} onWin={handleGameWin} />}

        </div>
      </motion.div>
    </div>
  );
}
