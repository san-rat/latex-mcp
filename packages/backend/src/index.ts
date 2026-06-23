import http from "node:http";
import express from "express";
import { config } from "./config.js";
import { sessionsRouter } from "./routes/sessions.js";
import { attachWebSocketServer } from "./ws.js";

const app = express();
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(sessionsRouter);

const httpServer = http.createServer(app);
attachWebSocketServer(httpServer);

httpServer.listen(config.port, () => {
  console.log(`latex-mcp backend listening on http://localhost:${config.port}`);
});
