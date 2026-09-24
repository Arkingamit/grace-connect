import { FIELD_LIMITS } from '@/lib/field-limits';

/** Format and detect mobile numbers for registration Autofill. */

const INDIA_MOBILE = /^[6-9]\d{9}$/;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Keep typing smooth while detecting Indian 10-digit mobiles. */
export function formatPhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const digits = digitsOnly(trimmed);
  if (!digits) return trimmed.startsWith("+") ? "+" : "";

  let national = digits;
  if (national.startsWith("0") && national.length === 11) {
    national = national.slice(1);
  }
  if (national.startsWith("91") && national.length >= 12) {
    national = national.slice(2);
  }

  if (INDIA_MOBILE.test(national.slice(0, 10)) && national.length <= 10) {
    const n = national.slice(0, 10);
    if (n.length <= 5) return `+91 ${n}`;
    return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  }

  if (trimmed.startsWith("+")) return `+${digits}`.slice(0, FIELD_LIMITS.phone);
  return raw.slice(0, FIELD_LIMITS.phone);
}

export function pickPhoneFromContactEntry(value: unknown): string {
  if (typeof value === "string") return formatPhoneNumber(value);
  if (value && typeof value === "object" && "value" in value) {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === "string") return formatPhoneNumber(nested);
  }
  return "";
}

export async function contactsPickerAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const contacts = (navigator as Navigator & { contacts?: { getProperties?: () => Promise<string[]> } }).contacts;
  if (!contacts?.getProperties) return false;
  try {
    const props = await contacts.getProperties();
    return props.includes("tel");
  } catch {
    return false;
  }
}

export async function selectPhoneFromContacts(): Promise<string | null> {
  const contacts = (navigator as Navigator & {
    contacts?: {
      select: (properties: string[], options?: { multiple?: boolean }) => Promise<Array<{ tel?: unknown[] }>>;
    };
  }).contacts;
  if (!contacts?.select) return null;
  const [contact] = await contacts.select(["tel"], { multiple: false });
  const first = contact?.tel?.[0];
  const parsed = pickPhoneFromContactEntry(first);
  return parsed || null;
}
