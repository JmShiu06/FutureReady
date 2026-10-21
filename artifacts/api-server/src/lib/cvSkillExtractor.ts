import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { imageSize } from "image-size";
import { PDFParse } from "pdf-parse";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import Tesseract from "tesseract.js";
import mammoth from "mammoth";
import yauzl from "yauzl";
import { careerDataset, normalizeSkill } from "./careerMatcher";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 1_000_000;
const MAX_OCR_PDF_PAGES = 3;
const MAX_IMAGE_PIXELS = 12_000_000;
const MAX_RENDER_EDGE = 2_000;
export const CV_PROCESSING_TIMEOUT_MS = 35_000;
const require = createRequire(import.meta.url);
const OCR_LANG_PATH = join(dirname(require.resolve("@tesseract.js-data/eng")), "4.0.0_best_int");
const TESSERACT_DIR = dirname(require.resolve("tesseract.js"));
const requireTesseract = createRequire(join(TESSERACT_DIR, "index.js"));
const TESSERACT_CORE_DIR = dirname(requireTesseract.resolve("tesseract.js-core"));

export class CvError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function skillPattern(skill: string): RegExp {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  // Punctuation is part of skill tokens: "ai" must not match "ai/ml",
  // nor "c" inside "c++". Commas, brackets and ordinary prose delimiters are safe.
  return new RegExp(`(?<![\\p{L}\\p{N}_+#/-])(?<![\\p{L}\\p{N}_]\\.)${escaped}(?![\\p{L}\\p{N}_+#/-]|\\.[\\p{L}\\p{N}_])`, "giu");
}

export function detectSkills(text: string, catalogue = careerDataset.allSkills): string[] {
  const normalized = text.normalize("NFKC");
  const explicitSkillLines = normalized.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(?:technical\s+)?(?:skills?|competencies)\s*[:–-]\s*(.*)$/i);
    return match ? [match[1]] : [];
  }).join("\n");
  const candidates: { skill: string; start: number; end: number }[] = [];
  for (const name of catalogue) {
    const skill = normalizeSkill(name);
    // Generic terms are evidence only when explicitly listed as skills.
    if (["data", "software"].includes(skill) && !skillPattern(skill).test(explicitSkillLines)) continue;
    for (const match of normalized.matchAll(skillPattern(skill))) {
      candidates.push({ skill, start: match.index!, end: match.index! + match[0].length });
    }
  }
  candidates.sort((a, b) => a.start - b.start || b.end - a.end || a.skill.localeCompare(b.skill));
  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (!selected.some((item) => candidate.start < item.end && candidate.end > item.start)) {
      selected.push(candidate);
    }
  }
  return [...new Set(selected.map((item) => item.skill))];
}

/** Validate and drain the archive before Mammoth opens it, bounding actual inflation. */
async function validateDocx(buffer: Buffer, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new CvError(422, "This DOCX is damaged or unreadable. Try another file."));
      let finished = false;
      let entries = 0;
      let bytes = 0;
      const paths = new Set<string>();
      const fail = () => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", abort);
        zip.close();
        reject(new CvError(422, "This DOCX is damaged, encrypted, or too complex to process. Export a simpler DOCX or TXT."));
      };
      const abort = () => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", abort);
        zip.close();
        reject(processingError(signal));
      };
      signal?.addEventListener("abort", abort, { once: true });
      zip.on("error", fail);
      zip.on("entry", (entry: yauzl.Entry) => {
        if (++entries > 400 || (entry.generalPurposeBitFlag & 1) || entry.uncompressedSize > MAX_EXPANDED_BYTES) return fail();
        paths.add(entry.fileName);
        if (entry.fileName.endsWith("/")) return zip.readEntry();
        zip.openReadStream(entry, (err, stream) => {
          if (err || !stream) return fail();
          stream.on("error", fail);
          stream.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > MAX_EXPANDED_BYTES) {
              stream.destroy();
              fail();
            }
          });
          stream.on("end", () => { if (!finished) zip.readEntry(); });
        });
      });
      zip.on("end", () => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", abort);
        zip.close();
        if (!paths.has("[Content_Types].xml") || !paths.has("word/document.xml")) {
          reject(new CvError(400, "The file is not a valid DOCX document."));
        } else resolve();
      });
      if (signal?.aborted) abort();
      if (!finished) zip.readEntry();
    });
  });
}

function processingError(signal?: AbortSignal): CvError {
  return signal?.reason?.name === "TimeoutError"
    ? new CvError(422, "CV processing took too long. Choose a smaller or simpler file, or enter skills manually.")
    : new CvError(499, "CV processing was cancelled.");
}

