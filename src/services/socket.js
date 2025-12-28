import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const onlineUsers = new Map();
const LIVE_STATUSES = ['LIVE', 'HT', '1H', '2H', 'ET', 'PEN_LIVE', 'BREAK'];
let liveMatchSubscriptions = new Map(); // matchId -> Set of socketIds

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
  });

  // =============================================
  // GOLDSTATS NAMESPACE (PUBLIC - No Auth Required)
  // =============================================
  const goldstatsNs = io.of('/goldstats');

  goldstatsNs.on('connection', (socket) => {
    console.log(`[GoldStats Socket] Client connected: ${socket.id}`);

    // Join match room for live updates
    socket.on('match:subscribe', (matchId) => {
      const room = `match:${matchId}`;
      socket.join(room);

      // Track subscription
      if (!liveMatchSubscriptions.has(matchId)) {
        liveMatchSubscriptions.set(matchId, new Set());
      }
      liveMatchSubscriptions.get(matchId).add(socket.id);

      console.log(`[GoldStats] ${socket.id} subscribed to match ${matchId}`);

      // Acknowledge subscription
      socket.emit('match:subscribed', { matchId, success: true });
    });

    socket.on('match:unsubscribe', (matchId) => {
      socket.leave(`match:${matchId}`);

      if (liveMatchSubscriptions.has(matchId)) {
        liveMatchSubscriptions.get(matchId).delete(socket.id);
      }

      console.log(`[GoldStats] ${socket.id} unsubscribed from match ${matchId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[GoldStats Socket] Client disconnected: ${socket.id}`);

      // Clean up subscriptions
      for (const [matchId, sockets] of liveMatchSubscriptions.entries()) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          liveMatchSubscriptions.delete(matchId);
        }
      }
    });
  });

  // =============================================
  // MAIN NAMESPACE (Auth Required - for users)
  // =============================================
  io.use((socket, next) => {
    const auth = socket.handshake?.auth || {};
    const token = auth.token;

    if (!token) {
      return next(new Error("Token ausente"));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      socket.userRole = payload.role;
      next();
    } catch (_err) {
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId ? String(socket.userId) : null;
    if (userId) {
      onlineUsers.set(userId, socket.id);
    }

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
      }
    });
  });

  // Helper methods
  io.sendToUser = (userId, event, payload) => {
    const sid = onlineUsers.get(String(userId));
    if (sid) io.to(sid).emit(event, payload);
  };

  io.broadcastToUsers = (userIds, event, payload) => {
    userIds.forEach((id) => io.sendToUser(id, event, payload));
  };

  // Broadcast match update to all subscribers
  io.broadcastMatchUpdate = (matchId, data) => {
    const room = `match:${matchId}`;
    goldstatsNs.to(room).emit('match:update', {
      matchId,
      data,
      timestamp: new Date().toISOString()
    });
    console.log(`[GoldStats] Broadcast update to match ${matchId}`);
  };

  // Get live match subscriptions
  io.getLiveMatchSubscriptions = () => {
    return Array.from(liveMatchSubscriptions.keys());
  };

  global.__io = io;
  global.__goldstatsNs = goldstatsNs;
  return io;
};

export const getIO = () => {
  if (!global.__io) {
    throw new Error("Socket.io não inicializado!");
  }
  return global.__io;
};

export const getGoldstatsNamespace = () => {
  if (!global.__goldstatsNs) {
    throw new Error("Goldstats namespace não inicializado!");
  }
  return global.__goldstatsNs;
};
