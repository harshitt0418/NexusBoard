/**
 * Renders PDF pages to PNG data URLs for use as canvas background.
 * Uses main thread (disableWorker). Worker URL must be set or library throws.
 */
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

/** Scale for sharp rendering on high-DPI displays (avoids blurry PDF text). */
function getScale() {
    if (typeof window === 'undefined') return 3;
    const dpr = window.devicePixelRatio || 1;
    return Math.min(4, Math.max(2.5, Math.round(dpr * 2)));
}

let pdfjsLibPromise = null;
async function getPdfjs() {
    if (pdfjsLibPromise) return pdfjsLibPromise;
    pdfjsLibPromise = (async () => {
        const lib = await import('pdfjs-dist');
        lib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        return lib;
    })();
    return pdfjsLibPromise;
}

async function loadPdf(arrayBuffer) {
    if (!arrayBuffer) throw new Error('PDF data is missing');
    const len = arrayBuffer.byteLength ?? 0;
    if (len === 0) throw new Error('PDF file is empty or could not be read');
    const pdfjsLib = await getPdfjs();
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
        data,
        disableWorker: true,
        verbosity: 0,
    });
    return await loadingTask.promise;
}

/**
 * @param {ArrayBuffer} arrayBuffer - PDF file content
 * @returns {Promise<number>} number of pages
 */
export async function getPdfNumPages(arrayBuffer) {
    const pdf = await loadPdf(arrayBuffer);
    return pdf.numPages;
}

/**
 * @param {ArrayBuffer} arrayBuffer - PDF file content
 * @param {number} pageNumber - 1-based page index
 * @param {number} [scale] - optional scale (default: high-DPI aware)
 * @returns {Promise<string>} data URL (image/png)
 */
export async function pdfPageToDataUrl(arrayBuffer, pageNumber, scale = getScale()) {
    const pdf = await loadPdf(arrayBuffer);
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({
        canvasContext: ctx,
        viewport,
    }).promise;
    return canvas.toDataURL('image/png');
}

/** @deprecated Use pdfPageToDataUrl(buf, 1) and getPdfNumPages(buf) instead. */
export async function pdfFirstPageToDataUrl(arrayBuffer, scale = getScale()) {
    return pdfPageToDataUrl(arrayBuffer, 1, scale);
}
