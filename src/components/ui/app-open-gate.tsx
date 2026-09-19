"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useSearchParams } from "next/navigation";
import { Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  androidIntentUrl,
  customSchemeRegisterUrl,
  DEFAULT_PLAY_STORE_URL,
  isMobileUserAgent,
  mobileStorePlatform,
  playStoreUrlForCampus,
  rememberCampusInvite,
} from "@/lib/campus-invite";

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

/**
 * Campus QR opened in a mobile browser (Google Lens, Camera, etc.):
 * try the installed app, otherwise send the user to Play Store / App Store.
 */
export function AppOpenGate({
  campusId,
  children,
}: {
  campusId: string;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const allowWeb = searchParams.get("web") === "1";
  const [phase, setPhase] = useState<"pass" | "opening" | "store">("pass");
  const [storeHref, setStoreHref] = useState(DEFAULT_PLAY_STORE_URL);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    rememberCampusInvite(campusId);
    if (allowWeb || Capacitor.isNativePlatform() || !isMobileUserAgent()) {
      setPhase("pass");
      return;
    }

    let cancelled = false;
    const storePlatform = mobileStorePlatform();
    setPlatform(storePlatform);
    setPhase("opening");

    const run = async () => {
      const stores = await loadStoreUrls();
      if (cancelled) return;

      const play = playStoreUrlForCampus(campusId, stores.android);
      const iosStore = stores.ios;
      const store = storePlatform === "ios" ? iosStore : play;
      setStoreHref(store);

      if (storePlatform === "android") {
        window.location.href = androidIntentUrl(campusId, play);
        window.setTimeout(() => {
          if (!cancelled && !document.hidden) setPhase("store");
        }, 1600);
        return;
      }

      if (storePlatform === "ios") {
        window.location.href = customSchemeRegisterUrl(campusId);
        window.setTimeout(() => {
          if (cancelled || document.hidden) return;
          if (iosStore) window.location.href = iosStore;
          setPhase("store");
        }, 1600);
        return;
      }

      setPhase("pass");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [allowWeb, campusId]);

  if (phase === "pass") return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7F2] px-5">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-[#E5D5C5]/80 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B2323] to-[#5C1111]">
          <Church className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-[#1A202C]">
          {phase === "opening" ? "Opening Grace Connect" : "Get the Grace Connect app"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#7A6150]">
          {phase === "opening"
            ? "Your campus is ready. Continue registration in the app after you choose your Google account — no extra QR scan."
            : platform === "ios"
              ? "Install Grace Connect from the App Store, then scan this campus QR again to finish registration."
              : "Install Grace Connect from Google Play, then scan this campus QR again to finish registration."}
        </p>
        {phase === "opening" ? (
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-[#8B2323] border-t-transparent" />
        ) : storeHref ? (
          <Button
            className="mt-6 w-full"
            onClick={() => {
              window.location.href = storeHref;
            }}
          >
            {platform === "ios" ? "Open App Store" : "Open Play Store"}
          </Button>
        ) : (
          <p className="mt-6 text-xs text-[#C4B0A0]">
            Ask your campus team for the App Store link, then scan this QR again after installing.
          </p>
        )}
      </div>
    </div>
  );
}
