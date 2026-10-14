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
  HelpCircle,
  Flame,
  ArrowRight
} from "lucide-react";
import { GameType, DuoGameState, GameParticipant } from "./types";

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

  playTone(freq: number, duration: number, type: OscillatorType = "sine", gainVal: number = 0.15) {
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
    this.playTone(600, 0.08, "triangle", 0.08);
  }

  start() {
    this.playTone(440, 0.1, "sine", 0.15);
    setTimeout(() => this.playTone(880, 0.25, "sine", 0.2), 100);
  }

  correct() {
    this.playTone(523.25, 0.1, "sine", 0.2); // C5
    setTimeout(() => this.playTone(659.25, 0.1, "sine", 0.2), 90); // E5
    setTimeout(() => this.playTone(783.99, 0.22, "sine", 0.25), 180); // G5
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.28, "triangle", 0.25), i * 110);
    });
  }

  move() {
    this.playTone(380, 0.06, "sine", 0.1);
  }

  clash() {
    this.playTone(220, 0.15, "sawtooth", 0.1);
  }
}

export const soundFX = new SoundFX();

// ==========================================
// PICTIONARY WORD BANK
// ==========================================
export const PICTIONARY_WORDS = [
  { word: "PIZZA", category: "Food", hint: "Cheesy slice" },
  { word: "CAT", category: "Animals", hint: "Furry pet with whiskers" },
  { word: "ROCKET", category: "Space", hint: "Shoots into the stars" },
  { word: "SUNGLASSES", category: "Accessories", hint: "Worn on a sunny day" },
  { word: "BURGER", category: "Food", hint: "Bun, patty, lettuce" },
  { word: "GIRAFFE", category: "Animals", hint: "Has a very long neck" },
  { word: "GUITAR", category: "Music", hint: "Instrument with 6 strings" },
  { word: "VOLCANO", category: "Nature", hint: "Erupts with hot lava" },
  { word: "ROBOT", category: "Sci-Fi", hint: "Mechanical electronic friend" },
  { word: "CANDLE", category: "Objects", hint: "Flickering flame on wax" },
  { word: "AIRPLANE", category: "Vehicles", hint: "Flies with wings" },
  { word: "ELEPHANT", category: "Animals", hint: "Has a long trunk" },
  { word: "ICE CREAM", category: "Food", hint: "Cold dessert on a cone" },
  { word: "RAINBOW", category: "Nature", hint: "Colors after the rain" },
  { word: "CASTLE", category: "Buildings", hint: "Towers and drawbridges" },
  { word: "PENGUIN", category: "Animals", hint: "Waddles on ice in tuxedo" },
  { word: "DIAMOND", category: "Items", hint: "Sparkling precious gem" },
  { word: "CAMPFIRE", category: "Outdoors", hint: "Roasting marshmallows" },
  { word: "TREASURE", category: "Adventure", hint: "Gold inside a chest" },
  { word: "HELICOPTER", category: "Vehicles", hint: "Spinning blades on top" },
  { word: "BUTTERFLY", category: "Animals", hint: "Colorful fluttering wings" },
  { word: "SUBMARINE", category: "Vehicles", hint: "Explores deep oceans" },
  { word: "MICROPHONE", category: "Music", hint: "Amplifies singing voice" },
  { word: "DONUT", category: "Food", hint: "Sweet ring with glaze" },
  { word: "SUNFLOWER", category: "Nature", hint: "Tall yellow bloom" },
  { word: "BICYCLE", category: "Vehicles", hint: "Two wheels & pedals" }
];

