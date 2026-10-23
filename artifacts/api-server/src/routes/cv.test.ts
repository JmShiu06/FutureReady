import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { PDFDocument } from "pdf-lib";
import { createCanvas } from "@napi-rs/canvas";
import JSZip from "jszip";
import type { CvProfileSuggestions } from "@workspace/api-zod";
import app from "../app";
import { CvError, detectCvName, detectProfileSuggestions, detectSkills, extractCvSkills, MAX_CV_BYTES } from "../lib/cvSkillExtractor";
import { watermarkedCvPdf } from "../test-fixtures/watermarkedCv";

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

function cvImage(kind: "png" | "jpeg" = "png"): Buffer {
  const canvas = createCanvas(1800, 1100);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.font = "bold 88px Arial";
  context.fillText("Skills: Python, SQL", 90, 220);
  context.fillText("JavaScript", 90, 360);
  return kind === "png" ? canvas.toBuffer("image/png") : canvas.toBuffer("image/jpeg", 92);
}

async function scannedPdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const image = await document.embedPng(cvImage());
  page.drawImage(image, { x: 32, y: 32, width: 548, height: 335 });
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
  return { status: res.status, json: await res.json() as { skills?: string[]; warnings?: string[]; detectedName?: string; profileSuggestions?: CvProfileSuggestions; error?: string }, headers: res.headers };
}

describe("deterministic CV skill detection", () => {
  it("extracts only a short CV header name without returning surrounding text", () => {
    assert.equal(detectCvName("Aisha Rahman\nKuala Lumpur, Malaysia\nSkills: Python"), "Aisha Rahman");
    assert.equal(detectCvName("Name: Nur Aisyah Tan\nEmail: private@example.test"), "Nur Aisyah Tan");
    assert.equal(detectCvName("Curriculum Vitae\nProfessional Summary\nSkills: Python\nOperations Manager"), undefined);
  });
  it("prefers parsed names, uses local PERSON entities as a fallback and rejects placeholders", () => {
    assert.equal(detectCvName("Aisha Rahman\nExperience\nWorked with Marina Lee", "Nur Aisyah Tan"), "Nur Aisyah Tan");
    assert.equal(detectCvName("Professional Experience\nWorked closely with Aisha Rahman on service design."), "Aisha Rahman");
    for (const name of ["John Doe", "Jane Doe", "Sample Candidate", "Demo User"]) {
      assert.equal(detectCvName(`Name: ${name}\nSkills: Python`), undefined);
    }
  });
  it("recognizes names in CV titles without a Name keyword", () => {
    for (const heading of [
      "CV: Mina Tan",
      "Curriculum Vitae — Mina Tan",
      "Resume of Mina Tan",
      "Mina Tan — Resume",
      "**Mina Tan** | Software Engineer",
      "# Mina Tan",
    ]) {
      assert.equal(detectCvName(`${heading}\nSkills: Python, SQL`), "Mina Tan");
    }
    assert.equal(detectCvName("\n".repeat(16) + "RESUME\nNUR AISYAH BINTI AHMAD BIN HASSAN\nSkills: Python"), "NUR AISYAH BINTI AHMAD BIN HASSAN");
    assert.equal(detectCvName("陈美玲\nSkills: Python"), "陈美玲");
    assert.equal(detectCvName("CV: Mina Tan\nName: Aisha Rahman\nSkills: SQL"), "Aisha Rahman");
  });
  it("does not use document titles, job headings or placeholder names as candidate names", () => {
    for (const heading of ["CV", "Resume", "Personal Details", "Curriculum Vitae — Software Engineer", "CV: John Doe", "Jane Doe — Resume"]) {
      assert.equal(detectCvName(`${heading}\nSkills: Python`), undefined);
    }
  });
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
  it("recognizes related skill wording without requiring the exact dataset keyword", () => {
    assert.deepEqual(
      detectSkills("Coordinated cross-functional projects, interviewed users, and presented data insights."),
      ["project management", "user research", "data visualization"],
    );
    assert.deepEqual(detectSkills("Worked on a project and handled customer requests."), []);
  });
  it("offers related phrase matches as reviewable CV skill suggestions", async () => {
    const result = await extractCvSkills(
      Buffer.from("Coordinated cross-functional projects, interviewed users, and presented data insights."),
      "related-skills.txt",
    );
    assert.deepEqual(result.skills, ["project management", "user research", "data visualization"]);
    assert.ok(result.warnings.some((warning) => /related-phrase matches, not exact wording/i.test(warning)));
  });
  it("suggests only explicitly labelled About You facts and does not infer from prose", () => {
    const result = detectProfileSuggestions([
      "Current Role: Operations coordinator",
      "Years of Experience: 5 years",
      "Education: Diploma in Business Information Systems",
      "Qualification: Diploma",
      "Field of Study: Business Information Systems",
      "Career Interests: Service design, workforce planning",
      "Location: Kuala Lumpur, Malaysia",
      "Work Preference: Hybrid",
      "Learning Hours per Week: 6 hours/week",
      "Learning Budget (MYR): RM 250",
      "Career Goals: Move into service design.",
    ].join("\n"));
    assert.deepEqual(result, {
      occupation: "Operations coordinator",
      experienceYears: 5,
      education: "Diploma in Business Information Systems",
      qualification: "Diploma",
      studyField: "Business Information Systems",
      interests: ["Service design", "workforce planning"],
      location: "Kuala Lumpur, Malaysia",
      workPreference: "Hybrid",
      learningHours: 6,
      budgetMYR: 250,
      goals: "Move into service design.",
    });
    assert.deepEqual(detectProfileSuggestions("Operations coordinator with a diploma, five years of experience, and based in Kuala Lumpur."), {});
  });
});

