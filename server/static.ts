import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback — serve index.html for all client-side routes.
  // IMPORTANT: Nginx unconditionally forwards Connection: upgrade for every proxied
  // request (even plain GETs), so checking that header causes ALL requests to be
  // skipped. Only the RFC-6455-required `Upgrade: websocket` header reliably
  // identifies a true WebSocket handshake.
  app.use((req, res, next) => {
    if (req.headers.upgrade?.toLowerCase() === 'websocket') {
      return next();
    }

    // Skip API routes and static asset requests
    if (req.path.startsWith('/ws/') || req.path.startsWith('/api/') || req.path.includes('.')) {
      return next();
    }

    if (req.method === 'GET') {
      res.sendFile(path.resolve(distPath, "index.html"));
    } else {
      next();
    }
  });
}
