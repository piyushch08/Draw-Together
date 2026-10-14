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
  Eye, 
  EyeOff, 
  Users, 
  Bot, 
  Send, 
  Play, 
  Pencil,
  Eraser,
  Trash2,
  Undo2,
  ChevronLeft
} from "lucide-react";
import { GameType, TicTacToeState, InkWarState, PictionaryState, BlindDrawState } from "./types";

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

  tick() {
    this.playTone(520, 0.05, "sine", 0.08);
  }

  start() {
    this.playTone(440, 0.09, "sine", 0.12);
    setTimeout(() => this.playTone(660, 0.18, "sine", 0.15), 90);
  }

  correct() {
    this.playTone(523.25, 0.09, "sine", 0.15);
    setTimeout(() => this.playTone(659.25, 0.09, "sine", 0.18), 80);
    setTimeout(() => this.playTone(783.99, 0.2, "sine", 0.2), 160);
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.22, "sine", 0.2), i * 100);
    });
  }

  move() {
    this.playTone(400, 0.05, "sine", 0.08);
  }
}

export const soundFX = new SoundFX();

// ==========================================
// PICTIONARY WORD BANK
// ==========================================
export const PICTIONARY_WORDS = [
  { word: "PIZZA", category: "Food", hint: "Cheesy triangular slice" },
  { word: "CAT", category: "Animals", hint: "Whiskers and purring" },
  { word: "ROCKET", category: "Space", hint: "Shoots into the stars" },
  { word: "BURGER", category: "Food", hint: "Bun, patty, lettuce" },
  { word: "GIRAFFE", category: "Animals", hint: "Has a very long neck" },
  { word: "GUITAR", category: "Music", hint: "Instrument with 6 strings" },
  { word: "VOLCANO", category: "Nature", hint: "Erupts with molten lava" },
  { word: "ROBOT", category: "Sci-Fi", hint: "Mechanical android friend" },
  { word: "AIRPLANE", category: "Vehicles", hint: "Flies high in the sky" },
  { word: "ELEPHANT", category: "Animals", hint: "Large ears and a trunk" },
  { word: "ICE CREAM", category: "Food", hint: "Cold sweet dessert on a cone" },
  { word: "RAINBOW", category: "Nature", hint: "Colors after a rainstorm" },
  { word: "CASTLE", category: "Buildings", hint: "Stone towers and drawbridge" },
  { word: "PENGUIN", category: "Animals", hint: "Flightless bird in the snow" },
  { word: "DIAMOND", category: "Items", hint: "Sparkling precious gemstone" },
  { word: "CAMPFIRE", category: "Outdoors", hint: "Flames for roasting marshmallows" },
  { word: "HELICOPTER", category: "Vehicles", hint: "Rotating blades on top" },
  { word: "BUTTERFLY", category: "Nature", hint: "Fluttering wings on flowers" },
  { word: "DONUT", category: "Food", hint: "Round pastry with a hole" },
  { word: "SUNFLOWER", category: "Plants", hint: "Tall bright yellow bloom" },
  { word: "BICYCLE", category: "Vehicles", hint: "Two wheels and pedals" }
];

