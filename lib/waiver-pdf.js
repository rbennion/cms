import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "waiver-template.pdf");

export async function renderSignedWaiver({
  waiverId,
  participantName,
  signerName,
  liabilityChoice, // "release" | "do_not_release"
  photoChoice,     // "allow" | "do_not_allow"
  signaturePngDataUrl,
  signedAt,
  ipAddress,
  userAgent,
}) {
  // Dynamic import so Next.js dev server doesn't bundle pdf-lib eagerly
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const templateBytes = await fs.readFile(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Append a "Signature & Audit" page so we don't have to pixel-hunt
  // checkboxes on the existing template.
  const page = pdfDoc.addPage([612, 792]); // US Letter
  let y = 740;
  const left = 60;
  const lh = 18;

  page.drawText("Signature & Audit Record", { x: left, y, size: 18, font: helvBold, color: rgb(0.08, 0.1, 0.16) });
  y -= 28;
  page.drawText("Fight Club Parental Liability Waiver & Photo/Name Release", { x: left, y, size: 11, font: helv, color: rgb(0.3, 0.3, 0.3) });
  y -= 28;

  // Section: choices
  page.drawText("Liability Release", { x: left, y, size: 12, font: helvBold });
  y -= lh;
  page.drawText(
    liabilityChoice === "release"
      ? "[X]  I release Fight Club from liability for damages resulting from participation in Club events."
      : "[X]  I DO NOT release Fight Club from liability for damages resulting from participation in Club events.",
    { x: left, y, size: 11, font: helv, maxWidth: 500 }
  );
  y -= lh * 2;

  page.drawText("Photo / Name Release", { x: left, y, size: 12, font: helvBold });
  y -= lh;
  page.drawText(
    photoChoice === "allow"
      ? "[X]  I give permission to Fight Club to use both my child's photo and name."
      : "[X]  I DO NOT give permission to Fight Club to use my child's photo or name.",
    { x: left, y, size: 11, font: helv, maxWidth: 500 }
  );
  y -= lh * 2;

  // Section: participant + signer
  page.drawText("Participant Name:", { x: left, y, size: 11, font: helvBold });
  page.drawText(participantName || "—", { x: left + 130, y, size: 11, font: helv });
  y -= lh;
  page.drawText("Parent / Guardian:", { x: left, y, size: 11, font: helvBold });
  page.drawText(signerName || "—", { x: left + 130, y, size: 11, font: helv });
  y -= lh;
  page.drawText("Date Signed:", { x: left, y, size: 11, font: helvBold });
  page.drawText(new Date(signedAt).toISOString(), { x: left + 130, y, size: 11, font: helv });
  y -= lh * 2;

  // Signature image
  page.drawText("Signature:", { x: left, y, size: 11, font: helvBold });
  y -= lh;
  if (signaturePngDataUrl) {
    const base64 = signaturePngDataUrl.replace(/^data:image\/png;base64,/, "");
    const pngBytes = Buffer.from(base64, "base64");
    const png = await pdfDoc.embedPng(pngBytes);
    const targetW = 240;
    const ratio = png.height / png.width;
    const targetH = targetW * ratio;
    y -= targetH;
    page.drawImage(png, { x: left, y, width: targetW, height: targetH });
    page.drawLine({ start: { x: left, y: y - 4 }, end: { x: left + targetW, y: y - 4 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    y -= 24;
  }

  // Audit
  page.drawText("Audit Trail", { x: left, y, size: 12, font: helvBold });
  y -= lh;
  page.drawText(`IP Address:  ${ipAddress || "—"}`, { x: left, y, size: 10, font: helv });
  y -= lh;
  page.drawText(`User Agent:  ${truncate(userAgent || "—", 90)}`, { x: left, y, size: 10, font: helv });
  y -= lh;
  page.drawText(`Waiver ID:   ${waiverId}`, { x: left, y, size: 10, font: helv });
  y -= lh * 2;

  page.drawText("This record was signed electronically and is binding under the U.S. ESIGN Act (15 U.S.C. §7001 et seq.)", {
    x: left, y, size: 9, font: helv, color: rgb(0.4, 0.4, 0.4), maxWidth: 500,
  });

  const pdfBytes = await pdfDoc.save();
  const sha256 = crypto.createHash("sha256").update(pdfBytes).digest("hex");
  const filename = `waiver-${waiverId}-${Date.now()}.pdf`;

  const blob = await put(`waivers/${filename}`, Buffer.from(pdfBytes), {
    access: "private",
    contentType: "application/pdf",
  });

  return { path: blob.pathname, sha256, bytes: pdfBytes.length };
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
