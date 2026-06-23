import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseCompileLog } from "@latex-mcp/shared";
import * as backend from "../backend-client.js";

export function registerDiagnosticsTool(server: McpServer): void {
  server.registerTool(
    "get_compile_diagnostics",
    {
      description:
        "Get structured errors and warnings (file, line, message, severity) parsed from the most " +
        "recent compile log, including Overfull/Underfull box warnings. Use this instead of " +
        "get_compile_log when you want to act on specific line numbers rather than read raw output.",
      inputSchema: {
        sessionId: z.string().describe("Session id returned by compile_latex"),
      },
    },
    async ({ sessionId }) => {
      try {
        const session = await backend.getSession(sessionId);
        const log = session.lastCompileResult?.log;
        if (!log) {
          return {
            content: [{ type: "text" as const, text: "No compile log found for this session." }],
            isError: true,
          };
        }

        const diagnostics = parseCompileLog(log, session.rootResourcePath);
        return { content: [{ type: "text" as const, text: JSON.stringify(diagnostics, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `get_compile_diagnostics failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
