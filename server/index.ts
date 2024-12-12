import express from "express";
import { registerRoutes } from "./routes";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isDev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
registerRoutes(app);

// In production, serve static files
if (!isDev) {
  app.use(express.static(path.join(__dirname, "../dist/public")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../dist/public/index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Running on port ${PORT} (${isDev ? "development" : "production"} mode)`);
});
