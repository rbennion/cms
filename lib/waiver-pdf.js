import crypto from "crypto";
import { put } from "@/lib/storage";
import {
  WAIVER_TITLE,
  WAIVER_SECTIONS,
  PARTICIPANT_NAME_LABEL,
  SIGNATURE_LABEL,
} from "@/lib/waiver-text";

// The signed document is written from scratch out of lib/waiver-text.js rather
// than stamped onto a pre-made file, so what is stored is exactly what the
// signer read on screen. Change the wording in one place and both follow.

const PAGE = { width: 612, height: 792 }; // US Letter
const MARGIN = 60;
const BODY_SIZE = 10.5;
const LINE = 15;
const TEXT_WIDTH = PAGE.width - MARGIN * 2;

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

  const pdfDoc = await PDFDocument.create();
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const doc = layout(pdfDoc, { helv, rgb });

  doc.text(WAIVER_TITLE, { font: helvBold, size: 15 });
  doc.gap(14);

  const chosen = { liability: liabilityChoice, photo: photoChoice };
  for (const section of WAIVER_SECTIONS) {
    doc.text(section.heading, { font: helvBold, size: 12 });
    doc.gap(6);
    for (const paragraph of section.paragraphs) {
      doc.text(paragraph);
      doc.gap(6);
    }
    doc.gap(2);
    for (const choice of section.choices) {
      const picked = chosen[section.key] === choice.value;
      doc.text(`${picked ? "[X]" : "[ ]"}  ${choice.emphasis}${choice.rest}`, {
        indent: 14,
        color: picked ? undefined : rgb(0.45, 0.45, 0.45),
      });
      doc.gap(4);
    }
    doc.gap(12);
  }

  // Signature and audit record.
  doc.need(300);
  doc.text("Signature & Audit Record", { font: helvBold, size: 13 });
  doc.gap(10);

  doc.field(PARTICIPANT_NAME_LABEL, participantName || "-");
  doc.field("Signed by", signerName || "-");
  doc.field("Date signed", formatSignedAt(signedAt));
  doc.gap(10);

  doc.text(`${SIGNATURE_LABEL}:`, { font: helvBold, size: 10.5 });
  doc.gap(4);
  if (signaturePngDataUrl) {
    const base64 = signaturePngDataUrl.replace(/^data:image\/png;base64,/, "");
    const png = await pdfDoc.embedPng(Buffer.from(base64, "base64"));
    const width = 240;
    const height = width * (png.height / png.width);
    doc.image(png, { width, height });
  } else {
    doc.text("(no signature captured)", { color: rgb(0.5, 0.5, 0.5) });
  }
  doc.gap(14);

  doc.text("Audit Trail", { font: helvBold, size: 11 });
  doc.gap(4);
  doc.text(`IP address:  ${ipAddress || "-"}`, { size: 9.5 });
  doc.text(`User agent:  ${truncate(userAgent || "-", 90)}`, { size: 9.5 });
  doc.text(`Waiver ID:   ${waiverId}`, { size: 9.5 });
  doc.gap(12);
  doc.text(
    "This record was signed electronically and is binding under the U.S. ESIGN Act (15 U.S.C. §7001 et seq.)",
    { size: 9, color: rgb(0.4, 0.4, 0.4) }
  );

  const pdfBytes = await pdfDoc.save();
  const sha256 = crypto.createHash("sha256").update(pdfBytes).digest("hex");
  const filename = `waiver-${waiverId}-${Date.now()}.pdf`;

  const buffer = Buffer.from(pdfBytes);
  const blob = await put(`waivers/${filename}`, buffer, {
    access: "private",
    contentType: "application/pdf",
  });

  return { path: blob.pathname, sha256, bytes: pdfBytes.length, buffer, filename };
}

// A tiny top-down writer: it tracks the cursor, wraps long lines and starts a
// new page when it runs out of room, so the wording can grow or shrink without
// anyone re-measuring coordinates by hand.
function layout(pdfDoc, { helv, rgb }) {
  let page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN;
  };

  const need = (space) => {
    if (y - space < MARGIN) newPage();
  };

  const text = (value, opts = {}) => {
    const font = opts.font || helv;
    const size = opts.size || BODY_SIZE;
    const indent = opts.indent || 0;
    const lineHeight = size + 4.5;
    for (const line of wrap(value, font, size, TEXT_WIDTH - indent)) {
      need(lineHeight);
      page.drawText(line, {
        x: MARGIN + indent,
        y: y - size,
        size,
        font,
        color: opts.color || rgb(0.05, 0.07, 0.1),
      });
      y -= lineHeight;
    }
  };

  return {
    need,
    text,
    gap: (space) => { y -= space; },
    field: (label, value) => {
      need(LINE);
      page.drawText(`${label}:`, { x: MARGIN, y: y - BODY_SIZE, size: BODY_SIZE, font: helv, color: rgb(0.35, 0.35, 0.35) });
      page.drawText(String(value), { x: MARGIN + 150, y: y - BODY_SIZE, size: BODY_SIZE, font: helv, color: rgb(0.05, 0.07, 0.1) });
      y -= LINE;
    },
    image: (png, { width, height }) => {
      need(height + 12);
      y -= height;
      page.drawImage(png, { x: MARGIN, y, width, height });
      page.drawLine({
        start: { x: MARGIN, y: y - 4 },
        end: { x: MARGIN + width, y: y - 4 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 10;
    },
  };
}

function wrap(value, font, size, maxWidth) {
  const lines = [];
  for (const paragraph of String(value).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function formatSignedAt(signedAt) {
  const date = signedAt ? new Date(signedAt) : new Date();
  return Number.isNaN(date.getTime()) ? String(signedAt) : date.toISOString();
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "..." : s;
}
