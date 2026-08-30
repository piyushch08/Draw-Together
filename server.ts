import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

interface ConnectedUser {
  id: string;
  username: string;
  color?: string;
  joinedAt: number;
  cursorX?: number;
  cursorY?: number;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  reactions?: Record<string, string[]>;
}

interface RoomData {
  id: string;
  createdAt: number;
  lastActivity: number;
  users: Map<string, ConnectedUser>;
  canvasData?: string;
  placedShapes: any[];
  placedTexts: any[];
  chat: ChatMessage[];
  layers?: any[];
  activeLayerId?: string;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7 // 10MB payload limit for canvas data snapshots
  });

  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "15mb" }));

  // In-memory room manager for active collaborative sessions
  const rooms = new Map<string, RoomData>();

  function getOrCreateRoom(roomId: string): RoomData {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        users: new Map(),
        placedShapes: [],
        placedTexts: [],
        chat: []
      };
      rooms.set(roomId, room);
    }
    return room;
  }

  // REST API Endpoints
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      activeRooms: rooms.size,
      timestamp: Date.now()
    });
  });

  app.get("/api/rooms", (req, res) => {
    const publicRooms = Array.from(rooms.values()).map(r => ({
      id: r.id,
      userCount: r.users.size,
      createdAt: r.createdAt,
      lastActivity: r.lastActivity,
      hasCanvas: Boolean(r.canvasData || r.placedShapes.length > 0)
    }));
    res.json({ rooms: publicRooms });
  });

  // Socket.io Real-Time Event Handlers
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    socket.on("join-room", ({ roomId, username, color }: { roomId: string; username: string; color?: string }) => {
      const cleanRoomId = (roomId || "default-room").trim();
      const cleanUsername = (username || "Anonymous Artist").trim();

      socket.join(cleanRoomId);
      console.log(`[Room Join] User "${cleanUsername}" (${socket.id}) joined room "${cleanRoomId}"`);

      const room = getOrCreateRoom(cleanRoomId);
      const user: ConnectedUser = {
        id: socket.id,
        username: cleanUsername,
        color: color || "#6366f1",
        joinedAt: Date.now()
      };

      room.users.set(socket.id, user);
      room.lastActivity = Date.now();

      // Send initial room state to the newly joined peer
      const activeUsersList = Array.from(room.users.values());
      socket.emit("init-room-state", {
        roomId: cleanRoomId,
        users: activeUsersList,
        placedShapes: room.placedShapes,
        placedTexts: room.placedTexts,
        canvasData: room.canvasData,
        chat: room.chat.slice(-50),
        layers: room.layers,
        activeLayerId: room.activeLayerId
      });

      // Broadcast new user arrival to existing peers in the room
      socket.to(cleanRoomId).emit("user-joined", user);

      // If there are other users, ask the first active peer to share the latest high-res canvas if needed
      const otherUserIds = Array.from(room.users.keys()).filter(id => id !== socket.id);
      if (otherUserIds.length > 0 && !room.canvasData) {
        io.to(otherUserIds[0]).emit("request-canvas-snapshot", { requesterId: socket.id, roomId: cleanRoomId });
      }
    });

    // Real-time cursor coordinates and drawing state
    socket.on("cursor-move", (data: { roomId: string; x: number; y: number; tool?: string; color?: string; isDrawing?: boolean }) => {
      if (!data?.roomId) return;
      const room = rooms.get(data.roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id)!;
        user.cursorX = data.x;
        user.cursorY = data.y;
      }
      socket.to(data.roomId).emit("cursor-move", { ...data, userId: socket.id });
    });

    // Real-time continuous brush stroke
    socket.on("drawing", (data: any) => {
      if (!data?.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) {
        room.lastActivity = Date.now();
      }
      socket.to(data.roomId).emit("drawing", data);
    });

    // High-performance batched drawing segments
    socket.on("drawing-batch", (data: { roomId: string; segments: any[] }) => {
      if (!data?.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) {
        room.lastActivity = Date.now();
      }
      socket.to(data.roomId).emit("drawing-batch", data);
    });

    // Live Laser Pointer / Sparkle effect broadcast
    socket.on("laser-pointer", (data: { roomId: string; x: number; y: number; color?: string; username?: string }) => {
      if (!data?.roomId) return;
      socket.to(data.roomId).emit("laser-pointer", { ...data, userId: socket.id });
    });

    // Full Canvas Sync (base64 image or layer snapshot)
    socket.on("sync-canvas", (data: { roomId: string; canvasData: string }) => {
      if (!data?.roomId || !data?.canvasData) return;
      const room = getOrCreateRoom(data.roomId);
      room.canvasData = data.canvasData;
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-canvas", data);
    });

    // Targeted canvas snapshot reply to specific requester
    socket.on("canvas-snapshot-reply", (data: { requesterId: string; canvasData: string; roomId: string }) => {
      if (data.requesterId && data.canvasData) {
        const room = rooms.get(data.roomId);
        if (room) {
          room.canvasData = data.canvasData;
        }
        io.to(data.requesterId).emit("sync-canvas", { canvasData: data.canvasData });
      }
    });

    // Placed Vector Shapes synchronization
    socket.on("sync-placed-shapes", (data: { roomId: string; placedShapes: any[] }) => {
      if (!data?.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.placedShapes = data.placedShapes || [];
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-placed-shapes", data);
    });

    // Placed Text Annotations synchronization
    socket.on("sync-placed-texts", (data: { roomId: string; placedTexts: any[] }) => {
      if (!data?.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.placedTexts = data.placedTexts || [];
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-placed-texts", data);
    });

    // Layers Stack synchronization
    socket.on("sync-layers", (data: { roomId: string; layers: any[]; activeLayerId?: string }) => {
      if (!data?.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      if (data.layers) room.layers = data.layers;
      if (data.activeLayerId) room.activeLayerId = data.activeLayerId;
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-layers", data);
    });

    // Real-Time Chat Message
    socket.on("chat-message", (data: ChatMessage & { roomId: string }) => {
      if (!data?.roomId || !data?.message) return;
      const room = getOrCreateRoom(data.roomId);
      room.chat.push(data);
      if (room.chat.length > 100) {
        room.chat.shift();
      }
      room.lastActivity = Date.now();
      io.to(data.roomId).emit("chat-message", data);
    });

    // User typing indicator
    socket.on("typing", (data: { roomId: string; username: string; isTyping: boolean }) => {
      if (!data?.roomId) return;
      socket.to(data.roomId).emit("typing", data);
    });

    // Message emoji reactions
    socket.on("message-reaction", (data: { roomId: string; messageId: string; emoji: string; username: string }) => {
      if (!data?.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) {
        const msg = room.chat.find(m => m.id === data.messageId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.reactions[data.emoji]) msg.reactions[data.emoji] = [];

          if (!msg.reactions[data.emoji].includes(data.username)) {
            msg.reactions[data.emoji].push(data.username);
          } else {
            msg.reactions[data.emoji] = msg.reactions[data.emoji].filter(u => u !== data.username);
            if (msg.reactions[data.emoji].length === 0) {
              delete msg.reactions[data.emoji];
            }
          }
        }
      }
      io.to(data.roomId).emit("message-reaction", data);
    });

    // Clear Canvas Event
    socket.on("clear-canvas", (roomId: string) => {
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (room) {
        room.canvasData = undefined;
        room.placedShapes = [];
        room.placedTexts = [];
        room.lastActivity = Date.now();
      }
      io.to(roomId).emit("clear-canvas");
    });

    // Disconnection & cleanup
    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          const room = rooms.get(roomId);
          if (room) {
            room.users.delete(socket.id);
            socket.to(roomId).emit("user-left", { id: socket.id, userCount: room.users.size });

            // If room is empty, preserve room data for 30 minutes in memory
            if (room.users.size === 0) {
              setTimeout(() => {
                const checkRoom = rooms.get(roomId);
                if (checkRoom && checkRoom.users.size === 0 && Date.now() - checkRoom.lastActivity > 1800000) {
                  rooms.delete(roomId);
                  console.log(`[Room Pruned] Cleaned empty room: ${roomId}`);
                }
              }, 1800000);
            }
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ DuoDraw backend & realtime server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

