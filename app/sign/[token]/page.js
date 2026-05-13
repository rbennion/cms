"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

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
          <h1 className="text-2xl font-bold">Fight Club Parental Waiver</h1>
          <p className="text-muted-foreground">Liability Waiver &amp; Photo / Name Release</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Waiver and Release of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              I, the undersigned parent or legal guardian of the Fight Club participant below, understand that
              participation in Fight Club events and associated activities involves physical activity and inherent
              risks, including but not limited to the risk of injury.
            </p>
            <p>
              I voluntarily assume all risks associated with my child&apos;s participation in Fight Club events and agree to
              release, waive, and hold harmless Fight Club employees, agents, and any other affiliated individuals or
              entities from any and all claims, liability, demands, actions, or causes of action arising out of any
              injury, loss, or damage that may occur during or as a result of participation in Fight Club.
            </p>
            <p>
              I certify that the child listed below is physically fit and able to participate, and I understand that
              medical insurance is my responsibility.
            </p>

            <RadioGroup value={liabilityChoice} onValueChange={setLiabilityChoice} className="pt-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem id="liability-release" value="release" className="mt-1" />
                <Label htmlFor="liability-release" className="font-normal leading-relaxed">
                  <strong>I release</strong> Fight Club from liability for damages resulting from participation in Club events.
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem id="liability-no" value="do_not_release" className="mt-1" />
                <Label htmlFor="liability-no" className="font-normal leading-relaxed">
                  <strong>I DO NOT release</strong> Fight Club from liability for damages resulting from participation in Club events.
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photo / Name Release</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              I grant permission to Fight Club employees, agents, and affiliated media to use photographs, video
              recordings, or other images of my child taken during Fight Club events for promotional, marketing, social
              media, and/or other news purposes. I also grant permission to Fight Club to use my child&apos;s name in
              promotional, marketing, social media, and/or news purposes.
            </p>
            <p>
              I understand that my child&apos;s name or images may be used without further notice, compensation, or approval,
              and may appear in printed materials, online, or other media formats.
            </p>

            <RadioGroup value={photoChoice} onValueChange={setPhotoChoice} className="pt-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem id="photo-allow" value="allow" className="mt-1" />
                <Label htmlFor="photo-allow" className="font-normal leading-relaxed">
                  <strong>I give permission</strong> to Fight Club to use both my child&apos;s photo and name.
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem id="photo-no" value="do_not_allow" className="mt-1" />
                <Label htmlFor="photo-no" className="font-normal leading-relaxed">
                  <strong>I DO NOT give permission</strong> to Fight Club to use my child&apos;s photo or name.
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="participant_name">Participant Name</Label>
              <Input
                id="participant_name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Child's full name"
              />
            </div>
            <div>
              <Label htmlFor="signer_name">Parent / Guardian Name</Label>
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
            "Sign &amp; Submit"
          )}
        </Button>
      </form>
    </div>
  );
}
