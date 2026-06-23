import type {
  CodePosition,
  CompileResult,
  Compiler,
  PdfPosition,
  ResourceFile,
  SessionInfo,
  WordCountResult,
} from "@latex-mcp/shared";

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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = (await res.json()) as T | { error: string };
  if (!res.ok) {
    throw new Error(
      data && typeof data === "object" && "error" in data
        ? data.error
        : `Request failed (${res.status})`
    );
  }
  return data as T;
}

export async function getWordCount(sessionId: string): Promise<WordCountResult> {
  return getJson<WordCountResult>(`${BACKEND_URL}/sessions/${sessionId}/wordcount`);
}

export async function syncCodeToPdf(
  sessionId: string,
  line: number,
  column?: number
): Promise<PdfPosition[]> {
  const params = new URLSearchParams({ line: String(line) });
  if (column !== undefined) params.set("column", String(column));
  return getJson<PdfPosition[]>(`${BACKEND_URL}/sessions/${sessionId}/sync/code?${params}`);
}

export async function syncPdfToCode(
  sessionId: string,
  page: number,
  h: number,
  v: number
): Promise<CodePosition[]> {
  const params = new URLSearchParams({ page: String(page), h: String(h), v: String(v) });
  return getJson<CodePosition[]>(`${BACKEND_URL}/sessions/${sessionId}/sync/pdf?${params}`);
}
