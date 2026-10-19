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
  if (typeof document === "undefined") return false;

  // Exit fullscreen first if a video player or element is active in fullscreen
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return true;
  }

  // 1. Direct search for any open dialog / modal close button across document
  const dialogCloseBtn = document.querySelector<HTMLElement>(
    [
      '[role="dialog"][data-state="open"] button[aria-label="Close"]',
      '[role="dialog"][data-state="open"] [data-radix-dialog-close]',
      '[role="dialog"][data-state="open"] button.absolute.right-4',
      '[role="dialog"] button[aria-label="Close"]',
      '[role="dialog"] [data-radix-dialog-close]',
      '[role="dialog"] button.absolute.right-4',
      '[role="alertdialog"] [data-radix-alert-dialog-cancel]',
      '[data-dialog-close]',
    ].join(", "),
  );
  if (dialogCloseBtn) {
    dialogCloseBtn.click();
    return true;
  }

  // Dispatch custom overlay close event
  window.dispatchEvent(new CustomEvent("app:close-overlay"));

  const openLayers = Array.from(
    document.querySelectorAll<HTMLElement>(
      [
        '[role="dialog"][data-state="open"]',
        '[role="dialog"]',
        '[role="alertdialog"][data-state="open"]',
        '[role="alertdialog"]',
        '[role="menu"][data-state="open"]',
        '[data-radix-popper-content-wrapper] [data-state="open"]',
        '[data-state="open"][role="listbox"]',
        '[data-dialog-open]',
        '.fixed.inset-0:not(.pointer-events-none):not([aria-hidden="true"])',
      ].join(", "),
    ),
  );

  const activeLayer = openLayers.reverse().find((layer) => {
    if (layer.classList.contains("pointer-events-none")) return false;
    if (layer.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(layer);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const zIndex = parseInt(style.zIndex, 10);
    return (
      (!isNaN(zIndex) && zIndex >= 40) ||
      layer.getAttribute("role") === "dialog" ||
      layer.getAttribute("role") === "alertdialog" ||
      layer.getAttribute("data-state") === "open"
    );
  });

  if (!activeLayer) return false;

  const closeBtn = activeLayer.querySelector<HTMLElement>(
    [
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      'button[aria-label="Back"]',
      'button[aria-label="back"]',
      '[data-radix-dialog-close]',
      '[data-dialog-close]',
    ].join(", "),
  );
  if (closeBtn) {
    closeBtn.click();
    return true;
  }

  // Fallback: search all buttons in activeLayer for close/back icons or text
  const allButtons = Array.from(activeLayer.querySelectorAll<HTMLButtonElement>("button"));
  const fallbackBtn = allButtons.find((btn) => {
    const label = (btn.getAttribute("aria-label") || "").toLowerCase();
    const text = (btn.textContent || "").toLowerCase().trim();
    const hasIcon = Boolean(
      btn.querySelector("svg.lucide-x, svg.lucide-chevron-left, svg.lucide-arrow-left"),
    );
    return (
      label.includes("close") ||
      label.includes("back") ||
      text === "close" ||
      text === "back" ||
      text === "cancel" ||
      hasIcon
    );
  });

  if (fallbackBtn) {
    fallbackBtn.click();
    return true;
  }

  const overlay = document.querySelector<HTMLElement>(
    "[data-radix-dialog-overlay][data-state='open'], [data-state='open'].fixed.inset-0",
  );
  if (overlay) {
    overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    overlay.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    overlay.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    overlay.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    overlay.click();
  }

  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    }),
  );
  document.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
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
        router.push(previous, { scroll: false });
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
        router.push(HOME_ROUTE, { scroll: false });
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

    const handlePopState = () => {
      // If an overlay/modal was open when user swiped back or used browser back, close it
      closeOpenOverlay();
    };

    window.addEventListener("popstate", handlePopState);

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
      window.removeEventListener("popstate", handlePopState);
      void listener?.remove();
    };
  }, [router]);

  return null;
}
