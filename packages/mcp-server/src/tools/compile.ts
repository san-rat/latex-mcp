import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Compiler, ResourceFile } from "@latex-mcp/shared";
import * as backend from "../backend-client.js";

const resourceSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export function registerCompileTool(server: McpServer): void {
  server.registerTool(
    "compile_latex",
    {
      description:
        "Compile a LaTeX document via a self-hosted CLSI instance and return the resulting PDF path, " +
        "compile status, and log. Pass sessionId to recompile/revise an existing document; omit it to " +
        "start a new one. Use the returned sessionId with get_page_count, get_pdf_preview, and " +
        "get_compile_log to inspect the result.",
      inputSchema: {
        source: z.string().describe("Main .tex source content"),
        rootResourcePath: z
          .string()
          .default("main.tex")
          .describe("Filename to use for the main source file"),
        resources: z
          .array(resourceSchema)
          .optional()
          .describe("Additional resource files (images, .bib, etc.) beyond the main source"),
        compiler: z
          .enum(["pdflatex", "xelatex", "lualatex"])
          .optional()
          .describe("LaTeX compiler to use, defaults to pdflatex"),
        sessionId: z
          .string()
          .optional()
          .describe("Existing session id to recompile/update; omit to create a new session"),
      },
    },
    async ({ source, rootResourcePath, resources, compiler, sessionId }) => {
      try {
        const session = sessionId
          ? await backend.getSession(sessionId).catch(() => backend.createSession())
          : await backend.createSession();

        const allResources: ResourceFile[] = [
          { path: rootResourcePath, content: source },
          ...(resources ?? []),
        ];

        await backend.setResources(session.sessionId, allResources, rootResourcePath);
        const result = await backend.compile(session.sessionId, (compiler ?? "pdflatex") as Compiler);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  sessionId: result.sessionId,
                  status: result.status,
                  pdfPath: result.pdfPath,
                  log: result.log,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `compile_latex failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
