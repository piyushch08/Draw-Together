export type Tool = "pencil" | "brush" | "spray" | "eraser" | "smudge" | "text" | "stamp" | "picker" | "shape";
export type BrushStyle = "round" | "square" | "soft" | "star" | "diamond" | "cross";
export type SymmetryMode = "none" | "horizontal" | "vertical" | "both";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode?: string;
}

export interface DrawingData {
  roomId: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
  size: number;
  tool: Tool;
  brushStyle: BrushStyle;
  symmetryMode: SymmetryMode;
  opacity: number;
  density: number;
  hardness?: number;
  flow?: number;
  jitter?: number;
  smudgeIntensity?: number;
  text?: string;
  stamp?: string;
  rotation?: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  hasOutline?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
  layerId?: string;
  midX?: number;
  midY?: number;
  prevMidX?: number;
  prevMidY?: number;
  strokeId?: string;
  userId?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  username: string;
  message: string;
  timestamp: string;
  reactions?: { [emoji: string]: string[] };
}

export interface UserPresence {
  id: string;
  username: string;
  cursorX?: number;
  cursorY?: number;
  tool?: Tool;
  color?: string;
  isDrawing?: boolean;
  trail?: Array<{ x: number; y: number; timestamp: number; id: string; size?: number }>;
  lastActiveAt?: number;
}

export interface CursorUpdate {
  userId: string;
  x: number;
  y: number;
  tool: Tool;
  color: string;
  isDrawing: boolean;
}

export interface CustomPalette {
  id: string;
  name: string;
  colors: string[];
  isPreset?: boolean;
}

export interface PlacedText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  align: "left" | "center" | "right";
  hasOutline: boolean;
  outlineColor: string;
  outlineWidth: number;
  layerId: string;
}

export interface PlacedShape {
  id: string;
  type: "circle" | "triangle" | "star" | "square" | "ellipse" | "hexagon" | "arrow" | "rectangle" | "sticker";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  lineWidth: number;
  isFilled: boolean;
  fillColor: string;
  layerId: string;
  emoji?: string;
}

export interface CanvasAction {
  id: string;
  userId: string;
  username?: string;
  type: "stroke" | "shape" | "text" | "clear";
  timestamp: number;
  undone: boolean;
  layerId?: string;
  // Stroke data
  segments?: DrawingData[];
  // Shape data
  shapeAction?: "add" | "delete" | "modify";
  shape?: PlacedShape;
  prevShape?: PlacedShape;
  // Text data
  textAction?: "add" | "delete" | "modify";
  text?: PlacedText;
  prevText?: PlacedText;
}

export type GameType = "pictionary" | "ink_war" | "tictactoe" | "blind_draw";

export interface GameParticipant {
  id: string;
  username: string;
  color: string;
  score: number;
}

export interface PictionaryState {
  word: string;
  category: string;
  drawerId: string;
  round: number;
  totalRounds: number;
  timeLeft: number;
  status: "idle" | "countdown" | "drawing" | "round_end" | "game_over";
  hints: string[];
  lastGuesserName?: string;
}

export interface InkWarState {
  timeLeft: number;
  player1Coverage: number;
  player2Coverage: number;
  status: "idle" | "countdown" | "battling" | "finished";
  winnerId?: string | "draw";
}

export interface TicTacToeState {
  board: (string | null)[];
  currentTurn: string; // "p1" or "p2"
  winningLine: number[] | null;
  status: "idle" | "playing" | "finished";
  winnerId?: string | "draw";
  p1Wins: number;
  p2Wins: number;
  draws: number;
}

export interface BlindDrawState {
  prompt: string;
  timeLeft: number;
  status: "idle" | "countdown" | "drawing" | "reveal" | "voting" | "finished";
  votes: Record<string, string>; // voterId -> "p1" | "p2"
  winnerId?: string | "draw";
}

export interface DuoGameState {
  activeGame: GameType | null;
  player1: GameParticipant | null;
  player2: GameParticipant | null;
  pictionary?: PictionaryState;
  inkWar?: InkWarState;
  ticTacToe?: TicTacToeState;
  blindDraw?: BlindDrawState;
}