describe("CV extraction and upload API", () => {
  it("extracts real dataset skills from UTF-8 TXT, selectable PDF and DOCX", async () => {
    const text = "Curriculum Vitae — Mina Tan\nSkills: Python, SQL, node.js, ci/cd, C++, C#.\nCurrent Role: Operations coordinator\nYears of Experience: 5 years";
    const fixtures: [Buffer, string][] = [[Buffer.from(text), "synthetic.txt"], [await pdf(text), "synthetic.pdf"], [await docx(text), "synthetic.docx"]];
    for (const [buffer, name] of fixtures) {
      const response = await upload(buffer, name);
      assert.equal(response.status, 200, `${name}: ${JSON.stringify(response.json)}`);
      assert.ok(response.json.skills?.includes("python"));
      assert.ok(response.json.skills?.includes("sql"));
      assert.ok(response.json.skills?.includes("node.js"));
      assert.ok(response.json.skills?.includes("ci/cd"));
       assert.equal(response.json.profileSuggestions?.occupation, "Operations coordinator");
       assert.equal(response.json.profileSuggestions?.experienceYears, 5);
        assert.equal(response.json.detectedName, "Mina Tan");
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
  it("uses ordinary text extraction for a multi-column PDF without invoking OCR", async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([595, 842]);
    page.drawText("Skills\nPython\nMachine learning\nGit", { x: 35, y: 720, size: 12, lineHeight: 24 });
    page.drawText("Experience\nCommunication and leadership\nSQL and data analysis", { x: 280, y: 720, size: 12, lineHeight: 24 });
    const response = await upload(Buffer.from(await document.save()), "synthetic-columns.pdf");
    assert.equal(response.status, 200, JSON.stringify(response.json));
    for (const skill of ["python", "machine learning", "git", "communication", "leadership", "sql", "data analysis"]) {
      assert.ok(response.json.skills?.includes(skill), `Missing text-layer skill: ${skill}`);
    }
    assert.ok(!response.json.warnings?.some(warning => warning.includes("local OCR")));
  });
  it("returns an honest empty skill list for readable but unrecognised text", async () => {
    const result = await upload(Buffer.from("A synthetic curriculum vitae with no catalogue terms."), "cv.txt");
    assert.equal(result.status, 200);
    assert.deepEqual(result.json.skills, []);
    assert.deepEqual(result.json.profileSuggestions, {});
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
      [Buffer.from("not an image"), "bad.png", 400],
      [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "truncated.png", 422],
      [Buffer.from("not a JPEG"), "bad.jpg", 400],
    ] as [Buffer, string, number][]) {
      const response = await upload(buffer, name);
      assert.equal(response.status, status, `${name}: ${JSON.stringify(response.json)}`);
      assert.ok(response.json.error);
      assert.ok(!response.json.error.includes("/home/"));
      assert.ok(!("stack" in response.json));
    }
  });
  it("runs local OCR on synthetic image-only PDFs and returns actual dataset skills", async () => {
    const response = await upload(await scannedPdf(), "scanned.pdf");
    assert.equal(response.status, 200, JSON.stringify(response.json));
    assert.ok(response.json.skills?.includes("python"));
    assert.ok(response.json.skills?.includes("sql"));
    assert.ok(response.headers.get("cache-control")?.includes("no-store"));
  });
  it("runs the same local OCR path for direct PNG and JPEG uploads", async () => {
    for (const [buffer, name] of [[cvImage("png"), "cv.png"], [cvImage("jpeg"), "cv.jpg"], [cvImage("jpeg"), "cv.jpeg"]] as const) {
      const response = await upload(buffer, name);
      assert.equal(response.status, 200, `${name}: ${JSON.stringify(response.json)}`);
      assert.ok(response.json.skills?.includes("python"), `${name}: Python should be recognized`);
      assert.ok(response.json.skills?.includes("sql"), `${name}: SQL should be recognized`);
    }
  });
  it("reads canonical skills from a synthetic two-column watermarked scan through the upload endpoint", async () => {
    const response = await upload(await watermarkedCvPdf(), "synthetic-watermark.pdf");
    assert.equal(response.status, 200, JSON.stringify(response.json));
    for (const skill of ["machine learning", "python", "data analysis", "sql"]) {
      assert.ok(response.json.skills?.includes(skill), `Missing canonical skill: ${skill}`);
    }
    // Problem solving is visible, but is not in the role-skill catalogue.
    assert.ok(!response.json.skills?.includes("problem solving"));
    assert.ok(response.json.warnings?.some(warning => warning.includes("local OCR")));
  });
  it("returns an honest retry/manual-entry error when OCR sees a blank scanned page", async () => {
    const document = await PDFDocument.create();
    document.addPage([612, 792]);
    const response = await upload(Buffer.from(await document.save()), "blank-scan.pdf");
    assert.equal(response.status, 422);
    assert.match(response.json.error!, /No readable text|Local OCR/);
    assert.match(response.json.error!, /manually|another file|clearer/i);
  });
  it("cancels local OCR work when the caller aborts", async () => {
    const controller = new AbortController();
    const pending = extractCvSkills(cvImage(), "cancel.png", controller.signal);
    const timer = setTimeout(() => controller.abort(), 50);
    try {
      await assert.rejects(pending, error => error instanceof CvError && error.status === 499);
    } finally {
      clearTimeout(timer);
    }
  });
  it("limits concurrent CV processing and returns a retryable busy response", async () => {
    const fixtures = await Promise.all([scannedPdf(), scannedPdf(), scannedPdf()]);
    const responses = await Promise.all(fixtures.map(buffer => upload(buffer, "concurrent-scan.pdf")));
    assert.equal(responses.filter(response => response.status === 200).length, 2);
    assert.equal(responses.filter(response => response.status === 503).length, 1);
    assert.ok(responses.every(response => response.status === 200 || response.status === 503));
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
