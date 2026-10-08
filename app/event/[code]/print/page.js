"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { PrintSheet, useQrCode, useLogo } from "@/components/event-registration/registration-screen";

// The printable registration page: one US-letter landscape sheet. Opens the
// print dialog by itself once the QR code, logo and fonts are ready.

export default function RegistrationPrintPage() {
  const { code } = useParams();
  const logo = useLogo();
  const [info, setInfo] = useState(null);
  const [formUrl, setFormUrl] = useState(null);
  const qr = useQrCode(formUrl);
  const printed = useRef(false);

  useEffect(() => {
    setFormUrl(`${window.location.origin}/event/${code}`);
    fetch(`/api/event/${code}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setInfo)
      .catch(() => {});
  }, [code]);

  useEffect(() => {
    if (!info || !qr || printed.current) return;
    printed.current = true;
    document.fonts.ready.then(() => setTimeout(() => window.print(), 400));
  }, [info, qr]);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-neutral-200 p-6 print:bg-white print:p-0">
      <style>{"@page { size: letter landscape; margin: 0 } @media print { body { margin: 0 } }"}</style>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex min-h-[44px] items-center gap-2 rounded-lg bg-white px-4 text-[15px] font-semibold shadow print:hidden"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
      {info && (
        <div className="bg-white shadow-lg print:shadow-none">
          <PrintSheet info={info} qr={qr} logo={logo} />
        </div>
      )}
    </div>
  );
}
