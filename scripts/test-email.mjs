// One-off SMTP OAuth test. Run: node --env-file=.env.local scripts/test-email.mjs <recipient>
import { sendWaiverRequest, buildSigningUrl } from "../lib/email.js";

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-email.mjs <recipient-email>");
  process.exit(1);
}

console.log(`Sending test waiver email to ${to}...`);
try {
  const result = await sendWaiverRequest({
    to,
    participantName: "Test Participant",
    signingUrl: buildSigningUrl("test-token-not-real"),
  });
  console.log("✓ Sent. Message ID:", result.messageId);
} catch (e) {
  console.error("✗ Failed:", e.message);
  if (e.response) console.error("Server response:", e.response);
  process.exit(1);
}
