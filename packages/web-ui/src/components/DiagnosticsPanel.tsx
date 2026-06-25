import { parseCompileLog } from "@latex-mcp/shared";

interface DiagnosticsPanelProps {
  log?: string;
  status?: "success" | "failure" | "error";
  onJump?: (line: number) => void;
}

export function DiagnosticsPanel({ log, status, onJump }: DiagnosticsPanelProps) {
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
          {diagnostics.map((d, i) => {
            const canJump = d.line !== undefined;
            const jump = () => {
              if (d.line !== undefined) onJump?.(d.line);
            };
            return (
              <li
                key={i}
                className={`diagnostic diagnostic-${d.severity}`}
                onClick={canJump ? jump : undefined}
                role={canJump ? "button" : undefined}
                tabIndex={canJump ? 0 : undefined}
                onKeyDown={
                  canJump
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          jump();
                        }
                      }
                    : undefined
                }
              >
                <span className="diagnostic-severity">{d.severity}</span>
                {d.line !== undefined && <span className="diagnostic-line">line {d.line}</span>}
                <span className="diagnostic-message">{d.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
