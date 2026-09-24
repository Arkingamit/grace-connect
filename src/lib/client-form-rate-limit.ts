"use client";

import { toast } from "sonner";

const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a moment and try again.";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PATH_COOLDOWN_MS = 800;
const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 40;

const lastByKey = new Map<string, number>();
const windowHits: number[] = [];

function pruneWindow(now: number) {
  while (windowHits.length && now - windowHits[0] > WINDOW_MS) {
    windowHits.shift();
  }
}

function allowClientSubmit(key: string): boolean {
  const now = Date.now();
  pruneWindow(now);
  const last = lastByKey.get(key) || 0;
  if (now - last < PATH_COOLDOWN_MS) return false;
  if (windowHits.length >= WINDOW_LIMIT) return false;
  lastByKey.set(key, now);
  windowHits.push(now);
  return true;
}

function requestKey(input: RequestInfo | URL, init?: RequestInit): string | null {
  const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (!MUTATING.has(method)) return null;
  const raw = input instanceof Request ? input.url : String(input);
  try {
    return `${method}:${new URL(raw, window.location.origin).pathname}`;
  } catch {
    return `${method}:${raw}`;
  }
}

function showRateLimitToast() {
  toast.error(RATE_LIMIT_MESSAGE);
}

export function installClientFormRateLimit() {
  if (typeof window === "undefined") return () => {};
  const w = window as Window & { __graceFormRateLimit?: boolean };
  if (w.__graceFormRateLimit) return () => {};
  w.__graceFormRateLimit = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = requestKey(input, init);
    if (key && !allowClientSubmit(key)) {
      showRateLimitToast();
      return new Response(JSON.stringify({ error: RATE_LIMIT_MESSAGE }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await originalFetch(input, init);
    if (res.status === 429) {
      showRateLimitToast();
    }
    return res;
  };

  const onSubmit = (event: Event) => {
    const form = event.target as HTMLFormElement | null;
    if (!form || form.tagName !== "FORM") return;
    const action = form.getAttribute("action") || form.id || window.location.pathname;
    if (!allowClientSubmit(`SUBMIT:${action}`)) {
      event.preventDefault();
      event.stopPropagation();
      showRateLimitToast();
    }
  };

  document.addEventListener("submit", onSubmit, true);
  return () => {
    window.fetch = originalFetch;
    document.removeEventListener("submit", onSubmit, true);
    w.__graceFormRateLimit = false;
  };
}