function checkProcessing(signal?: AbortSignal): void {
  if (signal?.aborted) throw processingError(signal);
}

async function awaitWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  checkProcessing(signal);
  if (!signal) return promise;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(processingError(signal));
        signal.addEventListener("abort", onAbort, { once: true });
      }),
    ]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

function hasMeaningfulText(text: string): boolean {
  return (text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 20;
}

function validateImage(buffer: Buffer, extension: string): void {
  const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if ((extension === "png" && !isPng) || (extension === "jpg" || extension === "jpeg") && !isJpeg) {
    throw new CvError(400, `The file is not a valid ${extension.toUpperCase()} image.`);
  }
  try {
    const dimensions = imageSize(buffer);
    if ((extension === "png" && dimensions.type !== "png") || ((extension === "jpg" || extension === "jpeg") && dimensions.type !== "jpg")) {
      throw new CvError(400, `The file contents do not match the .${extension} extension.`);
    }
    if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
      throw new CvError(422, "This image is too large to process safely. Choose an image with 12 megapixels or fewer.");
    }
  } catch (error) {
    if (error instanceof CvError) throw error;
    throw new CvError(422, `This ${extension.toUpperCase()} image is damaged or unreadable.`);
  }
}

type OcrPage = { image: Buffer; detailImage?: Buffer };

async function recognizeImages(images: OcrPage[], signal?: AbortSignal): Promise<string> {
  checkProcessing(signal);
  let worker: Tesseract.Worker | undefined;
  let terminating = false;
  const terminate = async () => {
    if (!worker || terminating) return;
    terminating = true;
    await worker.terminate().catch(() => undefined);
  };
  const abort = () => { void terminate(); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    worker = await Tesseract.createWorker("eng", Tesseract.OEM.LSTM_ONLY, {
      langPath: OCR_LANG_PATH,
      corePath: TESSERACT_CORE_DIR,
      workerPath: join(TESSERACT_DIR, "worker-script", "node", "index.js"),
      gzip: true,
      cacheMethod: "none",
      logger: () => undefined,
    });
    checkProcessing(signal);
    const pages: string[] = [];
    for (const { image, detailImage } of images) {
      // A single layout assumption can discard narrow columns as watermark/noise.
      // Keep each pass separate: only complete, explicitly recognised names go
      // through the existing deterministic detector; never repair/guess words.
      const passes = [
        { image, mode: Tesseract.PSM.AUTO },
        { image, mode: Tesseract.PSM.SPARSE_TEXT },
        ...(detailImage ? [{ image: detailImage, mode: Tesseract.PSM.SINGLE_COLUMN }] : []),
      ];
      for (const pass of passes) {
        checkProcessing(signal);
        await worker.setParameters({ tessedit_pageseg_mode: pass.mode });
        pages.push((await worker.recognize(pass.image)).data.text);
      }
    }
    // A phrase must never be invented across independent OCR passes/pages.
    return pages.join("\n|\n");
  } catch (error) {
    if (signal?.aborted) throw processingError(signal);
    throw new CvError(422, "Local OCR could not read this image. Try a clearer JPG, JPEG, PNG or PDF, or enter skills manually.");
  } finally {
    signal?.removeEventListener("abort", abort);
    await terminate();
  }
}

async function renderPdfPages(buffer: Buffer, pageCount: number, signal?: AbortSignal): Promise<OcrPage[]> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
    stopAtErrors: true,
    maxImageSize: MAX_IMAGE_PIXELS,
  });
  let document: Awaited<typeof loadingTask.promise> | undefined;
  try {
    checkProcessing(signal);
    document = await awaitWithAbort(loadingTask.promise, signal);
    const images: OcrPage[] = [];
    const count = Math.min(pageCount, MAX_OCR_PDF_PAGES);
    for (let index = 1; index <= count; index++) {
      checkProcessing(signal);
      const page = await document.getPage(index);
      try {
        checkProcessing(signal);
        const original = page.getViewport({ scale: 1 });
        const variants: Buffer[] = [];
        // Rasterise the PDF itself at two bounded resolutions rather than
        // enlarging an already-rasterised page (which loses small glyph detail).
        for (const [targetScale, maxEdge] of [[2, MAX_RENDER_EDGE], [2.5, 2400]]) {
          checkProcessing(signal);
          const scale = Math.min(targetScale, maxEdge / original.width, maxEdge / original.height);
          const viewport = page.getViewport({ scale });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          const renderTask = page.render({
            canvas: null,
            canvasContext: canvas.getContext("2d") as unknown as NonNullable<Parameters<typeof page.render>[0]["canvasContext"]>,
            viewport,
          });
          const abortRender = () => renderTask.cancel();
          signal?.addEventListener("abort", abortRender, { once: true });
          if (signal?.aborted) abortRender();
          try {
            await renderTask.promise;
            checkProcessing(signal);
            variants.push(canvas.toBuffer("image/png"));
          } finally {
            signal?.removeEventListener("abort", abortRender);
            canvas.width = 1;
            canvas.height = 1;
          }
        }
        images.push({ image: variants[0], detailImage: variants[1] });
      } finally {
        page.cleanup();
      }
    }
    return images;
  } catch (error) {
    if (signal?.aborted) throw processingError(signal);
    throw new CvError(422, "This PDF could not be rendered safely. Try another PDF or enter skills manually.");
  } finally {
    if (document) await document.destroy().catch(() => undefined);
    else await loadingTask.destroy().catch(() => undefined);
  }
}

