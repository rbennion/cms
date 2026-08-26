"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  WAIVER_TITLE,
  WAIVER_SUBTITLE,
  WAIVER_SECTIONS,
  PARTICIPANT_NAME_LABEL,
  SIGNER_NAME_LABEL,
} from "@/lib/waiver-text";

const SignaturePad = dynamic(
  () => import("@/components/waivers/signature-pad").then((m) => m.SignaturePad),
  { ssr: false, loading: () => <div className="h-48 rounded-md border bg-muted" /> }
);

export default function SignWaiverPage({ params }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [participant, setParticipant] = useState("");

  const [liabilityChoice, setLiabilityChoice] = useState("");
  const [photoChoice, setPhotoChoice] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState(null);
  const padRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { token: t } = await params;
      setToken(t);
      try {
        const res = await fetch(`/api/sign/${t}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid link");
        } else if (data.status === "signed") {
          setDone(true);
        } else {
          setParticipant(data.participant_name || "");
          setParticipantName(data.participant_name || "");
        }
      } catch (e) {
        setError("Failed to load waiver");
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!liabilityChoice || !photoChoice || !signerName.trim() || !signature) {
      setError("Please complete every field, including your signature.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liability_release_choice: liabilityChoice,
          photo_release_choice: photoChoice,
          participant_name: participantName,
          signer_name: signerName,
          signature_png: signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
      } else {
        setDone(true);
      }
    } catch (e) {
      setError("Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error && !done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Unable to load waiver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The link may have expired or already been used. Please contact Fight Club for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Thank you
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your waiver has been signed. A copy will be retained by Fight Club.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{WAIVER_TITLE}</h1>
          <p className="text-muted-foreground">{WAIVER_SUBTITLE}</p>
        </div>

        {WAIVER_SECTIONS.map((section) => {
          const value = section.key === "liability" ? liabilityChoice : photoChoice;
          const onChange = section.key === "liability" ? setLiabilityChoice : setPhotoChoice;
          return (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle>{section.heading}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed">
                {section.paragraphs.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}

                <RadioGroup value={value} onValueChange={onChange} className="pt-2">
                  {section.choices.map((choice) => {
                    const id = `${section.key}-${choice.value}`;
                    return (
                      <div key={choice.value} className="flex items-start gap-2">
                        <RadioGroupItem id={id} value={choice.value} className="mt-1" />
                        <Label htmlFor={id} className="font-normal leading-relaxed">
                          <strong>{choice.emphasis}</strong>
                          {choice.rest}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="participant_name">{PARTICIPANT_NAME_LABEL}</Label>
              <Input
                id="participant_name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Participant's full name"
              />
            </div>
            <div>
              <Label htmlFor="signer_name">{SIGNER_NAME_LABEL}</Label>
              <Input
                id="signer_name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <Label>Signature</Label>
              <SignaturePad ref={padRef} onChange={setSignature} />
            </div>
            <p className="text-xs text-muted-foreground">
              By submitting this form you agree that your electronic signature is the legal equivalent of a handwritten
              signature under the U.S. ESIGN Act. Your IP address and timestamp will be recorded as part of the audit
              trail.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" disabled={submitting} className="w-full" size="lg">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            "Sign & Submit"
          )}
        </Button>
      </form>
    </div>
  );
}
