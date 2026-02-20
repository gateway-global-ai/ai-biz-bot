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

  // SPA fallback - serve index.html for client-side routes
  // CRITICAL: Skip WebSocket upgrade requests entirely
  app.use((req, res, next) => {
    // WebSocket upgrade requests have these headers - don't touch them!
    if (req.headers.upgrade === 'websocket' || req.headers.connection?.toLowerCase().includes('upgrade')) {
      return next();
    }
    
    // Skip API routes and static files
    if (req.path.startsWith('/ws/') || req.path.startsWith('/api/') || req.path.includes('.')) {
      return next();
    }
    
    // Serve index.html for client-side routes
    if (req.method === 'GET') {
      res.sendFile(path.resolve(distPath, "index.html"));
    } else {
      next();
    }
  });
}
