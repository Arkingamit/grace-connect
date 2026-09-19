/** Campus captured from a registration QR so Google sign-in can skip a second scan. */

const STORAGE_KEY = "grace-campus-invite";

export const ANDROID_PACKAGE_ID = "com.graceconnect.app";
export const CUSTOM_APP_SCHEME = "graceconnect";
export const APP_HOST = "graceconnect.graceahmedabad.org";

export const DEFAULT_PLAY_STORE_URL =
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

export function isCampusId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const id = value.trim();
  return id.length >= 2 && id.length <= 64 && !id.includes("/");
}

export function campusRegisterPath(campusId: string) {
  return `/register/${encodeURIComponent(campusId.trim())}`;
}

export function rememberCampusInvite(campusId: string) {
  if (typeof window === "undefined" || !isCampusId(campusId)) return;
  const id = campusId.trim();
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // private mode
  }
}

export function readCampusInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (isCampusId(session)) return session.trim();
    const local = localStorage.getItem(STORAGE_KEY);
    if (isCampusId(local)) return local.trim();
  } catch {
    // private mode
  }
  return null;
}

export function campusIdFromSearch(search: {
  get(name: string): string | null;
} | null): string | null {
  if (!search) return null;
  const value = search.get("campusId") || search.get("campus");
  return isCampusId(value) ? value.trim() : null;
}

export function campusIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const registerIdx = parts.indexOf("register");
  if (registerIdx === -1 || !parts[registerIdx + 1]) return null;
  try {
    const id = decodeURIComponent(parts[registerIdx + 1]);
    return isCampusId(id) ? id : null;
  } catch {
    return null;
  }
}

/** Path inside the app for an incoming App Link / custom-scheme URL. */
export function inAppPathFromLaunchUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const protocol = url.protocol.replace(/:$/, "");

    if (protocol === CUSTOM_APP_SCHEME || protocol === ANDROID_PACKAGE_ID) {
      const host = url.hostname || url.host;
      const rest = `${url.pathname}${url.search}${url.hash}`;
      if (!host) return rest.startsWith("/") ? rest : `/${rest}`;
      if (host === "register") {
        const campus = url.pathname.split("/").filter(Boolean)[0];
        if (isCampusId(campus)) return campusRegisterPath(campus);
      }
      if (host === "open") {
        return `${url.pathname || "/"}${url.search}${url.hash}` || "/";
      }
      const path = `/${host}${url.pathname === "/" ? "" : url.pathname}${url.search}${url.hash}`;
      return path.replace(/\/{2,}/g, "/");
    }

    const host = url.hostname.toLowerCase();
    if (
      host === APP_HOST ||
      host.endsWith(".graceahmedabad.org") ||
      host.includes("graceconnect")
    ) {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch {
    return null;
  }
  return null;
}

export function isMobileUserAgent(ua = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

export function mobileStorePlatform(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): "android" | "ios" | null {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

export function playStoreUrlForCampus(campusId: string, base = DEFAULT_PLAY_STORE_URL) {
  const url = new URL(base);
  url.searchParams.set(
    "referrer",
    `utm_source=campus_qr&campus=${encodeURIComponent(campusId)}`,
  );
  return url.toString();
}

export function androidIntentUrl(campusId: string, playStoreUrl: string) {
  return androidIntentUrlForPath(campusRegisterPath(campusId), playStoreUrl);
}

export function customSchemeRegisterUrl(campusId: string) {
  return customSchemeUrlForPath(campusRegisterPath(campusId));
}

/** Open the installed app to this site path, or fall through to the store. */
export function androidIntentUrlForPath(pathAndQuery: string, playStoreUrl: string) {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const fallback = encodeURIComponent(playStoreUrl);
  return (
    `intent://${APP_HOST}${path}` +
    `#Intent;scheme=https;package=${ANDROID_PACKAGE_ID};` +
    `S.browser_fallback_url=${fallback};end`
  );
}

export function customSchemeUrlForPath(pathAndQuery: string) {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  if (path === "/" || path === "") return `${CUSTOM_APP_SCHEME}://open`;
  return `${CUSTOM_APP_SCHEME}://open${path}`;
}
