import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewProps {
  pdfUrl?: string;
}

export function PdfPreview({ pdfUrl }: PdfPreviewProps) {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load the document whenever a new PDF URL arrives (each compile produces one).
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    setError(null);

    pdfjsLib.getDocument(pdfUrl).promise.then(
      (pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setVersion((v) => v + 1);
      },
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    );

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Render every page into its own canvas once they're mounted. Queries the DOM
  // directly off a single stable container ref rather than per-canvas callback
  // refs, since React (especially under StrictMode's double-invoke in dev) can
  // churn array-index callback refs in ways that leave stale/null entries.
  useEffect(() => {
    const pdf = pdfRef.current;
    const container = containerRef.current;
    if (!pdf || !container || pageCount === 0) return;
    let cancelled = false;

    (async () => {
      const canvases = container.querySelectorAll<HTMLCanvasElement>(".pdf-page-canvas");
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled) return;
        const canvas = canvases[pageNum - 1];
        if (!canvas) continue;
        try {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1.3 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
        } catch {
          // A render on this canvas may have been superseded by a newer one
          // (e.g. React's dev-mode double-invoke of effects); safe to ignore.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageCount, version]);

  async function handleDownload() {
    if (!pdfUrl) return;
    // The backend runs on a different origin than the UI, and browsers ignore
    // the <a download> attribute for cross-origin links (it just opens the
    // PDF instead of saving it). Fetching as a blob and downloading that
    // works regardless of origin.
    const res = await fetch(pdfUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "output.pdf";
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  if (!pdfUrl) {
    return <div className="pdf-placeholder">Compile to see a preview</div>;
  }

  if (error) {
    return <div className="pdf-placeholder">Failed to load PDF: {error}</div>;
  }

  return (
    <div className="pdf-preview">
      <div className="pdf-toolbar">
        <span>
          {pageCount} page{pageCount === 1 ? "" : "s"}
        </span>
        <button className="download-button" onClick={handleDownload}>
          Download PDF
        </button>
      </div>
      <div className="pdf-canvas-wrapper" ref={containerRef}>
        {Array.from({ length: pageCount }, (_, i) => (
          <canvas key={i} className="pdf-page-canvas" />
        ))}
      </div>
    </div>
  );
}
