import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

// The wording a signer agrees to has to be the wording stored in their signed
// document. It used to live in three places — the page, a pre-made PDF and the
// email — and they were free to drift apart. These tests hold them together.

vi.mock("@/lib/storage", () => ({
  put: async (pathname, buffer) => ({ pathname, size: buffer.length }),
}));

const { WAIVER_TITLE, WAIVER_SECTIONS, choiceText } = await import("@/lib/waiver-text");
const { renderSignedWaiver } = await import("@/lib/waiver-pdf");

const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

// Every sentence the signer is shown, flattened.
const allProse = [
  WAIVER_TITLE,
  ...WAIVER_SECTIONS.flatMap((s) => [s.heading, ...s.paragraphs]),
  ...WAIVER_SECTIONS.flatMap((s) => s.choices.map((c) => `${c.emphasis}${c.rest}`)),
];

describe("the waiver wording", () => {
  it("covers a participant signing for themselves, not only a parent", () => {
    const joined = allProse.join(" ");
    expect(WAIVER_TITLE).toContain("Participant");
    expect(joined).toContain("I, the undersigned Fight Club participant, or parent or legal guardian");
    expect(joined).toContain("I certify that I am or the child listed below is physically fit");
    expect(joined).toContain("my or my child's participation");
    expect(joined).toContain("images of me or my child");
  });

  it("no longer speaks only of a child", () => {
    for (const line of allProse) {
      expect(line, `still assumes a child: ${line}`).not.toMatch(/(?<!my or )my child's/);
      expect(line).not.toContain("the undersigned parent or legal guardian");
    }
  });

  it("stays plain ASCII so the PDF fonts can render it", () => {
    for (const line of allProse) {
      expect(line, `non-ASCII in: ${line}`).toMatch(/^[\x20-\x7E]*$/);
    }
  });

  it("offers exactly one agree and one decline per section", () => {
    expect(WAIVER_SECTIONS.map((s) => s.key)).toEqual(["liability", "photo"]);
    expect(WAIVER_SECTIONS[0].choices.map((c) => c.value)).toEqual(["release", "do_not_release"]);
    expect(WAIVER_SECTIONS[1].choices.map((c) => c.value)).toEqual(["allow", "do_not_allow"]);
    // The stored values are what the signing route accepts and the PDF reads back.
    expect(choiceText("liability", "release")).toMatch(/^I release Fight Club/);
    expect(choiceText("photo", "do_not_allow")).toMatch(/^I DO NOT give permission/);
  });
});

describe("the signing page and the email read from the shared wording", () => {
  it("the signing page holds no waiver prose of its own", () => {
    const src = readFileSync("app/sign/[token]/page.js", "utf8");
    expect(src).toContain('@/lib/waiver-text');
    // A stray paragraph left behind in the page would silently disagree with
    // the stored document.
    expect(src).not.toContain("hold harmless");
    expect(src).not.toContain("physically fit");
    expect(src).not.toMatch(/I DO NOT release/);
  });

  it("the email names the current form", () => {
    const src = readFileSync("lib/email.js", "utf8");
    expect(src).toContain('@/lib/waiver-text');
    expect(src).not.toContain("Parental Liability Waiver");
  });

  it("nothing still stamps the old pre-made template", () => {
    const src = readFileSync("lib/waiver-pdf.js", "utf8");
    expect(src).not.toContain("waiver-template.pdf");
  });
});

describe("the signed PDF", () => {
  const render = (overrides = {}) =>
    renderSignedWaiver({
      waiverId: 4242,
      participantName: "Jordan Participant",
      signerName: "Alex Signer",
      liabilityChoice: "release",
      photoChoice: "allow",
      signaturePngDataUrl: ONE_PIXEL_PNG,
      signedAt: "2026-08-26T15:04:05.000Z",
      ipAddress: "203.0.113.7",
      userAgent: "vitest",
      ...overrides,
    });

  it("is a real PDF and is stored under waivers/", async () => {
    const result = await render();
    expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.path).toMatch(/^waivers\/waiver-4242-\d+\.pdf$/);
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.bytes).toBeGreaterThan(1000);
  });

  it("contains the current wording, the names and the audit trail", async () => {
    const text = await extractText((await render()).buffer);
    for (const line of allProse) {
      expect(text, `missing from the PDF: ${line}`).toContain(normalise(line));
    }
    expect(text).toContain("Jordan Participant");
    expect(text).toContain("Alex Signer");
    expect(text).toContain("203.0.113.7");
    expect(text).toContain("2026-08-26");
    expect(text).toContain("Waiver ID: 4242");
  });

  it("marks the choices that were actually made", async () => {
    const text = await extractText((await render({ photoChoice: "do_not_allow" })).buffer);
    expect(text).toContain(`[X] ${choiceText("liability", "release")}`);
    expect(text).toContain(`[ ] ${choiceText("liability", "do_not_release")}`);
    expect(text).toContain(`[X] ${choiceText("photo", "do_not_allow")}`);
    expect(text).toContain(`[ ] ${choiceText("photo", "allow")}`);
  });

  it("still renders when there is no signature image", async () => {
    const result = await render({ signaturePngDataUrl: null });
    const text = await extractText(result.buffer);
    expect(text).toContain("(no signature captured)");
  });
});

// Pulls the visible strings back out of a generated PDF. pdf-lib writes the
// text we drew into the page content streams; this reads them straight back so
// the assertions are about what a person would actually see.
async function extractText(buffer) {
  const { PDFDocument, PDFName, PDFRawStream } = await import("pdf-lib");
  const { inflateSync } = await import("node:zlib");
  const doc = await PDFDocument.load(buffer);
  let out = "";
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const streams = contents?.constructor?.name === "PDFArray"
      ? contents.asArray().map((ref) => doc.context.lookup(ref))
      : [contents];
    for (const stream of streams) {
      if (!stream) continue;
      let bytes = stream instanceof PDFRawStream ? stream.asUint8Array() : stream.getContents();
      if (stream.dict?.get(PDFName.of("Filter"))) bytes = inflateSync(Buffer.from(bytes));
      const src = Buffer.from(bytes).toString("latin1");
      // pdf-lib writes drawn text as a hex string; literal strings are handled
      // too so this keeps working if that ever changes.
      for (const m of src.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj|\(((?:\\.|[^\\()])*)\)\s*Tj/g)) {
        out += (m[1] !== undefined ? decodeHexString(m[1]) : unescapePdfString(m[2])) + " ";
      }
    }
  }
  return normalise(out);
}

const decodeHexString = (hex) =>
  Buffer.from(hex.replace(/\s+/g, ""), "hex").toString("latin1");

const unescapePdfString = (s) =>
  s.replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[c] ?? c))
   .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));

// Wrapping puts line breaks in arbitrary places, so compare on a single line.
const normalise = (s) => s.replace(/\s+/g, " ").trim();
