// src/utils/pdf.ts
// Robust text extraction from PDFs with a fast path (pdf.js) and OCR fallback (Tesseract.js)

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { TextContent, TextItem, PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import Tesseract from "tesseract.js";

// REQUIRED for pdf.js worker under Vite
GlobalWorkerOptions.workerSrc = workerSrc;

// Tweakable safety limits to keep UI responsive and costs predictable
const PAGE_LIMIT = 10;          // only process first N pages
const CHAR_LIMIT = 40000;       // truncate final text to ~40k chars (UI/generation stability)

function isTextItem(item: TextContent["items"][number]): item is TextItem {
  return Object.prototype.hasOwnProperty.call(item as object, "str");
}

async function fastText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;

  let text = "";
  const pages = Math.min(pdf.numPages, PAGE_LIMIT);
  console.log(`[pdf] numPages=${pdf.numPages} (limiting to ${pages})`);

  for (let p = 1; p <= pages; p++) {
    const page = await pdf.getPage(p);
    const content = (await page.getTextContent()) as TextContent;
    const t = content.items.map((i) => (isTextItem(i) ? i.str : "")).join(" ");
    text += t + "\n";

    if (text.length >= CHAR_LIMIT) {
      text = text.slice(0, CHAR_LIMIT);
      console.log(`[pdf] fastText reached CHAR_LIMIT (${CHAR_LIMIT})`);
      break;
    }
  }

  text = text.replace(/\s+/g, " ").trim();
  console.log(`[pdf] fastText length=${text.length}`);
  return text;
}

async function ocrText(file: File): Promise<string> {
  // pdf.js still needed to render pages to canvases for OCR
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;

  const SCALE = 2; // increase for small scans; higher = slower

  let text = "";
  const pages = Math.min(pdf.numPages, PAGE_LIMIT);
  console.log(`[pdf] OCR numPages=${pdf.numPages} (limiting to ${pages})`);

  for (let p = 1; p <= pages; p++) {
    const page = await pdf.getPage(p);

    // Infer the exact type pdf.js expects for render()
    type RenderParams = Parameters<PDFPageProxy["render"]>[0];

    const viewport = page.getViewport({ scale: SCALE });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available for OCR");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const renderCtx: RenderParams = {
      canvasContext: ctx, viewport,
      canvas: null
    };
    const renderTask = page.render(renderCtx);
    await renderTask.promise;

    // Tesseract.js will fetch the English traineddata from CDN by default
    const result = await Tesseract.recognize(canvas, "eng");
    const pageText = (result.data.text || "").replace(/\s+/g, " ").trim();
    console.log(`[pdf] OCR page ${p} text length=${pageText.length}`);

    text += pageText + "\n";
    if (text.length >= CHAR_LIMIT) {
      text = text.slice(0, CHAR_LIMIT);
      console.log(`[pdf] OCR reached CHAR_LIMIT (${CHAR_LIMIT})`);
      break;
    }
  }

  text = text.replace(/\s+/g, " ").trim();
  console.log(`[pdf] ocrText length=${text.length}`);
  return text;
}

/**
 * Extract text from a PDF:
 *  - Try fast selectable text
 *  - If empty, fallback to OCR
 *  - Throw with a clear error if both fail
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const quick = await fastText(file);
    if (quick.length > 0) return quick;
    console.warn("[pdf] Fast path returned empty — trying OCR fallback...");
  } catch (err) {
    console.warn("[pdf] Fast path failed — trying OCR fallback.", err);
  }

  try {
    const ocr = await ocrText(file);
    if (ocr.length > 0) return ocr;
  } catch (err) {
    console.error("[pdf] OCR failed:", err);
    throw new Error("Could not extract text: OCR failed.");
  }

  throw new Error("Could not extract text from this PDF (no text and OCR produced nothing).");
}
