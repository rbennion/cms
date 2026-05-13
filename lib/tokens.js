import crypto from "crypto";

// Tokens are 32 bytes of random base64url (~256 bits of entropy).
// We store sha256(token) in the DB so a DB leak doesn't expose live signing links.
// No salt needed — token entropy >> any feasible rainbow table.

export function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
