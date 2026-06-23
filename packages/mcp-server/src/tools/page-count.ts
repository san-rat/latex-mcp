import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as backend from "../backend-client.js";
import { getPageCount } from "../utils/pdf.js";

export function registerPageCountTool(server: McpServer): void {
  server.registerTool(
    "get_page_count",
    {
      description: "Get the number of pages in the most recently compiled PDF for a session.",
      inputSchema: {
        sessionId: z.string().describe("Session id returned by compile_latex"),
      },
    },
    async ({ sessionId }) => {
      try {
        const session = await backend.getSession(sessionId);
        const pdfPath = session.lastCompileResult?.pdfPath;
        if (!pdfPath) {
          return {
            content: [
              { type: "text" as const, text: "No successful compile with a PDF found for this session." },
            ],
            isError: true,
          };
        }

        const pageCount = await getPageCount(pdfPath);
        return { content: [{ type: "text" as const, text: String(pageCount) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `get_page_count failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
