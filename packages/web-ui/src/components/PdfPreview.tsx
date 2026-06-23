import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewProps {
  pdfUrl?: string;
}

export function PdfPreview({ pdfUrl }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    setError(null);

    pdfjsLib.getDocument(pdfUrl).promise.then(
      (pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setPage((p) => Math.min(p, pdf.numPages) || 1);
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

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || page < 1 || page > pdf.numPages) return;

    let cancelled = false;
    pdf.getPage(page).then((pdfPage) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale: 1.3 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      void pdfPage.render({ canvasContext: context, viewport }).promise;
    });

    return () => {
      cancelled = true;
    };
  }, [page, version]);

  if (!pdfUrl) {
    return <div className="pdf-placeholder">Compile to see a preview</div>;
  }

  if (error) {
    return <div className="pdf-placeholder">Failed to load PDF: {error}</div>;
  }

  return (
    <div className="pdf-preview">
      <div className="pdf-toolbar">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <span>
          Page {page} / {pageCount || "?"}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </div>
      <div className="pdf-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
