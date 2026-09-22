import { Capacitor } from "@capacitor/core";
import { ANDROID_PACKAGE_ID } from "@/lib/campus-invite";

function httpsStoreUrl(url: string): string {
  const raw = url.trim();
  if (/^market:/i.test(raw)) {
    const id = raw.match(/[?&]id=([^&]+)/)?.[1] || ANDROID_PACKAGE_ID;
    return `https://play.google.com/store/apps/details?id=${decodeURIComponent(id)}`;
  }
  return raw.replace(/^itms-apps:\/\//i, "https://").replace(/^itms:\/\//i, "https://");
}

/**
 * Convert an admin store URL into a scheme that leaves the Capacitor WebView
 * (market:// on Android, itms-apps:// on iOS).
 */
export function resolveStoreUpdateUrl(
  platform: "android" | "ios" | "web",
  adminUrl?: string
): string {
  const raw = String(adminUrl || "").trim();
  if (platform === "android") {
    const idMatch = raw.match(/[?&]id=([^&#]+)/);
    const pkg = decodeURIComponent(idMatch?.[1] || ANDROID_PACKAGE_ID);
    return `market://details?id=${pkg}`;
  }
  if (platform === "ios") {
    if (!raw) return "";
    if (/^(itms-apps|itms):/i.test(raw)) return raw;
    return raw.replace(/^https?:\/\//i, "itms-apps://");
  }
  return raw;
}

async function nativeOpenUrl(url: string): Promise<boolean> {
  try {
    const openUrl = (
      window as Window & {
        Capacitor?: {
          Plugins?: {
            App?: { openUrl?: (options: { url: string }) => Promise<void> };
          };
        };
      }
    ).Capacitor?.Plugins?.App?.openUrl;
    if (typeof openUrl !== "function") return false;
    await openUrl({ url });
    return true;
  } catch {
    return false;
  }
}

/**
 * Open Play Store / App Store from the native shell.
 * `window.open(url, "_system")` is Cordova-only and is ignored by Capacitor 8.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const target = String(url || "").trim();
  if (!target) return;

  const https = httpsStoreUrl(target);

  if (Capacitor.isNativePlatform()) {
    if (await nativeOpenUrl(target)) return;
    if (https && https !== target && (await nativeOpenUrl(https))) return;
  }

  window.open(https || target, "_blank", "noopener,noreferrer");
}
