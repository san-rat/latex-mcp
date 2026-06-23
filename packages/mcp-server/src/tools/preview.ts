import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as backend from "../backend-client.js";
import { renderPageToPng } from "../utils/pdf.js";

export function registerPreviewTool(server: McpServer): void {
  server.registerTool(
    "get_pdf_preview",
    {
      description:
        "Render a page of the most recently compiled PDF as a PNG image, for visually inspecting layout " +
        "(e.g. checking whether content fits on one page, margins look right, etc.).",
      inputSchema: {
        sessionId: z.string().describe("Session id returned by compile_latex"),
        page: z.number().int().min(1).default(1).describe("1-indexed page number to render"),
      },
    },
    async ({ sessionId, page }) => {
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

        const pngBuffer = await renderPageToPng(pdfPath, page);
        return {
          content: [
            {
              type: "image" as const,
              data: pngBuffer.toString("base64"),
              mimeType: "image/png",
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `get_pdf_preview failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
