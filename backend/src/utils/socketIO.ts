import { Server, Socket } from "socket.io";
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

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthSocket;
    logger.info(`User connected: ${authSocket.user?.name} (${authSocket.id})`);

    // Join user to their role-based rooms
    if (authSocket.user?.role) {
      authSocket.join(authSocket.user.role);
      authSocket.join(`user_${authSocket.user.id}`);
    }

    // Subscribe to inventory updates
    authSocket.on("subscribe-inventory", () => {
      authSocket.join("inventory-updates");
      logger.info("User subscribed to inventory updates");
    });

    // Subscribe to sales updates
    authSocket.on("subscribe-sales", () => {
      authSocket.join("sales-updates");
      logger.info("User subscribed to sales updates");
    });

    // Subscribe to analytics updates
    authSocket.on("subscribe-analytics", () => {
      authSocket.join("analytics-updates");
      logger.info("User subscribed to analytics updates");
    });

    // Subscribe to low stock alerts
    authSocket.on("subscribe-low-stock", () => {
      authSocket.join("low-stock-alerts");
      logger.info("User subscribed to low stock alerts");
    });

    // Handle disconnect
    authSocket.on("disconnect", () => {
      logger.info(
        `User disconnected: ${authSocket.user?.name} (${authSocket.id})`
      );
    });

    // Handle errors
    authSocket.on("error", (error: any) => {
      logger.error("Socket error:", error);
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
