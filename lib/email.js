import nodemailer from "nodemailer";
import { WAIVER_TITLE } from "@/lib/waiver-text";

// M365 OAuth2 client-credentials flow.
// One-time setup in Azure AD + Exchange Online:
//   1. App registration with API permission "Office 365 Exchange Online → SMTP.SendAsApp"
//   2. New-ServicePrincipal + Add-MailboxPermission (FullAccess) on the sending mailbox
// See: https://learn.microsoft.com/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth

const tenantId = process.env.MS_TENANT_ID;
const clientId = process.env.MS_CLIENT_ID;
const clientSecret = process.env.MS_CLIENT_SECRET;
const smtpUser = process.env.SMTP_USER; // mailbox to send AS (e.g. waiver@fightclubus.onmicrosoft.com)
const smtpHost = process.env.SMTP_HOST || "smtp.office365.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const fromAddress = process.env.EMAIL_FROM || smtpUser || "noreply@example.com";
const fromName = process.env.EMAIL_FROM_NAME || "Fight Club";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3009";

let cachedToken = null; // { value, expiresAt }

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 5 * 60 * 1000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://outlook.office365.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token request failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function getTransporter() {
  if (!tenantId || !clientId || !clientSecret || !smtpUser) return null;
  const accessToken = await getAccessToken();
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      type: "OAuth2",
      user: smtpUser,
      accessToken,
    },
  });
}

// Exchange Online occasionally returns 430 4.2.0 STOREDRV transient errors
// ("AuthenticationContext has no rights on this session") when permissions
// haven't propagated to the specific backend the request lands on. Retry with a
// fresh transporter (which forces a fresh OAuth token).
async function sendWithRetry({ to, subject, html, text, devLogLine }) {
  const transientCodes = new Set([421, 430, 451]);
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const t = await getTransporter();
    if (!t) {
      console.warn("[email] M365 OAuth env vars not set — logging instead of sending.");
      console.log(`[email] TO: ${to}\nSUBJECT: ${subject}\n${devLogLine}`);
      return { messageId: "dev-stub", logged: true };
    }
    try {
      const info = await t.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        html,
        text,
      });
      return { messageId: info.messageId, attempt };
    } catch (e) {
      lastError = e;
      const isTransient = transientCodes.has(e.responseCode) || /transient|temporar/i.test(e.response || "");
      if (!isTransient || attempt === 4) break;
      const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.warn(`[email] transient ${e.responseCode || ""} on attempt ${attempt}, retrying in ${delayMs}ms`);
      cachedToken = null; // force fresh token on next loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

export async function sendWaiverRequest({ to, participantName, signingUrl }) {
  const subject = `Please sign Fight Club waiver for ${participantName}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 16px;">Fight Club — Participant Waiver</h2>
      <p>Hi,</p>
      <p>We need a signature on the ${escapeHtml(WAIVER_TITLE)} for <strong>${escapeHtml(participantName)}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${signingUrl}" style="background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review &amp; Sign</a>
      </p>
      <p style="color: #555; font-size: 14px;">If the button doesn't work, paste this link into your browser:<br/><a href="${signingUrl}">${signingUrl}</a></p>
      <p style="color: #555; font-size: 14px; margin-top: 32px;">This link is unique to you. Please do not forward it.</p>
    </div>
  `;
  const text = `Please sign the Fight Club waiver for ${participantName}.\n\nReview & sign: ${signingUrl}`;
  return sendWithRetry({ to, subject, html, text, devLogLine: `LINK: ${signingUrl}` });
}

export async function sendPasswordReset({ to, name, resetUrl, expiresInHours = 1 }) {
  const subject = "Reset your Fight Club CRM password";
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 16px;">Reset your password</h2>
      <p>Hi${name ? ` ${escapeHtml(name)}` : ""},</p>
      <p>Someone asked to reset the password for your Fight Club CRM account. If that was you, use the button below.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Choose a new password</a>
      </p>
      <p style="color: #555; font-size: 14px;">If the button doesn't work, paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color: #555; font-size: 14px; margin-top: 32px;">This link works once and expires in ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}. If you didn't ask for it, you can ignore this message — your password will not change.</p>
    </div>
  `;
  const text = `Reset your Fight Club CRM password.\n\nChoose a new password: ${resetUrl}\n\nThis link works once and expires in ${expiresInHours} hour(s). If you did not request it, ignore this message.`;
  return sendWithRetry({ to, subject, html, text, devLogLine: `LINK: ${resetUrl}` });
}

export function buildSigningUrl(token) {
  return `${appUrl.replace(/\/$/, "")}/sign/${token}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
