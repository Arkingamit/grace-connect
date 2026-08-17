export const REJECTION_REASONS = [
  { value: "incorrect_details", label: "Incorrect details" },
  { value: "unknown_person", label: "Unknown person" },
  { value: "duplicate_account", label: "Duplicate account" },
  { value: "incomplete_information", label: "Incomplete information" },
  { value: "not_eligible", label: "Not eligible for membership" },
  { value: "other", label: "Other" },
] as const;

export type RejectionReasonValue = (typeof REJECTION_REASONS)[number]["value"];

export function getRejectionReasonLabel(value?: string | null): string {
  if (!value) return "";
  return REJECTION_REASONS.find((r) => r.value === value)?.label || value;
}

/** Message shown to the member on login / status screens. */
export function formatRejectionMessage(
  reason?: string | null,
  note?: string | null,
): string {
  const trimmedNote = note?.trim() || "";
  if (!reason) {
    return "Your registration was not approved. Please contact your campus pastor.";
  }
  if (reason === "other") {
    return trimmedNote
      ? `Your registration was not approved. Reason: ${trimmedNote}`
      : "Your registration was not approved. Please contact your campus pastor.";
  }
  const label = getRejectionReasonLabel(reason);
  return trimmedNote
    ? `Your registration was not approved. Reason: ${label} — ${trimmedNote}`
    : `Your registration was not approved. Reason: ${label}.`;
}
