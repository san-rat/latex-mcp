import { useCallback, useEffect, useState } from "react";
import type { CompileResult, Compiler } from "@latex-mcp/shared";
import * as api from "./api.js";
import { Editor } from "./components/Editor.js";
import { PdfPreview } from "./components/PdfPreview.js";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel.js";
import { Sidebar } from "./components/Sidebar.js";
import { openTexFile, saveAsTexFile, saveToHandle } from "./fileSystem.js";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fileName, setFileName] = useState("Untitled.tex");
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

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

  const startFreshSession = useCallback(async () => {
    const session = await api.createSession();
    setSessionId(session.sessionId);
    setSessionIdInUrl(session.sessionId);
    setLastResult(undefined);
    setPdfUrlValue(undefined);
  }, []);

  const handleNewFile = useCallback(async () => {
    setSource(DEFAULT_SOURCE);
    setFileName("Untitled.tex");
    setFileHandle(null);
    setErrorMessage(undefined);
    await startFreshSession();
  }, [startFreshSession]);

  const handleOpenFile = useCallback(async () => {
    try {
      const opened = await openTexFile();
      if (!opened) return;
      setSource(opened.content);
      setFileName(opened.name);
      setFileHandle(opened.handle);
      setErrorMessage(undefined);
      await startFreshSession();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to open file");
    }
  }, [startFreshSession]);

  const handleSaveAs = useCallback(async () => {
    try {
      const saved = await saveAsTexFile(source, fileName);
      if (saved) {
        setFileName(saved.name);
        setFileHandle(saved.handle);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save file");
    }
  }, [source, fileName]);

  const handleSave = useCallback(async () => {
    try {
      if (fileHandle) {
        await saveToHandle(fileHandle, source);
      } else {
        await handleSaveAs();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save file");
    }
  }, [fileHandle, source, handleSaveAs]);

  // Keyboard shortcuts: Ctrl/Cmd+S to save, Ctrl/Cmd+Enter to compile.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;
      if (event.key === "s") {
        event.preventDefault();
        void handleSave();
      } else if (event.key === "Enter") {
        event.preventDefault();
        void handleCompile();
      }
    }
    // Capture phase: CodeMirror's own key handling can stop propagation for
    // keys it considers its own once the event reaches the bubble phase, so a
    // bubble-phase listener on window can silently miss these while the
    // editor has focus.
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleSave, handleCompile]);

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
        <button onClick={handleCompile} disabled={!sessionId || compiling} title="Compile (Ctrl/Cmd+Enter)">
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

      <div className="body">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          fileName={fileName}
          onNewFile={handleNewFile}
          onOpenFile={handleOpenFile}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
        />
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
    </div>
  );
}
