"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Church, X } from "lucide-react";
import {
  androidIntentUrlForPath,
  customSchemeUrlForPath,
  DEFAULT_PLAY_STORE_URL,
  isMobileUserAgent,
  mobileStorePlatform,
} from "@/lib/campus-invite";

const DISMISS_KEY = "grace-open-in-app-dismissed";

type StoreUrls = { android: string; ios: string };

async function loadStoreUrls(): Promise<StoreUrls> {
  const fallback: StoreUrls = {
    android: DEFAULT_PLAY_STORE_URL,
    ios: process.env.NEXT_PUBLIC_IOS_APP_STORE_URL || "",
  };
  try {
    const res = await fetch("/api/system/settings");
    if (!res.ok) return fallback;
    const settings = await res.json();
    return {
      android: settings.androidStoreUrl || fallback.android,
      ios: settings.iosStoreUrl || fallback.ios,
    };
  } catch {
    return fallback;
  }
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
}

/**
 * Mobile browsers (not the installed app) get a prompt to continue in Grace Connect.
 */
export function OpenInAppBanner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const [stores, setStores] = useState<StoreUrls>({
    android: DEFAULT_PLAY_STORE_URL,
    ios: "",
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!isMobileUserAgent()) return;
    if (searchParams.get("web") === "1") return;
    if (pathname?.startsWith("/admin")) return;
    if (pathname?.startsWith("/register")) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // private mode
    }
    setVisible(true);
    void loadStoreUrls().then(setStores);
  }, [pathname, searchParams]);

  if (!visible) return null;

  const platform = mobileStorePlatform();
  const storeHref = platform === "ios" ? stores.ios : stores.android;

  const openApp = () => {
    const path = currentPath();
    setOpening(true);

    if (platform === "android") {
      window.location.href = androidIntentUrlForPath(path, stores.android || DEFAULT_PLAY_STORE_URL);
      window.setTimeout(() => setOpening(false), 1800);
      return;
    }

    window.location.href = customSchemeUrlForPath(path);
    window.setTimeout(() => {
      if (document.hidden) {
        setOpening(false);
        return;
      }
      if (storeHref) window.location.href = storeHref;
      setOpening(false);
    }, 1600);
  };

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // private mode
    }
    setVisible(false);
  };

  return (
    <div className="desktop:hidden">
      <div
        className="h-[calc(3.35rem+env(safe-area-inset-top))]"
        aria-hidden
      />
      <div className="fixed inset-x-0 top-0 z-[60]">
        <div className="flex items-center gap-3 border-b border-[#E5D5C5]/80 bg-[#FAF7F2]/95 px-3 py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] shadow-[0_8px_24px_-12px_rgba(58,45,39,0.35)] backdrop-blur-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B2323] to-[#5C1111]">
            <Church className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#1A202C]">Open in the app</p>
            <p className="truncate text-[11px] text-[#7A6150]">Grace Connect works best on your phone</p>
          </div>
          <button
            type="button"
            onClick={openApp}
            disabled={opening}
            className="shrink-0 rounded-full bg-[#8B2323] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {opening ? "Opening…" : "Open"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#7A6150]"
            aria-label="Continue on website"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
