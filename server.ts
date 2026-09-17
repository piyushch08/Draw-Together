import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import cluster from "cluster";
import os from "os";
import { setupMaster, setupWorker } from "@socket.io/sticky";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";

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
  backgroundColor?: string;
  aspectRatio?: string;
}

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

if (isProd && cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  const httpServer = createServer();
  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection",
  });
  setupPrimary();
  cluster.setupPrimary({
    serialization: "advanced",
  });
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Draw Together master server listening on http://0.0.0.0:${PORT}`);
  });
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startServer();
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

  if (isProd) {
    io.adapter(createAdapter());
    setupWorker(io);
  }

  app.use(express.json({ limit: "15mb" }));

  // In-memory room manager for active collaborative sessions
  // NOTE: In a true horizontally scaled multi-server environment without sticky sessions, 
  // you'd use Redis for this state. Here, sticky sessions ensure users in the same room 
  // hit the same process mostly, but real production would use a Redis store.
  const rooms = new Map<string, RoomData>();

  // Simple Rate Limiting Map
  const rateLimits = new Map<string, number>();

  function checkRateLimit(socketId: string, limit: number = 100): boolean {
    const now = Date.now();
    const last = rateLimits.get(socketId) || 0;
    if (now - last < (1000 / limit)) {
      return false; // Dropped
    }
    rateLimits.set(socketId, now);
    return true;
  }

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
      timestamp: Date.now(),
      workerId: isProd ? cluster.worker?.id : "dev"
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
    console.log(`[Socket Connected] ID: ${socket.id} on Worker ${isProd ? cluster.worker?.id : "dev"}`);

    socket.on("join-room", ({ roomId, username, color }: { roomId: string; username: string; color?: string }) => {
      const cleanRoomId = (roomId || "default-room").trim();
      const cleanUsername = (username || "Anonymous Artist").trim();

      socket.join(cleanRoomId);
      const room = getOrCreateRoom(cleanRoomId);
      const user: ConnectedUser = {
        id: socket.id,
        username: cleanUsername,
        color: color || "#6366f1",
        joinedAt: Date.now()
      };

      room.users.set(socket.id, user);
      room.lastActivity = Date.now();

      const activeUsersList = Array.from(room.users.values());
      socket.emit("init-room-state", {
        roomId: cleanRoomId,
        users: activeUsersList,
        placedShapes: room.placedShapes,
        placedTexts: room.placedTexts,
        canvasData: room.canvasData,
        chat: room.chat.slice(-50),
        layers: room.layers,
        activeLayerId: room.activeLayerId,
        backgroundColor: room.backgroundColor || "#FFFFFF",
        aspectRatio: room.aspectRatio || "16:9"
      });

      socket.to(cleanRoomId).emit("user-joined", user);

      const otherUserIds = Array.from(room.users.keys()).filter(id => id !== socket.id);
      if (otherUserIds.length > 0 && !room.canvasData) {
        io.to(otherUserIds[0]).emit("request-canvas-snapshot", { requesterId: socket.id, roomId: cleanRoomId });
      }
    });

    socket.on("cursor-move", (data: { roomId: string; x: number; y: number; tool?: string; color?: string; isDrawing?: boolean }) => {
      if (!data?.roomId) return;
      if (!checkRateLimit(socket.id, 15)) return; // Max 15 cursor updates per second per user for scale
      const room = rooms.get(data.roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id)!;
        user.cursorX = data.x;
        user.cursorY = data.y;
      }
      socket.volatile.to(data.roomId).emit("cursor-move", { ...data, userId: socket.id });
    });

    socket.on("drawing", (data: any) => {
      if (!data?.roomId) return;
      if (!checkRateLimit(socket.id + "_draw", 60)) return;
      const room = rooms.get(data.roomId);
      if (room) room.lastActivity = Date.now();
      socket.volatile.to(data.roomId).emit("drawing", data);
    });

    socket.on("drawing-batch", (data: { roomId: string; segments: any[] }) => {
      if (!data?.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) room.lastActivity = Date.now();
      socket.volatile.to(data.roomId).emit("drawing-batch", data);
    });

    socket.on("laser-pointer", (data: { roomId: string; x: number; y: number; color?: string; username?: string }) => {
      if (!data?.roomId) return;
      if (!checkRateLimit(socket.id + "_laser", 30)) return;
      socket.volatile.to(data.roomId).emit("laser-pointer", { ...data, userId: socket.id });
    });

    socket.on("sync-canvas", (data: { roomId: string; canvasData: string }) => {
      if (!data?.roomId || !data?.canvasData) return;
      const room = getOrCreateRoom(data.roomId);
      room.canvasData = data.canvasData;
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-canvas", data);
    });

    socket.on("canvas-snapshot-reply", (data: { requesterId: string; canvasData: string; roomId: string }) => {
      if (data.requesterId && data.canvasData) {
        const room = rooms.get(data.roomId);
        if (room) room.canvasData = data.canvasData;
        io.to(data.requesterId).emit("sync-canvas", { canvasData: data.canvasData });
      }
    });

    socket.on("sync-placed-shapes", (data: { roomId: string; placedShapes: any[] }) => {
      if (!data?.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.placedShapes = data.placedShapes || [];
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-placed-shapes", data);
    });

    socket.on("sync-placed-texts", (data: { roomId: string; placedTexts: any[] }) => {
      if (!data?.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.placedTexts = data.placedTexts || [];
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-placed-texts", data);
    });

    socket.on("sync-layers", (data: { roomId: string; layers: any[]; activeLayerId?: string }) => {
      if (!data?.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      if (data.layers) room.layers = data.layers;
      if (data.activeLayerId) room.activeLayerId = data.activeLayerId;
      room.lastActivity = Date.now();
      socket.to(data.roomId).emit("sync-layers", data);
    });

    socket.on("chat-message", (data: ChatMessage & { roomId: string }) => {
      if (!data?.roomId || !data?.message) return;
      const room = getOrCreateRoom(data.roomId);
      room.chat.push(data);
      if (room.chat.length > 100) room.chat.shift();
      room.lastActivity = Date.now();
      io.to(data.roomId).emit("chat-message", data);
    });

    socket.on("typing", (data: { roomId: string; username: string; isTyping: boolean }) => {
      if (!data?.roomId) return;
      socket.to(data.roomId).emit("typing", data);
    });

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
            if (msg.reactions[data.emoji].length === 0) delete msg.reactions[data.emoji];
          }
        }
      }
      io.to(data.roomId).emit("message-reaction", data);
    });

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

    socket.on("update-room-settings", (data: { roomId: string; backgroundColor: string; aspectRatio: string }) => {
      if (!data?.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.backgroundColor = data.backgroundColor;
      room.aspectRatio = data.aspectRatio;
      room.lastActivity = Date.now();
      io.to(data.roomId).emit("room-settings-updated", data);
    });

    socket.on("disconnecting", () => {
      rateLimits.delete(socket.id);
      rateLimits.delete(socket.id + "_draw");
      rateLimits.delete(socket.id + "_laser");
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          const room = rooms.get(roomId);
          if (room) {
            room.users.delete(socket.id);
            socket.to(roomId).emit("user-left", { id: socket.id, userCount: room.users.size });

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

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`✨ Draw Together backend (Dev) listening on http://0.0.0.0:${PORT}`);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    // In prod, workers don't listen, sticky session master does it
  }
}
