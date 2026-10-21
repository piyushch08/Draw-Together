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
  clientId?: string;
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
  actions?: any[];
  layers?: any[];
  activeLayerId?: string;
  backgroundColor?: string;
  aspectRatio?: string;
  isSettingsLocked?: boolean;
}

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";
const enableCluster = isProd && process.env.ENABLE_CLUSTER === "true";

if (enableCluster && cluster.isPrimary) {
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
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"],
    perMessageDeflate: false,
    maxHttpBufferSize: 1e7, // 10MB payload limit for canvas data snapshots
    pingInterval: 10000,
    pingTimeout: 5000
  });

  if (enableCluster) {
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
        chat: [],
        actions: []
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

  app.get("/api/room/:roomId", (req, res) => {
    const cleanRoomId = (req.params.roomId || "").trim().toUpperCase();
    const room = rooms.get(cleanRoomId);
    if (!room) {
      return res.status(404).json({ exists: false });
    }
    res.json({
      exists: true,
      roomId: cleanRoomId,
      backgroundColor: room.backgroundColor || "#FFFFFF",
      aspectRatio: room.aspectRatio || "16:9",
      isSettingsLocked: Boolean(room.isSettingsLocked),
      userCount: room.users.size
    });
  });

  app.post("/api/room/create", (req, res) => {
    const { roomId, backgroundColor, aspectRatio } = req.body || {};
    if (!roomId) return res.status(400).json({ error: "Missing roomId" });
    const cleanRoomId = roomId.trim().toUpperCase();
    const room = getOrCreateRoom(cleanRoomId);
    if (backgroundColor) room.backgroundColor = backgroundColor;
    if (aspectRatio) room.aspectRatio = aspectRatio;
    room.isSettingsLocked = true;
    res.json({
      success: true,
      roomId: cleanRoomId,
      backgroundColor: room.backgroundColor || "#FFFFFF",
      aspectRatio: room.aspectRatio || "16:9"
    });
  });

  app.get("/api/network-info", (req, res) => {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    addresses.sort((a, b) => {
      if (a.startsWith("192.168.") && !b.startsWith("192.168.")) return -1;
      if (!a.startsWith("192.168.") && b.startsWith("192.168.")) return 1;
      return 0;
    });
    res.json({
      port: PORT,
      addresses,
      primaryHost: addresses[0] ? `${addresses[0]}:${PORT}` : `localhost:${PORT}`
    });
  });

  // Socket.io Real-Time Event Handlers
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket Connected] ID: ${socket.id} on Worker ${isProd ? cluster.worker?.id : "dev"}`);

    socket.on("join-room", ({
      roomId,
      username,
      color,
      clientId,
      isCreator,
      backgroundColor,
      aspectRatio
    }: {
      roomId: string;
      username: string;
      color?: string;
      clientId?: string;
      isCreator?: boolean;
      backgroundColor?: string;
      aspectRatio?: string;
    }) => {
      const cleanRoomId = (roomId || "default-room").trim().toUpperCase();
      const cleanUsername = (username || "Anonymous Artist").trim();

      // If this socket was already in another room, leave it and notify that room
      for (const prevRoomId of socket.rooms) {
        if (prevRoomId !== socket.id && prevRoomId !== cleanRoomId) {
          socket.leave(prevRoomId);
          const prevRoom = rooms.get(prevRoomId);
          if (prevRoom) {
            prevRoom.users.delete(socket.id);
            io.to(prevRoomId).emit("user-left", { id: socket.id, userCount: prevRoom.users.size });
          }
        }
      }

      socket.join(cleanRoomId);
      const room = getOrCreateRoom(cleanRoomId);

      // Canvas ratio and background color are decided solely by the room creator at creation time.
      // They are identical across all clients and unchangeable inside the canvas.
      if (isCreator && (backgroundColor || aspectRatio)) {
        room.backgroundColor = backgroundColor || room.backgroundColor || "#FFFFFF";
        room.aspectRatio = aspectRatio || room.aspectRatio || "16:9";
        room.isSettingsLocked = true;
        // Broadcast creator's locked settings to any connected clients
        socket.to(cleanRoomId).emit("room-settings-updated", {
          roomId: cleanRoomId,
          backgroundColor: room.backgroundColor,
          aspectRatio: room.aspectRatio
        });
      } else if (!room.isSettingsLocked) {
        // If room was created without explicit creator flag, lock first available settings
        if (backgroundColor) room.backgroundColor = backgroundColor;
        if (aspectRatio) room.aspectRatio = aspectRatio;
        if (room.backgroundColor && room.aspectRatio) {
          room.isSettingsLocked = true;
        }
      }

      // If this client refreshed or reconnected, clean up any previous stale socket entry for this clientId
      if (clientId) {
        for (const [existingSocketId, existingUser] of room.users.entries()) {
          if (existingUser.clientId === clientId && existingSocketId !== socket.id) {
            room.users.delete(existingSocketId);
            const oldSock = io.sockets.sockets.get(existingSocketId);
            if (oldSock) {
              try { oldSock.leave(cleanRoomId); } catch (e) { }
            }
          }
        }
      }

      const isNewSocket = !room.users.has(socket.id);
      const user: ConnectedUser = {
        id: socket.id,
        clientId,
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
        userCount: room.users.size,
        placedShapes: room.placedShapes,
        placedTexts: room.placedTexts,
        canvasData: room.canvasData,
        chat: room.chat.slice(-50),
        layers: room.layers,
        activeLayerId: room.activeLayerId,
        actions: room.actions ? room.actions.slice(-200) : [],
        backgroundColor: room.backgroundColor || "#FFFFFF",
        aspectRatio: room.aspectRatio || "16:9"
      });

      if (isNewSocket) {
        socket.to(cleanRoomId).emit("user-joined", { user, userCount: room.users.size });
      } else {
        io.to(cleanRoomId).emit("user-updated", { id: socket.id, username: cleanUsername, color: user.color });
      }

      const otherUserIds = Array.from(room.users.keys()).filter(id => id !== socket.id);
      if (otherUserIds.length > 0) {
        io.to(otherUserIds[0]).emit("request-canvas-snapshot", { requesterId: socket.id, roomId: cleanRoomId });
      }
    });

    socket.on("cursor-move", (data: { roomId: string; x: number; y: number; tool?: string; color?: string; isDrawing?: boolean }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = rooms.get(targetRoom);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id)!;
        user.cursorX = data.x;
        user.cursorY = data.y;
      }
      socket.to(targetRoom).volatile.emit("cursor-move", { ...data, roomId: targetRoom, userId: socket.id });
    });

    socket.on("drawing", (data: any) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = rooms.get(targetRoom);
      if (room) room.lastActivity = Date.now();
      socket.to(targetRoom).emit("drawing", { ...data, roomId: targetRoom });
    });

    socket.on("drawing-batch", (data: { roomId: string; segments: any[] }) => {
      if (!data?.roomId || !data?.segments?.length) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = rooms.get(targetRoom);
      if (room) room.lastActivity = Date.now();
      socket.to(targetRoom).emit("drawing-batch", { ...data, roomId: targetRoom });
    });

    socket.on("action-added", (data: { roomId: string; action: any }) => {
      if (!data?.roomId || !data?.action) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = getOrCreateRoom(targetRoom);
      if (!room.actions) room.actions = [];
      const existingIdx = room.actions.findIndex((a: any) => a.id === data.action.id);
      if (existingIdx !== -1) {
        room.actions[existingIdx] = data.action;
      } else {
        room.actions.push(data.action);
        if (room.actions.length > 250) room.actions.shift();
      }
      room.lastActivity = Date.now();
      socket.to(targetRoom).emit("action-added", { roomId: targetRoom, action: data.action });
    });

    socket.on("user-undo", (data: { roomId: string; actionId: string; userId: string }) => {
      if (!data?.roomId || !data?.actionId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = rooms.get(targetRoom);
      if (room && room.actions) {
        const action = room.actions.find((a: any) => a.id === data.actionId);
        if (action) {
          action.undone = true;
          if (action.type === "text" && action.text) {
            if (action.textAction === "add") {
              room.placedTexts = (room.placedTexts || []).filter((t: any) => t.id !== action.text.id);
            } else if (action.textAction === "delete") {
              if (!(room.placedTexts || []).some((t: any) => t.id === action.text.id)) {
                room.placedTexts = [...(room.placedTexts || []), action.text];
              }
            }
          }
          if (action.type === "shape" && action.shape) {
            if (action.shapeAction === "add") {
              room.placedShapes = (room.placedShapes || []).filter((s: any) => s.id !== action.shape.id);
            } else if (action.shapeAction === "delete") {
              if (!(room.placedShapes || []).some((s: any) => s.id === action.shape.id)) {
                room.placedShapes = [...(room.placedShapes || []), action.shape];
              }
            }
          }
        }
        room.lastActivity = Date.now();
      }
      socket.to(targetRoom).emit("user-undo", { roomId: targetRoom, actionId: data.actionId, userId: data.userId });
    });

    socket.on("user-redo", (data: { roomId: string; actionId: string; userId: string }) => {
      if (!data?.roomId || !data?.actionId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = rooms.get(targetRoom);
      if (room && room.actions) {
        const action = room.actions.find((a: any) => a.id === data.actionId);
        if (action) {
          action.undone = false;
          if (action.type === "text" && action.text) {
            if (action.textAction === "add") {
              if (!(room.placedTexts || []).some((t: any) => t.id === action.text.id)) {
                room.placedTexts = [...(room.placedTexts || []), action.text];
              }
            } else if (action.textAction === "delete") {
              room.placedTexts = (room.placedTexts || []).filter((t: any) => t.id !== action.text.id);
            }
          }
          if (action.type === "shape" && action.shape) {
            if (action.shapeAction === "add") {
              if (!(room.placedShapes || []).some((s: any) => s.id === action.shape.id)) {
                room.placedShapes = [...(room.placedShapes || []), action.shape];
              }
            } else if (action.shapeAction === "delete") {
              room.placedShapes = (room.placedShapes || []).filter((s: any) => s.id !== action.shape.id);
            }
          }
        }
        room.lastActivity = Date.now();
      }
      socket.to(targetRoom).emit("user-redo", { roomId: targetRoom, actionId: data.actionId, userId: data.userId });
    });

    socket.on("laser-pointer", (data: { roomId: string; x: number; y: number; color?: string; username?: string }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      socket.to(targetRoom).volatile.emit("laser-pointer", { ...data, roomId: targetRoom, userId: socket.id });
    });

    socket.on("sync-canvas", (data: { roomId: string; canvasData: string; backgroundColor?: string; aspectRatio?: string }) => {
      if (!data?.roomId || !data?.canvasData) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = getOrCreateRoom(targetRoom);
      room.canvasData = data.canvasData;
      // Do not overwrite room.backgroundColor or room.aspectRatio - enforce creator's locked settings
      room.lastActivity = Date.now();
      socket.to(targetRoom).emit("sync-canvas", {
        ...data,
        backgroundColor: room.backgroundColor || "#FFFFFF",
        aspectRatio: room.aspectRatio || "16:9",
        roomId: targetRoom
      });
    });

    socket.on("canvas-snapshot-reply", (data: {
      requesterId: string;
      canvasData: string;
      roomId: string;
      backgroundColor?: string;
      aspectRatio?: string;
    }) => {
      if (data.requesterId && data.canvasData) {
        const targetRoom = (data.roomId || "").trim().toUpperCase();
        const room = rooms.get(targetRoom);
        if (room) {
          room.canvasData = data.canvasData;
          // Do not overwrite room.backgroundColor or room.aspectRatio
        }
        io.to(data.requesterId).emit("sync-canvas", {
          canvasData: data.canvasData,
          backgroundColor: room?.backgroundColor || "#FFFFFF",
          aspectRatio: room?.aspectRatio || "16:9",
          roomId: targetRoom
        });
      }
    });

    socket.on("sync-placed-shapes", (data: { roomId: string; placedShapes: any[] }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = getOrCreateRoom(targetRoom);
      room.placedShapes = data.placedShapes || [];
      room.lastActivity = Date.now();
      socket.to(targetRoom).emit("sync-placed-shapes", { ...data, roomId: targetRoom });
    });

    socket.on("sync-placed-texts", (data: { roomId: string; placedTexts: any[] }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = getOrCreateRoom(targetRoom);
      room.placedTexts = data.placedTexts || [];
      room.lastActivity = Date.now();
      socket.to(targetRoom).emit("sync-placed-texts", { ...data, roomId: targetRoom });
    });

    socket.on("sync-layers", (data: { roomId: string; layers: any[]; activeLayerId?: string }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = getOrCreateRoom(targetRoom);
      if (data.layers) room.layers = data.layers;
      if (data.activeLayerId) room.activeLayerId = data.activeLayerId;
      room.lastActivity = Date.now();
      socket.to(targetRoom).emit("sync-layers", { ...data, roomId: targetRoom });
    });

    socket.on("chat-message", (data: ChatMessage & { roomId: string }) => {
      if (!data?.roomId || !data?.message) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = getOrCreateRoom(targetRoom);
      room.chat.push(data);
      if (room.chat.length > 100) room.chat.shift();
      room.lastActivity = Date.now();
      io.to(targetRoom).emit("chat-message", { ...data, roomId: targetRoom });
    });

    socket.on("typing", (data: { roomId: string; username: string; isTyping: boolean }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      socket.to(targetRoom).emit("typing", { ...data, roomId: targetRoom });
    });

    socket.on("message-reaction", (data: { roomId: string; messageId: string; emoji: string; username: string }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = rooms.get(targetRoom);
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
      io.to(targetRoom).emit("message-reaction", { ...data, roomId: targetRoom });
    });

    socket.on("floating-reaction", (data: { roomId: string; emoji: string; username?: string; x?: number; y?: number }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      io.to(targetRoom).emit("floating-reaction", { ...data, roomId: targetRoom });
    });

    socket.on("clear-canvas", (data: any) => {
      const rawRoom = typeof data === "string" ? data : data?.roomId;
      if (!rawRoom) return;
      const targetRoom = rawRoom.trim().toUpperCase();
      const room = rooms.get(targetRoom);
      if (room) {
        room.canvasData = undefined;
        room.placedShapes = [];
        room.placedTexts = [];
        room.actions = [];
        room.lastActivity = Date.now();
      }
      io.to(targetRoom).emit("clear-canvas");
    });

    socket.on("update-room-settings", (data: { roomId: string; backgroundColor?: string; aspectRatio?: string }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const room = getOrCreateRoom(targetRoom);
      if (data.backgroundColor) room.backgroundColor = data.backgroundColor;
      if (data.aspectRatio) room.aspectRatio = data.aspectRatio;
      room.lastActivity = Date.now();
      console.log(`[Room Settings] Updated room ${targetRoom}: color=${room.backgroundColor}, ratio=${room.aspectRatio}`);
      io.to(targetRoom).emit("room-settings-updated", {
        roomId: targetRoom,
        backgroundColor: room.backgroundColor || "#FFFFFF",
        aspectRatio: room.aspectRatio || "16:9"
      });
    });

    socket.on("update-username", (data: { roomId: string; username: string }) => {
      if (!data?.roomId) return;
      const targetRoom = data.roomId.trim().toUpperCase();
      const cleanUsername = (data.username || "Anonymous Artist").trim();
      const room = rooms.get(targetRoom);
      if (room && room.users.has(socket.id)) {
        const u = room.users.get(socket.id)!;
        u.username = cleanUsername;
        io.to(targetRoom).emit("user-updated", { id: socket.id, username: cleanUsername, color: u.color });
      }
    });

    const handleSocketLeave = () => {
      rateLimits.delete(socket.id);
      rateLimits.delete(socket.id + "_draw");
      rateLimits.delete(socket.id + "_laser");
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          const room = rooms.get(roomId);
          if (room) {
            room.users.delete(socket.id);
            io.to(roomId).emit("user-left", { id: socket.id, userCount: room.users.size });

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
    };

    socket.on("leave-room", (data?: { roomId?: string }) => {
      const targetRoom = (data?.roomId || "").trim().toUpperCase();
      if (targetRoom) {
        socket.leave(targetRoom);
        const room = rooms.get(targetRoom);
        if (room) {
          room.users.delete(socket.id);
          io.to(targetRoom).emit("user-left", { id: socket.id, userCount: room.users.size });
        }
      } else {
        handleSocketLeave();
      }
    });

    socket.on("disconnecting", handleSocketLeave);

    socket.on("disconnect", () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });

  // Periodic synchronization (every 10 seconds) to clean dead sockets and keep all clients in exact sync
  const syncInterval = setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.size > 0) {
        let modified = false;
        for (const socketId of Array.from(room.users.keys())) {
          const sock = io.sockets.sockets.get(socketId);
          if (!sock || !sock.connected) {
            room.users.delete(socketId);
            modified = true;
          }
        }
        io.to(roomId).emit("room-users-sync", {
          roomId,
          userCount: room.users.size,
          users: Array.from(room.users.values())
        });
      }
    }
  }, 10000);

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
    if (!enableCluster) {
      httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`✨ Draw Together production server listening on http://0.0.0.0:${PORT}`);
      });
    }
  }
}
