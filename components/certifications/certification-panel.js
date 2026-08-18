"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatDate, formatFileSize } from "@/lib/utils";
import {
  BG_STATUS_OPTIONS,
  bgCheckExpired,
  deriveCertStatus,
  formatDateOnly,
} from "@/lib/certifications";
import { FileText, Upload } from "lucide-react";
import { MAX_UPLOAD_BYTES, fileTooLargeMessage, uploadDocument } from "@/lib/client-upload";

// The single edit surface for a person's certification checklist. Used inline
// on the person detail page and inside the sheet on the certifications page.
// Every control is live — each change saves immediately. The record is created
// on first save/upload; callers never pre-create it.
export function CertificationPanel({ personId, cert, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadType, setUploadType] = useState(null);
  const [documents, setDocuments] = useState({});
  const fileRef = useRef(null);

  // Fields with a save in flight. Rendering `cert` alone means a control does
  // not move until the round trip finishes — on a slow connection that reads
  // as a dead control, so the user clicks again and the two clicks cancel out.
  // Layering the in-flight values over `cert` makes the change land instantly;
  // the entry is dropped once the refetched record carries it (or on failure,
  // which snaps the control back to what the server actually holds).
  const [pending, setPending] = useState({});
  const view = { ...cert, ...pending };

  const status = deriveCertStatus(view);

  const certId = cert?.id;
  const appPath = cert?.application_attachment_path;
  const trainingPath = cert?.qpr_training_attachment_path;
  const certificatePath = cert?.qpr_certificate_attachment_path;

  useEffect(() => {
    if (!certId || (!appPath && !trainingPath && !certificatePath)) {
      setDocuments({});
      return;
    }
    let cancelled = false;
    fetch(`/api/certifications/${certId}/documents`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelled) setDocuments(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [certId, appPath, trainingPath, certificatePath]);

  // Saves run through a queue so rapid edits (blur one field, click the next)
  // never fire concurrent requests — that race produced duplicate-create
  // errors in production.
  const saveQueue = useRef(Promise.resolve());
  const enqueue = (work) => {
    const next = saveQueue.current.then(work, work);
    saveQueue.current = next.catch(() => {});
    return next;
  };

  const upsert = async (payload) => {
    const res = await fetch("/api/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_id: personId, ...payload }),
    });
    if (!res.ok) {
      let message = `Save failed (HTTP ${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {}
      throw new Error(message);
    }
    return res.json();
  };

  const saveField = (payload) =>
    enqueue(async () => {
      setSaving(true);
      setPending((prev) => ({ ...prev, ...payload }));
      try {
        await upsert(payload);
        // Wait for the caller's refetch so `cert` already carries the new
        // value before the optimistic entry is dropped — otherwise the control
        // flickers back to its old state for a frame.
        await onSaved?.();
      } catch (error) {
        toast({
          title: "Could not save certification",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setPending((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(payload)) delete next[key];
          return next;
        });
        setSaving(false);
      }
    });

  const pickFile = (type) => {
    setUploadType(type);
    fileRef.current?.click();
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !uploadType) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "File too large",
        description: fileTooLargeMessage(file),
        variant: "destructive",
      });
      setUploadType(null);
      return;
    }

    const type = uploadType;
    return enqueue(async () => {
      try {
        // Upload straight from the browser to storage (no server size limit),
        // then record the stored path on the certification.
        const pathname = await uploadDocument(file, "cert-doc");

        let id = cert?.id;
        if (!id) {
          const created = await upsert({});
          id = created.id;
        }
        const res = await fetch(`/api/certifications/${id}/${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathname }),
        });
        if (!res.ok) {
          let message = `Upload failed (HTTP ${res.status})`;
          try {
            const body = await res.json();
            if (body?.error) message = body.error;
          } catch {}
          throw new Error(message);
        }
        toast({ title: "Document uploaded" });
        onSaved?.();
      } catch (error) {
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setUploadType(null);
      }
    });
  };

  const docLine = (label, type, path) => {
    const meta = documents[type];
    const details = [
      meta?.size != null ? formatFileSize(meta.size) : null,
      meta?.uploadedAt ? `uploaded ${formatDate(meta.uploadedAt)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <div className="flex items-center justify-between gap-3 border-t pt-3 mt-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          {path ? (
            <div className="text-sm flex items-center gap-1.5">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium break-all">
                {meta?.name || "Document"}
              </span>
              {details && (
                <span className="text-muted-foreground"> — {details}</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              No document on file
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {path && cert?.id ? (
            <>
              <Button size="sm" variant="outline" asChild>
                <a
                  href={`/api/certifications/${cert.id}/${type}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => pickFile(type)}
              >
                <Upload className="h-3 w-3 mr-1" />
                Replace
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => pickFile(type)}
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleFile}
      />

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Overall:</span>
        <Badge variant={status.variant}>{status.label}</Badge>
        {status.reason && (
          <span className="text-sm text-muted-foreground">— {status.reason}</span>
        )}
      </div>

      <div className="space-y-3">
        <div className="p-3 border rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`cert-app-${personId}`}
              checked={!!view.application_received}
              disabled={saving}
              onCheckedChange={(checked) =>
                saveField({ application_received: !!checked })
              }
            />
            <Label htmlFor={`cert-app-${personId}`} className="cursor-pointer">
              Application Received
            </Label>
          </div>
          {docLine("Application document", "application", appPath)}
        </div>

        <div className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span>Background Check</span>
            <Select
              value={view.background_check_status || "pending"}
              disabled={saving}
              onValueChange={(value) =>
                saveField({ background_check_status: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BG_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
                {view.background_check_status === "expired" && (
                  <SelectItem value="expired">Expired</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 items-end">
            <div className="space-y-1">
              <Label
                htmlFor={`cert-bg-date-${personId}`}
                className="text-xs text-muted-foreground"
              >
                Check Date
              </Label>
              <Input
                type="date"
                id={`cert-bg-date-${personId}`}
                defaultValue={(cert?.background_check_date || "").slice(0, 10)}
                onBlur={(e) => {
                  const value = e.target.value || null;
                  if (value !== ((view.background_check_date || "").slice(0, 10) || null)) {
                    saveField({ background_check_date: value });
                  }
                }}
              />
            </div>
            <div className="text-sm pb-2">
              {view.background_check_status === "approved" &&
                view.background_check_expires_at &&
                (bgCheckExpired(view) ? (
                  <span className="text-destructive font-medium">
                    Expired {formatDateOnly(view.background_check_expires_at)} — needs a new
                    check
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Valid until {formatDateOnly(view.background_check_expires_at)}
                  </span>
                ))}
              {view.background_check_status === "approved" &&
                !view.background_check_date && (
                  <span className="text-muted-foreground italic">
                    Enter the check date to track renewal
                  </span>
                )}
            </div>
          </div>
        </div>

        <div className="p-3 border rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`cert-qpr-${personId}`}
              checked={!!view.qpr_gatekeeper_training}
              disabled={saving}
              onCheckedChange={(checked) =>
                saveField({ qpr_gatekeeper_training: !!checked })
              }
            />
            <Label htmlFor={`cert-qpr-${personId}`} className="cursor-pointer">
              QPR Training Complete
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1">
              <Label
                htmlFor={`cert-qpr-date-${personId}`}
                className="text-xs text-muted-foreground"
              >
                Training Date
              </Label>
              <Input
                type="date"
                id={`cert-qpr-date-${personId}`}
                defaultValue={(cert?.qpr_training_date || "").slice(0, 10)}
                onBlur={(e) => {
                  const value = e.target.value || null;
                  if (value !== ((view.qpr_training_date || "").slice(0, 10) || null)) {
                    saveField({ qpr_training_date: value });
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor={`cert-qpr-renewal-${personId}`}
                className="text-xs text-muted-foreground"
              >
                Renewal Date
              </Label>
              <Input
                type="date"
                id={`cert-qpr-renewal-${personId}`}
                defaultValue={(cert?.qpr_training_renewal_date || "").slice(0, 10)}
                onBlur={(e) => {
                  const value = e.target.value || null;
                  if (value !== ((view.qpr_training_renewal_date || "").slice(0, 10) || null)) {
                    saveField({ qpr_training_renewal_date: value });
                  }
                }}
              />
            </div>
          </div>
          {docLine("QPR Certificate", "qpr-certificate", certificatePath)}
        </div>
      </div>
    </div>
  );
}
