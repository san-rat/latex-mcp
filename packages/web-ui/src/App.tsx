import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { EditorView } from "@codemirror/view";
import type { CompileResult, Compiler, ResourceFile } from "@latex-mcp/shared";
import * as api from "./api.js";
import { Editor } from "./components/Editor.js";
import { PdfPreview } from "./components/PdfPreview.js";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel.js";
import { Sidebar } from "./components/Sidebar.js";
import { Toast } from "./components/Toast.js";
import { PlayIcon, SyncIcon } from "./components/icons.js";
import { openTexFile, saveAsTexFile, saveToHandle } from "./fileSystem.js";
import { useSessionSocket } from "./useSessionSocket.js";

const DEFAULT_SOURCE = `\\documentclass{article}
\\begin{document}
\\section{Hello from latex-mcp}
Edit this source, then click Compile.
\\end{document}
`;
const MIN_PANE_WIDTH = 200;
const DEFAULT_FILES: ResourceFile[] = [{ path: "main.tex", content: DEFAULT_SOURCE }];

function storedPaneWidth(key: string, fallback: number): number {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value >= MIN_PANE_WIDTH ? value : fallback;
}

function resourcesEqual(left: ResourceFile[], right: ResourceFile[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

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
  const [joinError, setJoinError] = useState<string | undefined>(undefined);
  const [files, setFiles] = useState<ResourceFile[]>(DEFAULT_FILES);
  const [savedFiles, setSavedFiles] = useState<ResourceFile[]>(DEFAULT_FILES);
  const [activePath, setActivePath] = useState("main.tex");
  const [rootPath, setRootPath] = useState("main.tex");
  const [compiling, setCompiling] = useState(false);
  const [compiler, setCompiler] = useState<Compiler>("pdflatex");
  const [lastResult, setLastResult] = useState<CompileResult | undefined>(undefined);
  const [pdfUrlValue, setPdfUrlValue] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editorW, setEditorW] = useState(() => storedPaneWidth("latex-mcp-editor-width", 480));
  const [diagW, setDiagW] = useState(() => storedPaneWidth("latex-mcp-diagnostics-width", 280));
  const [pdfScrollTarget, setPdfScrollTarget] = useState<
    { page: number; v: number; nonce: number } | undefined
  >(undefined);
  const editorViewRef = useRef<EditorView | null>(null);
  const compilingRef = useRef(false);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const fileHandlesRef = useRef<Map<string, FileSystemFileHandle>>(new Map());
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const activeContent = files.find((file) => file.path === activePath)?.content ?? "";
  const isDirty = !resourcesEqual(files, savedFiles);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const jumpToLine = useCallback((line: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
    const lineInfo = view.state.doc.line(clamped);
    view.dispatch({ selection: { anchor: lineInfo.from }, scrollIntoView: true });
    view.focus();
  }, []);

  const handlePdfClick = useCallback(
    async (page: number, h: number, v: number) => {
      if (!sessionId) return;
      try {
        const positions = await api.syncPdfToCode(sessionId, page, h, v);
        const position = positions[0];
        if (!position?.line) return;
        if (files.some((file) => file.path === position.file) && position.file !== activePath) {
          setActivePath(position.file);
          window.setTimeout(() => jumpToLine(position.line), 0);
        } else {
          jumpToLine(position.line);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "PDF sync failed");
      }
    },
    [sessionId, files, activePath, jumpToLine]
  );

  const handleSyncToPdf = useCallback(async () => {
    if (!sessionId) return;
    const view = editorViewRef.current;
    if (!view) return;
    const line = view.state.doc.lineAt(view.state.selection.main.head).number;
    try {
      const positions = await api.syncCodeToPdf(sessionId, line, 0, activePath);
      const position = positions[0];
      if (!position) {
        setErrorMessage("No PDF position found for the current source line");
        return;
      }
      setErrorMessage(undefined);
      setPdfScrollTarget((current) => ({
        page: position.page,
        v: position.v,
        nonce: (current?.nonce ?? 0) + 1,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Source sync failed");
    }
  }, [sessionId, activePath]);

  const startResize = useCallback(
    (side: "editor" | "diagnostics") => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = side === "editor" ? editorW : diagW;
      const maxWidth = Math.max(MIN_PANE_WIDTH, window.innerWidth - 400);
      const clamp = (value: number) => Math.min(maxWidth, Math.max(MIN_PANE_WIDTH, value));

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function onPointerMove(moveEvent: PointerEvent) {
        const delta = moveEvent.clientX - startX;
        if (side === "editor") {
          setEditorW(clamp(startWidth + delta));
        } else {
          setDiagW(clamp(startWidth - delta));
        }
      }

      function onPointerUp() {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [editorW, diagW]
  );

  // Bootstrap: join an existing session from the URL, or create a new one.
  useEffect(() => {
    const existing = getSessionIdFromUrl();
    if (existing) {
      api
        .getSession(existing)
        .then((session) => {
          setSessionId(session.sessionId);
          if (session.resources.length > 0) {
            const sessionRoot = session.rootResourcePath ?? session.resources[0].path;
            setFiles(session.resources);
            setSavedFiles(session.resources);
            setRootPath(sessionRoot);
            setActivePath(sessionRoot);
          }
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
    const external = !compilingRef.current;
    setLastResult(result);
    setCompiling(false);
    if (result.status === "success" && sessionId) {
      setPdfUrlValue(api.pdfUrl(sessionId));
    }
    if (sessionId) {
      api.getSession(sessionId).then((session) => {
        if (session.resources.length === 0) return;
        const sessionRoot = session.rootResourcePath ?? session.resources[0].path;
        setFiles(session.resources);
        setRootPath(sessionRoot);
        setActivePath((current) =>
          session.resources.some((file) => file.path === current) ? current : sessionRoot
        );
      });
    }
    if (external) showToast("Updated by another session");
  });

  useEffect(() => {
    compilingRef.current = compiling;
  }, [compiling]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  const handleCompile = useCallback(async () => {
    if (!sessionId) return;
    setCompiling(true);
    setErrorMessage(undefined);
    try {
      await api.setResources(sessionId, files, rootPath);
      await api.compile(sessionId, compiler);
      // Result + PDF refresh arrive via the WebSocket broadcast.
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Compile failed");
      setCompiling(false);
    }
  }, [sessionId, files, rootPath, compiler]);

  const handleJoin = useCallback(async () => {
    const id = joinInput.trim();
    if (!id) return;
    setJoinError(undefined);
    try {
      await api.getSession(id);
      setSessionIdInUrl(id);
      window.location.reload();
    } catch {
      setJoinError("No session found with that id.");
    }
  }, [joinInput]);

  const startFreshSession = useCallback(async () => {
    const session = await api.createSession();
    setSessionId(session.sessionId);
    setSessionIdInUrl(session.sessionId);
    setLastResult(undefined);
    setPdfUrlValue(undefined);
  }, []);

  const handleNewFile = useCallback(async () => {
    const nextFiles = [{ path: "main.tex", content: DEFAULT_SOURCE }];
    setFiles(nextFiles);
    setSavedFiles(nextFiles);
    setActivePath("main.tex");
    setRootPath("main.tex");
    fileHandlesRef.current.clear();
    setErrorMessage(undefined);
    await startFreshSession();
  }, [startFreshSession]);

  const handleOpenFile = useCallback(async () => {
    try {
      const opened = await openTexFile();
      if (!opened) return;
      const nextFiles = [{ path: opened.name, content: opened.content }];
      setFiles(nextFiles);
      setSavedFiles(nextFiles);
      setActivePath(opened.name);
      setRootPath(opened.name);
      fileHandlesRef.current.clear();
      if (opened.handle) fileHandlesRef.current.set(opened.name, opened.handle);
      setErrorMessage(undefined);
      await startFreshSession();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to open file");
    }
  }, [startFreshSession]);

  const handleSaveAs = useCallback(async () => {
    try {
      const saved = await saveAsTexFile(activeContent, activePath);
      if (saved) {
        if (saved.handle) fileHandlesRef.current.set(activePath, saved.handle);
        setSavedFiles((current) => {
          const existing = current.findIndex((file) => file.path === activePath);
          if (existing === -1) return [...current, { path: activePath, content: activeContent }];
          return current.map((file) =>
            file.path === activePath ? { ...file, content: activeContent } : file
          );
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save file");
    }
  }, [activeContent, activePath]);

  const handleSave = useCallback(async () => {
    try {
      const fileHandle = fileHandlesRef.current.get(activePath);
      if (fileHandle) {
        await saveToHandle(fileHandle, activeContent);
        setSavedFiles((current) =>
          current.map((file) =>
            file.path === activePath ? { ...file, content: activeContent } : file
          )
        );
      } else {
        await handleSaveAs();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save file");
    }
  }, [activeContent, activePath, handleSaveAs]);

  const handleAddFile = useCallback(() => {
    const path = window.prompt("New file name (.tex or .bib):")?.trim();
    if (!path) return;
    if (!/\.(tex|bib)$/i.test(path)) {
      setErrorMessage("File name must end in .tex or .bib");
      return;
    }
    if (files.some((file) => file.path === path)) {
      setErrorMessage("A file with that path already exists");
      return;
    }
    setFiles((current) => [...current, { path, content: "" }]);
    setActivePath(path);
    setErrorMessage(undefined);
  }, [files]);

  const handleDeleteFile = useCallback(
    (path: string) => {
      if (path === rootPath) {
        setErrorMessage("The root file cannot be deleted");
        return;
      }
      setFiles((current) => current.filter((file) => file.path !== path));
      setSavedFiles((current) => current.filter((file) => file.path !== path));
      fileHandlesRef.current.delete(path);
      if (activePath === path) setActivePath(rootPath);
      setErrorMessage(undefined);
    },
    [activePath, rootPath]
  );

  const handleSetRoot = useCallback(
    (path: string) => {
      if (!files.some((file) => file.path === path)) return;
      setRootPath(path);
      setErrorMessage(undefined);
    },
    [files]
  );

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

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    window.localStorage.setItem("latex-mcp-editor-width", String(editorW));
  }, [editorW]);

  useEffect(() => {
    window.localStorage.setItem("latex-mcp-diagnostics-width", String(diagW));
  }, [diagW]);

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
        <button
          className="icon-button"
          onClick={handleCompile}
          disabled={!sessionId || compiling}
          title="Compile (Ctrl/Cmd+Enter)"
        >
          <PlayIcon />
          {compiling ? "Compiling…" : "Compile"}
        </button>
        <div className="join-session">
          <input
            placeholder="Join session id…"
            value={joinInput}
            onChange={(e) => {
              setJoinInput(e.target.value);
              setJoinError(undefined);
            }}
          />
          <button onClick={handleJoin}>Join</button>
          {joinError && <span className="join-error">{joinError}</span>}
        </div>
        {errorMessage && <span className="error-message">{errorMessage}</span>}
      </header>

      <div className="body">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          files={files}
          activePath={activePath}
          rootPath={rootPath}
          dirty={isDirty}
          onSelectFile={setActivePath}
          onAddFile={handleAddFile}
          onDeleteFile={handleDeleteFile}
          onSetRoot={handleSetRoot}
          onNewFile={handleNewFile}
          onOpenFile={handleOpenFile}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
        />
        <main
          className="layout"
          style={
            isNarrow
              ? undefined
              : {
                  gridTemplateColumns: `${editorW}px 6px minmax(0, 1fr) 6px ${diagW}px`,
                }
          }
        >
          <div className="pane editor-pane">
            <div className="editor-toolbar">
              <button
                className="icon-button"
                onClick={handleSyncToPdf}
                disabled={!sessionId || !pdfUrlValue}
              >
                <SyncIcon />
                Sync to PDF
              </button>
            </div>
            <div className="editor-container">
              <Editor
                value={activeContent}
                onChange={(content) =>
                  setFiles((current) =>
                    current.map((file) => (file.path === activePath ? { ...file, content } : file))
                  )
                }
                editable={!compiling}
                onReady={(view) => {
                  editorViewRef.current = view;
                }}
              />
            </div>
          </div>
          {!isNarrow && <div className="gutter" onPointerDown={startResize("editor")} />}
          <div className="pane preview-pane">
            <PdfPreview
              pdfUrl={pdfUrlValue}
              onPdfClick={handlePdfClick}
              scrollTarget={pdfScrollTarget}
            />
          </div>
          {!isNarrow && <div className="gutter" onPointerDown={startResize("diagnostics")} />}
          <div className="pane diagnostics-pane">
            <DiagnosticsPanel log={lastResult?.log} status={lastResult?.status} onJump={jumpToLine} />
          </div>
        </main>
      </div>
      {toast && <Toast message={toast} />}
    </div>
  );
}
