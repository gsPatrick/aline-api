import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: "*" } });

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

  io.sendToUser = (userId, event, payload) => {
    const sid = onlineUsers.get(String(userId));
    if (sid) io.to(sid).emit(event, payload);
  };

  io.broadcastToUsers = (userIds, event, payload) => {
    userIds.forEach((id) => io.sendToUser(id, event, payload));
  };

  // Novo método para broadcast geral (Live Updates)
  io.broadcastMatchUpdate = (event, payload) => {
    io.emit(event, payload);
  };

  global.__io = io;
  return io;
};

export const getIO = () => {
  if (!global.__io) {
    throw new Error("Socket.io não inicializado!");
  }
  return global.__io;
};
