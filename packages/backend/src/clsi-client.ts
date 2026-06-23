import fs from "node:fs/promises";
import path from "node:path";
import type {
  CodePosition,
  CompileResult,
  Compiler,
  PdfPosition,
  ResourceFile,
  WordCountResult,
} from "@latex-mcp/shared";
import { config } from "./config.js";

interface ClsiCompileResponse {
  compile: {
    status: "success" | "failure" | "error";
    error: string | null;
  };
}

export async function compileWithClsi(
  sessionId: string,
  rootResourcePath: string,
  resources: ResourceFile[],
  compiler: Compiler = "pdflatex"
): Promise<CompileResult> {
  const response = await fetch(`${config.clsiUrl}/project/${sessionId}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compile: {
        options: { compiler },
        rootResourcePath,
        resources,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CLSI request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ClsiCompileResponse;
  const projectDir = path.join(config.compilesDir, sessionId);
  const log = await readIfExists(path.join(projectDir, "output.log"));

  if (data.compile.status !== "success") {
    return {
      sessionId,
      status: data.compile.status,
      log: log ?? data.compile.error ?? "CLSI compile failed with no log output",
    };
  }

  const pdfPath = path.join(projectDir, "output.pdf");

  return {
    sessionId,
    status: "success",
    pdfPath: (await fileExists(pdfPath)) ? pdfPath : undefined,
    log: log ?? "",
  };
}

export async function getWordCount(sessionId: string, file: string): Promise<WordCountResult> {
  const params = new URLSearchParams({ file });
  const response = await fetch(`${config.clsiUrl}/project/${sessionId}/wordcount?${params}`);
  if (!response.ok) {
    throw new Error(`CLSI wordcount request failed (${response.status})`);
  }
  const data = (await response.json()) as { texcount: WordCountResult };
  return data.texcount;
}

export async function syncCodeToPdf(
  sessionId: string,
  file: string,
  line: number,
  column = 0
): Promise<PdfPosition[]> {
  const params = new URLSearchParams({ file, line: String(line), column: String(column) });
  const response = await fetch(`${config.clsiUrl}/project/${sessionId}/sync/code?${params}`);
  if (!response.ok) {
    throw new Error(`CLSI sync/code request failed (${response.status})`);
  }
  const data = (await response.json()) as { pdf: PdfPosition[] };
  return data.pdf;
}

export async function syncPdfToCode(
  sessionId: string,
  page: number,
  h: number,
  v: number
): Promise<CodePosition[]> {
  const params = new URLSearchParams({ page: String(page), h: String(h), v: String(v) });
  const response = await fetch(`${config.clsiUrl}/project/${sessionId}/sync/pdf?${params}`);
  if (!response.ok) {
    throw new Error(`CLSI sync/pdf request failed (${response.status})`);
  }
  const data = (await response.json()) as { code: CodePosition[] };
  return data.code;
}

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