export const BLIND_DRAW_PROMPTS = [
  "Draw a smiling dinosaur wearing a party hat",
  "Draw a cat riding a skateboard",
  "Draw an alien eating a slice of pizza",
  "Draw a snowman on the beach",
  "Draw a dancing octopus with shoes",
  "Draw an astronaut walking a dog on the moon",
  "Draw a bird flying an airplane",
  "Draw a birthday cake with 10 candles"
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

    const colors = ["#7C3AED", "#C8F53A", "#EC4899", "#3B82F6", "#F59E0B", "#10B981"];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 300,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 6,
      size: Math.random() * 9 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.38,
      opacity: 1
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, p.opacity - 0.007);

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }
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
// MAIN DUO GAMES ARENA COMPONENT
// ==========================================
interface DuoGamesProps {
  socket: any;
  roomId: string;
  currentUserId: string;
  username: string;
  users: Record<string, any>;
  isOpen: boolean;
  onClose: () => void;
  onClearCanvas: () => void;
  onSelectColor: (color: string) => void;
  onSelectSize: (size: number) => void;
  onSelectTool: (tool: any) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function DuoGamesArena({
  socket,
  roomId,
  currentUserId,
  username,
  users,
  isOpen,
  onClose,
  onClearCanvas,
  onSelectColor,
  onSelectSize,
  onSelectTool,
  canvasRef
}: DuoGamesProps) {
  // Master Game State
  const [gameState, setGameState] = useState<DuoGameState>({
    activeGame: null,
    player1: null,
    player2: null
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [guessInput, setGuessInput] = useState("");
  const [isAloneWarning, setIsAloneWarning] = useState(false);
  const [passAndPlay, setPassAndPlay] = useState(false);
  const [blindfoldActive, setBlindfoldActive] = useState(false);

  // Sync sound settings
  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  // Determine Players
  const userList = Object.values(users || {});
  const otherUsers = userList.filter((u: any) => u.id !== currentUserId);
  const isSolo = otherUsers.length === 0;

  // Socket sync listeners
  useEffect(() => {
    if (!socket) return;

    const handleAction = (data: { action: string; payload: any; senderId: string }) => {
      if (data.senderId === socket.id) return;

      switch (data.action) {
        case "start_game":
          setGameState(data.payload);
          soundFX.start();
          break;
        case "update_game":
          setGameState(data.payload);
          break;
        case "tictactoe_move":
          soundFX.move();
          setGameState(prev => {
            if (!prev.ticTacToe) return prev;
            return {
              ...prev,
              ticTacToe: {
                ...prev.ticTacToe,
                board: data.payload.board,
                currentTurn: data.payload.currentTurn,
                winningLine: data.payload.winningLine,
                status: data.payload.status,
                winnerId: data.payload.winnerId,
                p1Wins: data.payload.p1Wins,
                p2Wins: data.payload.p2Wins,
                draws: data.payload.draws
              }
            };
          });
          if (data.payload.status === "finished") {
            soundFX.win();
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
          }
          break;
        case "pictionary_guess_correct":
          soundFX.correct();
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
          setGameState(data.payload);
          break;
        case "ink_war_finish":
          soundFX.win();
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
          setGameState(data.payload);
          break;
        case "blind_vote":
          setGameState(data.payload);
          break;
        case "exit_game":
          setGameState({ activeGame: null, player1: null, player2: null });
          break;
        default:
          break;
      }
    };

    const handleSync = (data: { gameState: DuoGameState; senderId: string }) => {
      if (data.senderId === socket.id) return;
      if (data.gameState) setGameState(data.gameState);
    };

    socket.on("duo-game-action", handleAction);
    socket.on("duo-game-sync", handleSync);

    return () => {
      socket.off("duo-game-action", handleAction);
      socket.off("duo-game-sync", handleSync);
    };
  }, [socket]);

  // Broadcast helper
  const emitGameAction = useCallback((action: string, payload: any) => {
    if (!socket || !roomId) return;
    socket.emit("duo-game-action", { roomId, action, payload });
  }, [socket, roomId]);

  // ==========================================
  // INK WAR LIVE CANVAS COVERAGE SCANNER
  // ==========================================
  useEffect(() => {
    if (gameState.activeGame !== "ink_war" || gameState.inkWar?.status !== "battling") return;

    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        const w = canvas.width;
        const h = canvas.height;
        // Sample 1200 random points across the canvas for 60fps lightweight estimation
        const sampleCount = 800;
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
            // Check for Purple/Indigo (#7C3AED / Violet)
            if (r > 90 && b > 140 && g < 120) {
              p1Count++;
            }
            // Check for Lime/Emerald (#10B981 / #84CC16)
            else if (g > 130 && r < 140) {
              p2Count++;
            }
          }
        }

        const totalMarked = p1Count + p2Count;
        let p1Cov = 50;
        let p2Cov = 50;
        if (totalMarked > 5) {
          p1Cov = Math.round((p1Count / totalMarked) * 100);
          p2Cov = 100 - p1Cov;
        }

        setGameState(prev => {
          if (!prev.inkWar || prev.inkWar.status !== "battling") return prev;
          return {
            ...prev,
            inkWar: {
              ...prev.inkWar,
              player1Coverage: p1Cov,
              player2Coverage: p2Cov
            }
          };
        });
      } catch {}
    }, 800);

