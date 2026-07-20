// A certification is a per-person readiness checklist: application received,
// background check, QPR training. One record per person (unique person_id).

// "expired" is no longer offered as a manual choice — it is derived from the
// check date + policy period. Legacy rows may still hold the value.
export const BG_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Passed" },
  { value: "denied", label: "Failed" },
];

export function bgStatusLabel(value) {
  if (value === "expired") return "Expired";
  return BG_STATUS_OPTIONS.find((o) => o.value === value)?.label || "Pending";
}

export function bgStatusVariant(value) {
  switch (value) {
    case "approved":
      return "success";
    case "denied":
    case "expired":
      return "destructive";
    default:
      return "warning";
  }
}

export const CERT_STATUS = {
  certified: { key: "certified", label: "Certified", variant: "success", group: "certified" },
  expiring: { key: "expiring", label: "Expiring Soon", variant: "warning", group: "attention" },
  expired: { key: "expired", label: "Expired", variant: "destructive", group: "attention" },
  failed: { key: "failed", label: "Failed", variant: "destructive", group: "attention" },
  in_progress: { key: "in_progress", label: "In Progress", variant: "warning", group: "in_progress" },
  not_started: { key: "not_started", label: "Not Started", variant: "secondary", group: "not_started" },
};

export const STATUS_GROUPS = [
  { key: "certified", label: "Certified" },
  { key: "in_progress", label: "In Progress" },
  { key: "attention", label: "Needs Attention" },
  { key: "not_started", label: "Not Started" },
];

const EXPIRING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Date-only values (e.g. "2025-05-01") parse as UTC midnight; formatting them
// in local time shifts them back a day. Format in UTC to show the true date.
export function formatDateOnly(date) {
  if (!date) return "";
  if (!(date instanceof Date)) date = new Date(date);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function bgCheckExpired(cert, now = new Date()) {
  return !!(
    cert?.background_check_status === "approved" &&
    cert?.background_check_expires_at &&
    new Date(cert.background_check_expires_at) < now
  );
}

// Returns the status plus a `reason` explaining what drove it, so the UI can
// tie the overall chip back to the checklist row responsible.
export function deriveCertStatus(cert, now = new Date()) {
  if (!cert) return { ...CERT_STATUS.not_started, reason: null };

  const bg = cert.background_check_status;
  const renewal = cert.qpr_training_renewal_date
    ? new Date(cert.qpr_training_renewal_date)
    : null;
  const bgExpires = cert.background_check_expires_at
    ? new Date(cert.background_check_expires_at)
    : null;

  if (bg === "expired") {
    return { ...CERT_STATUS.expired, reason: "Background check expired" };
  }
  if (bgCheckExpired(cert, now)) {
    return {
      ...CERT_STATUS.expired,
      reason: `Background check expired ${formatDateOnly(bgExpires)}`,
    };
  }
  if (renewal && renewal < now) {
    return { ...CERT_STATUS.expired, reason: "QPR training renewal date has passed" };
  }
  if (bg === "denied") {
    return { ...CERT_STATUS.failed, reason: "Background check failed" };
  }

  const done = [
    !!cert.application_received,
    bg === "approved",
    !!cert.qpr_gatekeeper_training,
  ].filter(Boolean).length;

  if (done === 3) {
    if (bg === "approved" && bgExpires && bgExpires - now < EXPIRING_WINDOW_MS) {
      return {
        ...CERT_STATUS.expiring,
        reason: `Background check renewal due ${formatDateOnly(bgExpires)}`,
      };
    }
    if (renewal && renewal - now < EXPIRING_WINDOW_MS) {
      return {
        ...CERT_STATUS.expiring,
        reason: `QPR training renewal due ${formatDateOnly(renewal)}`,
      };
    }
    return { ...CERT_STATUS.certified, reason: null };
  }

  const touched =
    done > 0 ||
    (bg && bg !== "pending") ||
    !!cert.application_attachment_path ||
    !!cert.qpr_training_attachment_path ||
    !!cert.qpr_certificate_attachment_path ||
    !!cert.qpr_training_date;

  if (!touched) return { ...CERT_STATUS.not_started, reason: null };
  return { ...CERT_STATUS.in_progress, reason: `${done} of 3 requirements met` };
}
