import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "./logger";

interface SocketUser {
  id: string;
  name: string;
  role: string;
}

interface AuthSocket extends Socket {
  user?: SocketUser;
}

export function setupSocketIO(server: any) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware for socket connections
  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.user = {
        id: decoded.userId,
        name: decoded.name,
        role: decoded.role,
      };

      next();
    } catch (error) {
      logger.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    logger.info(`User connected: ${socket.user?.name} (${socket.id})`);

    // Join user to their role-based rooms
    if (socket.user?.role) {
      socket.join(socket.user.role);
      socket.join(`user_${socket.user.id}`);
    }

    // Subscribe to inventory updates
    socket.on("subscribe-inventory", () => {
      socket.join("inventory-updates");
      logger.info(`${socket.user?.name} subscribed to inventory updates`);
    });

    // Subscribe to sales updates
    socket.on("subscribe-sales", () => {
      socket.join("sales-updates");
      logger.info(`${socket.user?.name} subscribed to sales updates`);
    });

    // Subscribe to analytics updates
    socket.on("subscribe-analytics", () => {
      socket.join("analytics-updates");
      logger.info(`${socket.user?.name} subscribed to analytics updates`);
    });

    // Handle low stock alerts
    socket.on("subscribe-low-stock", () => {
      socket.join("low-stock-alerts");
      logger.info(`${socket.user?.name} subscribed to low stock alerts`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${socket.user?.name} (${socket.id})`);
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error(`Socket error for user ${socket.user?.name}:`, error);
    });
  });

  // Helper functions to emit events
  const emitToRole = (role: string, event: string, data: any) => {
    io.to(role).emit(event, data);
  };

  const emitToUser = (userId: string, event: string, data: any) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  const emitToRoom = (room: string, event: string, data: any) => {
    io.to(room).emit(event, data);
  };

  // Expose helper functions
  (io as any).emitToRole = emitToRole;
  (io as any).emitToUser = emitToUser;
  (io as any).emitToRoom = emitToRoom;

  return io;
}
