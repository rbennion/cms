"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { oswald, jakarta, NAVY, GOLD, PHOTO_URL, TAGLINE, classOf } from "./brand";
import { statusLine, windowState } from "@/lib/event-registration";

// The registration screen and its printed page. The screen is drawn at a fixed
// 1920×1080 and scaled to fit, so it looks the same on a laptop, a TV or an
// iPad, and matches the downloaded image.

export function useQrCode(url) {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
    if (!url) return undefined;
    let live = true;
    QRCode.toDataURL(url, {
      width: 1000,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: NAVY, light: "#ffffff" },
    }).then((d) => live && setDataUrl(d));
    return () => {
      live = false;
    };
  }, [url]);
  return dataUrl;
}

// The CRM's logo setting (Fight Club's logo), shared with the sidebar.
export function useLogo() {
  const [logo, setLogo] = useState(null);
  useEffect(() => {
    fetch("/api/settings/logo")
      .then((r) => r.json())
      .then((d) => setLogo(d.logo_url || null))
      .catch(() => {});
  }, []);
  return logo;
}

const display = { fontFamily: oswald.style.fontFamily, textTransform: "uppercase" };

function ScreenStage({ info, qr, logo }) {
  const state = windowState(info);
  const closed = state === "ended" || state === "unset";
  return (
    <div
      className={jakarta.className}
      style={{ width: 1920, height: 1080, display: "flex", overflow: "hidden", background: NAVY, color: "#ffffff" }}
    >
      <div style={{ width: 1080, height: 1080, boxSizing: "border-box", padding: "104px 112px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {logo && <img src={logo} alt="Fight Club" style={{ width: 200, height: 160, objectFit: "cover", marginLeft: -12 }} />}
          <div style={{ ...display, marginTop: 48, fontWeight: 600, fontSize: 36, letterSpacing: "0.22em", color: GOLD }}>Event Registration</div>
          <h1 style={{ ...display, margin: "16px 0 0", fontWeight: 600, fontSize: 108, lineHeight: 1, letterSpacing: "0.01em", textWrap: "balance" }}>
            {info.school_name}
          </h1>
          {info.year && <div style={{ marginTop: 24, fontSize: 52, fontWeight: 500 }}>{classOf(info.year)}</div>}
          <div style={{ marginTop: 40, width: 120, height: 4, background: GOLD }} />
          <div style={{ marginTop: 36, fontSize: 40, fontWeight: 500, color: "#d5d5d5" }}>{statusLine(info)}</div>
        </div>
        <div style={{ ...display, fontWeight: 500, fontSize: 30, letterSpacing: "0.3em", color: GOLD }}>{TAGLINE}</div>
      </div>

      <div style={{ position: "relative", width: 840, height: 1080 }}>
        <img src={PHOTO_URL} alt="" style={{ position: "absolute", inset: 0, width: 840, height: 1080, objectFit: "cover", objectPosition: "55% 50%" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0, 21, 36, 0.55)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 640, boxSizing: "border-box", padding: "48px 56px 44px", background: "#ffffff", borderRadius: 28, display: "flex", flexDirection: "column", alignItems: "center", color: NAVY }}>
            {closed ? (
              <div style={{ ...display, padding: "120px 0", fontWeight: 700, fontSize: 56, textAlign: "center" }}>Registration is closed</div>
            ) : (
              <>
                {qr ? <img src={qr} alt="QR code to register" style={{ width: 500, height: 500 }} /> : <div style={{ width: 500, height: 500 }} />}
                <div style={{ ...display, marginTop: 28, fontWeight: 700, fontSize: 60, letterSpacing: "0.06em" }}>Scan to register</div>
                <div style={{ marginTop: 8, fontSize: 26, fontWeight: 500, color: "#33454e" }}>Point your phone&apos;s camera at the code.</div>
              </>
            )}
            <div style={{ marginTop: 28, width: "100%", height: 2, background: "#e6e2d8" }} />
            <div style={{ marginTop: 24, fontSize: 26, lineHeight: 1.4, textAlign: "center", textWrap: "balance" }}>
              <strong style={{ fontWeight: 600 }}>No phone?</strong> Use a friend&apos;s, or see Fight Club leadership.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fills its parent (give the parent a size), keeping the 16:9 screen whole.
export function RegistrationScreen({ info, qr, logo }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const fit = () => setScale(Math.min(box.clientWidth / 1920, box.clientHeight / 1080));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: NAVY }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 1920, height: 1080, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <ScreenStage info={info} qr={qr} logo={logo} />
      </div>
    </div>
  );
}

// One US-letter landscape page: white paper, navy type, a large dark QR code.
// No date or time: the group's code stays the same, so one printout is reused
// at every event.
export function PrintSheet({ info, qr, logo }) {
  return (
    <div
      className={jakarta.className}
      style={{ width: "11in", height: "8.5in", boxSizing: "border-box", padding: "0.67in 0.75in", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", color: NAVY }}
    >
      <div style={{ display: "flex", gap: 56, alignItems: "center" }}>
        <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column" }}>
          {logo && <img src={logo} alt="Fight Club" style={{ width: 170, height: 136, objectFit: "cover", borderRadius: 12 }} />}
          <div style={{ ...display, marginTop: 32, fontWeight: 600, fontSize: 24, letterSpacing: "0.22em" }}>Event Registration</div>
          <div style={{ marginTop: 10, width: 72, height: 4, background: GOLD }} />
          <h1 style={{ ...display, margin: "20px 0 0", fontWeight: 600, fontSize: 64, lineHeight: 1.02, letterSpacing: "0.01em", textWrap: "balance" }}>{info.school_name}</h1>
          {info.year && <div style={{ marginTop: 16, fontSize: 32, fontWeight: 500 }}>{classOf(info.year)}</div>}
        </div>
        <div style={{ width: 400, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {qr && <img src={qr} alt="QR code to register" style={{ width: 380, height: 380 }} />}
          <div style={{ ...display, marginTop: 18, fontWeight: 700, fontSize: 44, letterSpacing: "0.06em" }}>Scan to register</div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 500, color: "#33454e" }}>Point your phone&apos;s camera at the code.</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, paddingTop: 20, borderTop: `2px solid ${GOLD}` }}>
        <div style={{ fontSize: 20, lineHeight: 1.4 }}><strong style={{ fontWeight: 600 }}>No phone?</strong> Use a friend&apos;s, or see Fight Club leadership.</div>
        <div style={{ ...display, fontWeight: 500, fontSize: 18, letterSpacing: "0.3em", whiteSpace: "nowrap" }}>{TAGLINE}</div>
      </div>
    </div>
  );
}
