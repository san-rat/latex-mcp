import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as backend from "../backend-client.js";
import { getPageCount, renderPageToPng } from "../utils/pdf.js";

export function registerPreviewTool(server: McpServer): void {
  server.registerTool(
    "get_pdf_preview",
    {
      description:
        "Render page(s) of the most recently compiled PDF as PNG images, for visually inspecting layout " +
        "(e.g. checking whether content fits on one page, margins look right, etc.). Pass a specific " +
        "page to render just that one; omit it to render every page in the document in one call.",
      inputSchema: {
        sessionId: z.string().describe("Session id returned by compile_latex"),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("1-indexed page number to render. Omit to render every page in the document."),
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

        const pageNumbers = page
          ? [page]
          : Array.from({ length: await getPageCount(pdfPath) }, (_, i) => i + 1);

        const content = (
          await Promise.all(
            pageNumbers.map(async (pageNum) => {
              const pngBuffer = await renderPageToPng(pdfPath, pageNum);
              return [
                { type: "text" as const, text: `Page ${pageNum}` },
                {
                  type: "image" as const,
                  data: pngBuffer.toString("base64"),
                  mimeType: "image/png",
                },
              ];
            })
          )
        ).flat();

        return { content };
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
