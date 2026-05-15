// Test waiver PDF generation in isolation. Run: node --env-file=.env.local scripts/test-pdf.mjs
import { renderSignedWaiver } from "../lib/waiver-pdf.js";

console.log("Rendering test waiver PDF...");
try {
  const result = await renderSignedWaiver({
    waiverId: 999,
    participantName: "Test Participant",
    signerName: "Test Parent",
    liabilityChoice: "release",
    photoChoice: "allow",
    signaturePngDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    signedAt: new Date(),
    ipAddress: "127.0.0.1",
    userAgent: "test-script",
  });
  console.log("✓ PDF generated. Blob URL:", result.path);
  console.log("  SHA256:", result.sha256);
  console.log("  Size:", result.bytes, "bytes");
} catch (e) {
  console.error("✗ Failed:", e.message);
  console.error(e.stack);
  process.exit(1);
}
