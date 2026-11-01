import type { PDFDocumentProxy } from "pdfjs-dist";

/** Warm only the next two pages, one at a time, through the existing PDF.js range source. */
export async function prefetchNextPages(pdf: PDFDocumentProxy, currentPage: number, signal: AbortSignal) {
  if (signal.aborted || currentPage < 1 || currentPage > pdf.numPages) return;
  for (let number = currentPage + 1; number <= Math.min(pdf.numPages, currentPage + 2); number++) {
    if (signal.aborted) return;
    try {
      const next = await pdf.getPage(number);
      if (signal.aborted) return;
      await next.getOperatorList();
    } catch {
      // Prefetch is optional; the foreground page retains its normal loading/error handling.
      return;
    }
  }
}
