import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";

/** Generated public test content only: no real résumé or contact information. */
export async function watermarkedCvPdf(): Promise<Buffer> {
  const canvas = createCanvas(900, 1273);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#333333";
  ctx.font = "bold 44px Arial";
  ctx.fillText("SYNTHETIC CV", 55, 120);
  ctx.strokeStyle = "#81a99e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 200); ctx.lineTo(300, 1180);
  ctx.stroke();
  ctx.font = "bold 27px Arial";
  ctx.fillText("Skills", 55, 255);
  ctx.fillText("Summary", 330, 255);
  ctx.font = "22px Arial";
  ["Machine learning", "Python", "Data analysis", "SQL", "Problem solving"]
    .forEach((skill, i) => ctx.fillText(skill, 55, 310 + i * 62));
  ["Experience with machine learning,", "Python, data analysis and SQL.", "Practical problem solving skills."]
    .forEach((line, i) => ctx.fillText(line, 330, 310 + i * 40));
  ctx.save();
  ctx.rotate(-0.38);
  ctx.fillStyle = "rgba(110, 130, 125, 0.10)";
  ctx.font = "bold 35px Arial";
  for (let y = 0; y < 1800; y += 160) {
    for (let x = -600; x < 1300; x += 360) ctx.fillText("SAMPLE WATERMARK", x, y);
  }
  ctx.restore();
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const image = await document.embedPng(canvas.toBuffer("image/png"));
  page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  return Buffer.from(await document.save());
}
