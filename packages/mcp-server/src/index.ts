import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCompileTool } from "./tools/compile.js";
import { registerDiagnosticsTool } from "./tools/diagnostics.js";
import { registerLogsTool } from "./tools/logs.js";
import { registerPageCountTool } from "./tools/page-count.js";
import { registerPreviewTool } from "./tools/preview.js";
import { registerSynctexTools } from "./tools/synctex.js";
import { registerWordCountTool } from "./tools/wordcount.js";

const server = new McpServer({
  name: "latex-mcp",
  version: "0.1.0",
});

registerCompileTool(server);
registerPageCountTool(server);
registerPreviewTool(server);
registerLogsTool(server);
registerDiagnosticsTool(server);
registerWordCountTool(server);
registerSynctexTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
