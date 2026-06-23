export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  file?: string;
  line?: number;
}

const FILE_OPEN_RE = /\(([^\s()]+\.(?:tex|sty|cls|cfg|def))/g;
const LATEX_WARNING_RE = /^LaTeX Warning: (.+?) on input line (\d+)\.?$/;
const PACKAGE_WARNING_RE = /^Package (\S+) Warning: (.+?) on input line (\d+)\.?$/;
const BOX_WARNING_RE =
  /^(Overfull|Underfull) \\(hbox|vbox) \(([^)]+)\) (?:in paragraph at lines (\d+)--\d+|detected at line (\d+))/;
const SOURCE_LINE_RE = /^l\.(\d+)/;

/**
 * Parses a pdflatex/xelatex/lualatex compile log into structured diagnostics.
 * File tracking uses a simple paren-nesting heuristic (TeX opens a file with
 * "(<path>" and closes it with a bare ")"), which covers the common case but
 * isn't a full TeX parser.
 */
export function parseCompileLog(log: string, rootFile = "main.tex"): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = log.split(/\r?\n/);
  const fileStack: string[] = [rootFile];
  const currentFile = () => fileStack[fileStack.length - 1] ?? rootFile;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const latexWarning = line.match(LATEX_WARNING_RE);
    if (latexWarning) {
      diagnostics.push({
        severity: "warning",
        message: latexWarning[1],
        file: currentFile(),
        line: Number(latexWarning[2]),
      });
      continue;
    }

    const packageWarning = line.match(PACKAGE_WARNING_RE);
    if (packageWarning) {
      diagnostics.push({
        severity: "warning",
        message: `[${packageWarning[1]}] ${packageWarning[2]}`,
        file: currentFile(),
        line: Number(packageWarning[3]),
      });
      continue;
    }

    const boxWarning = line.match(BOX_WARNING_RE);
    if (boxWarning) {
      const [, kind, box, amount, fromLine, singleLine] = boxWarning;
      diagnostics.push({
        severity: "warning",
        message: `${kind} \\${box} (${amount})`,
        file: currentFile(),
        line: Number(fromLine ?? singleLine),
      });
      continue;
    }

    if (line.startsWith("! ")) {
      let sourceLine: number | undefined;
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const match = lines[j].match(SOURCE_LINE_RE);
        if (match) {
          sourceLine = Number(match[1]);
          break;
        }
      }
      diagnostics.push({
        severity: "error",
        message: line.slice(2),
        file: currentFile(),
        line: sourceLine,
      });
      continue;
    }

    let match: RegExpExecArray | null;
    FILE_OPEN_RE.lastIndex = 0;
    while ((match = FILE_OPEN_RE.exec(line))) {
      fileStack.push(match[1]);
    }
    for (const ch of line) {
      if (ch === ")" && fileStack.length > 1) fileStack.pop();
    }
  }

  return diagnostics;
}