export const BLIND_DRAW_PROMPTS = [
  "Draw a smiling cat wearing sunglasses",
  "Draw a dancing robot with sneakers",
  "Draw an alien eating a slice of pizza",
  "Draw a snowman holding an umbrella on the beach",
  "Draw a cute dinosaur playing a guitar",
  "Draw a dog driving a sports car",
  "Draw an astronaut riding a skateboard on the moon"
];

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
    const particles = Array.from({ length: 70 }).map(() => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 260,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 12,
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
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.009;

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

      if (alive) {
        animId = requestAnimationFrame(render);
      }
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
// MINIMALIST DRAWING BOARD (Self-Contained)
// ==========================================
interface MiniCanvasProps {
  color: string;
  size: number;
  isEraser: boolean;
  onCoverageSample?: (sample: { p1: number; p2: number }) => void;
  p1Color?: string;
  p2Color?: string;
  disabled?: boolean;
  clearTrigger?: number;
}

function MiniCanvas({
  color,
  size,
  isEraser,
  onCoverageSample,
  p1Color = "#7C3AED",
  p2Color = "#10B981",
  disabled = false,
  clearTrigger = 0
}: MiniCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use high resolution for crisp lines
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  // Clear when clearTrigger changes
  useEffect(() => {
    if (clearTrigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, [clearTrigger]);

  // Periodic territory scanner for Ink War
  useEffect(() => {
    if (!onCoverageSample) return;
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        const w = canvas.width;
        const h = canvas.height;
        const sampleCount = 600;
        let p1Count = 0;
        let p2Count = 0;

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        for (let i = 0; i < sampleCount; i++) {
          const rx = Math.floor(Math.random() * w);
          const ry = Math.floor(Math.random() * h);
          const idx = (ry * w + rx) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a > 30) {
            // Check for Violet (#7C3AED: high B, moderate R, lower G)
            if (b > 150 && r > 80 && g < 130) {
              p1Count++;
            }
            // Check for Emerald (#10B981: high G, moderate R/B)
            else if (g > 140 && r < 120) {
              p2Count++;
            }
          }
        }

        const totalMarked = p1Count + p2Count;
        let p1Pct = 50;
        let p2Pct = 50;
        if (totalMarked > 4) {
          p1Pct = Math.round((p1Count / totalMarked) * 100);
          p2Pct = 100 - p1Pct;
        }
        onCoverageSample({ p1: p1Pct, p2: p2Pct });
      } catch {}
    }, 700);

    return () => clearInterval(interval);
  }, [onCoverageSample]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, (isEraser ? size * 2 : size) / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? "#FFFFFF" : color;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || disabled) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas || !lastPointRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = isEraser ? "#FFFFFF" : color;
    ctx.lineWidth = isEraser ? size * 2 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDraw}
      onMouseMove={draw}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
      onTouchStart={startDraw}
      onTouchMove={draw}
      onTouchEnd={endDraw}
      className={`w-full h-full bg-white touch-none cursor-crosshair rounded-xl select-none ${
        disabled ? "pointer-events-none opacity-80" : ""
      }`}
    />
  );
}

