import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as backend from "../backend-client.js";

export function registerWordCountTool(server: McpServer): void {
  server.registerTool(
    "get_word_count",
    {
      description:
        "Get a word/character count breakdown (via texcount) for a session's source, for documents " +
        "with word-limit constraints (abstracts, papers, etc.). Requires at least one successful compile.",
      inputSchema: {
        sessionId: z.string().describe("Session id returned by compile_latex"),
      },
    },
    async ({ sessionId }) => {
      try {
        const result = await backend.getWordCount(sessionId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `get_word_count failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
