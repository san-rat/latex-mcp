import type { CompileResult, Compiler, ResourceFile, SessionInfo } from "@latex-mcp/shared";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function createSession(): Promise<SessionInfo> {
  const res = await fetch(`${BACKEND_URL}/sessions`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to create session (${res.status})`);
  }
  return (await res.json()) as SessionInfo;
}

export async function getSession(sessionId: string): Promise<SessionInfo> {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}`);
  if (!res.ok) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return (await res.json()) as SessionInfo;
}

export async function setResources(
  sessionId: string,
  resources: ResourceFile[],
  rootResourcePath: string
): Promise<SessionInfo> {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/resources`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resources, rootResourcePath }),
  });
  if (!res.ok) {
    throw new Error(`Failed to set resources (${res.status})`);
  }
  return (await res.json()) as SessionInfo;
}

export async function compile(sessionId: string, compiler: Compiler): Promise<CompileResult> {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler }),
  });
  const data = (await res.json()) as CompileResult | { error: string };
  if (!res.ok) {
    throw new Error("error" in data ? data.error : `Compile request failed (${res.status})`);
  }
  return data as CompileResult;
}
