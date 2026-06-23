import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import type { Compiler, ResourceFile } from "@latex-mcp/shared";
import { compileWithClsi } from "../clsi-client.js";
import { config } from "../config.js";
import {
  createSession,
  getOrCreateSession,
  getSession,
  recordCompileResult,
  updateResources,
} from "../session-manager.js";
import { broadcast } from "../ws.js";

export const sessionsRouter = Router();

sessionsRouter.post("/sessions", (_req, res) => {
  res.status(201).json(createSession());
});

sessionsRouter.get("/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  res.json(session);
});

sessionsRouter.put("/sessions/:id/resources", (req, res) => {
  const { resources, rootResourcePath } = req.body as {
    resources: ResourceFile[];
    rootResourcePath: string;
  };

  if (!Array.isArray(resources) || !rootResourcePath) {
    res.status(400).json({ error: "resources[] and rootResourcePath are required" });
    return;
  }

  res.json(updateResources(req.params.id, resources, rootResourcePath));
});

sessionsRouter.post("/sessions/:id/compile", async (req, res) => {
  const sessionId = req.params.id;
  const session = getOrCreateSession(sessionId);

  if (!session.rootResourcePath || session.resources.length === 0) {
    res.status(400).json({ error: "session has no resources set yet" });
    return;
  }

  const compiler = (req.body?.compiler as Compiler | undefined) ?? "pdflatex";

  try {
    const result = await compileWithClsi(
      sessionId,
      session.rootResourcePath,
      session.resources,
      compiler
    );
    recordCompileResult(sessionId, result);
    broadcast(sessionId, { type: "compile-result", result });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(502).json({ error: message });
  }
});

sessionsRouter.get("/sessions/:id/files/:filename", (req, res) => {
  const filePath = path.join(config.compilesDir, req.params.id, req.params.filename);

  if (!filePath.startsWith(config.compilesDir)) {
    res.status(400).json({ error: "invalid path" });
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "file not found" });
    return;
  }
  res.sendFile(filePath);
});
