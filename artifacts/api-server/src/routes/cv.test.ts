import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import app from "../app";
import { detectSkills, extractCvSkills, MAX_CV_BYTES } from "../lib/cvSkillExtractor";

let server: Server;
let base: string;
before(async () => {
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
after(() => server.close());

async function pdf(text?: string) {
  const document = await PDFDocument.create();
  const page = document.addPage();
  if (text) page.drawText(text, { x: 40, y: 700, size: 11 });
  return Buffer.from(await document.save());
}

async function docx(text: string) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function upload(buffer: Buffer, name: string) {
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(buffer)]), name);
  const res = await fetch(`${base}/career/cv-skills`, { method: "POST", body });
  return { status: res.status, json: await res.json() as { skills?: string[]; warnings?: string[]; error?: string }, headers: res.headers };
}

describe("deterministic CV skill detection", () => {
  it("preserves punctuation, normalizes case/space and deduplicates without substring matches", () => {
    const catalogue = ["ai", "ai/ml", "node.js", "react.js", "next.js", "ci/cd", "c++", "c#", "data analysis", "python"];
    assert.deepEqual(detectSkills("Mail contains AI/ML; NODE.JS, REACT.JS, NEXT.JS, CI/CD, C++, C#. Data   analysis. Python PYTHON.", catalogue),
      ["ai/ml", "node.js", "react.js", "next.js", "ci/cd", "c++", "c#", "data analysis", "python"]);
    assert.deepEqual(detectSkills("mail railway aim node.jsx c++builder reactive", catalogue), []);
    assert.deepEqual(detectSkills("AI and AI/ML", catalogue), ["ai", "ai/ml"]);
  });
  it("does not infer generic data/software skills from prose", () => {
    assert.deepEqual(detectSkills("I maintain data and software.", ["data", "software"]), []);
    assert.deepEqual(detectSkills("Skills: data, software", ["data", "software"]), ["data", "software"]);
  });
});

describe("CV extraction and upload API", () => {
  it("extracts real dataset skills from UTF-8 TXT, selectable PDF and DOCX", async () => {
    const text = "Skills: Python, SQL, node.js, ci/cd, C++, C#.";
    const fixtures: [Buffer, string][] = [[Buffer.from(text), "synthetic.txt"], [await pdf(text), "synthetic.pdf"], [await docx(text), "synthetic.docx"]];
    for (const [buffer, name] of fixtures) {
      const response = await upload(buffer, name);
      assert.equal(response.status, 200, `${name}: ${JSON.stringify(response.json)}`);
      assert.ok(response.json.skills?.includes("python"));
      assert.ok(response.json.skills?.includes("sql"));
      assert.ok(response.json.skills?.includes("node.js"));
      assert.ok(response.json.skills?.includes("ci/cd"));
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  });
  it("reuses the existing matching engine with user-added/removed skills", async () => {
    const extracted = await extractCvSkills(Buffer.from("Python SQL"), "cv.txt");
    const reviewed = extracted.skills.filter(skill => skill !== "sql").concat("react.js");
    const result = await fetch(`${base}/career/match`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skills: reviewed }) });
    const json = await result.json() as { matches: { score: number; matchedSkills: string[]; skillsConsidered: number }[]; normalizedSkills: string[] };
    assert.equal(result.status, 200);
    assert.ok(!json.normalizedSkills.includes("sql"));
    assert.ok(json.normalizedSkills.includes("react.js"));
    for (const role of json.matches) {
      assert.equal(role.score, Math.round(role.matchedSkills.length / role.skillsConsidered * 1000) / 10);
      assert.ok(!role.matchedSkills.includes("sql"));
    }
  });
  it("returns an honest empty skill list for readable but unrecognised text", async () => {
    const result = await upload(Buffer.from("A synthetic curriculum vitae with no catalogue terms."), "cv.txt");
    assert.equal(result.status, 200);
    assert.deepEqual(result.json.skills, []);
    assert.ok(result.json.warnings?.some(warning => warning.includes("No recognised")));
  });
  it("rejects missing, empty, unsupported, falsely named, malformed and non-UTF8 files safely", async () => {
    const missing = await fetch(`${base}/career/cv-skills`, { method: "POST" });
    assert.equal(missing.status, 400);
    for (const [buffer, name, status] of [
      [Buffer.alloc(0), "empty.txt", 400],
      [Buffer.from("Python"), "cv.doc", 400],
      [Buffer.from("not a PDF"), "fake.pdf", 400],
      [Buffer.from("%PDF-broken"), "broken.pdf", 422],
      [Buffer.from([0x50, 0x4b, 0x03, 0x04]), "broken.docx", 422],
      [Buffer.from([0xff, 0xfe, 0xff]), "bad.txt", 422],
      [Buffer.from([0, 1, 2, 3]), "binary.txt", 400],
      [Buffer.from(" \n "), "blank.txt", 422],
    ] as [Buffer, string, number][]) {
      const response = await upload(buffer, name);
      assert.equal(response.status, status, `${name}: ${JSON.stringify(response.json)}`);
      assert.ok(response.json.error);
      assert.ok(!response.json.error.includes("/home/"));
      assert.ok(!("stack" in response.json));
    }
  });
  it("rejects image-only/empty PDFs with an OCR explanation", async () => {
    const response = await upload(await pdf(), "scanned.pdf");
    assert.equal(response.status, 422);
    assert.match(response.json.error!, /OCR/);
  });
  it("rejects oversized uploads and can process a subsequent safe upload", async () => {
    const response = await upload(Buffer.alloc(MAX_CV_BYTES + 1, 65), "large.txt");
    assert.equal(response.status, 413);
    const next = await upload(Buffer.from("SQL"), "safe.txt");
    assert.equal(next.status, 200);
    assert.deepEqual(next.json.skills, ["sql"]);
  });
  it("rejects non-Word ZIPs and bounds DOCX expansion", async () => {
    const zip = new JSZip();
    zip.file("unrelated.xml", "not a Word document");
    assert.equal((await upload(await zip.generateAsync({ type: "nodebuffer" }), "fake.docx")).status, 400);
    zip.file("bomb.txt", "x".repeat(21 * 1024 * 1024));
    assert.equal((await upload(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), "complex.docx")).status, 422);
  });
});
