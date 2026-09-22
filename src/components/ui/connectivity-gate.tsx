"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
import { WifiOff } from "lucide-react";

export function ConnectivityGate() {
  const [offline, setOffline] = useState(false);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    const sync = () => {
      setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    };

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF7F2] px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-[22rem] rounded-3xl border border-[#E5D5C5] bg-white p-7 text-center shadow-[0_8px_30px_rgba(47,60,94,0.1)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBE8E8] text-[#810008]">
          <WifiOff className="h-8 w-8" />
        </div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B2323]">
          Grace Connect
        </p>
        <h1 className="mb-2 text-xl font-bold tracking-tight text-[#1A202C]">
          Connect to the internet
        </h1>
        <p className="text-sm leading-relaxed text-[#5B6470]">
          You&apos;re offline. Turn on Wi-Fi or mobile data
          {native ? " in Settings" : ""}, then try again.
        </p>
        <button
          type="button"
          className="mt-6 h-11 w-full rounded-full bg-gradient-to-r from-[#810008] to-[#A3161E] text-sm font-semibold text-white"
          onClick={() => {
            if (navigator.onLine) {
              setOffline(false);
              window.location.reload();
            }
          }}
        >
          Try again
        </button>
        {native && (
          <button
            type="button"
            className="mt-2.5 h-11 w-full rounded-full border border-[#E5D5C5] bg-white text-sm font-semibold text-[#1A202C]"
            onClick={() => {
              void NativeSettings.open({
                optionAndroid: AndroidSettings.Wireless,
                optionIOS: IOSSettings.WiFi,
              });
            }}
          >
            Open settings
          </button>
        )}
      </div>
    </div>
  );
}
