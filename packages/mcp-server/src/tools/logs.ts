import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as backend from "../backend-client.js";

export function registerLogsTool(server: McpServer): void {
  server.registerTool(
    "get_compile_log",
    {
      description: "Get the raw LaTeX compile log for a session's most recent compile, for debugging errors.",
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
        return { content: [{ type: "text" as const, text: log }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `get_compile_log failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