    return () => clearInterval(interval);
  }, [gameState.activeGame, gameState.inkWar?.status, canvasRef]);

  // ==========================================
  // GAME COUNTDOWN & TIMERS
  // ==========================================
  useEffect(() => {
    if (!gameState.activeGame) return;

    // Ink War Timer
    if (gameState.activeGame === "ink_war" && gameState.inkWar?.status === "battling") {
      const timer = setInterval(() => {
        setGameState(prev => {
          if (!prev.inkWar || prev.inkWar.status !== "battling") return prev;
          const nextTime = prev.inkWar.timeLeft - 1;
          if (nextTime <= 5 && nextTime > 0) soundFX.tick();

          if (nextTime <= 0) {
            const p1Won = prev.inkWar.player1Coverage > prev.inkWar.player2Coverage;
            const isDraw = prev.inkWar.player1Coverage === prev.inkWar.player2Coverage;
            const winner = isDraw ? "draw" : p1Won ? prev.player1?.id : prev.player2?.id;

            soundFX.win();
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);

            const updated: DuoGameState = {
              ...prev,
              player1: prev.player1 ? { ...prev.player1, score: prev.player1.score + (p1Won ? 1 : 0) } : null,
              player2: prev.player2 ? { ...prev.player2, score: prev.player2.score + (!p1Won && !isDraw ? 1 : 0) } : null,
              inkWar: {
                ...prev.inkWar,
                timeLeft: 0,
                status: "finished",
                winnerId: winner
              }
            };
            emitGameAction("ink_war_finish", updated);
            return updated;
          }

          return {
            ...prev,
            inkWar: { ...prev.inkWar, timeLeft: nextTime }
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    // Pictionary Timer
    if (gameState.activeGame === "pictionary" && gameState.pictionary?.status === "drawing") {
      const timer = setInterval(() => {
        setGameState(prev => {
          if (!prev.pictionary || prev.pictionary.status !== "drawing") return prev;
          const nextTime = prev.pictionary.timeLeft - 1;
          if (nextTime <= 5 && nextTime > 0) soundFX.tick();

          if (nextTime <= 0) {
            soundFX.playTone(200, 0.4, "sawtooth", 0.2); // Time's up buzzer
            const updated: DuoGameState = {
              ...prev,
              pictionary: {
                ...prev.pictionary,
                timeLeft: 0,
                status: "round_end"
              }
            };
            emitGameAction("update_game", updated);
            return updated;
          }

          return {
            ...prev,
            pictionary: { ...prev.pictionary, timeLeft: nextTime }
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    // Blind Draw Timer
    if (gameState.activeGame === "blind_draw" && gameState.blindDraw?.status === "drawing") {
      const timer = setInterval(() => {
        setGameState(prev => {
          if (!prev.blindDraw || prev.blindDraw.status !== "drawing") return prev;
          const nextTime = prev.blindDraw.timeLeft - 1;
          if (nextTime <= 5 && nextTime > 0) soundFX.tick();

          if (nextTime <= 0) {
            soundFX.win();
            setBlindfoldActive(false);
            const updated: DuoGameState = {
              ...prev,
              blindDraw: {
                ...prev.blindDraw,
                timeLeft: 0,
                status: "reveal"
              }
            };
            emitGameAction("update_game", updated);
            return updated;
          }

          return {
            ...prev,
            blindDraw: { ...prev.blindDraw, timeLeft: nextTime }
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.activeGame, gameState.inkWar?.status, gameState.pictionary?.status, gameState.blindDraw?.status, emitGameAction]);

  // ==========================================
  // START GAME CONTROLLERS
  // ==========================================
  const startPictionary = () => {
    const p1: GameParticipant = {
      id: currentUserId,
      username: username || "Player 1",
      color: "#7C3AED",
      score: 0
    };
    const otherUser = otherUsers[0];
    const p2: GameParticipant = {
      id: otherUser ? otherUser.id : "bot-rival",
      username: otherUser ? otherUser.username : (passAndPlay ? "Player 2" : "AI Rival"),
      color: "#10B981",
      score: 0
    };

    const wordItem = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
    onClearCanvas();
    onSelectTool("brush");
    onSelectSize(8);
    onSelectColor("#7C3AED");

    const newGameState: DuoGameState = {
      activeGame: "pictionary",
      player1: p1,
      player2: p2,
      pictionary: {
        word: wordItem.word,
        category: wordItem.category,
        drawerId: p1.id,
        round: 1,
        totalRounds: 4,
        timeLeft: 45,
        status: "drawing",
        hints: [wordItem.hint]
      }
    };

    soundFX.start();
    setGameState(newGameState);
    emitGameAction("start_game", newGameState);
    onClose();
  };

  const startInkWar = () => {
    const p1: GameParticipant = {
      id: currentUserId,
      username: username || "Player 1",
      color: "#7C3AED",
      score: 0
    };
    const otherUser = otherUsers[0];
    const p2: GameParticipant = {
      id: otherUser ? otherUser.id : "bot-rival",
      username: otherUser ? otherUser.username : (passAndPlay ? "Player 2" : "Neon Bot"),
      color: "#10B981",
      score: 0
    };

    onClearCanvas();
    // Default P1 to Violet, P2 to Emerald
    onSelectTool("brush");
    onSelectSize(32); // Thick battle brush!
    onSelectColor("#7C3AED");

    const newGameState: DuoGameState = {
      activeGame: "ink_war",
      player1: p1,
      player2: p2,
      inkWar: {
        timeLeft: 30,
        player1Coverage: 50,
        player2Coverage: 50,
        status: "battling"
      }
    };

    soundFX.start();
    setGameState(newGameState);
    emitGameAction("start_game", newGameState);
    onClose();
  };

  const startTicTacToe = () => {
    const p1: GameParticipant = {
      id: currentUserId,
      username: username || "Player 1",
      color: "#7C3AED",
      score: 0
    };
    const otherUser = otherUsers[0];
    const p2: GameParticipant = {
      id: otherUser ? otherUser.id : "bot-rival",
      username: otherUser ? otherUser.username : (passAndPlay ? "Player 2" : "Smart Bot"),
      color: "#10B981",
      score: 0
    };

    const newGameState: DuoGameState = {
      activeGame: "tictactoe",
      player1: p1,
      player2: p2,
      ticTacToe: {
        board: Array(9).fill(null),
        currentTurn: "p1",
        winningLine: null,
        status: "playing",
        p1Wins: 0,
        p2Wins: 0,
        draws: 0
      }
    };

    soundFX.start();
    setGameState(newGameState);
    emitGameAction("start_game", newGameState);
    onClose();
  };

  const startBlindDraw = () => {
    const p1: GameParticipant = {
      id: currentUserId,
      username: username || "Player 1",
      color: "#7C3AED",
      score: 0
    };
    const otherUser = otherUsers[0];
    const p2: GameParticipant = {
      id: otherUser ? otherUser.id : "bot-rival",
      username: otherUser ? otherUser.username : (passAndPlay ? "Player 2" : "AI Rival"),
      color: "#10B981",
      score: 0
    };

    const prompt = BLIND_DRAW_PROMPTS[Math.floor(Math.random() * BLIND_DRAW_PROMPTS.length)];
    onClearCanvas();
    onSelectTool("brush");
    onSelectSize(6);
    onSelectColor("#1E293B");
    setBlindfoldActive(true);

    const newGameState: DuoGameState = {
      activeGame: "blind_draw",
      player1: p1,
      player2: p2,
      blindDraw: {
        prompt,
        timeLeft: 30,
        status: "drawing",
        votes: {}
      }
    };

    soundFX.start();
    setGameState(newGameState);
    emitGameAction("start_game", newGameState);
    onClose();
  };

  // ==========================================
  // IN-GAME ACTIONS & GUESSING
  // ==========================================
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || !gameState.pictionary) return;

    const guess = guessInput.trim().toUpperCase();
    const targetWord = gameState.pictionary.word.toUpperCase();
    setGuessInput("");

    if (guess === targetWord) {
      soundFX.correct();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      const points = Math.max(10, gameState.pictionary.timeLeft * 2);
      const isP1Guesser = gameState.pictionary.drawerId !== gameState.player1?.id;

      const updated: DuoGameState = {
        ...gameState,
        player1: gameState.player1
          ? { ...gameState.player1, score: gameState.player1.score + (isP1Guesser ? points : 10) }
          : null,
        player2: gameState.player2
          ? { ...gameState.player2, score: gameState.player2.score + (!isP1Guesser ? points : 10) }
          : null,
        pictionary: {
          ...gameState.pictionary,
          status: "round_end",
          lastGuesserName: username || "Guesser"
        }
      };

      setGameState(updated);
      emitGameAction("pictionary_guess_correct", updated);
    } else {
      soundFX.playTone(260, 0.08, "square", 0.1); // soft buzz
    }
  };

  const nextPictionaryRound = () => {
    if (!gameState.pictionary) return;
    onClearCanvas();
    const nextRound = gameState.pictionary.round + 1;
    const isNewDrawerP2 = gameState.pictionary.drawerId === gameState.player1?.id;
    const nextDrawerId = isNewDrawerP2 ? (gameState.player2?.id || "p2") : (gameState.player1?.id || "p1");

    const wordItem = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];

    const updated: DuoGameState = {
      ...gameState,
      pictionary: {
        ...gameState.pictionary,
        round: nextRound,
        word: wordItem.word,
        category: wordItem.category,
        drawerId: nextDrawerId,
        timeLeft: 45,
        status: nextRound > gameState.pictionary.totalRounds ? "game_over" : "drawing",
        hints: [wordItem.hint],
        lastGuesserName: undefined
      }
    };

    soundFX.start();
    setGameState(updated);
    emitGameAction("update_game", updated);
  };

  // Tic-Tac-Toe Move
  const handleTicTacToeCellClick = (index: number) => {
    if (!gameState.ticTacToe || gameState.ticTacToe.status !== "playing") return;
    if (gameState.ticTacToe.board[index] !== null) return;

    const currentTurn = gameState.ticTacToe.currentTurn; // "p1" or "p2"
    const isP1 = currentTurn === "p1";
    const mark = isP1 ? "X" : "O";

    const newBoard = [...gameState.ticTacToe.board];
    newBoard[index] = mark;

    // Check winner
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    let winningLine: number[] | null = null;
    for (const line of lines) {
      const [a, b, c] = line;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winningLine = line;
        break;
      }
    }

    soundFX.move();

    if (winningLine) {
      soundFX.win();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);

      const p1Won = mark === "X";
      const updated: DuoGameState = {
        ...gameState,
        ticTacToe: {
          ...gameState.ticTacToe,
          board: newBoard,
          winningLine,
          status: "finished",
          winnerId: p1Won ? gameState.player1?.id : gameState.player2?.id,
          p1Wins: gameState.ticTacToe.p1Wins + (p1Won ? 1 : 0),
          p2Wins: gameState.ticTacToe.p2Wins + (!p1Won ? 1 : 0)
        }
      };
      setGameState(updated);
      emitGameAction("tictactoe_move", updated.ticTacToe);
    } else if (newBoard.every(cell => cell !== null)) {
      // Draw
      soundFX.clash();
      const updated: DuoGameState = {
        ...gameState,
        ticTacToe: {
          ...gameState.ticTacToe,
          board: newBoard,
          winningLine: null,
          status: "finished",
          winnerId: "draw",
          draws: gameState.ticTacToe.draws + 1
        }
      };
      setGameState(updated);
      emitGameAction("tictactoe_move", updated.ticTacToe);
    } else {
      const nextTurn = isP1 ? "p2" : "p1";
      const updated: DuoGameState = {
        ...gameState,
        ticTacToe: {
          ...gameState.ticTacToe,
          board: newBoard,
          currentTurn: nextTurn
        }
      };
      setGameState(updated);
      emitGameAction("tictactoe_move", updated.ticTacToe);

      // AI Rival Move if playing alone and not pass & play
      if (isSolo && !passAndPlay && nextTurn === "p2") {
        setTimeout(() => {
          const availableIndices = newBoard.map((val, idx) => (val === null ? idx : null)).filter(val => val !== null) as number[];
          if (availableIndices.length > 0) {
            const randomPick = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            handleTicTacToeCellClick(randomPick);
          }
        }, 600);
      }
    }
  };

  const restartTicTacToeRound = () => {
    if (!gameState.ticTacToe) return;
    const updated: DuoGameState = {
      ...gameState,
      ticTacToe: {
        ...gameState.ticTacToe,
        board: Array(9).fill(null),
        winningLine: null,
        status: "playing",
        currentTurn: "p1",
        winnerId: undefined
      }
    };
    soundFX.start();
    setGameState(updated);
    emitGameAction("tictactoe_move", updated.ticTacToe);
  };

  // Exit Active Game
  const exitGame = () => {
    setBlindfoldActive(false);
    setGameState({ activeGame: null, player1: null, player2: null });
    emitGameAction("exit_game", {});
  };

  return (
    <>
      <ConfettiCanvas active={showConfetti} />

      {/* ========================================================= */}
      {/* 1. ACTIVE GAME HUD (FLOATING IN THE CANVAS) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {gameState.activeGame && (
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.95 }}
            className="fixed top-14 xs:top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-2 pointer-events-none select-none"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl sm:rounded-3xl p-2.5 xs:p-3 sm:p-4 shadow-2xl pointer-events-auto ring-1 ring-white/10 flex flex-col gap-2">
              
              {/* Top Row: Game Name, Timer, Audio & Exit */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 xs:gap-2">
                  <div className="p-1 xs:p-1.5 rounded-lg bg-violet-600/30 text-violet-400 border border-violet-500/30">
                    <Swords size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black tracking-tight flex items-center gap-1">
                      {gameState.activeGame === "pictionary" && "Speed Pictionary"}
                      {gameState.activeGame === "ink_war" && "Ink War Arena"}
                      {gameState.activeGame === "tictactoe" && "Neon Tic-Tac-Toe"}
                      {gameState.activeGame === "blind_draw" && "Blindfold Sketch"}
                      <span className="text-[9px] uppercase font-bold text-lime-400 bg-lime-400/10 px-1.5 py-0.5 rounded ml-1">Duo</span>
                    </h4>
                  </div>
                </div>

                {/* Score Pill */}
                <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
                  <span className="text-violet-400">{gameState.player1?.username || "P1"}: {gameState.player1?.score || 0}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-emerald-400">{gameState.player2?.username || "P2"}: {gameState.player2?.score || 0}</span>
                </div>

                {/* Utility Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                  >
                    {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  </button>
                  <button
                    onClick={exitGame}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40 transition-colors"
                    title="Exit game"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* PICTIONARY SPECIFIC HUD */}
              {/* ========================================================= */}
              {gameState.activeGame === "pictionary" && gameState.pictionary && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-semibold">Round {gameState.pictionary.round}/{gameState.pictionary.totalRounds}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="text-violet-300 font-bold">{gameState.pictionary.category}</span>
                    </div>

                    {/* Clock */}
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                      <Clock size={12} />
                      <span>{gameState.pictionary.timeLeft}s</span>
                    </div>
                  </div>

                  {/* Drawer View vs Guesser View */}
                  {gameState.pictionary.drawerId === currentUserId ? (
                    <div className="bg-violet-950/40 border border-violet-500/30 rounded-xl p-2 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">Your Secret Word</span>
                        <p className="text-sm sm:text-base font-black text-white tracking-widest uppercase">
                          {gameState.pictionary.word}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 italic hidden xs:inline">Draw this on canvas!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <span className="text-xs text-slate-300">
                          Guess the word: <span className="font-mono tracking-widest text-lime-400 font-bold">{gameState.pictionary.word.replace(/[A-Z0-9]/g, "_ ")}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 italic">Hint: {gameState.pictionary.hints[0]}</span>
                      </div>

                      <form onSubmit={handleGuessSubmit} className="flex gap-1.5">
                        <input
                          type="text"
                          value={guessInput}
                          onChange={e => setGuessInput(e.target.value)}
                          placeholder="Type your guess here..."
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        />
                        <button
                          type="submit"
                          className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                        >
                          <Send size={12} />
                          <span>Guess</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Round End Overlay inside HUD */}
                  {gameState.pictionary.status === "round_end" && (
                    <div className="flex items-center justify-between bg-emerald-950/50 border border-emerald-500/40 p-2 rounded-xl">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">Round Complete!</span>
                        <p className="text-xs font-bold text-white">
                          The word was: <span className="text-lime-300 uppercase">{gameState.pictionary.word}</span>
                          {gameState.pictionary.lastGuesserName && ` (Guessed by ${gameState.pictionary.lastGuesserName})`}
                        </p>
                      </div>
                      <button
                        onClick={nextPictionaryRound}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span>Next Round</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* INK WAR SPECIFIC HUD */}
              {/* ========================================================= */}
              {gameState.activeGame === "ink_war" && gameState.inkWar && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <Flame size={13} className="text-amber-400" /> Paint & Claim Territory!
                    </span>
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                      <Clock size={12} />
                      <span>{gameState.inkWar.timeLeft}s</span>
                    </div>
                  </div>

                  {/* Territory Meter */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                      <span className="text-violet-400">{gameState.player1?.username || "P1"}: {gameState.inkWar.player1Coverage}%</span>
                      <span className="text-emerald-400">{gameState.player2?.username || "P2"}: {gameState.inkWar.player2Coverage}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex ring-1 ring-slate-700">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-600 to-purple-500 transition-all duration-300" 
                        style={{ width: `${gameState.inkWar.player1Coverage}%` }}
                      />
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-300" 
                        style={{ width: `${gameState.inkWar.player2Coverage}%` }}
                      />
                    </div>
                  </div>

                  {gameState.inkWar.status === "finished" && (
                    <div className="flex items-center justify-between bg-violet-950/60 border border-violet-500/40 p-2 rounded-xl mt-1">
                      <span className="text-xs font-bold text-lime-300">
                        {gameState.inkWar.winnerId === "draw" 
                          ? "🤝 Intense Draw! Match Tied!" 
                          : `🏆 ${gameState.inkWar.winnerId === gameState.player1?.id ? gameState.player1?.username : gameState.player2?.username} Wins the Clash!`}
                      </span>
                      <button
                        onClick={startInkWar}
                        className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <RotateCcw size={12} /> Rematch
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TIC-TAC-TOE SPECIFIC HUD */}
              {/* ========================================================= */}
              {gameState.activeGame === "tictactoe" && gameState.ticTacToe && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-bold">
                        Turn: {gameState.ticTacToe.currentTurn === "p1" ? (
                          <span className="text-violet-400 font-black">{gameState.player1?.username || "P1"} (X)</span>
                        ) : (
                          <span className="text-emerald-400 font-black">{gameState.player2?.username || "P2"} (O)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400">
                      <span>W:{gameState.ticTacToe.p1Wins}</span>
                      <span>L:{gameState.ticTacToe.p2Wins}</span>
                      <span>D:{gameState.ticTacToe.draws}</span>
                    </div>
                  </div>

                  {gameState.ticTacToe.status === "finished" && (
                    <div className="flex items-center justify-between bg-emerald-950/50 border border-emerald-500/40 p-2 rounded-xl">
                      <span className="text-xs font-bold text-lime-300">
                        {gameState.ticTacToe.winnerId === "draw"
                          ? "🤝 Well Played! It's a Draw!"
                          : `🏆 ${gameState.ticTacToe.winnerId === gameState.player1?.id ? gameState.player1?.username : gameState.player2?.username} Claims Victory!`}
                      </span>
                      <button
                        onClick={restartTicTacToeRound}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <RotateCcw size={12} /> Play Again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* BLIND DRAW SPECIFIC HUD */}
              {/* ========================================================= */}
              {gameState.activeGame === "blind_draw" && gameState.blindDraw && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-violet-300 font-bold flex items-center gap-1">
                      <EyeOff size={13} className="text-amber-400" /> Blind Drawing Challenge
                    </span>
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                      <Clock size={12} />
                      <span>{gameState.blindDraw.timeLeft}s</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Challenge Prompt</span>
                    <p className="text-xs sm:text-sm font-black text-lime-300">
                      "{gameState.blindDraw.prompt}"
                    </p>
                  </div>

                  {gameState.blindDraw.status === "reveal" && (
                    <div className="flex items-center justify-between bg-violet-950/60 border border-violet-500/40 p-2 rounded-xl">
                      <span className="text-xs font-bold text-white">Blindfold Lifted! Vote for Best Sketch:</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            soundFX.correct();
                            setGameState(prev => ({
                              ...prev,
                              player1: prev.player1 ? { ...prev.player1, score: prev.player1.score + 1 } : null,
                              blindDraw: prev.blindDraw ? { ...prev.blindDraw, status: "finished", winnerId: prev.player1?.id } : undefined
                            }));
                          }}
                          className="bg-violet-600 hover:bg-violet-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                        >
                          P1
                        </button>
                        <button
                          onClick={() => {
                            soundFX.correct();
                            setGameState(prev => ({
                              ...prev,
                              player2: prev.player2 ? { ...prev.player2, score: prev.player2.score + 1 } : null,
                              blindDraw: prev.blindDraw ? { ...prev.blindDraw, status: "finished", winnerId: prev.player2?.id } : undefined
                            }));
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                        >
                          P2
                        </button>
                      </div>
                    </div>
                  )}

                  {gameState.blindDraw.status === "finished" && (
                    <div className="flex items-center justify-between bg-emerald-950/50 border border-emerald-500/40 p-2 rounded-xl">
                      <span className="text-xs font-bold text-lime-300">
                        🏆 Winner Crowned for Blind Sketch!
                      </span>
                      <button
                        onClick={startBlindDraw}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <RotateCcw size={12} /> Next Prompt
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 2. TIC-TAC-TOE INTERACTIVE ON-CANVAS BOARD */}
      {/* ========================================================= */}
      <AnimatePresence>
        {gameState.activeGame === "tictactoe" && gameState.ticTacToe && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none p-4"
          >
            <div className="w-[300px] h-[300px] xs:w-[340px] xs:h-[340px] sm:w-[380px] sm:h-[380px] bg-slate-900/90 backdrop-blur-2xl border-2 border-indigo-500/30 rounded-3xl p-3 sm:p-4 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.3)] pointer-events-auto grid grid-cols-3 gap-2.5 relative">
              {gameState.ticTacToe.board.map((cell, idx) => {
                const isWinningCell = gameState.ticTacToe?.winningLine?.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleTicTacToeCellClick(idx)}
                    disabled={cell !== null || gameState.ticTacToe?.status !== "playing"}
                    className={`h-full rounded-2xl border-2 flex items-center justify-center transition-all text-4xl sm:text-5xl font-black select-none ${
                      cell === "X"
                        ? "text-violet-400 bg-violet-950/40 border-violet-500/60 shadow-lg shadow-violet-500/20"
                        : cell === "O"
                        ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/20"
                        : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-indigo-400/50 cursor-pointer active:scale-95"
                    } ${isWinningCell ? "ring-4 ring-lime-400 animate-pulse bg-lime-950/40" : ""}`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 3. BLINDFOLD DRAWING MASK OVERLAY */}
      {/* ========================================================= */}
      <AnimatePresence>
        {gameState.activeGame === "blind_draw" && blindfoldActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center backdrop-blur-md bg-slate-950/30"
          >
            <div className="bg-slate-900/95 border border-slate-700 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-white animate-pulse">
              <EyeOff size={18} className="text-amber-400" />
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase">
                🙈 Blindfold Active: Trust Your Muscle Memory!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 4. DUO GAMES SELECTION ARENA MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#C8F53A] flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Gamepad2 className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-['Fredoka',sans-serif]">
                      Duo Competitive Arena
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Simple, fast, and competitive real-time canvas games
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Pass & Play or AI Mode Toggle if solo */}
                  {isSolo && (
                    <button
                      onClick={() => setPassAndPlay(!passAndPlay)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 ${
                        passAndPlay 
                          ? "bg-violet-50 border-violet-300 text-violet-700" 
                          : "bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                      title="Toggle 2-Player Pass & Play mode"
                    >
                      {passAndPlay ? <Users size={12} /> : <Bot size={12} />}
                      <span>{passAndPlay ? "Pass & Play" : "AI Rival Mode"}</span>
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Player Status Bar */}
              <div className="py-3 px-3.5 my-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-bold text-slate-700">Room Status:</span>
                  <span className="text-slate-500">
                    {userList.length} Connected {userList.length === 1 ? "(Invite a friend or play vs AI!)" : "(Ready for Duo Battle!)"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600">
                  <span>Room: #{roomId}</span>
                </div>
              </div>

              {/* Game Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto no-scrollbar py-2">
                
                {/* 1. INK WAR */}
                <div className="border-2 border-slate-200/80 hover:border-violet-500 rounded-2xl p-4 transition-all hover:shadow-lg bg-gradient-to-br from-white to-violet-50/30 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md">
                        <Flame size={17} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 bg-violet-100 px-2 py-0.5 rounded-md">
                        30s Battle
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-violet-700 transition-colors">
                      ⚔️ Ink War: Territory Painter
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      Both players furiously paint canvas territory. Live scanner calculates % control. Whoever dominates the board at 0s wins!
                    </p>
                  </div>
                  <button
                    onClick={startInkWar}
                    className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/20 transition-all"
                  >
                    <Play size={14} /> Start Paint Battle
                  </button>
                </div>

                {/* 2. SPEED PICTIONARY */}
                <div className="border-2 border-slate-200/80 hover:border-emerald-500 rounded-2xl p-4 transition-all hover:shadow-lg bg-gradient-to-br from-white to-emerald-50/30 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                        <Sparkles size={17} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Duo Guess
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                      🎨 Speed Pictionary Rush
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      One sketches the secret prompt, other guesses in real time. Faster guesses earn higher points! Roles swap each round!
                    </p>
                  </div>
                  <button
                    onClick={startPictionary}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Play size={14} /> Start Pictionary
                  </button>
                </div>

                {/* 3. NEON TIC-TAC-TOE */}
                <div className="border-2 border-slate-200/80 hover:border-indigo-500 rounded-2xl p-4 transition-all hover:shadow-lg bg-gradient-to-br from-white to-indigo-50/30 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Trophy size={17} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">
                        Tactical
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors">
                      ⭕ Neon Tic-Tac-Toe Grid
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      Holographic 3x3 canvas duel. Tap or draw your mark. Features automated line detection, live score series, and instant rematches!
                    </p>
                  </div>
                  <button
                    onClick={startTicTacToe}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
                  >
                    <Play size={14} /> Start Grid Duel
                  </button>
                </div>

                {/* 4. BLINDFOLD DRAW */}
                <div className="border-2 border-slate-200/80 hover:border-amber-500 rounded-2xl p-4 transition-all hover:shadow-lg bg-gradient-to-br from-white to-amber-50/30 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                        <EyeOff size={17} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
                        Hilarious
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                      🙈 Blindfold Sketch Battle
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      Both get the same prompt, but your own canvas is masked while drawing! At 0s, the blindfolds lift for a hilarious reveal & vote!
                    </p>
                  </div>
                  <button
                    onClick={startBlindDraw}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                  >
                    <Play size={14} /> Start Blindfold Draw
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