export async function extractCvSkills(buffer: Buffer, filename: string, requestSignal?: AbortSignal): Promise<{ skills: string[]; warnings: string[] }> {
  const signal = requestSignal ?? AbortSignal.timeout(CV_PROCESSING_TIMEOUT_MS);
  checkProcessing(signal);
  if (!buffer.length) throw new CvError(400, "The file is empty. Choose a readable PDF, DOCX, TXT, JPG, JPEG or PNG.");
  if (buffer.length > MAX_CV_BYTES) throw new CvError(413, "Your CV exceeds the 5 MB limit.");
  const extension = filename.toLowerCase().split(".").pop();
  if (!["pdf", "docx", "txt", "jpg", "jpeg", "png"].includes(extension ?? "")) {
    throw new CvError(400, "Choose a PDF, DOCX, UTF-8 TXT, JPG, JPEG or PNG file.");
  }
  let text: string;
  let warnings: string[] = [];
  try {
    if (extension === "pdf") {
      if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new CvError(400, "The file is not a valid PDF.");
      const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0, isEvalSupported: false });
      try {
        const info = await awaitWithAbort(parser.getInfo(), signal);
        if (info.total > 100) throw new CvError(422, "This PDF has too many pages. Upload a CV with 100 pages or fewer.");
        const result = await awaitWithAbort(parser.getText(), signal);
        text = result.pages.map((page) => page.text).join("\n");
        if (!hasMeaningfulText(text)) {
          const pageImages = await renderPdfPages(buffer, info.total, signal);
          const recognized = await recognizeImages(pageImages, signal);
          text = `${text}\n${recognized}`;
          warnings.push("Scanned pages were read with local OCR. Small text and watermarks can cause missed or incorrect skills; check the list carefully.");
          if (info.total > MAX_OCR_PDF_PAGES) {
            warnings.push(`For privacy and speed, OCR was limited to the first ${MAX_OCR_PDF_PAGES} pages.`);
          }
        }
      } finally {
        await parser.destroy();
      }
    } else if (extension === "docx") {
      if (!buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
        throw new CvError(400, "The file is not a valid DOCX.");
      }
      await validateDocx(buffer, signal);
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (extension === "txt") {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (/[\u0000-\u0008\u000e-\u001f]/.test(text) || text.trimStart().startsWith("%PDF-")) {
        throw new CvError(400, "This does not appear to be a plain-text CV. Upload the original PDF or DOCX instead.");
      }
    } else {
      validateImage(buffer, extension!);
      text = await recognizeImages([{ image: buffer }], signal);
    }
  } catch (error) {
    if (error instanceof CvError) throw error;
    throw new CvError(422, `This ${extension?.toUpperCase()} could not be read. It may be damaged or password-protected. Try a readable PDF, DOCX, UTF-8 TXT, JPG, JPEG or PNG.`);
  }
  if (!text.trim() || !/[\p{L}\p{N}]/u.test(text)) {
    throw new CvError(422, "No readable text could be recognized in this file. Try a clearer image or PDF, enter skills manually, or choose another file.");
  }
  if (text.length > MAX_TEXT_LENGTH) throw new CvError(422, "This document contains too much text. Upload a shorter CV.");
  const skills = detectSkills(text);
  return {
    skills,
    warnings: [
      "Only exact skill names in the career dataset are detected. Review and correct the list before matching.",
      ...warnings,
      ...(skills.length ? [] : ["No recognised dataset skills were found. You can add skills manually or upload another file."]),
    ],
  };
}
