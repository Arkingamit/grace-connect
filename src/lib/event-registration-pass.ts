export const EVENT_PASSES_KEY = 'grace-event-passes';

export type EventRegistrationPass = {
  eventId: string;
  eventTitle: string;
  location: string;
  eventDate: string;
  userName: string;
  userEmail: string;
  qrCode: string;
  ticketId: string;
  registeredAt: string;
  extraFields: { label: string; value: string }[];
};

function readAll(): Record<string, EventRegistrationPass> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(EVENT_PASSES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, EventRegistrationPass>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveEventRegistrationPass(pass: EventRegistrationPass) {
  if (typeof window === 'undefined') return;
  try {
    const all = readAll();
    all[pass.eventId] = pass;
    localStorage.setItem(EVENT_PASSES_KEY, JSON.stringify(all));
  } catch {
    // quota / private mode
  }
}

export function loadEventRegistrationPass(eventId: string): EventRegistrationPass | null {
  const pass = readAll()[eventId];
  if (!pass?.qrCode || !pass?.userName) return null;
  return pass;
}

export function eventTicketId(eventId: string) {
  return `EVT-${eventId.slice(-8).toUpperCase()}`;
}

export function eventPassQrValue(eventId: string, email: string, memberQr?: string) {
  if (memberQr) return memberQr;
  return `grace-event:${eventId}:${email.toLowerCase()}`;
}
