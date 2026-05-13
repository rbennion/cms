"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";

export const SignaturePad = forwardRef(function SignaturePad({ onChange }, ref) {
  const padRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => (padRef.current?.isEmpty() ? null : padRef.current.toDataURL("image/png")),
    clear: () => {
      padRef.current?.clear();
      setIsEmpty(true);
      onChange?.(null);
    },
    isEmpty: () => padRef.current?.isEmpty() ?? true,
  }));

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-input bg-white">
        <SignatureCanvas
          ref={padRef}
          penColor="#0f172a"
          canvasProps={{
            className: "w-full h-48 touch-none",
            // width/height set in style; SignatureCanvas needs explicit attrs too
            width: 600,
            height: 192,
          }}
          onEnd={() => {
            const empty = padRef.current?.isEmpty();
            setIsEmpty(empty);
            onChange?.(empty ? null : padRef.current.toDataURL("image/png"));
          }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {isEmpty ? "Draw your signature above" : "Signature captured"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            padRef.current?.clear();
            setIsEmpty(true);
            onChange?.(null);
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
});
