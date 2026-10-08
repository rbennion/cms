"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Maximize } from "lucide-react";
import { RegistrationScreen, useQrCode, useLogo } from "@/components/event-registration/registration-screen";
import { jakarta, NAVY } from "@/components/event-registration/brand";

// The screen link: the registration screen on any device, no sign-in. It
// checks in every 15 seconds so it shows when registration opens and closes.

const REFRESH_MS = 15000;

export default function RegistrationScreenPage() {
  const { code } = useParams();
  const logo = useLogo();
  const [info, setInfo] = useState(null);
  const [missing, setMissing] = useState(false);
  const [formUrl, setFormUrl] = useState(null);
  const [canGoFull, setCanGoFull] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const qr = useQrCode(formUrl);

  useEffect(() => {
    setFormUrl(`${window.location.origin}/event/${code}`);
    const root = document.documentElement;
    setCanGoFull(Boolean(root.requestFullscreen || root.webkitRequestFullscreen));
    const onChange = () => setIsFull(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [code]);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch(`/api/event/${code}`)
        .then(async (res) => {
          if (!live) return;
          if (res.status === 404) setMissing(true);
          else if (res.ok) setInfo(await res.json());
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [code]);

  const goFull = () => {
    const root = document.documentElement;
    (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
  };

  if (missing) {
    return (
      <div className={`${jakarta.className} flex min-h-screen items-center justify-center p-8 text-center text-2xl text-white`} style={{ background: NAVY }}>
        This screen link isn&apos;t valid anymore. Ask Fight Club staff for a new one.
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ background: NAVY }}>
      {info && <RegistrationScreen info={info} qr={qr} logo={logo} />}
      {info && canGoFull && !isFull && (
        <button
          type="button"
          onClick={goFull}
          className={`${jakarta.className} absolute right-4 top-4 flex min-h-[44px] items-center gap-2 rounded-lg bg-white/90 px-4 text-[15px] font-semibold`}
          style={{ color: NAVY }}
        >
          <Maximize className="h-4 w-4" />
          Full screen
        </button>
      )}
    </div>
  );
}
