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

  const status = deriveCertStatus(cert);

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

  const saveField = async (payload) => {
    setSaving(true);
    try {
      await upsert(payload);
      onSaved?.();
    } catch (error) {
      toast({
        title: "Could not save certification",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const pickFile = (type) => {
    setUploadType(type);
    fileRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !uploadType) return;

    try {
      let id = cert?.id;
      if (!id) {
        const created = await upsert({});
        id = created.id;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/certifications/${id}/${uploadType}`, {
        method: "POST",
        body: formData,
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
              checked={!!cert?.application_received}
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
              value={cert?.background_check_status || "pending"}
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
                {cert?.background_check_status === "expired" && (
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
                key={`bd-${cert?.background_check_date || ""}`}
                defaultValue={(cert?.background_check_date || "").slice(0, 10)}
                disabled={saving}
                onBlur={(e) => {
                  const value = e.target.value || null;
                  if (value !== ((cert?.background_check_date || "").slice(0, 10) || null)) {
                    saveField({ background_check_date: value });
                  }
                }}
              />
            </div>
            <div className="text-sm pb-2">
              {cert?.background_check_status === "approved" &&
                cert?.background_check_expires_at &&
                (bgCheckExpired(cert) ? (
                  <span className="text-destructive font-medium">
                    Expired {formatDateOnly(cert.background_check_expires_at)} — needs a new
                    check
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Valid until {formatDateOnly(cert.background_check_expires_at)}
                  </span>
                ))}
              {cert?.background_check_status === "approved" &&
                !cert?.background_check_date && (
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
              checked={!!cert?.qpr_gatekeeper_training}
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
                key={`td-${cert?.qpr_training_date || ""}`}
                defaultValue={(cert?.qpr_training_date || "").slice(0, 10)}
                disabled={saving}
                onBlur={(e) => {
                  const value = e.target.value || null;
                  if (value !== ((cert?.qpr_training_date || "").slice(0, 10) || null)) {
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
                key={`rd-${cert?.qpr_training_renewal_date || ""}`}
                defaultValue={(cert?.qpr_training_renewal_date || "").slice(0, 10)}
                disabled={saving}
                onBlur={(e) => {
                  const value = e.target.value || null;
                  if (value !== ((cert?.qpr_training_renewal_date || "").slice(0, 10) || null)) {
                    saveField({ qpr_training_renewal_date: value });
                  }
                }}
              />
            </div>
          </div>
          {docLine("Training document", "training", trainingPath)}
          {docLine("QPR Certificate", "qpr-certificate", certificatePath)}
        </div>
      </div>
    </div>
  );
}
