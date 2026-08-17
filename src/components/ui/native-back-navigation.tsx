"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { toast } from "sonner";
import {
  HOME_ROUTE,
  isExitConfirmRoute,
  popNavStack,
  routeFromLocation,
  trackRoute,
  writeNavStack,
} from "@/lib/in-app-nav-stack";

declare global {
  interface Window {
    __graceNativeBack?: () => boolean;
  }
}

function canUseBrowserHistory(): boolean {
  if (typeof window === "undefined" || window.history.length <= 1) return false;
  const state = window.history.state as { idx?: number } | null;
  // Next.js App Router: idx 0 is the first in-app entry — don't back into about:blank
  if (state && typeof state.idx === "number") return state.idx > 0;
  return true;
}

function closeOpenOverlay(): boolean {
  const openLayer = document.querySelector<HTMLElement>(
    [
      '[role="dialog"][data-state="open"]',
      '[role="alertdialog"][data-state="open"]',
      '[role="menu"][data-state="open"]',
      '[data-radix-popper-content-wrapper] [data-state="open"]',
      '[data-state="open"][role="listbox"]',
    ].join(", "),
  );

  if (!openLayer) return false;

  const closeBtn = openLayer.querySelector<HTMLElement>(
    'button[aria-label="Close"], button[aria-label="close"], [data-radix-dialog-close]',
  );
  if (closeBtn) {
    closeBtn.click();
    return true;
  }

  const overlay = document.querySelector<HTMLElement>(
    "[data-radix-dialog-overlay][data-state='open'], [data-state='open'].fixed.inset-0",
  );
  if (overlay) {
    overlay.click();
    return true;
  }

  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  return true;
}

/**
 * Tracks the last 5 in-app routes and handles Android system Back:
 * overlay → in-app stack → WebView history → home → double-press exit.
 */
export function NativeBackNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const lastBackAt = useRef(0);
  const lastHandledAt = useRef(0);

  const route = routeFromLocation(pathname, searchParams.toString());

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    trackRoute(route);
  }, [route]);

  useEffect(() => {
    const handleBack = (): boolean => {
      const now = Date.now();
      if (now - lastHandledAt.current < 80) return true;
      lastHandledAt.current = now;

      if (closeOpenOverlay()) {
        lastBackAt.current = 0;
        return true;
      }

      const previous = popNavStack();
      if (previous) {
        lastBackAt.current = 0;
        router.push(previous);
        return true;
      }

      const path = pathnameRef.current || HOME_ROUTE;
      const canBrowserBack =
        typeof window !== "undefined" &&
        window.history.length > 1 &&
        !isExitConfirmRoute(path) &&
        canUseBrowserHistory();

      if (canBrowserBack) {
        lastBackAt.current = 0;
        writeNavStack([]);
        window.history.back();
        return true;
      }

      if (!isExitConfirmRoute(path)) {
        lastBackAt.current = 0;
        writeNavStack([]);
        router.push(HOME_ROUTE);
        return true;
      }

      if (now - lastBackAt.current < 2000) {
        lastBackAt.current = 0;
        if (Capacitor.getPlatform() === "android") {
          void App.exitApp();
        }
        return true;
      }

      lastBackAt.current = now;
      toast.message("Press back again to exit", { duration: 2000 });
      return true;
    };

    window.__graceNativeBack = handleBack;

    let listener: { remove: () => Promise<void> } | undefined;
    const setup = async () => {
      if (Capacitor.getPlatform() !== "android") return;
      listener = await App.addListener("backButton", () => {
        handleBack();
      });
    };
    void setup();

    return () => {
      if (window.__graceNativeBack === handleBack) {
        delete window.__graceNativeBack;
      }
      void listener?.remove();
    };
  }, [router]);

  return null;
}