// ==========================================
// MAIN HOMESCREEN DUO GAMES ARENA MODAL
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

  // Drawing Tools State
  const [brushColor, setBrushColor] = useState<string>("#7C3AED");
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isEraser, setIsEraser] = useState(false);
  const [clearCount, setClearCount] = useState(0);

  // 1. TIC-TAC-TOE STATE
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

  // 2. INK WAR STATE
  const [inkWar, setInkWar] = useState<InkWarState>({
    timeLeft: 30,
    player1Coverage: 50,
    player2Coverage: 50,
    status: "idle",
    winnerId: undefined
  });

  // 3. PICTIONARY STATE
  const [pictionary, setPictionary] = useState<PictionaryState>({
    word: "PIZZA",
    category: "Food",
    drawerId: "p1",
    round: 1,
    totalRounds: 4,
    timeLeft: 45,
    status: "idle",
    hints: ["Cheesy triangular slice"],
    lastGuesserName: undefined
  });
  const [pictionaryGuess, setPictionaryGuess] = useState("");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // 4. BLIND DRAW STATE
  const [blindDraw, setBlindDraw] = useState<BlindDrawState>({
    prompt: BLIND_DRAW_PROMPTS[0],
    timeLeft: 25,
    status: "idle",
    winnerId: undefined,
    p1Votes: 0,
    p2Votes: 0
  });
  const [hasVoted, setHasVoted] = useState(false);

  // Sync sound setting
  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  // If initialGame provided, open it
  useEffect(() => {
    if (initialGame) setActiveGame(initialGame);
  }, [initialGame]);

  // ==========================================
  // TIC-TAC-TOE LOGIC
  // ==========================================
  const checkTttWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    if (board.every(cell => cell !== null)) {
      return { winner: "draw", line: null };
    }
    return null;
  };

  const handleTttClick = (index: number) => {
    if (ttt.status !== "playing" || ttt.board[index] !== null) return;

    soundFX.move();
    const mark = ttt.currentTurn === "p1" ? "X" : "O";
    const nextBoard = [...ttt.board];
    nextBoard[index] = mark;

    const result = checkTttWinner(nextBoard);
    if (result) {
      if (result.winner === "draw") {
        setTtt(prev => ({
          ...prev,
          board: nextBoard,
          status: "finished",
          winnerId: "draw",
          draws: prev.draws + 1,
          winningLine: null
        }));
      } else {
        const isP1 = result.winner === "X";
        soundFX.win();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        setTtt(prev => ({
          ...prev,
          board: nextBoard,
          status: "finished",
          winnerId: isP1 ? "p1" : "p2",
          p1Wins: isP1 ? prev.p1Wins + 1 : prev.p1Wins,
          p2Wins: !isP1 ? prev.p2Wins + 1 : prev.p2Wins,
          winningLine: result.line
        }));
      }
      return;
    }

    const nextTurn = ttt.currentTurn === "p1" ? "p2" : "p1";
    setTtt(prev => ({ ...prev, board: nextBoard, currentTurn: nextTurn }));

    // AI Turn in ai_rival mode
    if (gameMode === "ai_rival" && nextTurn === "p2") {
      setTimeout(() => {
        makeAiTttMove(nextBoard);
      }, 350);
    }
  };

  const makeAiTttMove = (currentBoard: (string | null)[]) => {
    const emptyIndices = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((v): v is number => v !== null);

    if (emptyIndices.length === 0) return;

    // Smart move: check if AI can win, or block player
    let chosen = emptyIndices[0];
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    // 1. Can AI ("O") win?
    for (const [a, b, c] of lines) {
      const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
      if (vals.filter(v => v === "O").length === 2 && vals.includes(null)) {
        chosen = [a, b, c].find(i => currentBoard[i] === null)!;
        break;
      }
    }

    // 2. Can player ("X") win next turn? Block!
    if (chosen === emptyIndices[0]) {
      for (const [a, b, c] of lines) {
        const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
        if (vals.filter(v => v === "X").length === 2 && vals.includes(null)) {
          chosen = [a, b, c].find(i => currentBoard[i] === null)!;
          break;
        }
      }
    }

    // 3. Take center if available
    if (currentBoard[4] === null) chosen = 4;

    const nextBoard = [...currentBoard];
    nextBoard[chosen] = "O";
    soundFX.move();

    const result = checkTttWinner(nextBoard);
    if (result) {
      if (result.winner === "draw") {
        setTtt(prev => ({
          ...prev,
          board: nextBoard,
          status: "finished",
          winnerId: "draw",
          draws: prev.draws + 1,
          winningLine: null
        }));
      } else {
        soundFX.win();
        setTtt(prev => ({
          ...prev,
          board: nextBoard,
          status: "finished",
          winnerId: "p2",
          p2Wins: prev.p2Wins + 1,
          winningLine: result.line
        }));
      }
    } else {
      setTtt(prev => ({ ...prev, board: nextBoard, currentTurn: "p1" }));
    }
  };

  const restartTttRound = () => {
    soundFX.start();
    setTtt(prev => ({
      ...prev,
      board: Array(9).fill(null),
      currentTurn: "p1",
      winningLine: null,
      status: "playing",
      winnerId: undefined
    }));
  };

  // ==========================================
  // INK WAR TIMERS & LOGIC
  // ==========================================
  useEffect(() => {
    if (activeGame !== "ink_war" || inkWar.status !== "battling") return;

    const timer = setInterval(() => {
      setInkWar(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          soundFX.win();
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3500);

          let winner: string | "draw" = "draw";
          if (prev.player1Coverage > prev.player2Coverage) winner = "p1";
          else if (prev.player2Coverage > prev.player1Coverage) winner = "p2";

          return { ...prev, timeLeft: 0, status: "finished", winnerId: winner };
        }
        if (prev.timeLeft <= 6) soundFX.tick();
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeGame, inkWar.status]);

  const startInkWarGame = () => {
    soundFX.start();
    setClearCount(c => c + 1);
    setBrushColor("#7C3AED");
    setBrushSize(8);
    setIsEraser(false);
    setInkWar({
      timeLeft: 30,
      player1Coverage: 50,
      player2Coverage: 50,
      status: "battling",
      winnerId: undefined
    });
  };

  // ==========================================
  // SPEED PICTIONARY TIMERS & LOGIC
  // ==========================================
  useEffect(() => {
    if (activeGame !== "pictionary" || pictionary.status !== "drawing") return;

    const timer = setInterval(() => {
      setPictionary(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          return { ...prev, timeLeft: 0, status: "round_end" };
        }
        if (prev.timeLeft <= 5) soundFX.tick();
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeGame, pictionary.status]);

  const startPictionaryGame = () => {
    soundFX.start();
    setClearCount(c => c + 1);
    const item = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
    setPictionary({
      word: item.word,
      category: item.category,
      drawerId: "p1",
      round: 1,
      totalRounds: 4,
      timeLeft: 45,
      status: "drawing",
      hints: [item.hint],
      lastGuesserName: undefined
    });
    setP1Score(0);
    setP2Score(0);
    setPictionaryGuess("");
  };

  const nextPictionaryRound = () => {
    soundFX.start();
    setClearCount(c => c + 1);
    const nextRound = pictionary.round + 1;
    const nextDrawer = pictionary.drawerId === "p1" ? "p2" : "p1";
    const item = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];

    setPictionary({
      word: item.word,
      category: item.category,
      drawerId: nextDrawer,
      round: nextRound,
      totalRounds: 4,
      timeLeft: 45,
      status: nextRound > 4 ? "game_over" : "drawing",
      hints: [item.hint],
      lastGuesserName: undefined
    });
    setPictionaryGuess("");
  };

  const handlePictionaryGuessSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pictionaryGuess.trim() || pictionary.status !== "drawing") return;

    const cleanInput = pictionaryGuess.trim().toUpperCase();
    if (cleanInput === pictionary.word.toUpperCase()) {
      soundFX.correct();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);

      const points = Math.max(10, pictionary.timeLeft * 2);
      if (pictionary.drawerId === "p1") {
        setP2Score(s => s + points);
        setP1Score(s => s + Math.floor(points / 2)); // reward drawer too
      } else {
        setP1Score(s => s + points);
        setP2Score(s => s + Math.floor(points / 2));
      }

      setPictionary(prev => ({
        ...prev,
        status: "round_end",
        lastGuesserName: pictionary.drawerId === "p1" ? (gameMode === "ai_rival" ? "AI Rival" : "Player 2") : username
      }));
    } else {
      soundFX.playTone(260, 0.08, "square", 0.08); // gentle wrong buzz
    }
    setPictionaryGuess("");
  };

  // ==========================================
  // BLINDFOLD DRAW TIMERS & LOGIC
  // ==========================================
  useEffect(() => {
    if (activeGame !== "blind_draw" || blindDraw.status !== "drawing") return;

    const timer = setInterval(() => {
      setBlindDraw(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          soundFX.win();
          return { ...prev, timeLeft: 0, status: "reveal" };
        }
        if (prev.timeLeft <= 5) soundFX.tick();
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeGame, blindDraw.status]);

  const startBlindDrawGame = () => {
    soundFX.start();
    setClearCount(c => c + 1);
    setHasVoted(false);
    const prompt = BLIND_DRAW_PROMPTS[Math.floor(Math.random() * BLIND_DRAW_PROMPTS.length)];
    setBlindDraw({
      prompt,
      timeLeft: 25,
      status: "drawing",
      winnerId: undefined,
      p1Votes: 0,
      p2Votes: 0
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md">
      <ConfettiCanvas active={showConfetti} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* ========================================== */}
        {/* REFINED MINIMALIST HEADER */}
        {/* ========================================== */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            {activeGame && (
              <button
                onClick={() => setActiveGame(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-95"
                title="Back to games"
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
                  {activeGame === "tictactoe" && "⭕ Tic-Tac-Toe Grid Duel"}
                  {activeGame === "ink_war" && "⚔️ Ink War: Territory Clash"}
                  {activeGame === "pictionary" && "🎨 Speed Pictionary Rush"}
                  {activeGame === "blind_draw" && "🙈 Blindfold Sketch Battle"}
                  {!activeGame && "Duo Games Arena"}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  {!activeGame 
                    ? "Simple, clean, and fast 2-player games" 
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
                title="Pass & Play on same screen"
              >
                <Users size={12} />
                <span className="hidden xs:inline">Duo</span>
              </button>
              <button
                onClick={() => setGameMode("ai_rival")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  gameMode === "ai_rival" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Play against AI Rival"
              >
                <Bot size={12} />
                <span className="hidden xs:inline">vs AI</span>
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
              title={soundEnabled ? "Mute audio" : "Unmute audio"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-400 flex items-center justify-center transition-all active:scale-95"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* MODAL BODY */}
        {/* ========================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">

          {/* ------------------------------------------ */}
          {/* MENU VIEW (SELECT A GAME)                  */}
          {/* ------------------------------------------ */}
          {!activeGame && (
            <div className="space-y-4">
              <div className="text-center max-w-sm mx-auto space-y-1 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
                  Instant Duo Play
                </span>
                <h4 className="text-lg font-black text-slate-900 font-['Fredoka',sans-serif]">
                  Select a Competitive Mini-Game
                </h4>
                <p className="text-xs text-slate-500">
                  Play with a friend on this device or test your skills against the AI Rival!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Tic-Tac-Toe */}
                <div 
                  onClick={() => {
                    setActiveGame("tictactoe");
                    restartTttRound();
                  }}
                  className="bg-white border border-slate-200/90 hover:border-violet-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Trophy size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                        Tactical
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        ⭕ Neon Tic-Tac-Toe Grid
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Sleek 3×3 tactical duel with instant win detection, match score counters, and smart AI!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Grid Duel</span> →
                  </div>
                </div>

                {/* 2. Ink War */}
                <div 
                  onClick={() => {
                    setActiveGame("ink_war");
                    startInkWarGame();
                  }}
                  className="bg-white border border-slate-200/90 hover:border-violet-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Swords size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50/80 px-2 py-0.5 rounded-md">
                        30s Battle
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                        ⚔️ Ink War: Territory Clash
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Fast-paced 30s paint battle. Claim the canvas with your ink color and watch live territory %!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Territory War</span> →
                  </div>
                </div>

                {/* 3. Speed Pictionary */}
                <div 
                  onClick={() => {
                    setActiveGame("pictionary");
                    startPictionaryGame();
                  }}
                  className="bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Sparkles size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded-md">
                        Guess & Sketch
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        🎨 Speed Pictionary Rush
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        One sketches against a 45s clock, the other guesses! Letter hints reveal as time ticks.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Pictionary</span> →
                  </div>
                </div>

                {/* 4. Blindfold Draw */}
                <div 
                  onClick={() => {
                    setActiveGame("blind_draw");
                    startBlindDrawGame();
                  }}
                  className="bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group text-left active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <EyeOff size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50/80 px-2 py-0.5 rounded-md">
                        Muscle Memory
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                        🙈 Blindfold Sketch Battle
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Draw the mystery prompt while your canvas is masked! At 0s, the blindfold drops for reveal & vote!
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Blindfold Draw</span> →
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* 1. TIC-TAC-TOE ACTIVE VIEW                 */}
          {/* ------------------------------------------ */}
          {activeGame === "tictactoe" && (
            <div className="flex flex-col items-center max-w-sm mx-auto space-y-4">
              {/* Scoreboard */}
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
                    {gameMode === "ai_rival" ? "AI (O)" : "Player 2 (O)"}
                  </div>
                  <div className="text-lg font-black text-slate-900">{ttt.p2Wins}</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="text-xs font-bold text-slate-600">
                {ttt.status === "playing" ? (
                  <span>
                    Current Turn:{" "}
                    <span className={ttt.currentTurn === "p1" ? "text-violet-600 font-black" : "text-emerald-600 font-black"}>
                      {ttt.currentTurn === "p1" ? "Player 1 (X)" : (gameMode === "ai_rival" ? "AI Rival (O)" : "Player 2 (O)")}
                    </span>
                  </span>
                ) : ttt.winnerId === "draw" ? (
                  <span className="text-slate-600 font-black">🤝 It's a Tie! Well Played!</span>
                ) : (
                  <span className="text-emerald-600 font-black">
                    🏆 {ttt.winnerId === "p1" ? "Player 1 (X)" : (gameMode === "ai_rival" ? "AI Rival" : "Player 2 (O)")} Wins!
                  </span>
                )}
              </div>

              {/* 3x3 Minimalist Grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-200/80 p-2.5 rounded-2xl shadow-inner w-64 h-64 sm:w-72 sm:h-72">
                {ttt.board.map((cell, idx) => {
                  const isWinningCell = ttt.winningLine?.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleTttClick(idx)}
                      disabled={cell !== null || ttt.status !== "playing"}
                      className={`rounded-xl font-black text-3xl sm:text-4xl flex items-center justify-center transition-all shadow-xs ${
                        isWinningCell
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={restartTttRound}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <RotateCcw size={13} /> {ttt.status === "finished" ? "Next Round" : "Reset Board"}
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* 2. INK WAR ACTIVE VIEW                     */}
          {/* ------------------------------------------ */}
          {activeGame === "ink_war" && (
            <div className="space-y-3">
              {/* Top Territory Bar */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-violet-600 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                    P1 (Violet): {inkWar.player1Coverage}%
                  </span>
                  
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    <Clock size={12} />
                    <span>{inkWar.timeLeft}s</span>
                  </div>

                  <span className="text-emerald-600 flex items-center gap-1">
                    P2 (Emerald): {inkWar.player2Coverage}%
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </span>
                </div>

                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-violet-600 transition-all duration-300" 
                    style={{ width: `${inkWar.player1Coverage}%` }} 
                  />
                  <div 
                    className="bg-emerald-500 transition-all duration-300" 
                    style={{ width: `${inkWar.player2Coverage}%` }} 
                  />
                </div>
              </div>

              {/* Status or Result Banner */}
              {inkWar.status === "finished" && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-xs font-bold flex items-center justify-between">
                  <span>
                    🏆 {inkWar.winnerId === "p1" ? "Player 1 (Violet) Claims the Territory!" : inkWar.winnerId === "p2" ? "Player 2 (Emerald) Wins the Clash!" : "🤝 Incredible Draw!"}
                  </span>
                  <button
                    onClick={startInkWarGame}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                  >
                    Play Again
                  </button>
                </div>
              )}

              {/* Canvas Area */}
              <div className="w-full h-72 sm:h-80 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs relative bg-white">
                <MiniCanvas
                  color={brushColor}
                  size={brushSize}
                  isEraser={isEraser}
                  p1Color="#7C3AED"
                  p2Color="#10B981"
                  clearTrigger={clearCount}
                  disabled={inkWar.status === "finished"}
                  onCoverageSample={(sample) => {
                    setInkWar(prev => ({
                      ...prev,
                      player1Coverage: sample.p1,
                      player2Coverage: sample.p2
                    }));
                  }}
                />
              </div>

              {/* Minimalist Drawing Controls */}
              <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-2.5 text-xs font-bold">
                {/* Color Selector */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setBrushColor("#7C3AED");
                      setIsEraser(false);
                    }}
                    className={`w-7 h-7 rounded-lg bg-violet-600 transition-all flex items-center justify-center ${
                      brushColor === "#7C3AED" && !isEraser ? "ring-2 ring-violet-400 ring-offset-2 scale-105" : "opacity-80"
                    }`}
                    title="Violet (P1)"
                  />
                  <button
                    onClick={() => {
                      setBrushColor("#10B981");
                      setIsEraser(false);
                    }}
                    className={`w-7 h-7 rounded-lg bg-emerald-500 transition-all flex items-center justify-center ${
                      brushColor === "#10B981" && !isEraser ? "ring-2 ring-emerald-400 ring-offset-2 scale-105" : "opacity-80"
                    }`}
                    title="Emerald (P2)"
                  />
                  <button
                    onClick={() => setIsEraser(!isEraser)}
                    className={`px-2 py-1 rounded-lg border text-slate-600 flex items-center gap-1 ${
                      isEraser ? "bg-slate-200 border-slate-400 font-black" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Eraser size={13} /> Eraser
                  </button>
                </div>

                {/* Size Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  {[6, 12, 22].map((s) => (
                    <button
                      key={s}
                      onClick={() => setBrushSize(s)}
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        brushSize === s ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-500"
                      }`}
                    >
                      {s === 6 ? "S" : s === 12 ? "M" : "L"}
                    </button>
                  ))}
                </div>

                {/* Clear Button */}
                <button
                  onClick={() => setClearCount(c => c + 1)}
                  className="px-2.5 py-1 text-slate-500 hover:text-rose-600 flex items-center gap-1 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Clear canvas"
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* 3. SPEED PICTIONARY ACTIVE VIEW            */}
          {/* ------------------------------------------ */}
          {activeGame === "pictionary" && (
            <div className="space-y-3">
              {/* Header Info */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-black">Round {pictionary.round} / 4</span>
                  <div className="text-slate-900 font-black">
                    {pictionary.drawerId === "p1" ? "Player 1 is Drawing" : (gameMode === "ai_rival" ? "AI Rival is Drawing" : "Player 2 is Drawing")}
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                  <Clock size={12} />
                  <span>{pictionary.timeLeft}s</span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-black">Scores</span>
                  <div className="text-slate-900 font-mono font-black">
                    P1: {p1Score} | P2: {p2Score}
                  </div>
                </div>
              </div>

              {/* Secret Word Prompt banner for drawer */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Secret Prompt</span>
                <div className="text-base font-black text-emerald-950 font-['Fredoka',sans-serif]">
                  {pictionary.word} <span className="text-xs text-emerald-600 font-semibold font-sans">({pictionary.category})</span>
                </div>
                <div className="text-[11px] text-emerald-700/80 italic mt-0.5">
                  Hint: {pictionary.hints[0]}
                </div>
              </div>

              {/* Canvas Area */}
              <div className="w-full h-64 sm:h-72 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white relative">
                <MiniCanvas
                  color={brushColor}
                  size={brushSize}
                  isEraser={isEraser}
                  clearTrigger={clearCount}
                  disabled={pictionary.status !== "drawing"}
                />
              </div>

              {/* Guess Input Bar */}
              {pictionary.status === "drawing" ? (
                <form onSubmit={handlePictionaryGuessSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={pictionaryGuess}
                    onChange={(e) => setPictionaryGuess(e.target.value)}
                    placeholder="Type your guess here..."
                    className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 transition-all uppercase placeholder:normal-case shadow-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <Send size={13} /> Guess
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearCount(c => c + 1)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200 bg-white"
                    title="Clear"
                  >
                    <Trash2 size={15} />
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>
                    🎉 Round Over! Word was: <strong className="font-black">{pictionary.word}</strong>
                  </span>
                  <button
                    onClick={nextPictionaryRound}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-xs"
                  >
                    Next Round →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* 4. BLINDFOLD DRAW ACTIVE VIEW              */}
          {/* ------------------------------------------ */}
          {activeGame === "blind_draw" && (
            <div className="space-y-3">
              {/* Prompt Header */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="text-amber-600 text-[10px] uppercase font-black flex items-center gap-1">
                    <EyeOff size={12} /> Blindfold Challenge
                  </span>
                  <div className="text-slate-900 font-black text-sm">
                    {blindDraw.prompt}
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                  <Clock size={12} />
                  <span>{blindDraw.timeLeft}s</span>
                </div>
              </div>

              {/* Canvas Area with Blindfold Blur when drawing */}
              <div className="w-full h-72 sm:h-80 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white relative">
                <MiniCanvas
                  color={brushColor}
                  size={brushSize}
                  isEraser={isEraser}
                  clearTrigger={clearCount}
                  disabled={blindDraw.status === "reveal"}
                />

                {/* Blindfold Curtain */}
                {blindDraw.status === "drawing" && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-none select-none">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-2 animate-pulse">
                      <EyeOff size={24} className="text-amber-400" />
                    </div>
                    <div className="text-sm font-black tracking-wide">
                      🙈 Blindfold Active
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Draw with pure muscle memory! The curtain drops at 0s!
                    </p>
                  </div>
                )}
              </div>

              {/* Voting / Controls Area */}
              {blindDraw.status === "reveal" ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2 text-center">
                  <div className="text-xs font-bold text-slate-600">
                    ✨ Blindfold Lifted! Who drew the best masterpiece?
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setHasVoted(true)}
                      disabled={hasVoted}
                      className="px-3.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-xs rounded-xl border border-violet-200 transition-all disabled:opacity-50"
                    >
                      Vote Player 1
                    </button>
                    <button
                      onClick={() => setHasVoted(true)}
                      disabled={hasVoted}
                      className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all disabled:opacity-50"
                    >
                      Vote {gameMode === "ai_rival" ? "AI Rival" : "Player 2"}
                    </button>
                    <button
                      onClick={startBlindDrawGame}
                      className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all ml-2"
                    >
                      New Prompt ↺
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-2.5 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setClearCount(c => c + 1)}
                      className="px-2.5 py-1 text-slate-500 hover:text-rose-600 flex items-center gap-1 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} /> Reset Sketch
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Draw your stroke freely on the canvas
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
