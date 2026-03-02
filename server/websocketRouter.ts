import { Server } from "http";
import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";

/**
 * Central WebSocket Router
 * 
 * The `ws` library has a limitation: you can only attach ONE WebSocketServer
 * with automatic path routing ({ server, path }) per HTTP server.
 * 
 * This router solves that by creating multiple WebSocketServers with
 * `noServer: true` and manually routing upgrade requests based on the path.
 */

export interface WebSocketRoute {
  path: string;
  wss: WebSocketServer;
  name: string;
}

const routes: WebSocketRoute[] = [];

export function registerWebSocketRoute(path: string, wss: WebSocketServer, name: string): void {
  routes.push({ path, wss, name });
  console.log(`[WebSocketRouter] Registered route: ${path} (${name})`);
}

export function setupWebSocketRouter(server: Server): void {
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = request.url || '/';
    
    console.log(`[WebSocketRouter] Upgrade request for: ${url}`);
    
    // Find matching route
    const route = routes.find(r => url === r.path || url.startsWith(r.path + '?'));
    
    if (route) {
      console.log(`[WebSocketRouter] Routing to ${route.name}`);
      
      route.wss.handleUpgrade(request, socket, head, (ws) => {
        route.wss.emit('connection', ws, request);
      });
    } else {
      console.log(`[WebSocketRouter] No route found for ${url}, destroying socket`);
      socket.destroy();
    }
  });

  console.log(`[WebSocketRouter] Initialized with ${routes.length} routes (unified Gemini 2.5 Flash Native Audio)`);
}
