import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
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

/**
 * Open Play Store / App Store from the native shell.
 * `window.open(url, "_system")` is Cordova-only and is ignored by Capacitor 8.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const target = String(url || "").trim();
  if (!target) return;

  const https = httpsStoreUrl(target);

  if (Capacitor.isNativePlatform()) {
    try {
      await App.openUrl({ url: target });
      return;
    } catch {
      // market:// / itms-apps:// may fail if the store app is missing.
    }
    if (https && https !== target) {
      try {
        await App.openUrl({ url: https });
        return;
      } catch {
        // Fall through to window.open.
      }
    }
  }

  window.open(https || target, "_blank", "noopener,noreferrer");
}
