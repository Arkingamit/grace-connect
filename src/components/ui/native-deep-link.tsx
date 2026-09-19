"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  campusIdFromPath,
  inAppPathFromLaunchUrl,
  rememberCampusInvite,
} from "@/lib/campus-invite";

function applyLaunchPath(rawUrl: string, navigate: (path: string) => void) {
  const path = inAppPathFromLaunchUrl(rawUrl);
  if (!path) return;

  const campusId = campusIdFromPath(path.split("?")[0] || path);
  if (campusId) rememberCampusInvite(campusId);

  const current = `${window.location.pathname}${window.location.search}`;
  if (path === current || path === window.location.pathname) return;
  navigate(path);
}

/** Opens /register/{campus} when a campus QR launches the native app. */
export function NativeDeepLink() {
  const router = useRouter();
  const pathname = usePathname();
  const consumedLaunch = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const go = (path: string) => router.replace(path);

    if (!consumedLaunch.current) {
      consumedLaunch.current = true;
      void App.getLaunchUrl()
        .then((result) => {
          if (result?.url) applyLaunchPath(result.url, go);
        })
        .catch(() => undefined);
    }

    const sub = App.addListener("appUrlOpen", (event) => {
      applyLaunchPath(event.url, go);
    });

    return () => {
      void sub.then((listener) => listener.remove());
    };
  }, [router]);

  useEffect(() => {
    const campusId = campusIdFromPath(pathname);
    if (campusId) rememberCampusInvite(campusId);
  }, [pathname]);

  return null;
}
