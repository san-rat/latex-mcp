// Types shared between the backend service, the MCP server, and the web UI.

export type Compiler = "pdflatex" | "xelatex" | "lualatex";

export interface ResourceFile {
  path: string;
  content: string;
}

export interface CompileRequest {
  sessionId: string;
  rootResourcePath: string;
  resources: ResourceFile[];
  compiler?: Compiler;
}

export type CompileStatus = "success" | "failure" | "error";

export interface CompileResult {
  sessionId: string;
  status: CompileStatus;
  pdfPath?: string;
  pageCount?: number;
  log: string;
  rawLog?: string;
}

export interface SessionInfo {
  sessionId: string;
  createdAt: string;
  lastCompiledAt?: string;
  rootResourcePath?: string;
  resources: ResourceFile[];
  lastCompileResult?: CompileResult;
}
