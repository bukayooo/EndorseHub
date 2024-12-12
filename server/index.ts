import express from "express";
import { registerRoutes } from "./routes";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { setupVite } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();
    const isDev = process.env.NODE_ENV !== "production";
    const PORT = Number(process.env.PORT) || 3000;

    const server = createServer(app);

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // API Routes
    registerRoutes(app);

    if (isDev) {
      console.log("[Server] Setting up development environment...");
      await setupVite(app, server);
    } else {
      console.log("[Server] Setting up production environment...");
      app.use(express.static(path.join(__dirname, "../dist/public")));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(__dirname, "../dist/public/index.html"));
      });
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] Running on port ${PORT} (${isDev ? "development" : "production"} mode)`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

startServer().catch(console.error);
