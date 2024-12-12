import express from "express";
import { type Express, type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";

// Server configuration
const isDev = process.env.NODE_ENV !== "production";
const PORT = isDev ? 3000 : Number(process.env.PORT);
const CORS_ORIGINS = isDev 
  ? ["http://localhost:5173", "http://0.0.0.0:5173"]
  : ["https://testimonialhub.repl.co"];

// Create Express application
export function createApp(): Express {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !isDev,
      sameSite: isDev ? "lax" : "none",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "healthy", environment: process.env.NODE_ENV });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(`Error [${req.method} ${req.path}]:`, err);
    res.status(500).json({
      error: isDev ? err.message : "Internal Server Error",
      ...(isDev ? { stack: err.stack } : {})
    });
  });

  return app;
}

// Server startup
export function startServer(app: Express) {
  const server = createServer(app);

  return new Promise((resolve, reject) => {
    try {
      server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running in ${process.env.NODE_ENV || "development"} mode`);
        console.log(`Server listening on port ${PORT}`);
        resolve(server);
      });

      // Graceful shutdown
      process.on("SIGTERM", () => {
        console.log("SIGTERM received. Shutting down gracefully...");
        server.close(() => {
          console.log("Server closed");
          process.exit(0);
        });
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      reject(error);
    }
  });
}
