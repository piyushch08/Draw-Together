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


