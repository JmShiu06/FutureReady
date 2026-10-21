import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import yauzl from "yauzl";
import { careerDataset, normalizeSkill } from "./careerMatcher";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 1_000_000;

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
async function validateDocx(buffer: Buffer): Promise<void> {
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
        zip.close();
        reject(new CvError(422, "This DOCX is damaged, encrypted, or too complex to process. Export a simpler DOCX or TXT."));
      };
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
        zip.close();
        if (!paths.has("[Content_Types].xml") || !paths.has("word/document.xml")) {
          reject(new CvError(400, "The file is not a valid DOCX document."));
        } else resolve();
      });
      zip.readEntry();
    });
  });
}

export async function extractCvSkills(buffer: Buffer, filename: string): Promise<{ skills: string[]; warnings: string[] }> {
  if (!buffer.length) throw new CvError(400, "The file is empty. Choose a readable PDF, DOCX or TXT.");
  if (buffer.length > MAX_CV_BYTES) throw new CvError(413, "Your CV exceeds the 5 MB limit.");
  const extension = filename.toLowerCase().split(".").pop();
  if (!["pdf", "docx", "txt"].includes(extension ?? "")) {
    throw new CvError(400, "Choose a PDF, DOCX or UTF-8 TXT file.");
  }
  let text: string;
  try {
    if (extension === "pdf") {
      if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new CvError(400, "The file is not a valid PDF.");
      const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0, isEvalSupported: false });
      try {
        const info = await parser.getInfo();
        if (info.total > 100) throw new CvError(422, "This PDF has too many pages. Upload a CV with 100 pages or fewer.");
        const result = await parser.getText();
        text = result.pages.map((page) => page.text).join("\n");
      } finally {
        await parser.destroy();
      }
    } else if (extension === "docx") {
      if (!buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
        throw new CvError(400, "The file is not a valid DOCX.");
      }
      await validateDocx(buffer);
      text = (await mammoth.extractRawText({ buffer })).value;
    } else {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (/[\u0000-\u0008\u000e-\u001f]/.test(text) || text.trimStart().startsWith("%PDF-")) {
        throw new CvError(400, "This does not appear to be a plain-text CV. Upload the original PDF or DOCX instead.");
      }
    }
  } catch (error) {
    if (error instanceof CvError) throw error;
    throw new CvError(422, `This ${extension?.toUpperCase()} could not be read. It may be damaged or password-protected. Try a readable PDF, DOCX or UTF-8 TXT.`);
  }
  if (!text.trim() || !/[\p{L}\p{N}]/u.test(text)) {
    throw new CvError(422, extension === "pdf"
      ? "No selectable text was found in this PDF. Scanned or image-based PDFs may require OCR. Try a text-based PDF, DOCX or TXT."
      : "No readable text was found. Choose another CV or enter skills manually.");
  }
  if (text.length > MAX_TEXT_LENGTH) throw new CvError(422, "This document contains too much text. Upload a shorter CV.");
  const skills = detectSkills(text);
  return {
    skills,
    warnings: [
      "Only exact skill names in the career dataset are detected. Review and correct the list before matching.",
      ...(skills.length ? [] : ["No recognised dataset skills were found. You can add skills manually or upload another file."]),
    ],
  };
}
