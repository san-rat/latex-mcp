import { randomUUID } from "node:crypto";
import type { CompileResult, ResourceFile, SessionInfo } from "@latex-mcp/shared";

type Session = SessionInfo;

const sessions = new Map<string, Session>();

function newSession(sessionId: string): Session {
  const session: Session = {
    sessionId,
    createdAt: new Date().toISOString(),
    resources: [],
  };
  sessions.set(sessionId, session);
  return session;
}

export function createSession(): Session {
  return newSession(randomUUID());
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function getOrCreateSession(sessionId: string): Session {
  return sessions.get(sessionId) ?? newSession(sessionId);
}

export function updateResources(
  sessionId: string,
  resources: ResourceFile[],
  rootResourcePath: string
): Session {
  const session = getOrCreateSession(sessionId);
  session.resources = resources;
  session.rootResourcePath = rootResourcePath;
  return session;
}

export function recordCompileResult(sessionId: string, result: CompileResult): void {
  const session = getOrCreateSession(sessionId);
  session.lastCompiledAt = new Date().toISOString();
  session.lastCompileResult = result;
}

export function listSessions(): Session[] {
  return Array.from(sessions.values());
}
