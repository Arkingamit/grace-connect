/**
 * Browser-based Sign in with Apple, used on Android where the native plugin
 * does not exist.
 *
 * Apple opens in the system browser (appleid.apple.com sits outside the
 * Capacitor `allowNavigation` list, so Capacitor hands it to an external
 * intent). That browser has its own cookie jar, so the app cannot read the
 * session directly — instead it polls our own origin with the flow's `state`
 * until the session cookie is issued to the WebView.
 */

const STORAGE_KEY = "grace.appleWebSignIn";
const POLL_INTERVAL_MS = 2500;
const MAX_FLOW_MS = 10 * 60 * 1000;

export interface AppleWebSignInHandlers {
  onSuccess: () => void;
  onError: (message: string) => void;
  /** Fired while we wait for the member to finish in the browser. */
  onWaiting?: () => void;
}

interface StoredFlow {
  state: string;
  startedAt: number;
}

let activeState: string | null = null;

function readStoredFlow(): StoredFlow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFlow;
    if (!parsed?.state || typeof parsed.startedAt !== "number") return null;
    if (Date.now() - parsed.startedAt > MAX_FLOW_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearStoredFlow() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

function openExternally(url: string) {
  const opened = window.open(url, "_blank");
  if (!opened) window.location.href = url;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `silent` is used when resuming a flow the member may have abandoned: only a
 * finished sign-in should surface, never a stale timeout.
 */
async function pollUntilResolved(
  flow: StoredFlow,
  handlers: AppleWebSignInHandlers,
  silent = false,
) {
  while (activeState === flow.state) {
    await sleep(POLL_INTERVAL_MS);
    if (activeState !== flow.state) return;

    if (Date.now() - flow.startedAt > MAX_FLOW_MS) {
      activeState = null;
      clearStoredFlow();
      if (!silent) handlers.onError("Apple sign-in timed out. Please try again.");
      return;
    }

    let data: { status?: string; error?: string } = {};
    try {
      const res = await fetch(
        `/api/auth/apple/poll?state=${encodeURIComponent(flow.state)}`,
        { cache: "no-store" },
      );
      data = await res.json();
    } catch {
      continue; // offline or app was backgrounded — keep waiting
    }

    if (data.status === "pending") continue;

    activeState = null;
    clearStoredFlow();

    if (data.status === "success") {
      handlers.onSuccess();
    } else if (silent) {
      // Abandoned or expired flow — stay quiet.
    } else if (data.status === "expired") {
      handlers.onError("Apple sign-in expired. Please try again.");
    } else {
      handlers.onError(data.error || "Apple sign-in failed. Please try again.");
    }
    return;
  }
}

export async function startAppleWebSignIn(handlers: AppleWebSignInHandlers) {
  try {
    const res = await fetch("/api/auth/apple/start", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data?.url || !data?.state) {
      handlers.onError(data?.error || "Could not start Apple sign-in.");
      return;
    }

    const flow: StoredFlow = { state: data.state, startedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
    } catch {
      /* private mode — the flow still works, it just cannot be resumed */
    }

    activeState = flow.state;
    handlers.onWaiting?.();
    openExternally(data.url);
    void pollUntilResolved(flow, handlers);
  } catch {
    handlers.onError("Could not reach the server to start Apple sign-in.");
  }
}

/** Picks a flow back up after the WebView reloaded or the app was backgrounded. */
export function resumeAppleWebSignIn(handlers: AppleWebSignInHandlers): boolean {
  const flow = readStoredFlow();
  if (!flow || activeState) return false;

  activeState = flow.state;
  void pollUntilResolved(flow, handlers, true);
  return true;
}

/**
 * Stops polling without discarding the flow, so leaving the login screen and
 * coming back can still pick up a sign-in finished in the browser.
 */
export function stopAppleWebSignInPolling() {
  activeState = null;
}
