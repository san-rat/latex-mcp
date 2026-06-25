import type {
  CodePosition,
  Compiler,
  PdfPosition,
  ResourceFile,
  SessionInfo,
} from "@latex-mcp/shared";

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
  resources: ResourceFile[],
  rootResourcePath: string
): Promise<SessionInfo> {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/resources`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resources, rootResourcePath }),
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

export async function syncCodeToPdf(
  sessionId: string,
  line: number,
  column = 0,
  file?: string
): Promise<PdfPosition[]> {
  const params = new URLSearchParams({ line: String(line), column: String(column) });
  if (file) params.set("file", file);
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/sync/code?${params}`);
  if (!res.ok) throw new Error(`sync/code failed (${res.status})`);
  return (await res.json()) as PdfPosition[];
}

export async function syncPdfToCode(
  sessionId: string,
  page: number,
  h: number,
  v: number
): Promise<CodePosition[]> {
  const params = new URLSearchParams({ page: String(page), h: String(h), v: String(v) });
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/sync/pdf?${params}`);
  if (!res.ok) throw new Error(`sync/pdf failed (${res.status})`);
  return (await res.json()) as CodePosition[];
}

export function pdfUrl(sessionId: string): string {
  return `${BACKEND_URL}/sessions/${sessionId}/files/output.pdf?t=${Date.now()}`;
}
