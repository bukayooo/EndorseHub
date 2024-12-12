import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import viteConfig from "../vite.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} [server] ${message}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
registerRoutes(app);

async function startServer() {
  const PORT = parseInt(process.env.PORT || "3000");
  const server = createServer(app);

  // Development mode: Use Vite's dev server
  if (process.env.NODE_ENV === "development") {
    log("Setting up development server...");
    const vite = await createViteServer({
      ...viteConfig,
      server: { 
        middlewareMode: true,
        hmr: {
          server,
          port: PORT
        }
      },
      appType: 'custom'
    });

    // Use vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files
    const distPath = path.resolve(__dirname, "../dist/public");
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    log(`Listening on http://0.0.0.0:${PORT}`);
  });

  return server;
}

startServer().catch((err) => {
  log(`Failed to start server: ${err.message}`);
  process.exit(1);
});