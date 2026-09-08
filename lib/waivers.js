import { formatDate } from "./utils";

// A signing link is good for one day when the parent is in the room.
export const IN_PERSON_EXPIRY_MS = 24 * 60 * 60 * 1000;

// A waiver moves through: link sent → parent signed → document ready.
// The DB only stores 'pending'/'signed'/'declined'; an expired link is
// derived from expires_at so stale requests can't hide as "pending".
export function deriveWaiverStatus(w, now = new Date()) {
  if (w.status === "signed") {
    if (w.source === "paper") {
      return {
        key: "signed",
        label: "Signed",
        variant: "success",
        sentence: `Paper form on file — uploaded ${formatDate(w.signed_at)}`,
      };
    }
    return {
      key: "signed",
      label: "Signed",
      variant: "success",
      sentence: `Signed ${w.source === "in_person" ? "in person " : ""}by ${w.signer_name || "guardian"} on ${formatDate(w.signed_at)}`,
    };
  }
  if (w.status === "declined") {
    return {
      key: "declined",
      label: "Declined",
      variant: "destructive",
      sentence: "The guardian declined to sign",
    };
  }
  if (w.expires_at && new Date(w.expires_at) < now) {
    return {
      key: "expired",
      label: "Link Expired",
      variant: "destructive",
      sentence: `Link expired ${formatDate(w.expires_at)} — ${
        w.source === "in_person" ? "start a new one" : "send a new one"
      }`,
    };
  }
  if (w.source === "in_person") {
    return {
      key: "waiting",
      label: "Ready to Sign",
      variant: "warning",
      sentence: `Started in person ${formatDate(w.sent_at)}${
        w.expires_at ? ` — link expires ${formatDate(w.expires_at)}` : ""
      }`,
    };
  }
  return {
    key: "waiting",
    label: "Waiting for Signature",
    variant: "warning",
    sentence: `Sent ${formatDate(w.sent_at)}${
      w.expires_at ? ` — link expires ${formatDate(w.expires_at)}` : ""
    }`,
  };
}
