import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as backend from "../backend-client.js";

export function registerSynctexTools(server: McpServer): void {
  server.registerTool(
    "sync_source_to_pdf",
    {
      description:
        "Given a line number in the main source file, return the PDF page and coordinates it renders " +
        "to (via SyncTeX). Useful for locating where a specific piece of source content ended up in " +
        "the compiled output.",
      inputSchema: {
        sessionId: z.string().describe("Session id returned by compile_latex"),
        line: z.number().int().min(1).describe("1-indexed line number in the main source file"),
        column: z.number().int().min(0).optional().describe("Column number, defaults to 0"),
      },
    },
    async ({ sessionId, line, column }) => {
      try {
        const positions = await backend.syncCodeToPdf(sessionId, line, column);
        return { content: [{ type: "text" as const, text: JSON.stringify(positions, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `sync_source_to_pdf failed: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "sync_pdf_to_source",
    {
      description:
        "Given a page number and coordinates in the compiled PDF, return the source file and line " +
        "that produced that content (via SyncTeX). Useful for finding exactly which source line caused " +
        "something like a page overflow, given its position on the page.",
      inputSchema: {
        sessionId: z.string().describe("Session id returned by compile_latex"),
        page: z.number().int().min(1).describe("1-indexed PDF page number"),
        h: z.number().describe("Horizontal position on the page, in PDF points"),
        v: z.number().describe("Vertical position on the page, in PDF points"),
      },
    },
    async ({ sessionId, page, h, v }) => {
      try {
        const positions = await backend.syncPdfToCode(sessionId, page, h, v);
        return { content: [{ type: "text" as const, text: JSON.stringify(positions, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `sync_pdf_to_source failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
