"use client";

import { Badge } from "@/components/ui/badge";
import { deriveWaiverStatus } from "@/lib/waivers";
import { Check, Circle } from "lucide-react";

export function WaiverSteps({ waiver }) {
  if (waiver.source === "paper") {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <Check className="h-3 w-3" /> Paper form on file
      </div>
    );
  }
  const steps = [
    { label: "Sent", done: true },
    { label: "Signed", done: waiver.status === "signed" },
    { label: "Document", done: !!waiver.signed_pdf_path },
  ];
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {steps.map((step, i) => (
        <span key={step.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground">→</span>}
          <span
            className={
              "flex items-center gap-1 " +
              (step.done ? "text-green-600 font-medium" : "text-muted-foreground")
            }
          >
            {step.done ? (
              <Check className="h-3 w-3" />
            ) : (
              <Circle className="h-2.5 w-2.5" />
            )}
            {step.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export function WaiverStatusLine({ waiver }) {
  const status = deriveWaiverStatus(waiver);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-sm font-medium">{waiver.sent_to_email}</span>
      </div>
      <div className="text-sm text-muted-foreground">{status.sentence}</div>
    </div>
  );
}
