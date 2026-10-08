"use client";

import QRCode from "qrcode";
import { oswald, jakarta, NAVY, GOLD, PHOTO_URL, TAGLINE, classOf } from "./brand";

// The registration screen as a 1920×1080 PNG, drawn the same way the screen
// is laid out. Like the printout it carries no date or time, so one download
// works at every event.

const W = 1920;
const H = 1080;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draws an image cropped to fill the box, like object-fit: cover.
function drawCover(ctx, img, x, y, w, h, posX = 0.5, posY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) * posX, (img.height - sh) * posY, sw, sh, x, y, w, h);
}

function font(ctx, weight, size, family, spacing = "0px") {
  ctx.font = `${weight} ${size}px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = spacing;
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawScreen({ info, formUrl, logo }) {
  const O = oswald.style.fontFamily;
  const J = jakarta.style.fontFamily;
  await Promise.all([
    document.fonts.load(`600 108px ${O}`),
    document.fonts.load(`700 60px ${O}`),
    document.fonts.load(`500 30px ${O}`),
    document.fonts.load(`500 52px ${J}`),
    document.fonts.load(`600 26px ${J}`),
    document.fonts.load(`400 26px ${J}`),
  ]);
  const qrUrl = await QRCode.toDataURL(formUrl, {
    width: 1000, margin: 1, errorCorrectionLevel: "M", color: { dark: NAVY, light: "#ffffff" },
  });
  const [photo, qr, logoImg] = await Promise.all([
    loadImage(PHOTO_URL),
    loadImage(qrUrl),
    logo ? loadImage(logo).catch(() => null) : null,
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  // Left: logo, title, school, class year.
  let y = 104;
  if (logoImg) {
    drawCover(ctx, logoImg, 100, y, 200, 160);
    y += 160;
  }
  y += 48;
  font(ctx, 600, 36, O, "8px");
  ctx.fillStyle = GOLD;
  ctx.fillText("EVENT REGISTRATION", 112, y);
  y += 36 + 16;

  font(ctx, 600, 108, O, "1px");
  ctx.fillStyle = "#ffffff";
  for (const line of wrap(ctx, String(info.school_name || "").toUpperCase(), 856).slice(0, 4)) {
    ctx.fillText(line, 112, y);
    y += 108;
  }
  if (info.year) {
    y += 24;
    font(ctx, 500, 52, J);
    ctx.fillText(classOf(info.year), 112, y);
    y += 62;
  }
  ctx.fillStyle = GOLD;
  ctx.fillRect(112, y + 40, 120, 4);

  font(ctx, 500, 30, O, "9px");
  ctx.fillText(TAGLINE.toUpperCase(), 112, H - 104 - 30);

  // Right: the photo, dimmed, with the QR card on it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(1080, 0, 840, H);
  ctx.clip();
  drawCover(ctx, photo, 1080, 0, 840, H, 0.55, 0.5);
  ctx.restore();
  ctx.fillStyle = "rgba(0, 21, 36, 0.55)";
  ctx.fillRect(1080, 0, 840, H);

  const cardW = 640;
  const cardH = 860;
  const cardX = 1080 + (840 - cardW) / 2;
  const cardY = (H - cardH) / 2;
  const centerX = cardX + cardW / 2;
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();

  let cy = cardY + 48;
  ctx.drawImage(qr, centerX - 250, cy, 500, 500);
  cy += 500 + 28;

  ctx.textAlign = "center";
  ctx.fillStyle = NAVY;
  font(ctx, 700, 60, O, "4px");
  ctx.fillText("SCAN TO REGISTER", centerX, cy);
  cy += 66 + 8;
  font(ctx, 500, 26, J);
  ctx.fillStyle = "#33454e";
  ctx.fillText("Point your phone's camera at the code.", centerX, cy);
  cy += 34 + 28;
  ctx.fillStyle = "#e6e2d8";
  ctx.fillRect(cardX + 56, cy, cardW - 112, 2);
  cy += 2 + 24;

  // "No phone?" in bold, the rest regular, centered across two lines.
  ctx.fillStyle = NAVY;
  font(ctx, 400, 26, J);
  const lead = "No phone?";
  const rest = "Use a friend's, or see Fight Club leadership.";
  const lines = wrap(ctx, `${lead} ${rest}`, cardW - 112);
  ctx.textAlign = "left";
  for (const line of lines) {
    let x;
    if (line.startsWith(lead)) {
      font(ctx, 600, 26, J);
      const leadW = ctx.measureText(`${lead} `).width;
      font(ctx, 400, 26, J);
      const tail = line.slice(lead.length + 1);
      x = centerX - (leadW + ctx.measureText(tail).width) / 2;
      font(ctx, 600, 26, J);
      ctx.fillText(`${lead} `, x, cy);
      font(ctx, 400, 26, J);
      ctx.fillText(tail, x + leadW, cy);
    } else {
      x = centerX - ctx.measureText(line).width / 2;
      ctx.fillText(line, x, cy);
    }
    cy += 36;
  }

  return canvas;
}

export async function downloadScreenImage({ info, formUrl, logo, filename }) {
  const canvas = await drawScreen({ info, formUrl, logo });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
