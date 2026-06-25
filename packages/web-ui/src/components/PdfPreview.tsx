import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PageViewport } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DownloadIcon, MinusIcon, PlusIcon } from "./icons.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_SCALE = 1.3;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.1;

interface PdfPreviewProps {
  pdfUrl?: string;
  onPdfClick?: (page: number, h: number, v: number) => void;
  scrollTarget?: { page: number; v: number; nonce: number };
}

export function PdfPreview({ pdfUrl, onPdfClick, scrollTarget }: PdfPreviewProps) {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportsRef = useRef<Map<number, PageViewport>>(new Map());
  const [pageCount, setPageCount] = useState(0);
  const [version, setVersion] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);
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

  // Render every page into its own canvas once they're mounted, or re-render
  // all of them at a new scale when the zoom level changes. Queries the DOM
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
          const viewport = page.getViewport({ scale });
          viewportsRef.current.set(pageNum, viewport);
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
        } catch {
          // A render on this canvas may have been superseded by a newer one
          // (e.g. React's dev-mode double-invoke of effects, or a zoom change
          // landing mid-render); safe to ignore.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageCount, version, scale]);

  useEffect(() => {
    if (!scrollTarget) return;
    const canvas = containerRef.current?.querySelector<HTMLCanvasElement>(
      `canvas[data-page="${scrollTarget.page}"]`
    );
    canvas?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [scrollTarget]);

  function zoomIn() {
    setScale((s) => Math.min(MAX_SCALE, Math.round((s + SCALE_STEP) * 100) / 100));
  }

  function zoomOut() {
    setScale((s) => Math.max(MIN_SCALE, Math.round((s - SCALE_STEP) * 100) / 100));
  }

  function resetZoom() {
    setScale(DEFAULT_SCALE);
  }

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

  function handlePdfClick(event: React.MouseEvent<HTMLDivElement>) {
    const canvas = (event.target as HTMLElement).closest(
      "canvas.pdf-page-canvas"
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const page = Number(canvas.dataset.page);
    const viewport = viewportsRef.current.get(page);
    if (!viewport) return;
    const rect = canvas.getBoundingClientRect();
    const xDev = (event.clientX - rect.left) * (canvas.width / rect.width);
    const yDev = (event.clientY - rect.top) * (canvas.height / rect.height);
    const [h, v] = viewport.convertToPdfPoint(xDev, yDev);
    onPdfClick?.(page, h, v);
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
        <div className="zoom-controls">
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <MinusIcon />
          </button>
          <span className="zoom-level" title="Reset zoom" onClick={resetZoom}>
            {Math.round((scale / DEFAULT_SCALE) * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <PlusIcon />
          </button>
        </div>
        <button className="download-button icon-button" onClick={handleDownload}>
          <DownloadIcon />
          Download PDF
        </button>
      </div>
      <div className="pdf-canvas-wrapper" ref={containerRef} onClick={handlePdfClick}>
        {Array.from({ length: pageCount }, (_, i) => (
          <canvas key={i} className="pdf-page-canvas" data-page={i + 1} />
        ))}
      </div>
    </div>
  );
}
