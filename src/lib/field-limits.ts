/** Shared max lengths for registration and profile text fields. */
export const FIELD_LIMITS = {
  name: 40,
  phone: 20,
  relation: 40,
  search: 80,
  email: 80,
} as const;

export const PRAYER_FIELD_LIMITS = {
  title: 80,
  content: 1500,
} as const;

/** Max lengths for event RSVP answers. */
export const EVENT_FIELD_LIMITS = {
  text: 120,
  textarea: 500,
  email: 80,
  phone: 20,
  number: 12,
  other: 80,
} as const;

export function eventAnswerLimit(type?: string): number {
  switch (type) {
    case 'textarea':
      return EVENT_FIELD_LIMITS.textarea;
    case 'email':
      return EVENT_FIELD_LIMITS.email;
    case 'phone':
      return EVENT_FIELD_LIMITS.phone;
    case 'number':
      return EVENT_FIELD_LIMITS.number;
    case 'text':
      return EVENT_FIELD_LIMITS.text;
    default:
      return EVENT_FIELD_LIMITS.other;
  }
}

export function clampEventResponses(
  responses: Record<string, string | string[]> | undefined,
  fields?: { id: string; type?: string }[],
): Record<string, string | string[]> {
  const typeById = Object.fromEntries((fields || []).map((field) => [field.id, field.type]));
  const out: Record<string, string | string[]> = {};
  for (const [id, value] of Object.entries(responses || {})) {
    const max = eventAnswerLimit(typeById[id]);
    if (Array.isArray(value)) {
      out[id] = value.map((item) => String(item).slice(0, max));
    } else {
      out[id] = String(value ?? '').slice(0, max);
    }
  }
  return out;
}
