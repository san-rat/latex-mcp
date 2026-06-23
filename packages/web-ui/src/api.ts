import type { Compiler, SessionInfo } from "@latex-mcp/shared";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:4000";
const BACKEND_WS_URL = BACKEND_URL.replace(/^http/, "ws");

export { BACKEND_URL, BACKEND_WS_URL };

export async function createSession(): Promise<SessionInfo> {
  const res = await fetch(`${BACKEND_URL}/sessions`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to create session (${res.status})`);
  return (await res.json()) as SessionInfo;
}

export async function getSession(sessionId: string): Promise<SessionInfo> {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}`);
  if (!res.ok) throw new Error(`Session not found (${res.status})`);
  return (await res.json()) as SessionInfo;
}

export async function setResources(
  sessionId: string,
  source: string,
  rootResourcePath = "main.tex"
): Promise<SessionInfo> {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/resources`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resources: [{ path: rootResourcePath, content: source }],
      rootResourcePath,
    }),
  });
  if (!res.ok) throw new Error(`Failed to set resources (${res.status})`);
  return (await res.json()) as SessionInfo;
}

export async function compile(sessionId: string, compiler: Compiler = "pdflatex") {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Compile failed (${res.status})`);
  }
  return data;
}

export function pdfUrl(sessionId: string): string {
  return `${BACKEND_URL}/sessions/${sessionId}/files/output.pdf?t=${Date.now()}`;
}
