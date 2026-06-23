import { useEffect, useRef } from "react";
import type { CompileResult } from "@latex-mcp/shared";
import { BACKEND_WS_URL } from "./api.js";

type CompileResultMessage = { type: "compile-result"; result: CompileResult };

export function useSessionSocket(
  sessionId: string | undefined,
  onCompileResult: (result: CompileResult) => void
): void {
  const handlerRef = useRef(onCompileResult);
  handlerRef.current = onCompileResult;

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${BACKEND_WS_URL}/ws?sessionId=${sessionId}`);
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as CompileResultMessage;
        if (message.type === "compile-result") {
          handlerRef.current(message.result);
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => ws.close();
  }, [sessionId]);
}
