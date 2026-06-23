import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

const subscribers = new Map<string, Set<WebSocket>>();

export function attachWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      ws.close(1008, "sessionId query param required");
      return;
    }

    if (!subscribers.has(sessionId)) {
      subscribers.set(sessionId, new Set());
    }
    subscribers.get(sessionId)?.add(ws);

    ws.on("close", () => {
      subscribers.get(sessionId)?.delete(ws);
    });
  });
}

export function broadcast(sessionId: string, message: unknown): void {
  const targets = subscribers.get(sessionId);
  if (!targets) return;
  const payload = JSON.stringify(message);
  for (const ws of targets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}
