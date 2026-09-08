"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileSignature, Send, RotateCw, FileText, Loader2, Upload, PenLine, QrCode, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/components/ui/use-toast";
import { deriveWaiverStatus } from "@/lib/waivers";
import { MAX_UPLOAD_BYTES, fileTooLargeMessage, uploadDocument } from "@/lib/client-upload";
import { WaiverStatusLine, WaiverSteps } from "@/components/waivers/waiver-status";

export function WaiversCard({ personId, defaultEmail }) {
  const { toast } = useToast();
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [email, setEmail] = useState(defaultEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const paperFileRef = useRef(null);
  // In-person signing: { waiver_id, signing_url, qr } while the dialog is open.
  const [inPerson, setInPerson] = useState(null);
  const [startingInPerson, setStartingInPerson] = useState(false);

  useEffect(() => {
    setEmail(defaultEmail || "");
  }, [defaultEmail]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/waivers?person_id=${personId}`);
      const data = await res.json();
      setWaivers(data.waivers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (personId) load();
  }, [personId]);

  async function requestWaiver() {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/waivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to send", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: "Waiver request sent",
          description: data.warning ? data.warning : `Sent to ${data.sent_to}`,
        });
        setShowRequest(false);
        load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(id) {
    const res = await fetch(`/api/waivers/${id}/resend`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Resend failed", description: data.error, variant: "destructive" });
    } else {
      toast({
        title: "Waiver resent",
        description: data.warning || "New link sent",
      });
      load();
    }
  }

  // Open the in-person dialog for a fresh waiver, or re-open one still waiting.
  async function signInPerson(existingId) {
    setStartingInPerson(true);
    try {
      const res = await fetch(
        existingId ? `/api/waivers/${existingId}/in-person` : "/api/waivers/in-person",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existingId ? {} : { person_id: personId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not start signing", description: data.error, variant: "destructive" });
        return;
      }
      // Point the link at the site the staff member is on right now, so the
      // phone that scans the code lands on the same server as this page.
      const signingUrl = new URL(new URL(data.signing_url).pathname, window.location.origin).toString();
      const qr = await QRCode.toDataURL(signingUrl, { width: 240, margin: 1 });
      setInPerson({ waiver_id: data.waiver_id, signing_url: signingUrl, qr });
      load();
    } catch (error) {
      toast({ title: "Could not start signing", description: error.message, variant: "destructive" });
    } finally {
      setStartingInPerson(false);
    }
  }

  // While the dialog is open, watch for the signature to land so the card
  // updates itself the moment the parent taps Sign & Submit.
  useEffect(() => {
    if (!inPerson) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/waivers?person_id=${personId}`);
        const data = await res.json();
        const w = (data.waivers || []).find((x) => x.id === inPerson.waiver_id);
        if (w?.status === "signed") {
          setInPerson(null);
          toast({ title: "Waiver signed", description: `Signed by ${w.signer_name || "guardian"}` });
          setWaivers(data.waivers || []);
        }
      } catch {
        // keep polling; a blip should not close the dialog
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [inPerson, personId]);

  async function uploadPaperWaiver(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "File too large",
        description: fileTooLargeMessage(file),
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      // Upload straight from the browser to storage (no server size limit),
      // then record the stored path as the signed paper waiver.
      const pathname = await uploadDocument(file, "paper-waiver");
      const res = await fetch("/api/waivers/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, pathname }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Upload failed", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Paper waiver recorded" });
        load();
      }
    } catch (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={paperFileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={uploadPaperWaiver}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> Waivers
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => paperFileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Record Paper Waiver
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={startingInPerson}
              onClick={() => signInPerson()}
            >
              {startingInPerson ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-4 w-4" />
              )}
              Sign in Person
            </Button>
            <Button size="sm" onClick={() => setShowRequest(true)}>
              <Send className="mr-2 h-4 w-4" /> Request Waiver
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : waivers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No waivers requested yet.
            </p>
          ) : (
            <div className="space-y-3">
              {waivers.map((w) => {
                const status = deriveWaiverStatus(w);
                return (
                  <div
                    key={w.id}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <WaiverStatusLine waiver={w} />
                      <WaiverSteps waiver={w} />
                      {w.status === "signed" && w.source !== "paper" && (
                        <div className="text-xs text-muted-foreground">
                          Liability:{" "}
                          <span className="font-medium">
                            {w.liability_release_choice === "release" ? "Released" : "Not released"}
                          </span>{" "}
                          · Photo:{" "}
                          <span className="font-medium">
                            {w.photo_release_choice === "allow" ? "Allowed" : "Not allowed"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {w.status === "signed" && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/api/waivers/${w.id}/pdf`} target="_blank" rel="noreferrer">
                            <FileText className="mr-1 h-3 w-3" /> View signed waiver
                          </a>
                        </Button>
                      )}
                      {(status.key === "waiting" || status.key === "expired") &&
                        (w.source === "in_person" ? (
                          <Button size="sm" variant="outline" onClick={() => signInPerson(w.id)}>
                            <QrCode className="mr-1 h-3 w-3" /> Show signing link
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => resend(w.id)}>
                            <RotateCw className="mr-1 h-3 w-3" />
                            {status.key === "expired" ? "Send new link" : "Resend"}
                          </Button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!inPerson} onOpenChange={(open) => !open && setInPerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in Person</DialogTitle>
            <DialogDescription>
              Hand over this device, or have the parent scan the code with their phone. This card
              updates on its own once they sign. The link is good for 24 hours.
            </DialogDescription>
          </DialogHeader>
          {inPerson && (
            <div className="flex flex-col items-center gap-4 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimize */}
              <img src={inPerson.qr} alt="QR code for the signing page" className="h-60 w-60 rounded-md border" />
              <Button asChild className="w-full">
                <a href={inPerson.signing_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open signing page on this device
                </a>
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Waiting for signature…
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInPerson(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Waiver Signature</DialogTitle>
            <DialogDescription>
              An email will be sent with a unique signing link. The link expires in 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="waiver-email">Parent / Guardian Email</Label>
            <Input
              id="waiver-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequest(false)}>
              Cancel
            </Button>
            <Button onClick={requestWaiver} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                "Send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
