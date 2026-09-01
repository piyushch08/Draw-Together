import { useState, useEffect, useRef, ReactNode } from "react";
import React from "react";
import { nanoid } from "nanoid";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { Tool, BrushStyle, DrawingData, ChatMessage, UserPresence, CursorUpdate, Layer, CustomPalette, PlacedText, PlacedShape } from "./types";
import {
  Palette,
  Eraser,
  Pencil,
  Brush,
  CloudRain,
  Send,
  Trash2,
  Fingerprint,
  Users,
  Copy,
  Check,
  Smile,
  LogOut,
  Maximize,
  Square,
  Circle,
  Zap,
  Sparkles,
  Star,
  Activity as CrossBox,
  Diamond,
  Plus,
  Minus,
  Columns as ColumnsIcon,
  Rows as RowsIcon,
  Grid2X2 as GridIcon,
  Slash as NoSymmetryIcon,
  Undo2,
  Redo2,
  Hand,
  MessageSquare,
  Type,
  Sticker,
  X,
  Download,
  Upload,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  ArrowDownToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pipette,
  Triangle,
  Shapes,
  Hexagon,
  ArrowUp,
  Keyboard,
  HelpCircle,
  Github,
  Linkedin,
  MessageCircleHeart,
  Minimize,
  Grid
} from "lucide-react";
import { cn } from "./lib/utils";
import logo from "./assets/logo.jpg";

const COLORS = [
  "#000000", "#FF0000", "#00FF00", "#0000FF"
];

const EMOJIS = ["😂", "😢", "💖", "⭐", "💎", "🔥", "👍", "👎", "🎉", "👏", "😡", "🤔", "😮", "💯", "✨", "🚀", "💡", "🎨", "👀", "🙌"];

interface TooltipProps {
  children: ReactNode;
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  key?: string | number;
}

