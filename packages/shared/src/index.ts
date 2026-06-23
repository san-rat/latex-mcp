// Types shared between the backend service, the MCP server, and the web UI.

export * from "./log-parser.js";

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

export interface WordCountResult {
  encode: string;
  textWords: number;
  headWords: number;
  outside: number;
  headers: number;
  elements: number;
  mathInline: number;
  mathDisplay: number;
  errors: number;
  messages: string;
}

export interface PdfPosition {
  page: number;
  h: number;
  v: number;
  width?: number;
  height?: number;
}

export interface CodePosition {
  file: string;
  line: number;
  column: number;
}
