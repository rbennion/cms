import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.EMAIL_FROM || smtpUser || "noreply@example.com";
const fromName = process.env.EMAIL_FROM_NAME || "Fight Club";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3009";

let transporter = null;
function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // STARTTLS for 587, implicit TLS for 465
      auth: { user: smtpUser, pass: smtpPass },
    });
  }
  return transporter;
}

export async function sendWaiverRequest({ to, participantName, signingUrl }) {
  const subject = `Please sign Fight Club waiver for ${participantName}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 16px;">Fight Club — Parental Waiver</h2>
      <p>Hi,</p>
      <p>We need your signature on the Fight Club Parental Liability Waiver &amp; Photo/Name Release Form for <strong>${escapeHtml(participantName)}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${signingUrl}" style="background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review &amp; Sign</a>
      </p>
      <p style="color: #555; font-size: 14px;">If the button doesn't work, paste this link into your browser:<br/><a href="${signingUrl}">${signingUrl}</a></p>
      <p style="color: #555; font-size: 14px; margin-top: 32px;">This link is unique to you. Please do not forward it.</p>
    </div>
  `;
  const text = `Please sign the Fight Club waiver for ${participantName}.\n\nReview & sign: ${signingUrl}`;

  const t = getTransporter();
  if (!t) {
    console.warn("[email] SMTP env vars not set — logging instead of sending.");
    console.log(`[email] TO: ${to}\nSUBJECT: ${subject}\nLINK: ${signingUrl}`);
    return { messageId: "dev-stub", logged: true };
  }

  const info = await t.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text,
  });
  return { messageId: info.messageId };
}

export function buildSigningUrl(token) {
  return `${appUrl.replace(/\/$/, "")}/sign/${token}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
