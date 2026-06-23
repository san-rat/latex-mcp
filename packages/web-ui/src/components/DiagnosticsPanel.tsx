import { parseCompileLog } from "@latex-mcp/shared";

interface DiagnosticsPanelProps {
  log?: string;
  status?: "success" | "failure" | "error";
}

export function DiagnosticsPanel({ log, status }: DiagnosticsPanelProps) {
  if (!log) {
    return <div className="diagnostics-empty">No compile yet.</div>;
  }

  const diagnostics = parseCompileLog(log);

  return (
    <div className="diagnostics-panel">
      <div className={`status-badge status-${status ?? "unknown"}`}>{status ?? "unknown"}</div>
      {diagnostics.length === 0 ? (
        <div className="diagnostics-empty">No errors or warnings.</div>
      ) : (
        <ul className="diagnostics-list">
          {diagnostics.map((d, i) => (
            <li key={i} className={`diagnostic diagnostic-${d.severity}`}>
              <span className="diagnostic-severity">{d.severity}</span>
              {d.line !== undefined && <span className="diagnostic-line">line {d.line}</span>}
              <span className="diagnostic-message">{d.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
