import { useCallback, useEffect, useState } from "react";
import type { CompileResult, Compiler } from "@latex-mcp/shared";
import * as api from "./api.js";
import { Editor } from "./components/Editor.js";
import { PdfPreview } from "./components/PdfPreview.js";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel.js";
import { useSessionSocket } from "./useSessionSocket.js";

const DEFAULT_SOURCE = `\\documentclass{article}
\\begin{document}
\\section{Hello from latex-mcp}
Edit this source, then click Compile.
\\end{document}
`;

function getSessionIdFromUrl(): string | undefined {
  return new URLSearchParams(window.location.search).get("session") ?? undefined;
}

function setSessionIdInUrl(sessionId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  window.history.replaceState(null, "", url.toString());
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [joinInput, setJoinInput] = useState("");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [compiling, setCompiling] = useState(false);
  const [compiler, setCompiler] = useState<Compiler>("pdflatex");
  const [lastResult, setLastResult] = useState<CompileResult | undefined>(undefined);
  const [pdfUrlValue, setPdfUrlValue] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Bootstrap: join an existing session from the URL, or create a new one.
  useEffect(() => {
    const existing = getSessionIdFromUrl();
    if (existing) {
      api
        .getSession(existing)
        .then((session) => {
          setSessionId(session.sessionId);
          if (session.resources[0]) setSource(session.resources[0].content);
          if (session.lastCompileResult) {
            setLastResult(session.lastCompileResult);
            if (session.lastCompileResult.status === "success") {
              setPdfUrlValue(api.pdfUrl(session.sessionId));
            }
          }
        })
        .catch(() => api.createSession().then((s) => setSessionId(s.sessionId)));
    } else {
      api.createSession().then((s) => {
        setSessionId(s.sessionId);
        setSessionIdInUrl(s.sessionId);
      });
    }
  }, []);

  // Live updates from the backend, regardless of whether the compile was
  // triggered from this UI or from an LLM via MCP.
  useSessionSocket(sessionId, (result) => {
    setLastResult(result);
    setCompiling(false);
    if (result.status === "success" && sessionId) {
      setPdfUrlValue(api.pdfUrl(sessionId));
    }
    if (sessionId) {
      api.getSession(sessionId).then((session) => {
        if (session.resources[0]) setSource(session.resources[0].content);
      });
    }
  });

  const handleCompile = useCallback(async () => {
    if (!sessionId) return;
    setCompiling(true);
    setErrorMessage(undefined);
    try {
      await api.setResources(sessionId, source);
      await api.compile(sessionId, compiler);
      // Result + PDF refresh arrive via the WebSocket broadcast.
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Compile failed");
      setCompiling(false);
    }
  }, [sessionId, source, compiler]);

  const handleJoin = useCallback(() => {
    if (!joinInput.trim()) return;
    setSessionIdInUrl(joinInput.trim());
    window.location.reload();
  }, [joinInput]);

  return (
    <div className="app">
      <header className="toolbar">
        <strong>latex-mcp</strong>
        <span className="session-id" title={sessionId}>
          session: {sessionId ? `${sessionId.slice(0, 8)}…` : "creating…"}
        </span>
        <select value={compiler} onChange={(e) => setCompiler(e.target.value as Compiler)}>
          <option value="pdflatex">pdflatex</option>
          <option value="xelatex">xelatex</option>
          <option value="lualatex">lualatex</option>
        </select>
        <button onClick={handleCompile} disabled={!sessionId || compiling}>
          {compiling ? "Compiling…" : "Compile"}
        </button>
        <div className="join-session">
          <input
            placeholder="Join session id…"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
          />
          <button onClick={handleJoin}>Join</button>
        </div>
        {errorMessage && <span className="error-message">{errorMessage}</span>}
      </header>

      <main className="layout">
        <div className="pane editor-pane">
          <Editor value={source} onChange={setSource} editable={!compiling} />
        </div>
        <div className="pane preview-pane">
          <PdfPreview pdfUrl={pdfUrlValue} />
        </div>
        <div className="pane diagnostics-pane">
          <DiagnosticsPanel log={lastResult?.log} status={lastResult?.status} />
        </div>
      </main>
    </div>
  );
}
