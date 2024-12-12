import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} [server] ${message}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes first
registerRoutes(app);

async function startServer() {
  try {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const server = createServer(app);

    // In development, set up Vite's dev server
    if (process.env.NODE_ENV === "development") {
      log("Setting up development server...");
      try {
        const clientRoot = path.resolve(__dirname, "../client");
        const vite = await createViteServer({
          root: clientRoot,
          configFile: path.resolve(clientRoot, "vite.config.ts"),
          server: {
            middlewareMode: true,
            hmr: {
              server,
              port: PORT
            }
          },
          appType: 'custom'
        });

        app.use(vite.middlewares);

        // Serve index.html for all routes (SPA)
        app.use("*", async (req, res, next) => {
          try {
            const template = fs.readFileSync(
              path.resolve(clientRoot, "index.html"),
              "utf-8"
            );
            const html = await vite.transformIndexHtml(req.originalUrl, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(html);
          } catch (e) {
            const err = e as Error;
            log(`Error serving index.html: ${err.message}`);
            next(err);
          }
        });

        log("Development server setup complete");
      } catch (err) {
        log(`Failed to create Vite server: ${(err as Error).message}`);
        throw err;
      }
    } else {
      // Production: Serve the built files
      const distPath = path.resolve(__dirname, "../dist/public");
      if (!fs.existsSync(distPath)) {
        throw new Error(`Build directory not found: ${distPath}. Run 'npm run build' first.`);
      }
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
      log(`Listening on http://0.0.0.0:${PORT}`);
    });

    return server;
  } catch (err) {
    log(`Failed to start server: ${(err as Error).message}`);
    console.error(err);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  log(`Uncaught Exception: ${err.message}`);
  console.error(err);
  process.exit(1);
});

startServer().catch((err) => {
  log(`Failed to start server: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});