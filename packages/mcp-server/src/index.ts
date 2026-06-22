import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Placeholder MCP entrypoint. Real tools (compile_latex, get_page_count,
// get_pdf_preview, get_compile_log) are wired up against the backend service
// in a later step — this proves the stdio transport + tool registration works.

const server = new McpServer({
  name: "latex-mcp",
  version: "0.1.0",
});

server.registerTool(
  "ping",
  {
    description: "Health check tool — returns pong.",
    inputSchema: { message: z.string().optional() },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: `pong${message ? `: ${message}` : ""}` }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
