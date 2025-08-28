import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth";
import inventoryRoutes from "./routes/inventory";
import salesRoutes from "./routes/sales";
import analyticsRoutes from "./routes/analytics";
import userRoutes from "./routes/users";
import branchRoutes from "./routes/branches";
import categoryRoutes from "./routes/categories";
import outgoingRoutes from "./routes/outgoing";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";

// Import utilities
import { logger } from "./utils/logger";
import { connectDatabase } from "./utils/database";
import { setupSocketIO } from "./utils/socketIO";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = setupSocketIO(httpServer);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Enable rate limiter only in production to avoid 429s during local dev
if (process.env.NODE_ENV === "production") {
  app.use(limiter);
}
app.use(requestLogger);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
const API_VERSION = process.env.API_VERSION || "v1";
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/inventory`, inventoryRoutes);
app.use(`/api/${API_VERSION}/sales`, salesRoutes);
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/branches`, branchRoutes);
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/outgoing`, outgoingRoutes);

// Swagger Documentation
if (process.env.NODE_ENV !== "production") {
  const swaggerJsdoc = require("swagger-jsdoc");
  const swaggerUi = require("swagger-ui-express");

  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "AX Stock Management API",
        version: "2.0.0",
        description: "Modern stock management system API",
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3001}/api/${API_VERSION}`,
          description: "Development server",
        },
      ],
    },
    apis: ["./src/routes/*.ts"],
  };

  const specs = swaggerJsdoc(options);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export { app, io };