function Tooltip({ children, label, side = "right" }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setShow(true);
      if (window.navigator?.vibrate) window.navigator.vibrate(15);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShow(false);
  };

  const positions = {
    right: "left-full ml-3 top-1/2 -translate-y-1/2",
    left: "right-full mr-3 top-1/2 -translate-y-1/2",
    top: "bottom-full mb-3 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-3 left-1/2 -translate-x-1/2"
  };

  const animations = {
    right: { x: [0, 5], opacity: [0, 1] },
    left: { x: [0, -5], opacity: [0, 1] },
    top: { y: [0, -5], opacity: [0, 1] },
    bottom: { y: [0, 5], opacity: [0, 1] }
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchEnd} // Also hide if they start moving/scrolling
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={animations[side]}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "absolute px-2 py-1 bg-slate-900 text-white text-[10px] font-bold tracking-wider rounded border border-slate-700 whitespace-nowrap z-[100] shadow-xl pointer-events-none uppercase",
              positions[side]
            )}
          >
            {label}
            <div className={cn(
              "absolute w-1.5 h-1.5 bg-slate-900 border-slate-700 border-l border-t rotate-45",
              side === "right" && "-left-[4px] top-1/2 -translate-y-1/2 border-l border-t",
              side === "left" && "-right-[4px] top-1/2 -translate-y-1/2 border-r border-b rotate-45 translate-x-px",
              side === "top" && "-bottom-[4px] left-1/2 -translate-x-1/2 border-r border-b",
              side === "bottom" && "-top-[4px] left-1/2 -translate-x-1/2 border-l border-t"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("draw_together_username") || "";
  });
  const [isEntered, setIsEntered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [createCustomName, setCreateCustomName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isNewRoom, setIsNewRoom] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  useEffect(() => {
    // 1. Get or generate user nickname automatically
    let savedUsername = localStorage.getItem("draw_together_username");
    if (!savedUsername) {
      const adjectives = ["Happy", "Creative", "Clever", "Swift", "Pixel", "Sketch", "Vector", "Cosmic", "Vibrant", "Neon", "Magic", "Bold"];
      const nouns = ["Artist", "Painter", "Sketcher", "Designer", "Doodler", "Creator", "Muralist", "Wand", "Brush", "Canvas", "Palette"];
      const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNum = Math.floor(100 + Math.random() * 900);
      savedUsername = `${randAdj}${randNoun}_${randomNum}`;
      localStorage.setItem("draw_together_username", savedUsername);
    }
    setUsername(savedUsername);

    // 2. Check URL hash for existing room code
    let initialRoom = window.location.hash.substring(1).toUpperCase();
    if (!initialRoom) {
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get("room") || params.get("roomId");
      if (queryRoom) {
        initialRoom = queryRoom.toUpperCase();
      }
    }

    if (initialRoom) {
      setRoomId(initialRoom);
      setJoinCode(initialRoom);
      setIsJoining(true); // default to joining view if URL contains a code
    }

    // Register hashchange so user can transition Rooms dynamically by editing URL
    const handleHashChange = () => {
      const hashRoom = window.location.hash.substring(1).toUpperCase();
      if (hashRoom) {
        setRoomId(hashRoom);
        setJoinCode(hashRoom);
        setIsEntered(true);
      } else {
        setIsEntered(false);
        setRoomId(null);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleLeaveRoom = () => {
    window.location.hash = "";
    setRoomId(null);
    setIsEntered(false);
  };

  const navigateToRoom = (targetRoomId: string) => {
    const cleanId = targetRoomId.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanId) return;
    window.location.hash = `#${cleanId}`;
    setRoomId(cleanId);
    setIsEntered(true);
  };

  if (!isEntered || !roomId) {
    return (
      <>
        <LandingPage
          username={username}
          setUsername={(newVal: string) => {
            setUsername(newVal);
            localStorage.setItem("draw_together_username", newVal);
          }}
          roomId={roomId}
          setRoomId={setRoomId}
          onEnter={() => setIsEntered(true)}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          createCustomName={createCustomName}
          setCreateCustomName={setCreateCustomName}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          isJoining={isJoining}
          setIsJoining={setIsJoining}
          onCreate={() => {
            let target = createCustomName.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
            if (!target) {
              target = nanoid(6).toUpperCase();
            }
            setIsNewRoom(true);
            navigateToRoom(target);
          }}
          onJoin={() => {
            if (joinCode.trim()) {
              setIsNewRoom(false);
              navigateToRoom(joinCode);
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <DrawingRoom
        roomId={roomId}
        username={username}
        setUsername={(newUsername: string) => {
          setUsername(newUsername);
          localStorage.setItem("draw_together_username", newUsername);
        }}
        onLeave={handleLeaveRoom}
        onEnter={() => setIsEntered(true)}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        isNewRoom={isNewRoom}
      />
    </>
  );
}

export function LandingPage({
  username,
  setUsername,
  joinCode,
  setJoinCode,
  createCustomName,
  setCreateCustomName,
  isJoining,
  setIsJoining,
  onCreate,
  onJoin,
  isFullscreen,
  toggleFullscreen
}: any) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  return (
    <div
      className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 left-4 z-[9999] w-10 h-10 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-white hover:text-indigo-600 shadow-sm transition-all active:scale-95"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>

      {/* Colorful Animated Background Blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-pink-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] bg-yellow-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-cyan-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-2000"></div>
      </div>

      {/* Colorful Interactive Spotlight Grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
        style={{
          backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(236, 72, 153, 0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 1,
          maskImage: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`
        }}
      ></div>

      <div className="flex-1 flex items-center justify-center w-full z-10 mt-8 sm:mt-12">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
          className="w-full max-w-md bg-white/40 backdrop-blur-2xl border border-white/60 p-6 sm:p-10 rounded-3xl shadow-[0_8px_32px_rgba(31,38,135,0.15)] relative overflow-hidden"
        >
          {/* Subtle shine inside the glass card */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

          <div className="flex flex-col items-center justify-center text-center gap-4 mb-10 relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.6, type: "spring", bounce: 0.6 }}
              className="flex-shrink-0 h-24 w-24 rounded-3xl flex items-center justify-center text-logo-container cursor-default relative group"
            >
              <div className="absolute inset-0 bg-white/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
              <Brush className="absolute text-white/20 w-16 h-16 transform -rotate-12 translate-x-2 -translate-y-2 pointer-events-none" style={{ transform: 'translateZ(20px)' }} />
              <span className="font-extrabold text-4xl sm:text-5xl tracking-tighter text-logo-text select-none relative z-10">
                Dt
              </span>
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl sm:text-4xl font-black tracking-tight title-interactive drop-shadow-sm"
              >
                Draw Together
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-slate-600 text-sm font-semibold mt-2 mix-blend-color-burn"
              >
                A vibrant real-time collaborative canvas.
              </motion.p>
            </div>
          </div>

          <div className="space-y-6">
            {/* User Nickname */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Your Nickname</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Picasso"
                className="w-full bg-white/70 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-4 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 transition-all text-sm shadow-inner placeholder:text-slate-400"
              />
            </div>

            {/* Action Tabs Selector */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setIsJoining(false)}
                className={cn(
                  "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                  !isJoining ? "bg-white text-purple-700 shadow-md scale-105" : "text-slate-500 hover:text-purple-600"
                )}
              >
                <Plus size={14} />
                Create Room
              </button>
              <button
                onClick={() => setIsJoining(true)}
                className={cn(
                  "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                  isJoining ? "bg-white text-pink-700 shadow-md scale-105" : "text-slate-500 hover:text-pink-600"
                )}
              >
                <Users size={14} />
                Join Room
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!isJoining ? (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Custom Room Code / Name</label>
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase bg-slate-100 px-2 py-0.5 rounded-md">Optional</span>
                    </div>
                    <input
                      type="text"
                      value={createCustomName}
                      onChange={(e) => setCreateCustomName(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && username.trim()) {
                          onCreate();
                        }
                      }}
                      placeholder="e.g. PIXEL-PARTY"
                      className="w-full bg-white/70 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-4 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 transition-all text-sm uppercase placeholder:normal-case placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-500 font-bold pl-1 leading-relaxed">
                      Leave blank to automatically generate a random, unique 6-character room code.
                    </p>
                  </div>

                  <button
                    onClick={onCreate}
                    disabled={!username.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4.5 rounded-2xl font-bold hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_-10px_rgba(124,58,237,0.8)] hover:shadow-[0_15px_30px_-10px_rgba(124,58,237,0.9)] active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                  >
                    <Sparkles size={16} />
                    Create & Enter Room
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Enter Room Code / Name</label>
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase bg-slate-100 px-2 py-0.5 rounded-md">Required</span>
                    </div>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && username.trim() && joinCode.trim()) {
                          onJoin();
                        }
                      }}
                      placeholder="e.g. PIXEL-PARTY"
                      className="w-full bg-white/70 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-4 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-pink-500/30 focus:border-pink-400 transition-all text-sm uppercase placeholder:normal-case placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    onClick={onJoin}
                    disabled={!username.trim() || !joinCode.trim()}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-500 text-white p-4.5 rounded-2xl font-bold hover:from-pink-500 hover:to-rose-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_-10px_rgba(236,72,153,0.8)] hover:shadow-[0_15px_30px_-10px_rgba(236,72,153,0.9)] active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                  >
                    Join & Enter Room
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-4xl mt-12 mb-6 z-10 flex flex-col gap-6"
      >
        {/* Interactive Review Section */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 rounded-3xl p-6 shadow-xl shadow-purple-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-1 hover:bg-white/80 dark:hover:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
              <MessageCircleHeart size={20} />
            </div>
            <div>
              <h3 className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Enjoying Draw Together?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Share your feedback directly via email.</p>
            </div>
          </div>
          <a
            href="mailto:piyush.ch407@gmail.com?subject=Draw%20Together%20Review"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold rounded-2xl hover:from-purple-500 hover:to-pink-400 transition-all flex items-center gap-2 shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            Give me your review
          </a>
        </div>

        {/* Footer Links & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-slate-500 dark:text-slate-400 text-xs px-2 gap-4 mt-2 border-t border-slate-200/50 dark:border-slate-700/50 pt-6">
          <p className="font-medium">
            &copy; {new Date().getFullYear()} Piyush Chauhan. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/piyushch08"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Github size={14} />
              <span className="font-semibold">GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/piyush-chauhan-353822385/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Linkedin size={14} />
              <span className="font-semibold">LinkedIn</span>
            </a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

function DrawingRoom({ roomId, username, setUsername, onLeave, onEnter, isFullscreen, toggleFullscreen, isNewRoom }: {
  roomId: string;
  username: string;
  setUsername: (v: string) => void;
  onLeave: () => void;
  onEnter: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isNewRoom: boolean;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(isNewRoom);
  
  const [roomSettings, _setRoomSettings] = useState({ backgroundColor: "#FFFFFF", aspectRatio: "16:9" });
  const roomSettingsRef = useRef({ backgroundColor: "#FFFFFF", aspectRatio: "16:9" });
  const resizeCanvasRef = useRef<(() => void) | null>(null);

  const setRoomSettings = (settings: { backgroundColor: string, aspectRatio: string }) => {
    _setRoomSettings(settings);
    roomSettingsRef.current = settings;
    if (resizeCanvasRef.current) resizeCanvasRef.current();
  };

  const fitToScreen = () => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    
    let boardW = 1920; let boardH = 1080;
    if (roomSettingsRef.current.aspectRatio === "4:3") { boardW = 1440; boardH = 1080; }
    else if (roomSettingsRef.current.aspectRatio === "1:1") { boardW = 1080; boardH = 1080; }
    else if (roomSettingsRef.current.aspectRatio === "9:16") { boardW = 1080; boardH = 1920; }
    else if (roomSettingsRef.current.aspectRatio === "3:4") { boardW = 1080; boardH = 1440; }
    
    const scaleX = clientWidth / boardW;
    const scaleY = clientHeight / boardH;
    const fitScale = Math.min(scaleX, scaleY) * 0.95; // 5% padding
    
    const targetX = (clientWidth - boardW * fitScale) / 2;
    const targetY = (clientHeight - boardH * fitScale) / 2;
    
    setTransformSmooth({ x: targetX, y: targetY, scale: fitScale });
  };

  const [localRoomInput, setLocalRoomInput] = useState(roomId);
  useEffect(() => {
    setLocalRoomInput(roomId);
  }, [roomId]);

  const handleRoomSubmit = (val: string) => {
    const cleanRoom = val.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (cleanRoom && cleanRoom !== roomId) {
      window.location.hash = "#" + cleanRoom;
    } else {
      setLocalRoomInput(roomId);
    }
  };

  const [layers, setLayers] = useState<Layer[]>([
    { id: "default", name: "Layer 1", visible: true, opacity: 1 }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>("default");
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [palettes, setPalettes] = useState<CustomPalette[]>(() => {
    const saved = localStorage.getItem("custom_color_palettes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: "retro-sunset",
        name: "Retro Sunset",
        colors: ["#EA580C", "#F97316", "#FB923C", "#FDBA74", "#FFEDD5", "#F43F5E", "#EC4899", "#F472B6"],
        isPreset: true
      },
      {
        id: "cyberpunk-neon",
        name: "Cyberpunk Neon",
        colors: ["#00F0FF", "#FF007F", "#9D00FF", "#39FF14", "#FFFF33", "#FF073A", "#08F7FE", "#FE53BB"],
        isPreset: true
      },
      {
        id: "earthy-pine",
        name: "Earthy Pine",
        colors: ["#14532D", "#166534", "#15803D", "#22C55E", "#4ADE80", "#86EFAC", "#1E293B", "#D1D5DB"],
        isPreset: true
      },
      {
        id: "ocean-deep",
        name: "Ocean Deep",
        colors: ["#0369A1", "#0284C7", "#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#E0F2FE", "#0C4A6E"],
        isPreset: true
      }
    ];
  });
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>("retro-sunset");
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [editingPaletteName, setEditingPaletteName] = useState("");

  useEffect(() => {
    localStorage.setItem("custom_color_palettes", JSON.stringify(palettes));
  }, [palettes]);

  const layersRef = useRef(layers);
  const activeLayerIdRef = useRef(activeLayerId);
  layersRef.current = layers;
  activeLayerIdRef.current = activeLayerId;

  const layerCanvasesRef = useRef<Record<string, HTMLCanvasElement>>({});
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);
  const [opacity, setOpacity] = useState(1);
  const [density, setDensity] = useState(20);
  const [smudgeIntensity, setSmudgeIntensity] = useState(0.5);
  const [brushStyle, setBrushStyle] = useState<BrushStyle>("round");
  const [hardness, setHardness] = useState(0.8);
  const [flow, setFlow] = useState(1.0);
  const [jitter, setJitter] = useState(0);
  const [symmetryMode, setSymmetryMode] = useState<"none" | "horizontal" | "vertical" | "both">("none");
  const [tool, setTool] = useState<Tool>("pencil");
  const [smoothing, setSmoothing] = useState(0.8); // Ultra smooth drawing tracking!
  const [showGrid, setShowGrid] = useState(false);
  const [isSmoothingEnabled, setIsSmoothingEnabled] = useState(true);
  const cursorRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const [transform, _setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<any>(null);

  const setTransform = (update: any) => {
    if (typeof update === 'function') {
      _setTransform((prev: any) => {
        const next = update(prev);
        transformRef.current = next;
        return next;
      });
    } else {
      _setTransform(update);
      transformRef.current = update;
    }
  };

  const setTransformSmooth = (update: any) => {
    setIsTransitioning(true);
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setTransform(update);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 300);
  };

  const [isHandTool, setIsHandTool] = useState(false);
  const [textValue, setTextValue] = useState("AI Studio");
  const [stampEmoji, setStampEmoji] = useState("✨");
  const [textRotation, setTextRotation] = useState(0);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [hasOutline, setHasOutline] = useState(false);
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [textOutlineWidth, setTextOutlineWidth] = useState(2);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [placedTexts, setPlacedTexts] = useState<PlacedText[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const placedTextsRef = useRef<PlacedText[]>([]);
  placedTextsRef.current = placedTexts;

  const [placedShapes, setPlacedShapes] = useState<PlacedShape[]>([]);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const editingShapeIdRef = useRef<string | null>(null);
  editingShapeIdRef.current = editingShapeId;
  const placedShapesRef = useRef<PlacedShape[]>([]);
  placedShapesRef.current = placedShapes;
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const selectedShapeIdsRef = useRef<string[]>([]);
  selectedShapeIdsRef.current = selectedShapeIds;
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const [shapeType, setShapeType] = useState<"circle" | "triangle" | "star" | "square" | "ellipse" | "hexagon" | "arrow" | "rectangle">("square");
  const [shapeWidth, setShapeWidth] = useState(120);
  const [shapeHeight, setShapeHeight] = useState(120);
  const [shapeRotation, setShapeRotation] = useState(0);
  const [shapeLineWidth, setShapeLineWidth] = useState(4);
  const [shapeIsFilled, setShapeIsFilled] = useState(false);
  const [shapeFillColor, setShapeFillColor] = useState("#4f46e5");

  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [isRainbowMode, setIsRainbowMode] = useState(false);
  const hueRef = useRef(0);
  const isTransformModified = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1;
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const historyIndexRef = useRef(-1);
  const historyRef = useRef<string[]>([]);
  const undoRef = useRef<() => void>(() => { });
  const redoRef = useRef<() => void>(() => { });

  historyIndexRef.current = historyIndex;
  historyRef.current = history;
  const touchState = useRef({
    initialDist: 0,
    initialScale: 1,
    initialCenter: { x: 0, y: 0 },
    lastTouchX: 0,
    lastTouchY: 0
  });
  const [users, setUsers] = useState<Record<string, UserPresence>>({});
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [exportName, setExportName] = useState("my-artwork");
  const [copied, setCopied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingQueue = useRef<DrawingData[]>([]);
  const rafId = useRef<number | null>(null);

  const processDrawingQueue = () => {
    if (drawingQueue.current.length > 0) {
      const segments = [...drawingQueue.current];
      drawingQueue.current = [];

      if (segments.length > 0) {
        // Use a single requestAnimationFrame batch
        segments.forEach(data => drawOnCanvas(data));
        socket?.emit("drawing-batch", { roomId, segments });
      }
    }
    rafId.current = requestAnimationFrame(processDrawingQueue);
  };

  useEffect(() => {
    rafId.current = requestAnimationFrame(processDrawingQueue);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [socket]);

  // --- LAYER TYPES & HELPERS ---
  interface LayerHistoryState {
    layers: Layer[];
    activeLayerId: string;
    layerData: Record<string, string>;
    placedTexts?: PlacedText[];
    placedShapes?: PlacedShape[];
  }

  const getOrCreateLayerCanvas = (layerId: string, width: number, height: number): HTMLCanvasElement => {
    let offscreen = layerCanvasesRef.current[layerId];
    const initialWidth = Math.max(width, window.innerWidth, 1920);
    const initialHeight = Math.max(height, window.innerHeight, 1080);

    if (!offscreen) {
      offscreen = document.createElement("canvas");
      offscreen.width = initialWidth;
      offscreen.height = initialHeight;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        offCtx.lineJoin = "round";
        offCtx.lineCap = "round";
      }
      layerCanvasesRef.current[layerId] = offscreen;
    } else {
      const currentWidth = offscreen.width;
      const currentHeight = offscreen.height;
      const targetWidth = Math.max(currentWidth, width);
      const targetHeight = Math.max(currentHeight, height);

      if (targetWidth > currentWidth || targetHeight > currentHeight) {
        const temp = document.createElement("canvas");
        temp.width = currentWidth;
        temp.height = currentHeight;
        const tempCtx = temp.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(offscreen, 0, 0);
        }

        offscreen.width = targetWidth;
        offscreen.height = targetHeight;

        const offCtx = offscreen.getContext("2d");
        if (offCtx) {
          offCtx.lineJoin = "round";
          offCtx.lineCap = "round";
          offCtx.drawImage(temp, 0, 0);
        }
      }
    }
    return offscreen;
  };

  const drawTextOnContext = (ctx: CanvasRenderingContext2D, t: PlacedText) => {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate((t.rotation || 0) * Math.PI / 180);

    const style = `${t.isItalic ? 'italic ' : ''}${t.isBold ? 'bold ' : ''}`;
    ctx.font = `${style}${t.size * 3}px ${t.fontFamily || "sans-serif"}`;

    ctx.textAlign = t.align || "center";
    ctx.textBaseline = "middle";

    if (t.hasOutline) {
      ctx.strokeStyle = t.outlineColor || "#000000";
      ctx.lineWidth = (t.outlineWidth || 2) * (t.size / 10);
      ctx.strokeText(t.text, 0, 0);
    }

    ctx.fillStyle = t.color;
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  };

  const drawShapeOnContext = (ctx: CanvasRenderingContext2D, s: PlacedShape) => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((s.rotation || 0) * Math.PI / 180);

    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth * 3;
    ctx.fillStyle = s.fillColor;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    const w = s.width * 3;
    const h = s.height * 3;

    if (s.type === "square" || s.type === "rectangle") {
      if (s.isFilled) {
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    } else if (s.type === "circle") {
      ctx.arc(0, 0, Math.max(0, Math.min(w, h)) / 2, 0, 2 * Math.PI);
      if (s.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (s.type === "ellipse") {
      ctx.ellipse(0, 0, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, 2 * Math.PI);
      if (s.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (s.type === "triangle") {
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      if (s.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (s.type === "star") {
      const points = 5;
      const rOuter = Math.min(w, h) / 2;
      const rInner = rOuter * 0.4;
      for (let i = 0; i < 2 * points; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      if (s.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (s.type === "hexagon") {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2; // Pointy topped hexagon
        ctx.lineTo((Math.cos(angle) * w) / 2, (Math.sin(angle) * h) / 2);
      }
      ctx.closePath();
      if (s.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (s.type === "arrow") {
      // Draw an arrow pointing upwards centered at 0, 0
      ctx.moveTo(0, -h / 2); // Tip
      ctx.lineTo(w / 2, 0); // Bottom-right of tip
      ctx.lineTo(w / 4, 0); // Inner corner right
      ctx.lineTo(w / 4, h / 2); // Bottom-right of shaft
      ctx.lineTo(-w / 4, h / 2); // Bottom-left of shaft
      ctx.lineTo(-w / 4, 0); // Inner corner left
      ctx.lineTo(-w / 2, 0); // Bottom-left of tip
      ctx.closePath();
      if (s.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  const compositeLayers = () => {
    const masterCanvas = canvasRef.current;
    if (!masterCanvas) return;
    const masterCtx = masterCanvas.getContext("2d");
    if (!masterCtx) return;

    masterCtx.save();
    masterCtx.clearRect(0, 0, masterCanvas.width, masterCanvas.height);

    // Draw base background first
    masterCtx.fillStyle = roomSettingsRef.current.backgroundColor;
    masterCtx.fillRect(0, 0, masterCanvas.width, masterCanvas.height);

    // Render layers from bottom (end of array) to top (start of array)
    for (let i = layersRef.current.length - 1; i >= 0; i--) {
      const layer = layersRef.current[i];
      if (!layer.visible) continue;

      masterCtx.save();
      masterCtx.globalAlpha = layer.opacity;
      if (layer.blendMode) {
        masterCtx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
      }

      const offscreen = layerCanvasesRef.current[layer.id];
      if (offscreen) {
        masterCtx.drawImage(offscreen, 0, 0);
      }

      // Render any dynamic shapes placed on this layer (drawn behind texts)
      const layerShapes = placedShapesRef.current.filter(s => s.layerId === layer.id);
      layerShapes.forEach(s => {
        drawShapeOnContext(masterCtx, s);
      });

      // Render any dynamic texts placed on this layer
      const layerTexts = placedTextsRef.current.filter(t => t.layerId === layer.id);
      layerTexts.forEach(t => {
        drawTextOnContext(masterCtx, t);
      });

      masterCtx.restore();
    }
    masterCtx.restore();
  };

  const resetLayersToDefault = () => {
    const defaultLayers = [
      { id: "default", name: "Layer 1", visible: true, opacity: 1 }
    ];
    setLayers(defaultLayers);
    layersRef.current = defaultLayers;
    setActiveLayerId("default");
    activeLayerIdRef.current = "default";
    setPlacedTexts([]);
    placedTextsRef.current = [];
    setEditingTextId(null);
    setPlacedShapes([]);
    placedShapesRef.current = [];
    setEditingShapeId(null);

    Object.keys(layerCanvasesRef.current).forEach((id) => {
      const offscreen = layerCanvasesRef.current[id];
      if (offscreen) {
        const offCtx = offscreen.getContext("2d");
        offCtx?.clearRect(0, 0, offscreen.width, offscreen.height);
      }
    });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = roomSettingsRef.current.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // --- PALETTE HELPERS ---
  const handleCreatePalette = () => {
    const newId = `palette-${nanoid(6)}`;
    const newPalette: CustomPalette = {
      id: newId,
      name: `Palette ${palettes.filter(p => !p.isPreset).length + 1}`,
      colors: [color]
    };
    setPalettes(prev => [...prev, newPalette]);
    setSelectedPaletteId(newId);
    vibrate(15);
  };

  const handleDeletePalette = (id: string) => {
    const target = palettes.find(p => p.id === id);
    if (!target || target.isPreset) return;
    const updated = palettes.filter(p => p.id !== id);
    setPalettes(updated);
    if (selectedPaletteId === id) {
      setSelectedPaletteId(updated[0]?.id || "");
    }
    vibrate(15);
  };

  const handleAddColorToPalette = (paletteId: string, hexColor: string) => {
    setPalettes(prev => prev.map(p => {
      if (p.id === paletteId) {
        if (p.colors.includes(hexColor)) return p;
        return { ...p, colors: [...p.colors, hexColor] };
      }
      return p;
    }));
    vibrate(10);
  };

  const handleRemoveColorFromPalette = (paletteId: string, hexColor: string) => {
    setPalettes(prev => prev.map(p => {
      if (p.id === paletteId) {
        return { ...p, colors: p.colors.filter(c => c !== hexColor) };
      }
      return p;
    }));
    vibrate(10);
  };

  const handleAddLayer = () => {
    const id = nanoid();
    const newLayerName = `Layer ${layersRef.current.length + 1}`;
    const newLayers = [
      { id, name: newLayerName, visible: true, opacity: 1 },
      ...layersRef.current
    ];
    setLayers(newLayers);
    setActiveLayerId(id);
    vibrate(10);
    setTimeout(() => saveToHistoryStack(newLayers, id), 10);
  };

  const handleDeleteLayer = (id: string) => {
    if (layersRef.current.length <= 1) return;
    const nextLayers = layersRef.current.filter(l => l.id !== id);
    setLayers(nextLayers);

    if (layerCanvasesRef.current[id]) {
      delete layerCanvasesRef.current[id];
    }

    const nextActiveId = activeLayerIdRef.current === id ? nextLayers[0].id : activeLayerIdRef.current;
    setActiveLayerId(nextActiveId);

    vibrate(12);
    setTimeout(() => {
      saveToHistoryStack(nextLayers, nextActiveId);
      compositeLayers();
    }, 10);
  };

  const handleToggleVisibility = (id: string) => {
    const nextLayers = layersRef.current.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
    setLayers(nextLayers);
    vibrate(5);
    setTimeout(() => {
      saveToHistoryStack(nextLayers, activeLayerIdRef.current);
      compositeLayers();
    }, 10);
  };

  const handleOpacityChange = (id: string, opacityVal: number) => {
    const nextLayers = layersRef.current.map(l => l.id === id ? { ...l, opacity: opacityVal } : l);
    setLayers(nextLayers);
    layersRef.current = nextLayers;
    compositeLayers();
  };

  const handleBlendModeChange = (id: string, blendMode: string) => {
    const nextLayers = layersRef.current.map(l => l.id === id ? { ...l, blendMode } : l);
    setLayers(nextLayers);
    layersRef.current = nextLayers;
    compositeLayers();
    setTimeout(() => {
      saveToHistoryStack(nextLayers, activeLayerIdRef.current);
    }, 10);
  };

  const handleMoveLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layersRef.current.length) return;

    const nextLayers = [...layersRef.current];
    const temp = nextLayers[index];
    nextLayers[index] = nextLayers[targetIndex];
    nextLayers[targetIndex] = temp;

    setLayers(nextLayers);
    vibrate(8);
    setTimeout(() => {
      saveToHistoryStack(nextLayers, activeLayerIdRef.current);
      compositeLayers();
    }, 10);
  };

  const handleMergeLayerDown = (index: number) => {
    if (index >= layersRef.current.length - 1) return;

    const topLayer = layersRef.current[index];
    const bottomLayer = layersRef.current[index + 1];

    const masterCanvas = canvasRef.current;
    if (!masterCanvas) return;

    const topCanvas = getOrCreateLayerCanvas(topLayer.id, masterCanvas.width, masterCanvas.height);
    const bottomCanvas = getOrCreateLayerCanvas(bottomLayer.id, masterCanvas.width, masterCanvas.height);
    const bottomCtx = bottomCanvas.getContext("2d");

    if (bottomCtx) {
      bottomCtx.save();
      bottomCtx.globalAlpha = topLayer.opacity;
      bottomCtx.drawImage(topCanvas, 0, 0);
      bottomCtx.restore();
    }

    const nextLayers = layersRef.current.filter(l => l.id !== topLayer.id);
    setLayers(nextLayers);

    const nextActiveId = activeLayerIdRef.current === topLayer.id ? bottomLayer.id : activeLayerIdRef.current;
    setActiveLayerId(nextActiveId);

    delete layerCanvasesRef.current[topLayer.id];

    vibrate(15);
    setTimeout(() => {
      saveToHistoryStack(nextLayers, nextActiveId);
      compositeLayers();
    }, 10);
  };

  const saveToHistoryStack = (currentLayers: Layer[], currentActiveId: string, customPlacedTexts?: PlacedText[], customPlacedShapes?: PlacedShape[]) => {
    const layerData: Record<string, string> = {};
    currentLayers.forEach((layer) => {
      const offscreen = layerCanvasesRef.current[layer.id];
      if (offscreen) {
        layerData[layer.id] = offscreen.toDataURL();
      }
    });

    const state: LayerHistoryState = {
      layers: JSON.parse(JSON.stringify(currentLayers)),
      activeLayerId: currentActiveId,
      layerData,
      placedTexts: customPlacedTexts || JSON.parse(JSON.stringify(placedTextsRef.current)),
      placedShapes: customPlacedShapes || JSON.parse(JSON.stringify(placedShapesRef.current))
    };

    const newHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), JSON.stringify(state)];
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    // Synchronously update the refs to avoid concurrent transaction race conditions
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Run initial or state composite
  useEffect(() => {
    compositeLayers();
  }, [layers]);

  const handleSaveImage = (format: 'png' | 'jpeg' = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    vibrate(25);
    const dataUrl = canvas.toDataURL(`image/${format}`, 0.9);
    const link = document.createElement('a');
    link.download = `${exportName || 'draw-together-artwork'}.${format}`;
    link.href = dataUrl;
    link.click();
  };

  const handleLoadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current || !socket) return;

    vibrate(20);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const offscreen = getOrCreateLayerCanvas(activeLayerId, canvas.width, canvas.height);
        const offCtx = offscreen.getContext("2d");
        if (offCtx) {
          offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
          offCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        compositeLayers();
        saveToHistory();

        socket.emit("clear-canvas", { roomId });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isChatOpen && chat.length > 0) {
      setUnreadCount(prev => prev + 1);
    }
  }, [chat]);

  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
    }
  }, [isChatOpen]);

  const toggleChat = () => {
    const newState = !isChatOpen;
    setIsChatOpen(newState);
    if (newState && window.innerWidth < 1024) {
      setShowInvite(false);
    }
    vibrate(15);
  };

  const toggleTools = () => {
    const newState = !showInvite;
    setShowInvite(newState);
    if (newState && window.innerWidth < 1024) {
      setIsChatOpen(false);
    }
    vibrate(10);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const vibrate = (pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const lastCursorEmitTime = useRef(0);
  const emitCursorUpdateThrottled = (x?: number, y?: number, drawingOverride?: boolean) => {
    const now = Date.now();
    if (now - lastCursorEmitTime.current < 12 && drawingOverride === undefined) return; // ~80fps for ultra-smooth cursor sharing
    lastCursorEmitTime.current = now;
    emitCursorUpdate(x, y, drawingOverride);
  };

  const emitCursorUpdate = (x?: number, y?: number, drawingOverride?: boolean) => {
    if (!socket || !roomId) return;

    let targetX = x;
    let targetY = y;

    if (targetX === undefined || targetY === undefined) {
      // We need current mouse pos for relative coordinates
      // Since we removed mousePos state, we'll fetch them from the event or a ref if available
      // But usually this is called within move handlers which have the data.
      return;
    }

    socket.emit("cursor-move", {
      roomId,
      x: targetX,
      y: targetY,
      tool,
      color,
      isDrawing: drawingOverride !== undefined ? drawingOverride : drawingState.current.isDrawing
    });
  };

  const handleToolChange = (newTool: Tool) => {
    if (tool === "text" && editingTextId) {
      saveToHistory();
    }
    if (tool === "shape" && editingShapeId) {
      saveToHistory();
    }
    setTool(newTool);
    if (newTool !== "text") {
      setEditingTextId(null);
    }
    if (newTool !== "shape") {
      setEditingShapeId(null);
    }
    vibrate(10);
    emitCursorUpdate();
  };

  // Hand tool toggle logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && document.activeElement?.tagName !== "INPUT") {
        setIsHandTool(true);
      }

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        if (e.shiftKey) {
          redoRef.current();
        } else {
          undoRef.current();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsHandTool(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Prevent default touch actions on canvas
    const canvas = canvasRef.current;
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1 || !isHandTool) {
        e.preventDefault();
      }
    };

    if (canvas) {
      canvas.addEventListener('touchstart', preventDefault, { passive: false });
      canvas.addEventListener('touchmove', preventDefault, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('touchstart', preventDefault);
        canvas.removeEventListener('touchmove', preventDefault);
      }
    };
  }, [isHandTool]);

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.emit("join-room", { roomId, username });

    s.on("drawing", (data: DrawingData) => {
      drawOnCanvas(data);
    });

    s.on("drawing-batch", ({ segments }: { segments: DrawingData[] }) => {
      segments.forEach(data => drawOnCanvas(data));
    });

    s.on("chat-message", (data: ChatMessage) => {
      setChat(prev => [...prev.slice(-49), data]);
    });

    s.on("typing", ({ username: typingUser, isTyping: typingStatus }: { username: string, isTyping: boolean }) => {
      // Just a placeholder if we need global state, but ChatSection handles its own
    });

    s.on("message-reaction", ({ messageId, emoji, username: reactingUser }: { messageId: string, emoji: string, username: string }) => {
      setChat(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = { ...(msg.reactions || {}) };
          if (!reactions[emoji]) {
            reactions[emoji] = [];
          }
          if (!reactions[emoji].includes(reactingUser)) {
            reactions[emoji].push(reactingUser);
          } else {
            reactions[emoji] = reactions[emoji].filter(u => u !== reactingUser);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          }
          return { ...msg, reactions };
        }
        return msg;
      }));
    });

    s.on("cursor-move", (data: CursorUpdate) => {
      setUsers(prev => {
        const prevUser = prev[data.userId];
        const prevX = prevUser?.cursorX;
        const prevY = prevUser?.cursorY;
        let trail = prevUser?.trail || [];

        if (prevX !== undefined && prevY !== undefined && data.x !== undefined && data.y !== undefined) {
          const dx = data.x - prevX;
          const dy = data.y - prevY;
          const dist = Math.hypot(dx, dy);

          if (dist > 15) {
            const numSteps = Math.min(Math.floor(dist / 15), 4);
            const newPoints = [];
            for (let i = 1; i <= numSteps; i++) {
              const ratio = i / (numSteps + 1);
              const ix = prevX + dx * ratio;
              const iy = prevY + dy * ratio;
              newPoints.push({
                x: ix,
                y: iy,
                timestamp: Date.now() - (1 - ratio) * 50,
                id: `${data.userId}-${Date.now()}-${i}-${Math.random()}`,
                size: Math.max(2.5, Math.min(dist / 8, 10))
              });
            }
            trail = [...newPoints, ...trail].slice(0, 15);
          }
        }

        return {
          ...prev,
          [data.userId]: {
            ...(prevUser || { id: data.userId, username: "..." }),
            cursorX: data.x,
            cursorY: data.y,
            tool: data.tool,
            color: data.color,
            isDrawing: data.isDrawing,
            trail,
            lastActiveAt: Date.now()
          }
        };
      });
    });

    s.on("init-room-state", (data: {
      roomId: string;
      users?: Array<{ id: string; username: string; color?: string }>;
      placedShapes?: PlacedShape[];
      placedTexts?: PlacedText[];
      canvasData?: string;
      chat?: ChatMessage[];
      backgroundColor?: string;
      aspectRatio?: string;
    }) => {
      if (data.users && Array.isArray(data.users)) {
        const userMap: Record<string, UserPresence> = {};
        data.users.forEach(u => {
          if (u.id !== s.id) {
            userMap[u.id] = {
              id: u.id,
              username: u.username,
              color: u.color || "#6366f1",
              lastActiveAt: Date.now()
            };
          }
        });
        setUsers(userMap);
      }
      if (data.chat && Array.isArray(data.chat) && data.chat.length > 0) {
        setChat(data.chat);
      }
      
      const bg = data.backgroundColor || "#FFFFFF";
      const ar = data.aspectRatio || "16:9";
      setRoomSettings({ backgroundColor: bg, aspectRatio: ar });
      setTimeout(() => fitToScreen(), 100);
      
      if (data.placedShapes && Array.isArray(data.placedShapes) && data.placedShapes.length > 0) {
        setPlacedShapes(data.placedShapes);
        placedShapesRef.current = data.placedShapes;
      }
      if (data.placedTexts && Array.isArray(data.placedTexts) && data.placedTexts.length > 0) {
        setPlacedTexts(data.placedTexts);
        placedTextsRef.current = data.placedTexts;
      }
      if (data.canvasData) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            const offscreen = getOrCreateLayerCanvas(activeLayerIdRef.current, canvas.width, canvas.height);
            const offCtx = offscreen.getContext("2d");
            if (offCtx) {
              offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
              offCtx.drawImage(img, 0, 0);
            }
            compositeLayers();
          }
        };
        img.src = data.canvasData;
      }
    });

    s.on("request-canvas-snapshot", ({ requesterId, roomId: reqRoomId }: { requesterId: string; roomId: string }) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasData = canvas.toDataURL("image/png");
        s.emit("canvas-snapshot-reply", { requesterId, canvasData, roomId: reqRoomId });
      }
    });

    s.on("user-joined", (user: UserPresence) => {
      setUsers(prev => ({
        ...prev,
        [user.id]: {
          ...user,
          lastActiveAt: Date.now()
        }
      }));
    });

    s.on("user-left", ({ id }) => {
      setUsers(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    s.on("clear-canvas", () => {
      resetLayersToDefault();
    });

    s.on("room-settings-updated", (data: { backgroundColor: string; aspectRatio: string }) => {
      setRoomSettings({ backgroundColor: data.backgroundColor, aspectRatio: data.aspectRatio });
      setTimeout(() => {
        compositeLayers();
        fitToScreen();
      }, 50);
    });

    s.on("sync-placed-texts", ({ placedTexts: remotePlacedTexts }: { placedTexts: PlacedText[] }) => {
      setPlacedTexts(remotePlacedTexts);
      placedTextsRef.current = remotePlacedTexts;
      setTimeout(() => {
        compositeLayers();
      }, 20);
    });

    s.on("sync-placed-shapes", ({ placedShapes: remotePlacedShapes }: { placedShapes: PlacedShape[] }) => {
      setPlacedShapes(remotePlacedShapes);
      placedShapesRef.current = remotePlacedShapes;
      setTimeout(() => {
        compositeLayers();
      }, 20);
    });

    s.on("sync-canvas", ({ canvasData }: { canvasData: string }) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const offscreen = getOrCreateLayerCanvas(activeLayerIdRef.current, canvas.width, canvas.height);
          const offCtx = offscreen.getContext("2d");
          if (offCtx) {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
            offCtx.drawImage(img, 0, 0);
          }

          compositeLayers();

          const state: LayerHistoryState = {
            layers: JSON.parse(JSON.stringify(layersRef.current)),
            activeLayerId: activeLayerIdRef.current,
            layerData: {
              [activeLayerIdRef.current]: canvasData
            }
          };

          setHistory(prev => {
            const index = historyIndexRef.current;
            const next = prev.slice(0, index + 1);
            next.push(JSON.stringify(state));
            if (next.length > 50) next.shift();
            return next;
          });
          setHistoryIndex(prev => Math.min(49, prev + 1));
        }
      };
      img.src = canvasData;
    });

    return () => {
      s.disconnect();
    };
  }, [roomId, username]);

  // Handle Resize
  useEffect(() => {
    const resizeCanvas = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      let newWidth = 1920; 
      let newHeight = 1080;
      const ar = roomSettingsRef.current.aspectRatio;
      if (ar === "4:3") { newWidth = 1440; newHeight = 1080; }
      else if (ar === "1:1") { newWidth = 1080; newHeight = 1080; }
      else if (ar === "9:16") { newWidth = 1080; newHeight = 1920; }
      else if (ar === "3:4") { newWidth = 1080; newHeight = 1440; }

      // 1. Resize each offscreen layer canvas
      layersRef.current.forEach((layer) => {
        const offscreen = layerCanvasesRef.current[layer.id];
        if (offscreen) {
          const currentWidth = offscreen.width;
          const currentHeight = offscreen.height;
          const targetWidth = Math.max(currentWidth, newWidth);
          const targetHeight = Math.max(currentHeight, newHeight);

          if (targetWidth > currentWidth || targetHeight > currentHeight) {
            const temp = document.createElement("canvas");
            temp.width = currentWidth;
            temp.height = currentHeight;
            const tempCtx = temp.getContext("2d");
            tempCtx?.drawImage(offscreen, 0, 0);

            offscreen.width = targetWidth;
            offscreen.height = targetHeight;

            const offCtx = offscreen.getContext("2d");
            if (offCtx) {
              offCtx.lineJoin = "round";
              offCtx.lineCap = "round";
              offCtx.drawImage(temp, 0, 0);
            }
          }
        }
      });

      // 2. Resize master canvas
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
      }

      // 3. Composite
      compositeLayers();
    };

    resizeCanvasRef.current = resizeCanvas;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const drawOnCanvas = (data: DrawingData) => {
    const masterCanvas = canvasRef.current;
    if (!masterCanvas) return;

    const targetLayerId = data.layerId || activeLayerIdRef.current;
    const canvas = getOrCreateLayerCanvas(targetLayerId, masterCanvas.width, masterCanvas.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;

    if (data.tool === "eraser") {
      const shapes = placedShapesRef.current;
      const eraserRadius = (data.size || 20) / 2;
      const nextShapes = shapes.filter(s => {
        if (s.layerId !== targetLayerId) return true;

        // Continuous collision detection: test 7 intermediate points along the eraser stroke segment
        const steps = 7;
        const pX = data.prevX ?? data.x;
        const pY = data.prevY ?? data.y;

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const currX = pX + (data.x - pX) * t;
          const currY = pY + (data.y - pY) * t;

          const dx = currX - s.x;
          const dy = currY - s.y;
          const halfW = s.width / 2;
          const halfH = s.height / 2;

          const angleRad = -(s.rotation || 0) * Math.PI / 180;
          const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
          const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

          if (rx >= -halfW - eraserRadius && rx <= halfW + eraserRadius && ry >= -halfH - eraserRadius && ry <= halfH + eraserRadius) {
            return false; // Point intersects shape, erase the shape!
          }
        }
        return true;
      });

      if (nextShapes.length !== shapes.length) {
        placedShapesRef.current = nextShapes;
        setPlacedShapes(nextShapes);
        if (editingShapeId && !nextShapes.some(s => s.id === editingShapeId)) {
          setEditingShapeId(null);
        }
        socket?.emit("sync-placed-shapes", { roomId, placedShapes: nextShapes });
        setTimeout(() => compositeLayers(), 5);
      }
    }

    // Use offscreen canvas for smudge to avoid direct self-copy slowdown
    if (data.tool === "smudge" && !offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }

    const render = (x: number, y: number, px: number, py: number) => {
      let finalX = x;
      let finalY = y;

      const jitterVal = data.jitter;
      if (jitterVal && jitterVal > 0) {
        const jitterAmount = jitterVal * data.size * 2;
        finalX += (Math.random() - 0.5) * jitterAmount;
        finalY += (Math.random() - 0.5) * jitterAmount;
      }

      ctx.beginPath();

      const toolVal = data.tool;
      const isEraser = toolVal === "eraser";

      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = data.color;
      }

      const hardnessVal = data.hardness ?? 1.0;
      ctx.lineWidth = data.size;
      const effectiveFlow = data.flow ?? 1.0;
      ctx.globalAlpha = data.opacity * effectiveFlow;

      if (data.tool === "text" && data.text) {
        ctx.save();
        ctx.translate(finalX, finalY);
        ctx.rotate((data.rotation || 0) * Math.PI / 180);

        const style = `${data.isItalic ? 'italic ' : ''}${data.isBold ? 'bold ' : ''}`;
        ctx.font = `${style}${data.size * 3}px ${data.fontFamily || "sans-serif"}`;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (data.hasOutline) {
          ctx.strokeStyle = data.outlineColor || "#000000";
          ctx.lineWidth = (data.outlineWidth || 2) * (data.size / 10);
          ctx.strokeText(data.text, 0, 0);
        }

        ctx.fillStyle = data.color;
        ctx.fillText(data.text, 0, 0);
        ctx.restore();
        return;
      }

      if (data.tool === "stamp" && data.stamp) {
        ctx.save();
        ctx.translate(finalX, finalY);
        ctx.rotate((data.rotation || 0) * Math.PI / 180);
        ctx.font = `${data.size * 5}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(data.stamp, 0, 0);
        ctx.restore();
        return;
      }

      const brushStyleVal = data.brushStyle;
      if (brushStyleVal === "round" || brushStyleVal === "square") {
        ctx.lineCap = brushStyleVal;
        ctx.lineJoin = brushStyleVal === "round" ? "round" : "miter";
        if (hardnessVal < 1) {
          ctx.shadowBlur = data.size * (1 - hardnessVal) * 2;
          ctx.shadowColor = isEraser ? "rgba(0,0,0,1)" : data.color;
        } else {
          ctx.shadowBlur = 0;
        }
      } else if (brushStyleVal === "soft") {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = data.size * (1 - (data.hardness ?? 0.5)) * 4;
        ctx.shadowColor = isEraser ? "rgba(0,0,0,1)" : data.color;
      } else if (brushStyleVal === "star" || brushStyleVal === "diamond" || brushStyleVal === "cross") {
        const drawShape = (centerX: number, centerY: number) => {
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.beginPath();
          ctx.fillStyle = isEraser ? "rgba(0,0,0,1)" : data.color;

          if (data.brushStyle === "star") {
            const spikes = 5;
            const outerRadius = data.size / 2;
            const innerRadius = data.size / 4;
            let rot = (Math.PI / 2) * 3;
            let sx = 0;
            let sy = 0;
            const step = Math.PI / spikes;

            ctx.moveTo(0, -outerRadius);
            for (let i = 0; i < spikes; i++) {
              sx = Math.cos(rot) * outerRadius;
              sy = Math.sin(rot) * outerRadius;
              ctx.lineTo(sx, sy);
              rot += step;

              sx = Math.cos(rot) * innerRadius;
              sy = Math.sin(rot) * innerRadius;
              ctx.lineTo(sx, sy);
              rot += step;
            }
            ctx.lineTo(0, -outerRadius);
          } else if (data.brushStyle === "diamond") {
            ctx.moveTo(0, -data.size / 2);
            ctx.lineTo(data.size / 2, 0);
            ctx.lineTo(0, data.size / 2);
            ctx.lineTo(-data.size / 2, 0);
          } else if (data.brushStyle === "cross") {
            const w = data.size / 2;
            const t = data.size / 6;
            ctx.rect(-w, -t, data.size, t * 2);
            ctx.rect(-t, -w, t * 2, data.size);
          }

          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };
        drawShape(finalX, finalY);
        return;
      }

      if (data.tool === "spray") {
        ctx.shadowBlur = 0;
        const sprayDensity = data.density || 20;
        for (let i = 0; i < sprayDensity; i++) {
          const offset = data.size * 2;
          const r = Math.random() * offset;
          const angle = Math.random() * Math.PI * 2;
          const dx = finalX + r * Math.cos(angle);
          const dy = finalY + r * Math.sin(angle);
          ctx.fillStyle = data.color;
          ctx.fillRect(dx, dy, 1, 1);
        }
      } else if (data.tool === "smudge") {
        ctx.save();
        const intensity = data.smudgeIntensity || 0.5;
        const s = data.size;

        // Sync offscreen if needed
        const off = offscreenCanvasRef.current;
        if (off) {
          if (off.width !== canvas.width || off.height !== canvas.height) {
            off.width = canvas.width;
            off.height = canvas.height;
          }
          const offCtx = off.getContext("2d");
          if (offCtx) {
            offCtx.globalCompositeOperation = "copy";
            offCtx.drawImage(canvas, px - s, py - s, s * 2, s * 2, px - s, py - s, s * 2, s * 2);
          }
        }

        ctx.beginPath();
        if (data.brushStyle === "round") {
          ctx.arc(finalX, finalY, s, 0, Math.PI * 2);
        } else if (data.brushStyle === "square") {
          ctx.rect(finalX - s, finalY - s, s * 2, s * 2);
        } else if (data.brushStyle === "soft") {
          const gradient = ctx.createRadialGradient(finalX, finalY, 0, finalX, finalY, s);
          gradient.addColorStop(0, `rgba(255,255,255,${intensity})`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gradient;
          ctx.arc(finalX, finalY, s, 0, Math.PI * 2);
        } else {
          // For complex shapes, just use a rect clip for now or implement per-shape
          ctx.rect(finalX - s, finalY - s, s * 2, s * 2);
        }
        ctx.clip();

        ctx.globalAlpha = intensity;
        // The magic: grab from offscreen (previous state) and put at current
        if (off) {
          ctx.drawImage(off, px - s, py - s, s * 2, s * 2, finalX - s, finalY - s, s * 2, s * 2);
        } else {
          ctx.drawImage(canvas, px - s, py - s, s * 2, s * 2, finalX - s, finalY - s, s * 2, s * 2);
        }
        ctx.restore();
      } else {
        ctx.moveTo(px, py);
        ctx.lineTo(finalX, finalY);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    // We no longer apply transform context-wide as the canvas is transformed via CSS.
    // Drawing coordinates are now relative to the canvas's local pixel space.
    render(data.x, data.y, data.prevX, data.prevY);

    // Symmetry strokes
    const symmetryModeVal = data.symmetryMode;
    if (symmetryModeVal === "horizontal" || symmetryModeVal === "both") {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      render(data.x, data.y, data.prevX, data.prevY);
      ctx.restore();
    }

    if (symmetryModeVal === "vertical" || symmetryModeVal === "both") {
      ctx.save();
      ctx.translate(0, height);
      ctx.scale(1, -1);
      render(data.x, data.y, data.prevX, data.prevY);
      ctx.restore();
    }

    if (symmetryModeVal === "both") {
      ctx.save();
      ctx.translate(width, height);
      ctx.scale(-1, -1);
      render(data.x, data.y, data.prevX, data.prevY);
      ctx.restore();
    }

    compositeLayers();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const containerRect = container.getBoundingClientRect();
      const relativeMouseX = e.clientX - containerRect.left;
      const relativeMouseY = e.clientY - containerRect.top;

      const isZoom = e.ctrlKey || e.metaKey || e.altKey;

      if (isZoom) {
        // Zooming centered on context of mouse pos
        const zoomFactor = Math.exp(-e.deltaY * 0.003);
        const prevScale = transformRef.current.scale;
        const newScale = Math.min(Math.max(prevScale * zoomFactor, 0.1), 15);

        // Find world coordinate currently under mouse using stable ref
        const worldX = (relativeMouseX - transformRef.current.x) / prevScale;
        const worldY = (relativeMouseY - transformRef.current.y) / prevScale;

        // Compute new translation such that worldX, worldY lands at relativeMouseX, relativeMouseY
        const newX = relativeMouseX - worldX * newScale;
        const newY = relativeMouseY - worldY * newScale;

        setTransform({ x: newX, y: newY, scale: newScale });
      } else {
        // Panning with smooth scroll
        setTransform(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Drawing Logic
  const drawingState = useRef({
    isDrawing: false,
    lastX: 0, // World X
    lastY: 0, // World Y
    lastScreenX: 0, // Screen X for panning
    lastScreenY: 0  // Screen Y for panning
  });

  const containerRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        containerRectRef.current = containerRef.current.getBoundingClientRect();
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, []);

  function getCoordinates(e: any) {
    if (!containerRectRef.current) return { x: 0, y: 0 };

    const clientX = e.clientX ?? (e.touches?.[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY) ?? 0;

    // Get position relative to container
    const mouseX = clientX - containerRectRef.current.left;
    const mouseY = clientY - containerRectRef.current.top;

    // Convert to world coordinates (Undo the transform)
    return {
      x: (mouseX - transformRef.current.x) / transformRef.current.scale,
      y: (mouseY - transformRef.current.y) / transformRef.current.scale
    };
  }

  const pickColorFromCanvas = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    if (roundedX >= 0 && roundedX < canvas.width && roundedY >= 0 && roundedY < canvas.height) {
      try {
        const pixel = ctx.getImageData(roundedX, roundedY, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const a = pixel[3];

        const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        setColor(hex);
        vibrate(5);
      } catch (err) {
        console.error("Error picking color:", err);
      }
    }
  };

  function startDrawing(e: any) {
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY) ?? 0;

    if (isHandTool || e.button === 1) {
      drawingState.current.isDrawing = false;
      drawingState.current.lastScreenX = clientX;
      drawingState.current.lastScreenY = clientY;
      return;
    }

    if (tool === "picker") {
      drawingState.current.isDrawing = true;
      const { x, y } = getCoordinates(e);
      pickColorFromCanvas(x, y);
      return;
    }

    if (tool === "shape") {
      drawingState.current.isDrawing = false;
      const { x, y } = getCoordinates(e);

      // Let's check if the user clicked on an existing shape to select / drag it
      let matchedShape: PlacedShape | null = null;
      for (let i = placedShapesRef.current.length - 1; i >= 0; i--) {
        const s = placedShapesRef.current[i];
        if (s.layerId !== activeLayerId) continue;

        const dx = x - s.x;
        const dy = y - s.y;
        const halfW = s.width / 2;
        const halfH = s.height / 2;

        const angleRad = -(s.rotation || 0) * Math.PI / 180;
        const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

        if (rx >= -halfW - 15 && rx <= halfW + 15 && ry >= -halfH - 15 && ry <= halfH + 15) {
          matchedShape = s;
          break;
        }
      }

      if (matchedShape) {
        const isShift = e.shiftKey;
        const exists = selectedShapeIdsRef.current.includes(matchedShape.id);

        let nextSelected: string[];
        if (isShift || isMultiSelectMode) {
          if (exists) {
            nextSelected = selectedShapeIdsRef.current.filter(id => id !== matchedShape.id);
          } else {
            nextSelected = [...selectedShapeIdsRef.current, matchedShape.id];
          }
        } else {
          nextSelected = [matchedShape.id];
        }

        setSelectedShapeIds(nextSelected);
        selectedShapeIdsRef.current = nextSelected;

        if (nextSelected.length > 0) {
          const primaryId = nextSelected[nextSelected.length - 1];
          if (editingShapeId !== primaryId) {
            saveToHistory();
          }
          setEditingShapeId(primaryId);
          const primaryShape = placedShapesRef.current.find(sh => sh.id === primaryId);
          if (primaryShape) {
            setShapeType(primaryShape.type);
            setShapeWidth(primaryShape.width);
            setShapeHeight(primaryShape.height);
            setShapeRotation(primaryShape.rotation);
            setShapeLineWidth(primaryShape.lineWidth);
            setShapeIsFilled(primaryShape.isFilled);
            setShapeFillColor(primaryShape.fillColor);
            setColor(primaryShape.color);
          }
        } else {
          saveToHistory();
          setEditingShapeId(null);
        }

        // Setup drag-reposition for all selected shapes
        drawingState.current.isDraggingShape = true;
        drawingState.current.dragShapeId = matchedShape.id;
        (drawingState.current as any).dragStartPositions = nextSelected.map(id => {
          const sh = placedShapesRef.current.find(s => s.id === id);
          return { id, x: sh ? sh.x : 0, y: sh ? sh.y : 0 };
        });
        drawingState.current.dragStartX = x;
        drawingState.current.dragStartY = y;
        vibrate(15);
      } else {
        if (editingShapeId) {
          saveToHistory();
          setEditingShapeId(null);
          setSelectedShapeIds([]);
          selectedShapeIdsRef.current = [];
        } else {
          // Create new shape at clicked position!
          const newShapeId = `shape-${nanoid(6)}`;
          const newShape: PlacedShape = {
            id: newShapeId,
            type: shapeType,
            x,
            y,
            width: 0,
            height: 0,
            color: color,
            rotation: shapeRotation,
            lineWidth: shapeLineWidth,
            isFilled: shapeIsFilled,
            fillColor: shapeFillColor,
            layerId: activeLayerId
          };

          const nextPlacedShapes = [...placedShapesRef.current, newShape];
          setPlacedShapes(nextPlacedShapes);
          placedShapesRef.current = nextPlacedShapes;
          setEditingShapeId(newShapeId);
          setSelectedShapeIds([newShapeId]);
          selectedShapeIdsRef.current = [newShapeId];

          drawingState.current.isCreatingShape = true;
          drawingState.current.dragShapeId = newShapeId;
          drawingState.current.dragStartX = x;
          drawingState.current.dragStartY = y;

          vibrate(15);
          setTimeout(() => {
            compositeLayers();
          }, 10);
        }
      }
      return;
    }

    if (tool === "text") {
      drawingState.current.isDrawing = false;
      const { x, y } = getCoordinates(e);

      // Let's check if the user clicked on an existing text to edit it
      let matchedText: PlacedText | null = null;

      // Look from front to back (top-most first)
      for (let i = placedTextsRef.current.length - 1; i >= 0; i--) {
        const t = placedTextsRef.current[i];
        if (t.layerId !== activeLayerId) continue;

        const dx = x - t.x;
        const dy = y - t.y;

        const textLength = t.text.length;
        const height = t.size * 3;
        const width = textLength * t.size * 1.6;

        let minX = -width / 2;
        let maxX = width / 2;

        if (t.align === "left") {
          minX = 0;
          maxX = width;
        } else if (t.align === "right") {
          minX = -width;
          maxX = 0;
        }

        const minY = -height / 2;
        const maxY = height / 2;

        const angleRad = -(t.rotation || 0) * Math.PI / 180;
        const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

        if (rx >= minX - 15 && rx <= maxX + 15 && ry >= minY - 15 && ry <= maxY + 15) {
          matchedText = t;
          break;
        }
      }

      if (matchedText) {
        // Selection!
        if (editingTextId && editingTextId !== matchedText.id) {
          // We were editing another text, save its final state first!
          saveToHistory();
        } else if (!editingTextId) {
          // If we weren't editing, save the current state before we start editing this text!
          saveToHistory();
        }

        setEditingTextId(matchedText.id);
        setTextValue(matchedText.text);
        setFontFamily(matchedText.fontFamily);
        setSize(matchedText.size);
        setColor(matchedText.color);
        setIsBold(matchedText.isBold);
        setIsItalic(matchedText.isItalic);
        setTextAlign(matchedText.align || "center");
        setHasOutline(matchedText.hasOutline);
        setOutlineColor(matchedText.outlineColor || "#000000");
        setTextOutlineWidth(matchedText.outlineWidth || 2);
        setTextRotation(matchedText.rotation || 0);
        vibrate(15);
      } else {
        // If they click empty space:
        if (editingTextId) {
          saveToHistory(); // Save final edited text state
          setEditingTextId(null);
        } else {
          // If NOT editing, create a new text at this location!
          const newText: PlacedText = {
            id: `text-${nanoid(6)}`,
            text: textValue || "Text",
            x,
            y,
            color,
            size,
            rotation: textRotation,
            fontFamily,
            isBold,
            isItalic,
            align: textAlign,
            hasOutline,
            outlineColor,
            outlineWidth: textOutlineWidth,
            layerId: activeLayerId
          };

          const nextPlacedTexts = [...placedTextsRef.current, newText];
          setPlacedTexts(nextPlacedTexts);
          placedTextsRef.current = nextPlacedTexts; // immediate sync
          setEditingTextId(newText.id);
          saveToHistory(nextPlacedTexts); // Save new text to history
          socket?.emit("sync-placed-texts", { roomId, placedTexts: nextPlacedTexts });
          vibrate(15);
          setTimeout(() => {
            compositeLayers();
          }, 10);
        }
      }
      return;
    }

    drawingState.current.isDrawing = true;
    const { x, y } = getCoordinates(e);
    drawingState.current.lastX = x;
    drawingState.current.lastY = y;
    drawingState.current.lastScreenX = clientX;
    drawingState.current.lastScreenY = clientY;
    emitCursorUpdate(x, y, true);
  }

  function draw(e: any) {
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY) ?? 0;

    if (isHandTool || e.button === 1 || (e.buttons === 4)) {
      if (e.buttons === 4 || (isHandTool && (e.buttons === 1 || e.type === "touchmove"))) {
        const dx = clientX - drawingState.current.lastScreenX;
        const dy = clientY - drawingState.current.lastScreenY;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        drawingState.current.lastScreenX = clientX;
        drawingState.current.lastScreenY = clientY;
        return;
      }
    }

    if (tool === "picker") {
      if (!drawingState.current.isDrawing) return;
      const { x, y } = getCoordinates(e);
      pickColorFromCanvas(x, y);
      return;
    }

    if (tool === "shape") {
      const { x, y } = getCoordinates(e);

      if ((drawingState.current as any).isResizingShape && drawingState.current.dragShapeId) {
        // Corner resize dragging!
        const s = placedShapesRef.current.find(shape => shape.id === drawingState.current.dragShapeId);
        if (s) {
          const corner = (drawingState.current as any).resizeCorner;
          const startWidth = (drawingState.current as any).dragStartWidth;
          const startHeight = (drawingState.current as any).dragStartHeight;
          const startCenterX = (drawingState.current as any).dragStartCenterX;
          const startCenterY = (drawingState.current as any).dragStartCenterY;

          // Get diff in world space
          const dx = x - drawingState.current.dragStartX;
          const dy = y - drawingState.current.dragStartY;

          // Rotate into shape local space to find stretch along local axes
          const theta = (s.rotation || 0) * Math.PI / 180;
          const angleRad = -theta;
          const localDx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
          const localDy = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

          let newWidth = startWidth;
          let newHeight = startHeight;
          let shiftX = 0;
          let shiftY = 0;

          if (corner === "br") {
            newWidth = Math.max(10, startWidth + localDx);
            newHeight = Math.max(10, startHeight + localDy);
            shiftX = (newWidth - startWidth) / 2;
            shiftY = (newHeight - startHeight) / 2;
          } else if (corner === "bl") {
            newWidth = Math.max(10, startWidth - localDx);
            newHeight = Math.max(10, startHeight + localDy);
            shiftX = -(newWidth - startWidth) / 2;
            shiftY = (newHeight - startHeight) / 2;
          } else if (corner === "tr") {
            newWidth = Math.max(10, startWidth + localDx);
            newHeight = Math.max(10, startHeight - localDy);
            shiftX = (newWidth - startWidth) / 2;
            shiftY = -(newHeight - startHeight) / 2;
          } else if (corner === "tl") {
            newWidth = Math.max(10, startWidth - localDx);
            newHeight = Math.max(10, startHeight - localDy);
            shiftX = -(newWidth - startWidth) / 2;
            shiftY = -(newHeight - startHeight) / 2;
          }

          // Convert center shift back from local to world coordinates
          const worldShiftX = shiftX * Math.cos(theta) - shiftY * Math.sin(theta);
          const worldShiftY = shiftX * Math.sin(theta) + shiftY * Math.cos(theta);

          const nextShapes = placedShapesRef.current.map(sh => {
            if (sh.id === s.id) {
              return {
                ...sh,
                x: startCenterX + worldShiftX,
                y: startCenterY + worldShiftY,
                width: newWidth,
                height: newHeight
              };
            }
            return sh;
          });

          setPlacedShapes(nextShapes);
          placedShapesRef.current = nextShapes;
          setShapeWidth(Math.round(newWidth));
          setShapeHeight(Math.round(newHeight));

          socket?.emit("sync-placed-shapes", { roomId, placedShapes: nextShapes });
          setTimeout(() => compositeLayers(), 5);
        }
      } else if (drawingState.current.isDraggingShape && drawingState.current.dragShapeId) {
        // Drag-move shape
        const dx = x - drawingState.current.dragStartX;
        const dy = y - drawingState.current.dragStartY;
        const startPositions = (drawingState.current as any).dragStartPositions || [];

        const nextShapes = placedShapesRef.current.map(s => {
          const startPos = startPositions.find((sp: any) => sp.id === s.id);
          if (startPos) {
            return {
              ...s,
              x: startPos.x + dx,
              y: startPos.y + dy
            };
          }
          return s;
        });
        setPlacedShapes(nextShapes);
        placedShapesRef.current = nextShapes;
        socket?.emit("sync-placed-shapes", { roomId, placedShapes: nextShapes });
        setTimeout(() => compositeLayers(), 5);
      } else if (drawingState.current.isCreatingShape && drawingState.current.dragShapeId) {
        // Drag-resize shape during creation
        const startX = drawingState.current.dragStartX;
        const startY = drawingState.current.dragStartY;

        const width = Math.abs(x - startX);
        const height = Math.abs(y - startY);
        const centerX = (startX + x) / 2;
        const centerY = (startY + y) / 2;

        const nextShapes = placedShapesRef.current.map(s => {
          if (s.id === drawingState.current.dragShapeId) {
            return {
              ...s,
              x: centerX,
              y: centerY,
              width,
              height
            };
          }
          return s;
        });
        setPlacedShapes(nextShapes);
        placedShapesRef.current = nextShapes;
        setShapeWidth(Math.round(width));
        setShapeHeight(Math.round(height));

        socket?.emit("sync-placed-shapes", { roomId, placedShapes: nextShapes });
        setTimeout(() => compositeLayers(), 5);
      }
      return;
    }

    if (!drawingState.current.isDrawing) return;
    if (tool === "text") return;
    const { x: rawX, y: rawY } = getCoordinates(e);

    let x = rawX;
    let y = rawY;

    if (isSmoothingEnabled) {
      // Enhanced exponential lerp: use higher precision lerp for responsiveness
      // Factor is 1 - smoothing (e.g. 0.9 smoothing means 0.1 factor per update)
      const factor = Math.max(0.01, 1 - smoothing);
      x = drawingState.current.lastX + (rawX - drawingState.current.lastX) * factor;
      y = drawingState.current.lastY + (rawY - drawingState.current.lastY) * factor;
    }

    let currentColor = color;
    if (isRainbowMode) {
      hueRef.current = (hueRef.current + 5) % 360;
      currentColor = `hsl(${hueRef.current}, 100%, 50%)`;
    }

    const data: DrawingData = {
      roomId,
      x,
      y,
      prevX: drawingState.current.lastX,
      prevY: drawingState.current.lastY,
      color: currentColor,
      size: tool === "eraser" ? eraserSize : size,
      tool,
      brushStyle,
      symmetryMode,
      opacity,
      density,
      hardness,
      flow,
      jitter,
      smudgeIntensity,
      text: textValue,
      stamp: stampEmoji,
      rotation: textRotation,
      fontFamily: fontFamily,
      isBold,
      isItalic,
      hasOutline,
      outlineColor,
      outlineWidth: textOutlineWidth,
      layerId: activeLayerId
    };

    drawingQueue.current.push(data);

    drawingState.current.lastX = x;
    drawingState.current.lastY = y;
  }

  function stopDrawing() {
    if (tool === "picker") {
      drawingState.current.isDrawing = false;
      return;
    }

    if (tool === "shape") {
      if (drawingState.current.isCreatingShape && drawingState.current.dragShapeId) {
        const shapes = placedShapesRef.current;
        const created = shapes.find(s => s.id === drawingState.current.dragShapeId);
        if (created && (created.width < 10 || created.height < 10)) {
          // Click placed! Give it default 120x120 size
          const updatedShapes = shapes.map(s => {
            if (s.id === drawingState.current.dragShapeId) {
              return { ...s, width: 120, height: 120 };
            }
            return s;
          });
          setPlacedShapes(updatedShapes);
          placedShapesRef.current = updatedShapes;
          setShapeWidth(120);
          setShapeHeight(120);
          socket?.emit("sync-placed-shapes", { roomId, placedShapes: updatedShapes });
        }
        saveToHistory();
      } else if (drawingState.current.isDraggingShape || (drawingState.current as any).isResizingShape) {
        saveToHistory();
      }
      drawingState.current.isCreatingShape = false;
      drawingState.current.isDraggingShape = false;
      (drawingState.current as any).isResizingShape = false;
      drawingState.current.dragShapeId = null;
      setTimeout(() => compositeLayers(), 10);
      return;
    }

    if (drawingState.current.isDrawing) {
      saveToHistory();
      emitCursorUpdate(undefined, undefined, false);
    }
    drawingState.current.isDrawing = false;
  }

  const saveToHistory = (customPlacedTexts?: PlacedText[], customPlacedShapes?: PlacedShape[]) => {
    const layerData: Record<string, string> = {};
    const currentLayers = layersRef.current;
    const currentActiveId = activeLayerIdRef.current;

    currentLayers.forEach((layer) => {
      const offscreen = layerCanvasesRef.current[layer.id];
      if (offscreen) {
        layerData[layer.id] = offscreen.toDataURL();
      }
    });

    const state: LayerHistoryState = {
      layers: JSON.parse(JSON.stringify(currentLayers)),
      activeLayerId: currentActiveId,
      layerData,
      placedTexts: customPlacedTexts || JSON.parse(JSON.stringify(placedTextsRef.current)),
      placedShapes: customPlacedShapes || JSON.parse(JSON.stringify(placedShapesRef.current))
    };

    const newHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), JSON.stringify(state)];

    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    // Synchronously update the refs to avoid concurrent transaction race conditions
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  useEffect(() => {
    if (!editingTextId) return;
    const selectedText = placedTexts.find(t => t.id === editingTextId);
    if (!selectedText) return;

    // Check if any property actually changed to avoid infinite loops
    if (
      selectedText.text !== textValue ||
      selectedText.fontFamily !== fontFamily ||
      selectedText.size !== size ||
      selectedText.color !== color ||
      selectedText.isBold !== isBold ||
      selectedText.isItalic !== isItalic ||
      selectedText.align !== textAlign ||
      selectedText.hasOutline !== hasOutline ||
      selectedText.outlineColor !== outlineColor ||
      selectedText.outlineWidth !== textOutlineWidth ||
      selectedText.rotation !== textRotation
    ) {
      const next = placedTexts.map(t => {
        if (t.id === editingTextId) {
          return {
            ...t,
            text: textValue,
            fontFamily,
            size,
            color,
            isBold,
            isItalic,
            align: textAlign,
            hasOutline,
            outlineColor,
            outlineWidth: textOutlineWidth,
            rotation: textRotation
          };
        }
        return t;
      });
      setPlacedTexts(next);
      socket?.emit("sync-placed-texts", { roomId, placedTexts: next });

      // Request redraw after update
      setTimeout(() => compositeLayers(), 10);
    }
  }, [
    editingTextId,
    placedTexts,
    textValue,
    fontFamily,
    size,
    color,
    isBold,
    isItalic,
    textAlign,
    hasOutline,
    outlineColor,
    textOutlineWidth,
    textRotation,
    socket,
    roomId
  ]);

  useEffect(() => {
    if (!editingShapeId) return;
    const selectedShape = placedShapes.find(s => s.id === editingShapeId);
    if (!selectedShape) return;

    // Check if any property actually changed to avoid infinite loops
    if (
      selectedShape.type !== shapeType ||
      selectedShape.width !== shapeWidth ||
      selectedShape.height !== shapeHeight ||
      selectedShape.rotation !== shapeRotation ||
      selectedShape.lineWidth !== shapeLineWidth ||
      selectedShape.isFilled !== shapeIsFilled ||
      selectedShape.fillColor !== shapeFillColor ||
      selectedShape.color !== color
    ) {
      const next = placedShapes.map(s => {
        if (s.id === editingShapeId) {
          return {
            ...s,
            type: shapeType,
            width: shapeWidth,
            height: shapeHeight,
            rotation: shapeRotation,
            lineWidth: shapeLineWidth,
            isFilled: shapeIsFilled,
            fillColor: shapeFillColor,
            color: color
          };
        }
        return s;
      });
      setPlacedShapes(next);
      placedShapesRef.current = next;
      socket?.emit("sync-placed-shapes", { roomId, placedShapes: next });

      // Request redraw after update
      setTimeout(() => compositeLayers(), 10);
    }
  }, [
    editingShapeId,
    placedShapes,
    shapeType,
    shapeWidth,
    shapeHeight,
    shapeRotation,
    shapeLineWidth,
    shapeIsFilled,
    shapeFillColor,
    color,
    socket,
    roomId
  ]);

  const handleAlignShapes = (direction: "left" | "right" | "top" | "bottom" | "centerX" | "centerY") => {
    const selectedIds = selectedShapeIdsRef.current;
    if (selectedIds.length <= 1) return;

    saveToHistory();
    const shapes = [...placedShapesRef.current];
    const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
    if (selectedShapes.length === 0) return;

    let nextShapes = [...shapes];

    if (direction === "left") {
      const minLeft = Math.min(...selectedShapes.map(s => s.x - s.width / 2));
      nextShapes = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, x: minLeft + s.width / 2 };
        }
        return s;
      });
    } else if (direction === "right") {
      const maxRight = Math.max(...selectedShapes.map(s => s.x + s.width / 2));
      nextShapes = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, x: maxRight - s.width / 2 };
        }
        return s;
      });
    } else if (direction === "top") {
      const minTop = Math.min(...selectedShapes.map(s => s.y - s.height / 2));
      nextShapes = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, y: minTop + s.height / 2 };
        }
        return s;
      });
    } else if (direction === "bottom") {
      const maxBottom = Math.max(...selectedShapes.map(s => s.y + s.height / 2));
      nextShapes = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, y: maxBottom - s.height / 2 };
        }
        return s;
      });
    } else if (direction === "centerX") {
      const avgX = selectedShapes.reduce((sum, s) => sum + s.x, 0) / selectedShapes.length;
      nextShapes = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, x: avgX };
        }
        return s;
      });
    } else if (direction === "centerY") {
      const avgY = selectedShapes.reduce((sum, s) => sum + s.y, 0) / selectedShapes.length;
      nextShapes = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, y: avgY };
        }
        return s;
      });
    }

    setPlacedShapes(nextShapes);
    placedShapesRef.current = nextShapes;
    socket?.emit("sync-placed-shapes", { roomId, placedShapes: nextShapes });
    setTimeout(() => compositeLayers(), 10);
    vibrate(10);
  };

  const startResize = (e: any, corner: "tl" | "tr" | "bl" | "br", shape: PlacedShape) => {
    e.preventDefault();
    e.stopPropagation();

    const coords = getCoordinates(e.nativeEvent || e);

    (drawingState.current as any).isResizingShape = true;
    (drawingState.current as any).resizeCorner = corner;
    drawingState.current.dragShapeId = shape.id;
    drawingState.current.dragStartX = coords.x;
    drawingState.current.dragStartY = coords.y;
    (drawingState.current as any).dragStartWidth = shape.width;
    (drawingState.current as any).dragStartHeight = shape.height;
    (drawingState.current as any).dragStartCenterX = shape.x;
    (drawingState.current as any).dragStartCenterY = shape.y;

    vibrate(10);
  };

  const undo = () => {
    if (historyIndex > 0) {
      loadHistoryState(historyIndex - 1);
      setHistoryIndex(historyIndex - 1);
    } else if (historyIndex === 0) {
      // Reset layers to default if undoing the first action
      resetLayersToDefault();
      setHistoryIndex(-1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      loadHistoryState(historyIndex + 1);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const loadHistoryState = (index: number, syncRemote = true) => {
    const masterCanvas = canvasRef.current;
    if (!masterCanvas || !history[index]) return;

    try {
      const state = JSON.parse(history[index]);

      const loadPromises = state.layers.map((layerState: any) => {
        return new Promise<void>((resolve) => {
          const dataUrl = state.layerData[layerState.id];
          if (!dataUrl) {
            resolve();
            return;
          }

          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            const offscreen = getOrCreateLayerCanvas(layerState.id, masterCanvas.width, masterCanvas.height);
            const offCtx = offscreen.getContext("2d");
            if (offCtx) {
              offCtx.save();
              offCtx.globalCompositeOperation = "source-over";
              offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
              offCtx.drawImage(img, 0, 0);
              offCtx.restore();
            }
            resolve();
          };
          img.onerror = () => resolve();
        });
      });

      Promise.all(loadPromises).then(() => {
        setLayers(state.layers);
        layersRef.current = state.layers;
        setActiveLayerId(state.activeLayerId);
        activeLayerIdRef.current = state.activeLayerId;

        const nextTexts = state.placedTexts || [];
        setPlacedTexts(nextTexts);
        placedTextsRef.current = nextTexts;

        const nextShapes = state.placedShapes || [];
        setPlacedShapes(nextShapes);
        placedShapesRef.current = nextShapes;

        socket?.emit("sync-placed-texts", { roomId, placedTexts: nextTexts });
        socket?.emit("sync-placed-shapes", { roomId, placedShapes: nextShapes });

        // Redraw complete composition including texts and shapes
        compositeLayers();

        if (syncRemote && socket && roomId) {
          socket.emit("sync-canvas", { roomId, canvasData: masterCanvas.toDataURL() });
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Keep references to undo and redo callbacks up to date
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  });

  // Optimized Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      // Save raw screen coordinates for panning mode
      drawingState.current.lastScreenX = touch.clientX;
      drawingState.current.lastScreenY = touch.clientY;
      startDrawing(touch);
    } else if (e.touches.length === 2) {
      drawingState.current.isDrawing = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      touchState.current.initialDist = Math.max(dist, 10); // Prevent div by zero
      touchState.current.initialScale = transformRef.current.scale;

      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const mouseX = centerX - containerRect.left;
        const mouseY = centerY - containerRect.top;

        // Store the world position of the center point at the start of the gesture
        touchState.current.initialCenter = {
          x: (mouseX - transformRef.current.x) / transformRef.current.scale,
          y: (mouseY - transformRef.current.y) / transformRef.current.scale
        };

        // Initialize shape two-finger state if under shape tool & editing a shape
        if (tool === "shape" && editingShapeIdRef.current) {
          const s = placedShapesRef.current.find(sh => sh.id === editingShapeIdRef.current);
          if (s) {
            const initialAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
            (touchState.current as any).shapeInitialAngle = initialAngle;
            (touchState.current as any).shapeInitialRotation = s.rotation || 0;
            (touchState.current as any).shapeInitialDist = Math.max(dist, 10);
            (touchState.current as any).shapeInitialWidth = s.width;
            (touchState.current as any).shapeInitialHeight = s.height;

            const worldCenterX = (mouseX - transformRef.current.x) / transformRef.current.scale;
            const worldCenterY = (mouseY - transformRef.current.y) / transformRef.current.scale;
            (touchState.current as any).shapeInitialCenter = { x: worldCenterX, y: worldCenterY };
            (touchState.current as any).shapeInitialShapePos = { x: s.x, y: s.y };
          }
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default browser gestures
    if (e.cancelable) e.preventDefault();

    if (e.touches.length === 1 && !isHandTool) {
      draw(e.touches[0]);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      // Check if we are doing a two-finger shape gesture
      if (tool === "shape" && editingShapeIdRef.current) {
        const s = placedShapesRef.current.find(shape => shape.id === editingShapeIdRef.current);
        if (s) {
          // Rotate calculation
          const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
          const initialAngle = (touchState.current as any).shapeInitialAngle ?? currentAngle;
          const dAngleRad = currentAngle - initialAngle;
          const dAngleDeg = dAngleRad * 180 / Math.PI;

          let newRotation = ((touchState.current as any).shapeInitialRotation ?? s.rotation ?? 0) + dAngleDeg;
          newRotation = (newRotation % 360 + 360) % 360;

          // Scale calculation
          const initialDist = (touchState.current as any).shapeInitialDist ?? dist;
          const scaleFactor = dist / Math.max(initialDist, 10);

          const startWidth = (touchState.current as any).shapeInitialWidth ?? s.width;
          const startHeight = (touchState.current as any).shapeInitialHeight ?? s.height;
          const newWidth = Math.max(10, startWidth * scaleFactor);
          const newHeight = Math.max(10, startHeight * scaleFactor);

          // Translate calculation: move shape center matching finger center shift
          const centerX = (t1.clientX + t2.clientX) / 2;
          const centerY = (t1.clientY + t2.clientY) / 2;
          const containerRect = containerRef.current?.getBoundingClientRect();
          let newX = s.x;
          let newY = s.y;

          if (containerRect && (touchState.current as any).shapeInitialCenter) {
            const mouseX = centerX - containerRect.left;
            const mouseY = centerY - containerRect.top;
            const worldCenterX = (mouseX - transformRef.current.x) / transformRef.current.scale;
            const worldCenterY = (mouseY - transformRef.current.y) / transformRef.current.scale;

            const dx = worldCenterX - (touchState.current as any).shapeInitialCenter.x;
            const dy = worldCenterY - (touchState.current as any).shapeInitialCenter.y;

            newX = ((touchState.current as any).shapeInitialShapePos?.x ?? s.x) + dx;
            newY = ((touchState.current as any).shapeInitialShapePos?.y ?? s.y) + dy;
          }

          const nextShapes = placedShapesRef.current.map(sh => {
            if (sh.id === s.id) {
              return {
                ...sh,
                rotation: Math.round(newRotation),
                width: Math.round(newWidth),
                height: Math.round(newHeight),
                x: newX,
                y: newY
              };
            }
            return sh;
          });

          setPlacedShapes(nextShapes);
          placedShapesRef.current = nextShapes;
          setShapeRotation(Math.round(newRotation));
          setShapeWidth(Math.round(newWidth));
          setShapeHeight(Math.round(newHeight));

          socket?.emit("sync-placed-shapes", { roomId, placedShapes: nextShapes });
          setTimeout(() => compositeLayers(), 5);
          return; // Skip normal board pan/zoom gesture when shape is manipulated
        }
      }

      const scaleChange = dist / touchState.current.initialDist;
      const newScale = Math.min(Math.max(touchState.current.initialScale * scaleChange, 0.1), 15);

      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const mouseX = centerX - containerRect.left;
        const mouseY = centerY - containerRect.top;

        // Calculate the new transform so that the world point remains under the center point
        // and accounts for any panning of the fingers themselves
        const newX = mouseX - touchState.current.initialCenter.x * newScale;
        const newY = mouseY - touchState.current.initialCenter.y * newScale;

        setTransform({ x: newX, y: newY, scale: newScale });
      }
    } else if (e.touches.length === 1 && isHandTool) {
      const touch = e.touches[0];
      const dx = touch.clientX - drawingState.current.lastScreenX;
      const dy = touch.clientY - drawingState.current.lastScreenY;

      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));

      drawingState.current.lastScreenX = touch.clientX;
      drawingState.current.lastScreenY = touch.clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    stopDrawing();
    // After a multi-touch gesture ends, we don't want to immediately start drawing
    if (e.touches.length > 0) {
      drawingState.current.isDrawing = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    // Direct DOM update for custom cursor for 60fps performance without React overhead
    if (cursorRef.current) {
      cursorRef.current.style.left = `${e.clientX}px`;
      cursorRef.current.style.top = `${e.clientY}px`;
    }

    draw(e.nativeEvent);

    // Emit cursor position to others - throttled
    if (socket && roomId) {
      const { x, y } = getCoordinates(e.nativeEvent);
      emitCursorUpdateThrottled(x, y);
    }
  };

  const CustomCursor = () => {
    // Disable custom cursor on touch devices to improve performance and visibility
    if (!isOverCanvas || isHandTool || ('ontouchstart' in window)) return null;

    const cursorSize = (tool === "eraser" ? eraserSize : size) * transform.scale;
    const icons = {
      pencil: <Pencil size={12} />,
      brush: <Brush size={12} />,
      spray: <CloudRain size={12} />,
      smudge: <Fingerprint size={12} />,
      eraser: <Eraser size={12} />
    };

    return (
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[9999] flex items-center justify-center -translate-x-1/2 -translate-y-1/2 will-change-[left,top]"
        style={{ left: -100, top: -100 }} // Start offscreen
      >
        {/* Brush Area Preview */}
        <div
          className={cn(
            "rounded-full border border-slate-400/50 flex items-center justify-center",
            tool === "eraser" ? "bg-white/20" : "bg-transparent"
          )}
          style={{
            width: cursorSize,
            height: cursorSize,
          }}
        >
          {/* Tool Icon */}
          <div className="bg-white/90 p-0.5 rounded shadow-lg text-slate-700 flex items-center justify-center transform scale-90">
            {icons[tool]}
          </div>
        </div>
      </div>
    );
  };

  const RemoteCursors = () => {
    // We only want to show cursors that are "live" (updated recently)
    // and correctly scaled/translated.
    // Ticker to continually update and fade out trails in real-time
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
      let active = true;
      const tick = () => {
        if (!active) return;
        setNow(Date.now());
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return () => {
        active = false;
      };
    }, []);

    const TRAIL_LIFETIME = 500; // Trail fades completely after 500ms

    return (
      <div
        className={cn(
          "absolute inset-0 pointer-events-none z-10 overflow-hidden",
          isTransitioning && "transition-transform duration-300 ease-out"
        )}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {(Object.values(users) as UserPresence[]).filter(u => u.id !== socket?.id && u.cursorX !== undefined).map(u => {
          const activeTrail = (u.trail || []).filter(t => now - t.timestamp < TRAIL_LIFETIME);
          return (
            <React.Fragment key={u.id}>
              {/* Cursor trail points */}
              {activeTrail.map((point) => {
                const age = now - point.timestamp;
                const ratio = Math.max(0, 1 - age / TRAIL_LIFETIME);
                return (
                  <div
                    key={point.id}
                    className="absolute rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 will-change-[width,height,opacity]"
                    style={{
                      left: point.x,
                      top: point.y,
                      width: (point.size || 5) * ratio * 1.5,
                      height: (point.size || 5) * ratio * 1.5,
                      backgroundColor: u.color,
                      opacity: ratio * 0.55,
                      boxShadow: `0 0 6px ${u.color}`,
                    }}
                  />
                );
              })}

              <motion.div
                initial={false}
                animate={{ x: u.cursorX, y: u.cursorY }}
                transition={{ type: "spring", stiffness: 800, damping: 60, mass: 0.2 }}
                className="absolute flex flex-col items-start gap-1"
                style={{
                  zIndex: u.isDrawing ? 20 : 10,
                }}
              >
                {/* The cursor pointer itself */}
                <div className="relative">
                  <svg
                    width="24" height="24" viewBox="0 0 24 24" fill="none"
                    className="drop-shadow-2xl -translate-x-[2px] -translate-y-[2px]"
                    style={{ color: u.color }}
                  >
                    <path
                      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                      fill="currentColor"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {/* Drawing Ping Pulse */}
                  {u.isDrawing && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute left-0 top-0 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
                      style={{ backgroundColor: u.color }}
                    />
                  )}
                </div>

                {/* Tool indicator & Name tag */}
                <div className="flex items-center gap-1.5 -translate-x-1 mt-1">
                  <motion.div
                    animate={u.isDrawing ? { scale: [1, 1.2, 1], rotate: [-10, 10, -10] } : { scale: 1, rotate: 0 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                      "w-6 h-6 rounded-lg border-2 border-white shadow-xl flex items-center justify-center transition-all bg-white overflow-hidden",
                    )}
                  >
                    <div className="absolute inset-0 opacity-20" style={{ backgroundColor: u.color }} />
                    <div className="relative">
                      {u.tool === "pencil" && <Pencil size={12} style={{ color: u.color }} />}
                      {u.tool === "brush" && <Brush size={12} style={{ color: u.color }} />}
                      {u.tool === "spray" && <CloudRain size={12} style={{ color: u.color }} />}
                      {u.tool === "smudge" && <Fingerprint size={12} style={{ color: u.color }} />}
                      {u.tool === "eraser" && <Eraser size={12} className="text-slate-400" />}
                    </div>
                  </motion.div>

                  <div className="bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl border border-slate-700/50 uppercase tracking-tighter shadow-indigo-500/10">
                    {u.username}
                  </div>
                </div>
              </motion.div>
            </React.Fragment>
          )
        })}
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden cursor-default">
      <CustomCursor />
      <RemoteCursors />
      {/* Floating Header */}
      <header className="absolute top-4 left-4 right-4 z-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pointer-events-none">
        <div className="flex items-center gap-3 sm:gap-4 md:gap-6 pointer-events-auto">
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:bg-white transition-all active:scale-95 shrink-0"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          {/* Logo container removed per user request */}
          <div className="hidden lg:flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl px-3 py-1 border border-slate-200 shadow-sm">
            <div className="flex flex-col items-start leading-none shrink-0">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-0.5">Room Code / Name</span>
              <input
                type="text"
                value={localRoomInput}
                onChange={(e) => setLocalRoomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRoomSubmit(localRoomInput);
                    vibrate(10);
                    e.currentTarget.blur();
                  }
                }}
                onBlur={() => {
                  handleRoomSubmit(localRoomInput);
                }}
                className="text-xs font-mono font-bold text-slate-700 bg-transparent border-none p-0 m-0 outline-none focus:ring-0 w-24 sm:w-32 placeholder-slate-400 uppercase"
                placeholder="ROOM-CODE"
                title="Click to change room code or name (Press Enter to apply)"
              />
            </div>
            <Tooltip label="Copy Invite Link" side="bottom">
              <button
                onClick={handleCopyCode}
                className="p-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors shadow-sm active:scale-90"
              >
                {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
              </button>
            </Tooltip>
          </div>

          {/* Inline editable Nickname capsule */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 shrink-0 pointer-events-auto">
            <div className="flex flex-col items-start leading-none">
              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-widest leading-none mb-0.5">My Badge</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 15);
                  setUsername(val);
                  if (socket) {
                    socket.emit("join-room", { roomId, username: val });
                  }
                }}
                className="text-xs font-bold text-indigo-600 bg-transparent border-none p-0 m-0 outline-none focus:ring-0 w-16 sm:w-24 placeholder-indigo-300"
                placeholder="Name"
                title="Click to edit nickname"
              />
            </div>
            <span className="text-xs text-indigo-400 pointer-events-none select-none select-none">✏️</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm rounded-xl p-1 shrink-0">
            <Tooltip label="Undo" side="bottom">
              <button
                onClick={() => {
                  undo();
                  vibrate(5);
                }}
                disabled={historyIndex < 0}
                className="p-2 sm:p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-lg transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <Undo2 size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Redo" side="bottom">
              <button
                onClick={() => {
                  redo();
                  vibrate(5);
                }}
                disabled={historyIndex >= history.length - 1}
                className="p-2 sm:p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-lg transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <Redo2 size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Keyboard shortcuts button removed per user request */}

          <div className="h-8 w-[1px] bg-slate-200 mx-0.5 hidden xs:block" />

          <Tooltip label={showInvite ? "Close" : "Tools"} side="bottom">
            <button
              onClick={toggleTools}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold transition-all border active:scale-95 shadow-sm shrink-0",
                showInvite
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-100"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Palette size={16} />
              <span className="text-[10px] uppercase font-black tracking-widest hidden sm:inline">Tools</span>
            </button>
          </Tooltip>

          <Tooltip label="Live Artists" side="bottom">
            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm shrink-0 cursor-default">
              <Users size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black tracking-widest text-slate-600">
                {Object.keys(users).length} <span className="hidden sm:inline">Artists</span>
              </span>
            </div>
          </Tooltip>

          {/* Grid Toggle */}
          <Tooltip label="Toggle Grid" side="bottom">
            <button
              onClick={() => {
                setShowGrid(!showGrid);
                vibrate(5);
              }}
              className={cn(
                "p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm shrink-0 flex items-center justify-center",
                showGrid
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-white/90 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-white hover:text-indigo-600 hover:border-slate-300"
              )}
            >
              <Grid size={16} />
            </button>
          </Tooltip>


          <button
            onClick={onLeave}
            className="flex items-center justify-center w-10 sm:w-auto h-10 sm:px-4 bg-white/90 backdrop-blur-md text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl font-bold transition-all text-sm border border-slate-200 shadow-sm active:scale-90 shrink-0 pointer-events-auto"
          >
            <LogOut size={16} /> <span className="hidden lg:inline ml-2 uppercase text-[10px] tracking-widest">Leave</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={cn("flex-1 flex overflow-hidden relative", showGrid ? "bg-slate-100" : "bg-slate-50")}>
        {/* Full-screen Canvas Area */}
        <div ref={containerRef} className="absolute inset-0 z-0 select-none overflow-hidden">
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-10 z-10"
              style={{
                backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`,
                backgroundPosition: `${transform.x}px ${transform.y}px`
              }}
            />
          )}
          {/* Symmetry Guides */}
          {(symmetryMode === "horizontal" || symmetryMode === "both") && (
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-slate-200 pointer-events-none z-10" />
          )}
          {(symmetryMode === "vertical" || symmetryMode === "both") && (
            <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-slate-200 pointer-events-none z-10" />
          )}

          <canvas
            ref={canvasRef}
            className={cn(
              "touch-none outline-none will-change-transform canvas-area shadow-2xl transition-shadow",
              isTransitioning && "transition-transform duration-300 ease-out",
              isHandTool ? "cursor-grab active:cursor-grabbing" : "cursor-none"
            )}
            style={{
              width: roomSettings.aspectRatio === "16:9" ? 1920 : 
                     roomSettings.aspectRatio === "4:3" ? 1440 : 
                     (roomSettings.aspectRatio === "1:1" || roomSettings.aspectRatio === "9:16" || roomSettings.aspectRatio === "3:4") ? 1080 : 1920, 
              height: roomSettings.aspectRatio === "9:16" ? 1920 : 
                      roomSettings.aspectRatio === "3:4" ? 1440 : 1080, 
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0'
            }}
            onMouseDown={(e) => startDrawing(e.nativeEvent)}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrawing}
            onMouseLeave={() => {
              setIsOverCanvas(false);
              stopDrawing();
            }}
            onMouseEnter={() => setIsOverCanvas(true)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          />

          {/* Interactive Transform Overlay for selections */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              width: canvasRef.current?.width || '100%',
              height: canvasRef.current?.height || '100%'
            }}
          >
            {/* If editingTextId exists, draw dashed border and label around it */}
            {(() => {
              if (!editingTextId) return null;
              const t = placedTexts.find(x => x.id === editingTextId);
              if (!t || t.layerId !== activeLayerId) return null;

              const textLength = t.text.length;
              const height = t.size * 3;
              const width = textLength * t.size * 1.6;
              const px = t.x;
              const py = t.y;

              let minX = px - width / 2;
              if (t.align === "left") minX = px;
              else if (t.align === "right") minX = px - width;

              const minY = py - height / 2;

              return (
                <div
                  className="absolute border border-dashed border-indigo-500 bg-indigo-50/15 rounded pointer-events-none"
                  style={{
                    left: `${minX}px`,
                    top: `${minY}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: `rotate(${t.rotation || 0}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="absolute -top-5 left-0 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                    Editing Text
                  </div>
                </div>
              );
            })()}

            {/* If editingShapeId exists, draw dashed border and handles */}
            {(() => {
              if (!editingShapeId) return null;
              const s = placedShapes.find(x => x.id === editingShapeId);
              if (!s || s.layerId !== activeLayerId) return null;

              const w = s.width;
              const h = s.height;
              const left = s.x - w / 2;
              const top = s.y - h / 2;

              return (
                <div
                  className="absolute border border-dashed border-indigo-600 bg-indigo-50/10 rounded pointer-events-none animate-fade-in"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    transform: `rotate(${s.rotation || 0}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="absolute -top-5 left-0 bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider whitespace-nowrap pointer-events-none">
                    {s.type} Shape
                  </div>
                  {/* Top Left Resize Handle */}
                  <div
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 flex items-center justify-center cursor-nwse-resize pointer-events-auto group/handle z-20"
                    onMouseDown={(e) => startResize(e, "tl", s)}
                    onTouchStart={(e) => startResize(e, "tl", s)}
                  >
                    <div className="w-3 h-3 bg-white border-2 border-indigo-600 rounded-full group-hover/handle:scale-125 transition-transform shadow-sm" />
                  </div>
                  {/* Top Right Resize Handle */}
                  <div
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 flex items-center justify-center cursor-nesw-resize pointer-events-auto group/handle z-20"
                    onMouseDown={(e) => startResize(e, "tr", s)}
                    onTouchStart={(e) => startResize(e, "tr", s)}
                  >
                    <div className="w-3 h-3 bg-white border-2 border-indigo-600 rounded-full group-hover/handle:scale-125 transition-transform shadow-sm" />
                  </div>
                  {/* Bottom Left Resize Handle */}
                  <div
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 flex items-center justify-center cursor-nesw-resize pointer-events-auto group/handle z-20"
                    onMouseDown={(e) => startResize(e, "bl", s)}
                    onTouchStart={(e) => startResize(e, "bl", s)}
                  >
                    <div className="w-3 h-3 bg-white border-2 border-indigo-600 rounded-full group-hover/handle:scale-125 transition-transform shadow-sm" />
                  </div>
                  {/* Bottom Right Resize Handle */}
                  <div
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 flex items-center justify-center cursor-nwse-resize pointer-events-auto group/handle z-20"
                    onMouseDown={(e) => startResize(e, "br", s)}
                    onTouchStart={(e) => startResize(e, "br", s)}
                  >
                    <div className="w-3 h-3 bg-white border-2 border-indigo-600 rounded-full group-hover/handle:scale-125 transition-transform shadow-sm" />
                  </div>
                </div>
              );
            })()}

            {/* Render borders for other shapes in selectedShapeIds */}
            {selectedShapeIds.map(id => {
              if (id === editingShapeId) return null;
              const s = placedShapes.find(x => x.id === id);
              if (!s || s.layerId !== activeLayerId) return null;

              const w = s.width;
              const h = s.height;
              const left = s.x - w / 2;
              const top = s.y - h / 2;

              return (
                <div
                  key={id}
                  className="absolute border border-dashed border-indigo-400 bg-indigo-50/5 rounded pointer-events-none"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    transform: `rotate(${s.rotation || 0}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="absolute -top-4 left-0 bg-indigo-400 text-white text-[8px] px-1 py-0.5 rounded font-black uppercase tracking-wider whitespace-nowrap pointer-events-none">
                    {s.type} Selected
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Toolbar (Centered Bottom) */}
        <div className="fixed bottom-6 xs:bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-3 z-30 pointer-events-none group w-full max-w-[95vw] justify-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl sm:rounded-[2.5rem] p-1.5 sm:p-2 flex items-center pointer-events-auto overflow-x-auto no-scrollbar scroll-smooth"
          >
            <div className="flex items-center gap-1 sm:gap-1.5 pr-2 sm:pr-3 border-r border-slate-100 flex-nowrap shrink-0 ml-1">
              <Tooltip label="Pencil" side="top">
                <ToolButton active={tool === "pencil"} onClick={() => handleToolChange("pencil")} icon={<Pencil size={18} />} label="Pencil" color="bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20 border-indigo-200" />
              </Tooltip>
              <Tooltip label="Brush" side="top">
                <ToolButton active={tool === "brush"} onClick={() => handleToolChange("brush")} icon={<Brush size={18} />} label="Brush" color="bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600/10 border-indigo-200 shadow-inner" />
              </Tooltip>
              <Tooltip label="Spray" side="top">
                <ToolButton active={tool === "spray"} onClick={() => handleToolChange("spray")} icon={<CloudRain size={18} />} label="Spray" color="bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20 border-indigo-200" />
              </Tooltip>
              <Tooltip label="Smudge" side="top">
                <ToolButton active={tool === "smudge"} onClick={() => handleToolChange("smudge")} icon={<Fingerprint size={18} />} label="Smudge" color="bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20 border-indigo-200" />
              </Tooltip>
              <Tooltip label="Eraser" side="top">
                <ToolButton active={tool === "eraser"} onClick={() => handleToolChange("eraser")} icon={<Eraser size={18} />} label="Eraser" color="bg-slate-900 text-white shadow-xl ring-2 ring-slate-800/20" />
              </Tooltip>
              <Tooltip label="Text Tool" side="top">
                <ToolButton active={tool === "text"} onClick={() => handleToolChange("text")} icon={<Type size={18} />} label="Text" color="bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20 border-indigo-200" />
              </Tooltip>
              <Tooltip label="Shapes Tool" side="top">
                <ToolButton active={tool === "shape"} onClick={() => handleToolChange("shape")} icon={<Shapes size={18} />} label="Shapes" color="bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20 border-indigo-200" />
              </Tooltip>
              <Tooltip label="Eye Dropper" side="top">
                <ToolButton active={tool === "picker"} onClick={() => handleToolChange("picker")} icon={<Pipette size={18} />} label="Picker" color="bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20 border-indigo-200" />
              </Tooltip>
              <Tooltip label="Emoji Stamps" side="top">
                <ToolButton active={tool === "stamp"} onClick={() => handleToolChange("stamp")} icon={<Sticker size={18} />} label="Stickers" color="bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20 border-indigo-200" />
              </Tooltip>
              <div className="w-[1px] h-6 bg-slate-100 mx-1 shrink-0" />

              {/* View/Zoom Controls Prominent */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 border border-slate-100 rounded-xl px-1">
                <Tooltip label="Zoom Out" side="top">
                  <button
                    onClick={() => {
                      setTransformSmooth(prev => {
                        const newScale = Math.max(prev.scale - 0.2, 0.1);
                        return { ...prev, scale: newScale };
                      }); vibrate(5);
                    }}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all active:scale-90"
                  >
                    <Minus size={14} />
                  </button>
                </Tooltip>

                <Tooltip label="Reset (Click for 100%)" side="top">
                  <button
                    onClick={() => { setTransformSmooth({ x: 0, y: 0, scale: 1 }); vibrate(15); }}
                    className={cn(
                      "px-2 py-1 text-[9px] font-black rounded-lg transition-all tabular-nums min-w-[40px] text-center uppercase tracking-tighter",
                      isTransformModified ? "text-indigo-600 bg-white shadow-sm ring-1 ring-indigo-100" : "text-slate-400"
                    )}
                  >
                    {Math.round(transform.scale * 100)}%
                  </button>
                </Tooltip>

                <Tooltip label="Zoom In" side="top">
                  <button
                    onClick={() => {
                      setTransformSmooth(prev => {
                        const newScale = Math.min(prev.scale + 0.2, 10);
                        return { ...prev, scale: newScale };
                      }); vibrate(5);
                    }}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all active:scale-90"
                  >
                    <Plus size={14} />
                  </button>
                </Tooltip>

                <Tooltip label="Fit Canvas (Reset View)" side="top">
                  <button
                    onClick={() => { setTransformSmooth({ x: 0, y: 0, scale: 1 }); vibrate(15); }}
                    className={cn(
                      "p-2 rounded-lg transition-all active:scale-90",
                      !isTransformModified ? "text-slate-300 pointer-events-none" : "text-slate-500 hover:text-indigo-600 hover:bg-white"
                    )}
                  >
                    <Maximize size={14} />
                  </button>
                </Tooltip>

                <Tooltip label={isHandTool ? "Switch to Draw" : "Hand Pan (Click then drag canvas)"} side="top">
                  <button
                    onClick={() => { setIsHandTool(!isHandTool); vibrate(10); }}
                    className={cn(
                      "p-2 rounded-lg transition-all active:scale-90",
                      isHandTool ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-white"
                    )}
                  >
                    <Hand size={14} />
                  </button>
                </Tooltip>
              </div>

              <div className="w-[1px] h-6 bg-slate-100 mx-1 shrink-0" />

              <Tooltip label={isLayersOpen ? "Close Layers" : "Open Layers"} side="top">
                <div className="relative">
                  <ToolButton
                    active={isLayersOpen}
                    onClick={() => {
                      setIsLayersOpen(prev => !prev);
                      setIsPaletteOpen(false);
                    }}
                    icon={<Layers size={18} />}
                    label="Layers"
                    color="bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-400/20"
                  />
                  {layers.length > 1 && !isLayersOpen && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm pointer-events-none"
                    >
                      {layers.length}
                    </motion.div>
                  )}
                </div>
              </Tooltip>

              <div className="w-[1px] h-6 bg-slate-100 mx-1 shrink-0" />

              <Tooltip label={isPaletteOpen ? "Close Palettes" : "Open Palettes"} side="top">
                <div className="relative">
                  <ToolButton
                    active={isPaletteOpen}
                    onClick={() => {
                      setIsPaletteOpen(prev => !prev);
                      setIsLayersOpen(false);
                      vibrate(10);
                    }}
                    icon={<Palette size={18} />}
                    label="Palettes"
                    color="bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-400/20"
                  />
                  {palettes.length > 0 && !isPaletteOpen && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm pointer-events-none"
                    >
                      {palettes.length}
                    </motion.div>
                  )}
                </div>
              </Tooltip>

              <div className="w-[1px] h-6 bg-slate-100 mx-1 shrink-0" />

              <Tooltip label={isChatOpen ? "Close Chat" : "Open Chat"} side="top">
                <div className="relative">
                  <ToolButton
                    active={isChatOpen}
                    onClick={toggleChat}
                    icon={<MessageSquare size={18} />}
                    label="Chat"
                    color="bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-400/20"
                  />
                  {unreadCount > 0 && !isChatOpen && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm pointer-events-none"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.div>
                  )}
                </div>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 shrink-0 mr-1">
              <Tooltip label="Custom Color Picker" side="top">
                <label
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-4 border-white rounded-xl shadow-lg ring-1 ring-slate-200 hover:scale-105 active:scale-90 transition-all cursor-pointer overflow-hidden relative shrink-0 group"
                  style={{ backgroundColor: color }}
                >
                  <Palette size={16} className={cn("transition-opacity", color === "#ffffff" ? "text-slate-800" : "text-white")} />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      vibrate(5);
                      // Update cursor state for others
                      if (socket && roomId) {
                        const { x, y } = getCoordinates({ clientX: mousePosRef.current.x, clientY: mousePosRef.current.y });
                        socket.emit("cursor-move", {
                          roomId, x, y, tool, color: e.target.value,
                          isDrawing: drawingState.current.isDrawing
                        });
                      }
                    }}
                    className="opacity-0 absolute inset-0 cursor-pointer"
                  />
                </label>
              </Tooltip>
              <div className="flex items-center gap-2 shrink-0">
                {COLORS.slice(0, 12).map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      vibrate(5);
                      // Update cursor state for others
                      if (socket && roomId) {
                        const { x, y } = getCoordinates({ clientX: mousePosRef.current.x, clientY: mousePosRef.current.y });
                        socket.emit("cursor-move", {
                          roomId, x, y, tool, color: c,
                          isDrawing: drawingState.current.isDrawing
                        });
                      }
                    }}
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 transition-all hover:scale-125 active:scale-75 shrink-0",
                      color === c && "ring-2 ring-indigo-500 ring-offset-2 scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Options Drawer (Left Side) */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ x: -20, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -20, opacity: 0, scale: 0.95 }}
              className="fixed left-4 right-4 sm:left-6 top-20 sm:top-24 bottom-28 sm:bottom-32 sm:w-80 bg-white border border-slate-200 shadow-2xl rounded-3xl sm:rounded-[2.5rem] z-40 p-6 sm:p-8 flex flex-col gap-6 sm:gap-8 overflow-y-auto overflow-x-hidden no-scrollbar transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Configurations</h3>
                  <span className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5">Customize your stroke</span>
                </div>
                <button
                  onClick={() => {
                    setShowInvite(false);
                    vibrate(5);
                  }}
                  className="p-2 sm:p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Room Info for Mobile */}
              <div className="lg:hidden p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Room Code / Custom Name</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={localRoomInput}
                      onChange={(e) => setLocalRoomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRoomSubmit(localRoomInput);
                          vibrate(10);
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={() => {
                        handleRoomSubmit(localRoomInput);
                      }}
                      className="flex-1 text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500/80 uppercase"
                      placeholder="ENTER-ROOM-CODE"
                      title="Enter room code or name, and click outside or press Enter to join"
                    />
                    <button
                      onClick={handleCopyCode}
                      className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-500 hover:text-indigo-600 active:scale-90 transition-all shrink-0"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1 flex-1">
                    {(Object.values(users) as UserPresence[]).slice(0, 5).map((u, i) => {
                      const isIdle = currentTime - (u.lastActiveAt || 0) > 60000;
                      let indicatorColor = "bg-sky-500";
                      if (u.isDrawing) indicatorColor = "bg-green-500 animate-pulse";
                      else if (isIdle) indicatorColor = "bg-amber-500";

                      return (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600 uppercase relative">
                          {u.username[0]}
                          <span className={cn("absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white", indicatorColor)} />
                        </div>
                      );
                    })}
                    {(Object.values(users) as UserPresence[]).length > 5 && (
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-800 text-white flex items-center justify-center text-[8px] font-black">
                        +{(Object.values(users) as UserPresence[]).length - 5}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{(Object.values(users) as UserPresence[]).length} Active</span>
                </div>
              </div>

              <div className="space-y-8 flex-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brush Size</label>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{size}PX</span>
                  </div>
                  <input
                    type="range" min="1" max="100" value={size}
                    onChange={(e) => {
                      setSize(parseInt(e.target.value));
                      if (parseInt(e.target.value) % 10 === 0) vibrate(5);
                    }}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex gap-1.5 sm:gap-2">
                    {[2, 8, 20, 50].map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setSize(s);
                          vibrate(10);
                        }}
                        className={cn(
                          "flex-1 py-3 sm:py-3.5 rounded-2xl text-[10px] font-bold border transition-all active:scale-95",
                          size === s ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {s === 2 ? 'S' : s === 8 ? 'M' : s === 20 ? 'L' : 'XL'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Eraser Size</label>
                    <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{eraserSize}PX</span>
                  </div>
                  <input
                    type="range" min="1" max="150" value={eraserSize}
                    onChange={(e) => {
                      setEraserSize(parseInt(e.target.value));
                      if (parseInt(e.target.value) % 10 === 0) vibrate(5);
                    }}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                  <div className="flex gap-1.5 sm:gap-2">
                    {[5, 15, 30, 80].map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setEraserSize(s);
                          vibrate(10);
                        }}
                        className={cn(
                          "flex-1 py-3 sm:py-3.5 rounded-2xl text-[10px] font-bold border transition-all active:scale-95",
                          eraserSize === s ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {s === 5 ? 'S' : s === 15 ? 'M' : s === 30 ? 'L' : 'XL'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tip Profile</label>
                  <div className="grid grid-cols-3 bg-slate-50 border border-slate-100/50 rounded-[1.5rem] p-1.5 gap-1.5 sm:gap-2">
                    {[
                      { id: "round", icon: <Circle size={14} fill={brushStyle === "round" ? "currentColor" : "none"} /> },
                      { id: "square", icon: <Square size={14} fill={brushStyle === "square" ? "currentColor" : "none"} /> },
                      { id: "soft", icon: <Sparkles size={14} /> },
                      { id: "star", icon: <Star size={14} fill={brushStyle === "star" ? "currentColor" : "none"} /> },
                      { id: "diamond", icon: <Diamond size={14} fill={brushStyle === "diamond" ? "currentColor" : "none"} /> },
                      { id: "cross", icon: <Plus size={14} /> },
                    ].map((tip) => (
                      <button
                        key={tip.id}
                        onClick={() => {
                          setBrushStyle(tip.id as BrushStyle);
                          vibrate(10);
                        }}
                        className={cn(
                          "py-4 sm:py-5 rounded-2xl flex justify-center transition-all active:scale-95",
                          brushStyle === tip.id ? "bg-white shadow-md text-indigo-600" : "text-slate-300 hover:text-slate-400"
                        )}
                      >
                        {tip.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Tool Config */}
                {tool === "text" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-6 pt-2">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Text Content</label>
                      <input
                        type="text"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        placeholder="Enter text..."
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Font Style</label>
                      <div className="max-h-48 overflow-y-auto no-scrollbar border border-slate-100 rounded-2xl bg-slate-50 p-1.5 space-y-1">
                        {[
                          { name: 'Sans', value: 'sans-serif' },
                          { name: 'Serif', value: 'serif' },
                          { name: 'Mono', value: 'monospace' },
                          { name: 'Cursive', value: 'cursive' },
                          { name: 'Inter (Modern)', value: 'Inter, sans-serif' },
                          { name: 'Playfair (Serif)', value: '"Playfair Display", Georgia, serif' },
                          { name: 'Fira (Mono)', value: '"Fira Code", monospace' },
                          { name: 'Fredoka (Playful)', value: 'Fredoka, sans-serif' },
                          { name: 'Caveat (Hand)', value: 'Caveat, cursive' },
                          { name: 'Bebas (Display)', value: '"Bebas Neue", sans-serif' },
                          { name: 'Pacifico (Cursive)', value: 'Pacifico, cursive' },
                          { name: 'Montserrat', value: 'Montserrat, sans-serif' },
                          { name: 'Cinzel (Classic)', value: 'Cinzel, serif' }
                        ].map(font => (
                          <button
                            key={font.value}
                            onClick={() => setFontFamily(font.value)}
                            className={cn(
                              "w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between",
                              fontFamily === font.value
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-slate-600 border-transparent hover:border-slate-100"
                            )}
                            style={{ fontFamily: font.value }}
                          >
                            <span>{font.name}</span>
                            <span className="text-[10px] opacity-75">Aa</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setIsBold(!isBold); vibrate(10); }}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold border transition-all text-[10px] uppercase tracking-widest",
                          isBold ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                        )}
                      >
                        Bold
                      </button>
                      <button
                        onClick={() => { setIsItalic(!isItalic); vibrate(10); }}
                        className={cn(
                          "flex-1 py-3 rounded-xl italic border transition-all text-[10px] uppercase tracking-widest",
                          isItalic ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                        )}
                      >
                        Italic
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Text Alignment</label>
                      <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1 gap-1">
                        {[
                          { value: 'left', icon: <AlignLeft size={16} />, label: 'Left' },
                          { value: 'center', icon: <AlignCenter size={16} />, label: 'Center' },
                          { value: 'right', icon: <AlignRight size={16} />, label: 'Right' }
                        ].map(alignOption => (
                          <button
                            key={alignOption.value}
                            onClick={() => { setTextAlign(alignOption.value as "left" | "center" | "right"); vibrate(8); }}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-center text-xs font-bold transition-all border",
                              textAlign === alignOption.value
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-slate-600 border-transparent hover:border-slate-100 active:scale-95"
                            )}
                          >
                            {alignOption.icon}
                            <span className="text-[9px] font-bold uppercase tracking-wide">{alignOption.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {editingTextId && (
                      <div className="space-y-3 bg-indigo-50/40 p-4 rounded-3xl border border-indigo-100/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">
                            ● Editing text
                          </span>
                          <button
                            onClick={() => { saveToHistory(); setEditingTextId(null); vibrate(10); }}
                            className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                          >
                            Deselect
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            const next = placedTextsRef.current.filter(t => t.id !== editingTextId);
                            setPlacedTexts(next);
                            placedTextsRef.current = next;
                            saveToHistory(next);
                            setEditingTextId(null);
                            socket?.emit("sync-placed-texts", { roomId, placedTexts: next });
                            setTimeout(() => compositeLayers(), 10);
                            vibrate(12);
                          }}
                          className="w-full py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:border-rose-200 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                          Delete Text
                        </button>
                      </div>
                    )}

                    <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-100/50">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outline</label>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Stroke Effect</span>
                        </div>
                        <button
                          onClick={() => { setHasOutline(!hasOutline); vibrate(15); }}
                          className={cn(
                            "w-10 h-6 rounded-full transition-all relative p-1",
                            hasOutline ? "bg-indigo-600" : "bg-slate-200"
                          )}
                        >
                          <motion.div
                            animate={{ x: hasOutline ? 16 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>

                      <AnimatePresence>
                        {hasOutline && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="space-y-3 overflow-hidden"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative group">
                                <input
                                  type="color"
                                  value={outlineColor}
                                  onChange={(e) => setOutlineColor(e.target.value)}
                                  className="w-10 h-10 rounded-xl overflow-hidden border-none cursor-pointer p-0 bg-transparent"
                                />
                                <div className="absolute inset-0 rounded-xl border-2 border-white pointer-events-none shadow-inner" />
                              </div>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>Thickness</span>
                                  <span className="text-indigo-500">{textOutlineWidth}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="15"
                                  value={textOutlineWidth}
                                  onChange={(e) => setTextOutlineWidth(parseInt(e.target.value))}
                                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rotation</label>
                        <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{textRotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={textRotation}
                        onChange={(e) => setTextRotation(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Shape Tool Config */}
                {tool === "shape" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-6 pt-2">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shape Type Preset</label>
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1.5">
                        {[
                          { type: 'square', id: 'Square', icon: <Square size={16} /> },
                          { type: 'circle', id: 'Circle', icon: <Circle size={16} /> },
                          { type: 'triangle', id: 'Triangle', icon: <Triangle size={16} /> },
                          { type: 'star', id: 'Star', icon: <Star size={16} /> },
                          { type: 'hexagon', id: 'Hexagon', icon: <Hexagon size={16} /> },
                          { type: 'arrow', id: 'Arrow', icon: <ArrowUp size={16} /> }
                        ].map(preset => (
                          <button
                            key={preset.type}
                            onClick={() => { setShapeType(preset.type as any); vibrate(8); }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all text-xs font-bold",
                              shapeType === preset.type
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-slate-600 border-transparent hover:border-slate-100 active:scale-95"
                            )}
                          >
                            {preset.icon}
                            <span className="text-[8px] uppercase tracking-wide">{preset.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Width</label>
                        <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{shapeWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="800"
                        value={shapeWidth}
                        onChange={(e) => setShapeWidth(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Height</label>
                        <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{shapeHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="800"
                        value={shapeHeight}
                        onChange={(e) => setShapeHeight(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rotation</label>
                        <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{shapeRotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={shapeRotation}
                        onChange={(e) => setShapeRotation(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Border Thickness</label>
                        <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{shapeLineWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={shapeLineWidth}
                        onChange={(e) => setShapeLineWidth(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-100/50">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fill Shape</label>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Color Fill Effect</span>
                        </div>
                        <button
                          onClick={() => { setShapeIsFilled(!shapeIsFilled); vibrate(15); }}
                          className={cn(
                            "w-10 h-6 rounded-full transition-all relative p-1",
                            shapeIsFilled ? "bg-indigo-600" : "bg-slate-200"
                          )}
                        >
                          <motion.div
                            animate={{ x: shapeIsFilled ? 16 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>

                      <AnimatePresence>
                        {shapeIsFilled && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="space-y-3 overflow-hidden"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative group">
                                <input
                                  type="color"
                                  value={shapeFillColor}
                                  onChange={(e) => setShapeFillColor(e.target.value)}
                                  className="w-10 h-10 rounded-xl overflow-hidden border-none cursor-pointer p-0 bg-transparent"
                                />
                                <div className="absolute inset-0 rounded-xl border-2 border-white pointer-events-none shadow-inner" />
                              </div>
                              <div className="flex-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fill Color Accent</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {editingShapeId && (
                      <div className="space-y-3 bg-indigo-50/40 p-4 rounded-3xl border border-indigo-100/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">
                            ● Editing Shape
                          </span>
                          <button
                            onClick={() => { saveToHistory(); setEditingShapeId(null); vibrate(10); }}
                            className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                          >
                            Deselect
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            const next = placedShapesRef.current.filter(s => s.id !== editingShapeId);
                            setPlacedShapes(next);
                            placedShapesRef.current = next;
                            saveToHistory(undefined, next);
                            setEditingShapeId(null);
                            socket?.emit("sync-placed-shapes", { roomId, placedShapes: next });
                            setTimeout(() => compositeLayers(), 10);
                            vibrate(12);
                          }}
                          className="w-full py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:border-rose-200 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                          Delete Shape
                        </button>
                      </div>
                    )}

                    {/* Shape alignment panel */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-100/50">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Multi-Select Mode</label>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Select multiple shapes</span>
                        </div>
                        <button
                          onClick={() => {
                            setIsMultiSelectMode(!isMultiSelectMode);
                            vibrate(15);
                            if (!isMultiSelectMode) {
                              if (editingShapeId) {
                                setSelectedShapeIds([editingShapeId]);
                                selectedShapeIdsRef.current = [editingShapeId];
                              }
                            } else {
                              if (editingShapeId) {
                                setSelectedShapeIds([editingShapeId]);
                                selectedShapeIdsRef.current = [editingShapeId];
                              } else {
                                setSelectedShapeIds([]);
                                selectedShapeIdsRef.current = [];
                              }
                            }
                          }}
                          className={cn(
                            "w-10 h-6 rounded-full transition-all relative p-1",
                            isMultiSelectMode ? "bg-indigo-600" : "bg-slate-200"
                          )}
                        >
                          <motion.div
                            animate={{ x: isMultiSelectMode ? 16 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-400 leading-normal">
                        Enable to select & drag multiple shapes by clicking them. You can also hold <kbd className="bg-slate-200 px-1 rounded font-mono text-[7px] text-slate-600">Shift</kbd> to multi-select.
                      </p>

                      <div className="pt-2 border-t border-slate-200/55 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Shape Alignment</span>
                          {selectedShapeIds.length > 1 && (
                            <span className="bg-indigo-100 text-indigo-700 text-[8px] px-2 py-0.5 rounded-full font-bold">
                              {selectedShapeIds.length} Selected
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            disabled={selectedShapeIds.length <= 1}
                            onClick={() => handleAlignShapes("left")}
                            className={cn(
                              "py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                              selectedShapeIds.length > 1
                                ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                : "bg-slate-100/50 text-slate-400 border-transparent"
                            )}
                            title="Align Left Edges"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider">Left</span>
                          </button>

                          <button
                            disabled={selectedShapeIds.length <= 1}
                            onClick={() => handleAlignShapes("centerX")}
                            className={cn(
                              "py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                              selectedShapeIds.length > 1
                                ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                : "bg-slate-100/50 text-slate-400 border-transparent"
                            )}
                            title="Align Center Horizontally"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider">H-Center</span>
                          </button>

                          <button
                            disabled={selectedShapeIds.length <= 1}
                            onClick={() => handleAlignShapes("right")}
                            className={cn(
                              "py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                              selectedShapeIds.length > 1
                                ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                : "bg-slate-100/50 text-slate-400 border-transparent"
                            )}
                            title="Align Right Edges"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider">Right</span>
                          </button>

                          <button
                            disabled={selectedShapeIds.length <= 1}
                            onClick={() => handleAlignShapes("top")}
                            className={cn(
                              "py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                              selectedShapeIds.length > 1
                                ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                : "bg-slate-100/50 text-slate-400 border-transparent"
                            )}
                            title="Align Top Edges"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider">Top</span>
                          </button>

                          <button
                            disabled={selectedShapeIds.length <= 1}
                            onClick={() => handleAlignShapes("centerY")}
                            className={cn(
                              "py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                              selectedShapeIds.length > 1
                                ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                : "bg-slate-100/50 text-slate-400 border-transparent"
                            )}
                            title="Align Center Vertically"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider">V-Center</span>
                          </button>

                          <button
                            disabled={selectedShapeIds.length <= 1}
                            onClick={() => handleAlignShapes("bottom")}
                            className={cn(
                              "py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                              selectedShapeIds.length > 1
                                ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                : "bg-slate-100/50 text-slate-400 border-transparent"
                            )}
                            title="Align Bottom Edges"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider">Bottom</span>
                          </button>
                        </div>

                        {selectedShapeIds.length <= 1 && (
                          <p className="text-[7.5px] text-slate-400/80 leading-snug pt-1 text-center font-medium">
                            ※ Select 2 or more shapes to align them.
                          </p>
                        )}
                      </div>
                    </div>


                  </motion.div>
                )}

                {/* Stamp Tool Config */}
                {tool === "stamp" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-6 pt-2">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Emoji Stamps</label>
                      <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-[1.5rem]">
                        {["✨", "🔥", "❤️", "⭐", "🎨", "🚀", "🌈", "🦋", "🍄", "🐱", "🧿", "🍀", "💎", "🍭", "👾"].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => { setStampEmoji(emoji); vibrate(5); }}
                            className={cn(
                              "aspect-square text-lg flex items-center justify-center rounded-xl transition-all active:scale-75",
                              stampEmoji === emoji ? "bg-white shadow-md scale-110" : "hover:bg-white/50"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Custom Emoji</label>
                      <input
                        type="text"
                        value={stampEmoji}
                        onChange={(e) => setStampEmoji(e.target.value.substring(0, 4))} // Handle composite emojis
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-center text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="Drop any emoji..."
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rotation</label>
                        <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{textRotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={textRotation}
                        onChange={(e) => setTextRotation(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-[2rem] p-6 space-y-6 shadow-inner">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opacity</span>
                        <span className="text-[10px] font-bold text-indigo-600">{Math.round(opacity * 100)}%</span>
                      </div>
                      <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                    {(tool !== "spray" && tool !== "smudge") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hardness</span>
                          <span className="text-[10px] font-bold text-indigo-600">{Math.round(hardness * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={hardness} onChange={(e) => setHardness(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    )}
                    {(tool !== "spray" && tool !== "smudge") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flow</span>
                          <span className="text-[10px] font-bold text-indigo-600">{Math.round(flow * 100)}%</span>
                        </div>
                        <input type="range" min="0.05" max="1" step="0.05" value={flow} onChange={(e) => setFlow(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    )}
                    {(tool !== "spray" && tool !== "smudge" && tool !== "eraser") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jitter</span>
                          <span className="text-[10px] font-bold text-indigo-600">{Math.round(jitter * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={jitter} onChange={(e) => setJitter(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    )}
                    {tool === "spray" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intensity</span>
                          <span className="text-[10px] font-bold text-indigo-600">{density}%</span>
                        </div>
                        <input type="range" min="5" max="100" value={density} onChange={(e) => setDensity(parseInt(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    )}
                    {tool === "smudge" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Smudge Intensity</span>
                          <span className="text-[10px] font-bold text-indigo-600">{Math.round(smudgeIntensity * 100)}%</span>
                        </div>
                        <input type="range" min="0.01" max="1" step="0.01" value={smudgeIntensity} onChange={(e) => setSmudgeIntensity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Smoothing</span>
                        <Tooltip label={isSmoothingEnabled ? "High Precision" : "Raw Input"} side="top">
                          <button
                            onClick={() => setIsSmoothingEnabled(!isSmoothingEnabled)}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-all duration-500 shadow-inner",
                              isSmoothingEnabled ? "bg-indigo-600" : "bg-slate-300"
                            )}
                          >
                            <motion.div
                              animate={{ x: isSmoothingEnabled ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute inset-y-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm"
                            />
                          </button>
                        </Tooltip>
                      </div>
                      <input type="range" min="0.1" max="0.95" step="0.01" value={smoothing} disabled={!isSmoothingEnabled} onChange={(e) => setSmoothing(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rainbow Effect</span>
                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">Smooth Color Cycling</span>
                      </div>
                      <button
                        onClick={() => { setIsRainbowMode(!isRainbowMode); vibrate(15); }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                          isRainbowMode
                            ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 text-white shadow-lg animate-gradient-x"
                            : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        {isRainbowMode ? "Active" : "Enable"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reflection</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 border border-slate-100/50 rounded-[1.5rem] p-1.5 gap-1.5 sm:gap-2">
                    {[
                      { id: "none", icon: <NoSymmetryIcon size={14} />, label: "Off" },
                      { id: "horizontal", icon: <ColumnsIcon size={14} />, label: "Horiz" },
                      { id: "vertical", icon: <RowsIcon size={14} />, label: "Vert" },
                      { id: "both", icon: <GridIcon size={14} />, label: "Quad" },
                    ].map((sym) => (
                      <Tooltip key={sym.id} label={sym.label} side="top">
                        <button
                          onClick={() => {
                            setSymmetryMode(sym.id as any);
                            vibrate(10);
                          }}
                          className={cn(
                            "py-4 sm:py-5 rounded-2xl flex justify-center transition-all active:scale-95",
                            symmetryMode === sym.id ? "bg-white shadow-md text-indigo-600" : "text-slate-300 hover:text-slate-400"
                          )}
                        >
                          {sym.icon}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Project</label>
                  <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Filename</span>
                      <input
                        type="text"
                        value={exportName}
                        onChange={(e) => setExportName(e.target.value)}
                        placeholder="Project name..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveImage('png')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                      >
                        <Download size={12} />
                        PNG
                      </button>
                      <button
                        onClick={() => handleSaveImage('jpeg')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                      >
                        <Download size={12} />
                        JPG
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-200/50">
                      <input
                        type="file"
                        id="load-image"
                        accept="image/*"
                        onChange={handleLoadImage}
                        className="hidden"
                      />
                      <label
                        htmlFor="load-image"
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-black text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Upload size={14} />
                        Import Artwork
                      </label>
                      <p className="text-[8px] text-slate-400 text-center mt-2 font-medium">Replaces current canvas</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsClearConfirmOpen(true);
                  vibrate(20);
                }}
                className="w-full py-4 flex items-center justify-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 hover:bg-rose-100 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
              >
                <Trash2 size={16} />
                <span>Canvas Wipe</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Removed bulky side panel as requested */}

        {/* Palettes Section */}
        <AnimatePresence>
          {isPaletteOpen && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="fixed left-4 right-4 sm:right-auto sm:left-6 top-20 sm:top-24 bottom-28 sm:bottom-32 sm:w-80 z-40 pointer-events-none"
            >
              <div className="pointer-events-auto h-full flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200 shadow-3xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Palette className="text-indigo-600" size={16} />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Palettes ({palettes.length})</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCreatePalette}
                      className="p-1 px-2 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-lg flex items-center gap-1"
                      title="Create custom blank palette"
                    >
                      <Plus size={10} /> Add New
                    </button>
                    <button
                      onClick={() => setIsPaletteOpen(false)}
                      className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {palettes.map((palette) => {
                    const isSelected = palette.id === selectedPaletteId;

                    return (
                      <div
                        key={palette.id}
                        onClick={() => setSelectedPaletteId(palette.id)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 relative group",
                          isSelected
                            ? "bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50 shadow-sm"
                            : "bg-slate-50/40 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {/* Palette Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {editingPaletteId === palette.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={editingPaletteName}
                                onChange={(e) => setEditingPaletteName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editingPaletteName.trim()) {
                                      const updated = palettes.map((p) =>
                                        p.id === palette.id ? { ...p, name: editingPaletteName.trim() } : p
                                      );
                                      setPalettes(updated);
                                    }
                                    setEditingPaletteId(null);
                                  } else if (e.key === "Escape") {
                                    setEditingPaletteId(null);
                                  }
                                }}
                                onBlur={() => {
                                  if (editingPaletteName.trim()) {
                                    const updated = palettes.map((p) =>
                                      p.id === palette.id ? { ...p, name: editingPaletteName.trim() } : p
                                    );
                                    setPalettes(updated);
                                  }
                                  setEditingPaletteId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-xs font-black bg-white border border-slate-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  if (palette.isPreset) return;
                                  setEditingPaletteId(palette.id);
                                  setEditingPaletteName(palette.name);
                                }}
                                className={cn(
                                  "font-black text-xs truncate max-w-[120px] font-sans text-slate-705",
                                  isSelected ? "text-indigo-950" : "text-slate-700"
                                )}
                                title={palette.isPreset ? palette.name : "Double click to rename"}
                              >
                                {palette.name}
                              </span>
                            )}

                            {palette.isPreset ? (
                              <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded uppercase tracking-wider">
                                Preset
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-teal-600 bg-teal-50 px-1 py-0.5 rounded uppercase tracking-wider">
                                Custom
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {!palette.isPreset && (
                              <button
                                onClick={() => {
                                  vibrate([15]);
                                  handleDeletePalette(palette.id);
                                }}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                title="Delete palette"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Colors Grid */}
                        <div className="grid grid-cols-6 gap-2">
                          {palette.colors.map((c, idx) => {
                            const isCurrentColorActive = color === c;
                            return (
                              <div
                                key={idx}
                                className="relative group/swatch"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setColor(c);
                                  vibrate(5);
                                }}
                              >
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-xl border border-slate-200 shadow-xs transition-all duration-150 hover:scale-110 cursor-pointer relative",
                                    isCurrentColorActive && "ring-2 ring-indigo-500 ring-offset-1 scale-105"
                                  )}
                                  style={{ backgroundColor: c }}
                                  title={c}
                                />
                                {!palette.isPreset && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveColorFromPalette(palette.id, c);
                                    }}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-slate-850 bg-slate-900 border border-white text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover/swatch:opacity-100 transition-opacity shadow leading-none font-sans"
                                    title="Remove color"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {/* Add active color to this custom palette */}
                          {!palette.isPreset && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddColorToPalette(palette.id, color);
                              }}
                              className="w-8 h-8 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50 flex items-center justify-center text-indigo-500 transition-all active:scale-90"
                              title={`Save current color (${color})`}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layers Section */}
        <AnimatePresence>
          {isLayersOpen && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="fixed left-4 right-4 sm:right-auto sm:left-6 top-20 sm:top-24 bottom-28 sm:bottom-32 sm:w-80 z-40 pointer-events-none"
            >
              <div className="pointer-events-auto h-full flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200 shadow-3xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Layers className="text-indigo-600" size={16} />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layers ({layers.length})</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleAddLayer}
                      className="p-1 px-2 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-lg flex items-center gap-1"
                    >
                      <Plus size={10} /> Add
                    </button>
                    <button
                      onClick={() => setIsLayersOpen(false)}
                      className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {[...layers].reverse().map((layer, reverseIndex) => {
                    const originalIndex = layers.length - 1 - reverseIndex;
                    const isActive = layer.id === activeLayerId;

                    return (
                      <div
                        key={layer.id}
                        onClick={() => setActiveLayerId(layer.id)}
                        className={cn(
                          "p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative group",
                          isActive
                            ? "bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-200"
                            : "bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {editingLayerId === layer.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={editingLayerName}
                                onChange={(e) => setEditingLayerName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editingLayerName.trim()) {
                                      const updated = layers.map((l) =>
                                        l.id === layer.id ? { ...l, name: editingLayerName.trim() } : l
                                      );
                                      setLayers(updated);
                                    }
                                    setEditingLayerId(null);
                                  } else if (e.key === "Escape") {
                                    setEditingLayerId(null);
                                  }
                                }}
                                onBlur={() => {
                                  if (editingLayerName.trim()) {
                                    const updated = layers.map((l) =>
                                      l.id === layer.id ? { ...l, name: editingLayerName.trim() } : l
                                    );
                                    setLayers(updated);
                                  }
                                  setEditingLayerId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-sm font-bold bg-white border border-slate-200 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLayerId(layer.id);
                                  setEditingLayerName(layer.name);
                                }}
                                className={cn(
                                  "font-bold text-sm truncate",
                                  isActive ? "text-indigo-900" : "text-slate-700"
                                )}
                                title="Double click to rename"
                              >
                                {layer.name}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                                Active
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={originalIndex === layers.length - 1}
                              onClick={() => {
                                vibrate([10]);
                                handleMoveLayer(layer.id, "up");
                              }}
                              className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-500 transition-colors"
                              title="Move layer up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              disabled={originalIndex === 0}
                              onClick={() => {
                                vibrate([10]);
                                handleMoveLayer(layer.id, "down");
                              }}
                              className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-500 transition-colors"
                              title="Move layer down"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-bold text-slate-400 w-12 text-left">Opacity</span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={layer.opacity}
                            onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                            className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">
                            {Math.round(layer.opacity * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-bold text-slate-400 w-12 text-left">Blend</span>
                          <select
                            value={layer.blendMode || "source-over"}
                            onChange={(e) => {
                              handleBlendModeChange(layer.id, e.target.value);
                              vibrate(8);
                            }}
                            className="flex-1 text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-400 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer shadow-sm transition-all"
                          >
                            <option value="source-over">Normal</option>
                            <option value="multiply">Multiply (Darken)</option>
                            <option value="screen">Screen (Lighten)</option>
                            <option value="overlay">Overlay (Contrast)</option>
                            <option value="darken">Darken</option>
                            <option value="lighten">Lighten</option>
                            <option value="color-dodge">Color Dodge</option>
                            <option value="color-burn">Color Burn</option>
                            <option value="hard-light">Hard Light</option>
                            <option value="soft-light">Soft Light</option>
                            <option value="difference">Difference</option>
                            <option value="exclusion">Exclusion</option>
                            <option value="hue">Hue</option>
                            <option value="saturation">Saturation</option>
                            <option value="color">Color</option>
                            <option value="luminosity">Luminosity</option>
                          </select>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100/10 pt-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleVisibility(layer.id)}
                              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                              title={layer.visible ? "Hide layer" : "Show layer"}
                            >
                              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>

                            {originalIndex > 0 && (
                              <button
                                onClick={() => {
                                  vibrate([15]);
                                  handleMergeLayerDown(layer.id);
                                }}
                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                                title="Merge layer down"
                              >
                                <ArrowDownToLine size={14} />
                              </button>
                            )}
                          </div>

                          {layers.length > 1 && (
                            <button
                              onClick={() => {
                                vibrate([15]);
                                handleDeleteLayer(layer.id);
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                              title="Delete layer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Section */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="fixed left-4 right-4 sm:left-auto sm:right-6 top-20 sm:top-24 bottom-28 sm:bottom-32 sm:w-80 z-40 pointer-events-none"
            >
              <div className="pointer-events-auto h-full flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200 shadow-3xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Live Chat</h3>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatSection
                    roomId={roomId}
                    username={username}
                    socket={socket}
                    chat={chat}
                    vibrate={vibrate}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template Settings Modal */}
        <AnimatePresence>
          {showTemplateModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-200"
              >
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Room Template</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                      Choose your canvas settings. You can always change this later.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Background Color</label>
                    <div className="flex flex-wrap gap-2">
                      {["#FFFFFF", "#F8FAFC", "#F1F5F9", "#E2E8F0", "#FEF3C7", "#DCFCE7", "#E0E7FF"].map(c => (
                        <button
                          key={c}
                          onClick={() => setRoomSettings({ ...roomSettingsRef.current, backgroundColor: c })}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-transform",
                            roomSettingsRef.current.backgroundColor === c ? "border-indigo-600 scale-110" : "border-slate-200 hover:scale-105"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "16:9", label: "Widescreen (16:9)" },
                        { id: "4:3", label: "Standard (4:3)" },
                        { id: "1:1", label: "Square (1:1)" },
                        { id: "9:16", label: "Mobile (9:16)" },
                        { id: "3:4", label: "Tablet (3:4)" }
                      ].map(ar => (
                        <button
                          key={ar.id}
                          onClick={() => setRoomSettings({ ...roomSettingsRef.current, aspectRatio: ar.id })}
                          className={cn(
                            "py-3 px-4 rounded-xl text-xs font-bold transition-all border",
                            roomSettingsRef.current.aspectRatio === ar.id 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {ar.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      vibrate([20]);
                      setShowTemplateModal(false);
                      if (socket && roomId) {
                        socket.emit("update-room-settings", { 
                          roomId, 
                          backgroundColor: roomSettingsRef.current.backgroundColor, 
                          aspectRatio: roomSettingsRef.current.aspectRatio 
                        });
                      }
                      setTimeout(() => fitToScreen(), 50);
                    }}
                    className="w-full mt-2 py-4 px-6 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 active:scale-95 text-sm"
                  >
                    Start Drawing
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Clear Confirmation Modal */}
        <AnimatePresence>
          {isClearConfirmOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-200"
              >
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                    <Trash2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Wipe Canvas?</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                      This will permanently erase all your local progress. This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setIsClearConfirmOpen(false)}
                      className="flex-1 py-4 px-6 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all active:scale-95 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        vibrate([20, 50, 20]);
                        resetLayersToDefault();
                        saveToHistory();
                        if (socket && roomId) {
                          socket.emit("clear-canvas", { roomId });
                        }
                        setIsClearConfirmOpen(false);
                      }}
                      className="flex-1 py-4 px-6 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 active:scale-95 text-sm"
                    >
                      Yes, Wipe
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Keyboard Shortcuts Modal */}
        <AnimatePresence>
          {showHotkeysModal && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setShowHotkeysModal(false);
                vibrate(5);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-200/80 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button top-right */}
                <button
                  onClick={() => {
                    setShowHotkeysModal(false);
                    vibrate(5);
                  }}
                  className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-95 animate-duration-150"
                >
                  <X size={16} />
                </button>

                <div className="flex flex-col gap-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                      <Keyboard size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Shortcuts</h3>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Discovery & Controls</p>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-100 w-full" />

                  {/* Shortcuts List */}
                  <div className="space-y-4">
                    {/* Undo */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 shrink-0">
                          <Undo2 size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-800">Undo Action</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">Revert canvas change</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 border-b-[3px] border-b-slate-300 rounded-md text-[10px] font-mono font-bold text-slate-700 shadow-sm">Ctrl</kbd>
                        <span className="text-slate-400 text-xs font-bold font-mono">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 border-b-[3px] border-b-slate-300 rounded-md text-[10px] font-mono font-bold text-slate-700 shadow-sm">Z</kbd>
                      </div>
                    </div>

                    {/* Redo */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 shrink-0">
                          <Redo2 size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-800">Redo Action</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">Apply discarded change</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 border-b-[3px] border-b-slate-300 rounded-md text-[10px] font-mono font-bold text-slate-700 shadow-sm">Ctrl</kbd>
                        <span className="text-slate-400 text-xs font-bold font-mono">+</span>
                        <kbd className="px-1 py-0.5 bg-white border border-slate-200 border-b-[3px] border-b-slate-300 rounded-md text-[9px] font-mono font-bold text-slate-700 shadow-sm">Shift</kbd>
                        <span className="text-slate-400 text-xs font-bold font-mono">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 border-b-[3px] border-b-slate-300 rounded-md text-[10px] font-mono font-bold text-slate-700 shadow-sm">Z</kbd>
                      </div>
                    </div>

                    {/* Pan Mode */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 shrink-0">
                          <Hand size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-800">Pan Canvas</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">Hold space to move drawing view</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mr-1">Hold</span>
                        <kbd className="px-2 py-0.5 bg-white border border-slate-200 border-b-[3px] border-b-slate-300 rounded-md text-[10px] font-mono font-bold text-slate-700 shadow-sm">Space</kbd>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-100 w-full" />

                  {/* Got it action button */}
                  <button
                    onClick={() => {
                      setShowHotkeysModal(false);
                      vibrate(5);
                    }}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-[0.98] text-sm"
                  >
                    Alright, Got It!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer status bar */}
      <footer className="h-8 bg-slate-900 flex items-center px-6 justify-between text-white shrink-0">
        <div className="flex items-center gap-4 text-[9px] font-medium tracking-wide uppercase opacity-70">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Connected
          </span>
          <span className="hidden sm:inline">Latency: 12ms</span>
          <span className="hidden sm:inline">Canvas: Optimized</span>
        </div>
        <div className="text-[9px] opacity-50 font-medium tracking-widest uppercase">
          Draw Together &copy; 2024 • Real-time Collaboration
        </div>
      </footer>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, color }: any) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "w-12 h-12 flex items-center justify-center transition-all rounded-xl border border-slate-200 shadow-sm",
        active ? `${color} shadow-indigo-100` : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      )}
    >
      {icon}
    </button>
  );
}

function ChatSection({ roomId, username, socket, chat, vibrate }: any) {
  const [msg, setMsg] = useState("");
  const [isTypingUI, setIsTypingUI] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleTyping = ({ username: u, isTyping }: any) => {
      setTypingUsers(prev => {
        if (isTyping) {
          if (prev.includes(u)) return prev;
          return [...prev, u];
        } else {
          return prev.filter(user => user !== u);
        }
      });
    };
    socket.on("typing", handleTyping);
    return () => { socket.off("typing", handleTyping); };
  }, [socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg(e.target.value);
    if (!isTypingUI) {
      setIsTypingUI(true);
      socket?.emit("typing", { roomId, username, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingUI(false);
      socket?.emit("typing", { roomId, username, isTyping: false });
    }, 2000);
  };

  const sendMsg = () => {
    if (!msg.trim()) return;
    vibrate(15);
    const messageData: ChatMessage = {
      id: nanoid(),
      roomId,
      username,
      message: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    socket?.emit("chat-message", messageData);
    if (isTypingUI) {
      setIsTypingUI(false);
      socket?.emit("typing", { roomId, username, isTyping: false });
    }
    setMsg("");
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex flex-col">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 leading-none">Live Chat</h3>
          <span className="text-[10px] font-bold text-indigo-500 mt-1 uppercase">Community Chat</span>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1.5 h-1.5 rounded-full bg-indigo-500"
          />
          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">LIVE</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30 no-scrollbar relative scroll-smooth">
        <AnimatePresence initial={false}>
          {chat.map((c: any, i: number) => (
            <motion.div
              key={c.id || i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn("flex flex-col gap-1", c.username === username ? "items-end" : "items-start")}
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{c.username}</span>
                <span className="text-[8px] font-bold text-slate-300 tabular-nums">{c.timestamp}</span>
              </div>
              <div className={cn(
                "px-4 py-2.5 rounded-2xl text-[13px] font-medium shadow-sm max-w-[90%] break-words relative group mb-3 mt-0.5 transition-all border",
                c.username === username
                  ? "bg-indigo-600 text-white rounded-tr-none border-indigo-500 shadow-indigo-100"
                  : "bg-white text-slate-700 rounded-tl-none border-slate-200"
              )}>
                {c.message}

                {/* Reaction Picker on Hover */}
                <div className={cn(
                  "absolute -top-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-30 pointer-events-none group-hover:pointer-events-auto",
                  c.username === username ? "right-0" : "left-0"
                )}>
                  <motion.div
                    initial={{ scale: 0.8, y: 10 }}
                    whileInView={{ scale: 1, y: 0 }}
                    className="bg-white/95 border border-slate-200 rounded-2xl p-2 grid grid-cols-5 gap-1.5 shadow-2xl backdrop-blur-md max-w-[180px]"
                  >
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          socket?.emit("message-reaction", { roomId, messageId: c.id, emoji, username });
                          vibrate(5);
                        }}
                        className="hover:scale-150 transition-transform text-lg active:scale-90 p-1 flex items-center justify-center rounded-lg hover:bg-slate-50"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                </div>

                {/* Displayed Reactions */}
                {c.reactions && Object.keys(c.reactions).length > 0 && (
                  <div className={cn(
                    "absolute -bottom-4 flex flex-wrap gap-1 z-20",
                    c.username === username ? "right-1" : "left-1"
                  )}>
                    {Object.entries(c.reactions as { [key: string]: string[] }).map(([emoji, users]) => {
                      const reactorList = users.length > 5
                        ? `${users.slice(0, 5).join(", ")} and ${users.length - 5} others`
                        : users.join(", ");

                      return (
                        <Tooltip key={emoji} label={`${reactorList} reacted with ${emoji}`} side="top">
                          <motion.button
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => {
                              socket?.emit("message-reaction", { roomId, messageId: c.id, emoji, username });
                              vibrate(5);
                            }}
                            className={cn(
                              "bg-white border rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1.5 shadow-sm transition-all hover:bg-slate-50",
                              users.includes(username) ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-400/10" : "border-slate-200"
                            )}
                          >
                            <span>{emoji}</span>
                            <span className={cn("font-black tracking-tight", users.includes(username) ? "text-indigo-600" : "text-slate-500")}>
                              {users.length}
                            </span>
                          </motion.button>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {typingUsers.filter(u => u !== username).map(u => (
            <motion.div
              key={u}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1 items-start mb-4"
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">
                  {u} is drawing words
                </span>
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((idx) => (
                    <motion.div
                      key={idx}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: idx * 0.15 }}
                      className="w-1 h-1 bg-indigo-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto no-scrollbar scroll-smooth pb-0.5">
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                setMsg(prev => prev + emoji);
                vibrate(5);
              }}
              className="p-1.5 px-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-sm shrink-0 active:scale-90 bg-white shadow-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 group">
            <input
              type="text"
              value={msg}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              placeholder="Type a message..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={sendMsg}
            disabled={!msg.trim()}
            className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:bg-slate-300 shadow-xl shadow-indigo-100 shrink-0"
          >
            <Send size={20} className={cn("transition-transform", msg.trim() ? "translate-x-0.5 -translate-y-0.5 rotate-[-10deg]" : "")} />
          </button>
        </div>
      </div>
    </div>
  );
}
