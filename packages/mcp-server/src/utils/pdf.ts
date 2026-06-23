import fs from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function getPageCount(pdfPath: string): Promise<number> {
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await getDocument({ data }).promise;
  return pdf.numPages;
}

export async function renderPageToPng(pdfPath: string, pageNumber: number): Promise<Buffer> {
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await getDocument({ data }).promise;

  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Page ${pageNumber} out of range (document has ${pdf.numPages} pages)`);
  }

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  // pdfjs-dist's render() expects a browser-like CanvasRenderingContext2D;
  // @napi-rs/canvas's context is a compatible implementation but not the same type.
  await page.render({ canvasContext: context as never, viewport }).promise;

  return canvas.toBuffer("image/png");
}
