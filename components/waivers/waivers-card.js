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
import { FileSignature, Send, RotateCw, FileText, Loader2, Upload } from "lucide-react";
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
                      {(status.key === "waiting" || status.key === "expired") && (
                        <Button size="sm" variant="outline" onClick={() => resend(w.id)}>
                          <RotateCw className="mr-1 h-3 w-3" />
                          {status.key === "expired" ? "Send new link" : "Resend"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
