"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { FileSignature, Send, RotateCw, ExternalLink, Loader2, FileDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT = {
  pending: "secondary",
  signed: "default",
  declined: "destructive",
  expired: "outline",
};

export function WaiversCard({ personId, defaultEmail }) {
  const { toast } = useToast();
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [email, setEmail] = useState(defaultEmail || "");
  const [submitting, setSubmitting] = useState(false);

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

  async function generatePdf(id) {
    toast({ title: "Generating PDF…", description: "This may take a moment on first run." });
    const res = await fetch(`/api/waivers/${id}/pdf`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "PDF generation failed", description: data.error, variant: "destructive" });
    } else {
      toast({ title: "PDF generated" });
      load();
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> Waivers
          </CardTitle>
          <Button size="sm" onClick={() => setShowRequest(true)}>
            <Send className="mr-2 h-4 w-4" /> Request Waiver
          </Button>
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
              {waivers.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[w.status] || "outline"}>
                        {w.status}
                      </Badge>
                      <span className="text-sm font-medium">{w.sent_to_email}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sent {formatDate(w.sent_at)}
                      {w.signed_at && <> · Signed {formatDate(w.signed_at)}</>}
                    </div>
                    {w.status === "signed" && (
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
                  <div className="flex gap-2">
                    {w.signed_pdf_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={`/api/waivers/${w.id}/pdf`} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 h-3 w-3" /> PDF
                        </a>
                      </Button>
                    )}
                    {w.status === "signed" && !w.signed_pdf_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generatePdf(w.id)}
                      >
                        <FileDown className="mr-1 h-3 w-3" /> Generate PDF
                      </Button>
                    )}
                    {w.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resend(w.id)}
                      >
                        <RotateCw className="mr-1 h-3 w-3" /> Resend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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
