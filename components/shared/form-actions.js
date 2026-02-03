"use client";

import { Button } from "@/components/ui/button";

export function FormActions({
  loading = false,
  isEdit = false,
  onCancel,
  submitLabel,
  cancelLabel = "Cancel",
  className = "",
}) {
  const defaultSubmitLabel = isEdit ? "Update" : "Create";

  return (
    <div className={`flex justify-end gap-4 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={loading}
      >
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : submitLabel || defaultSubmitLabel}
      </Button>
    </div>
  );
}
