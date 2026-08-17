"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { toast } from "sonner";
import { useNavigationHistory } from "./navigation-history-provider";

/** Primary tab / shell routes where Android back should exit (not browser-history). */
const ROOT_ROUTES = new Set([
  "/",
  "/sermons",
  "/broadcasts",
  "/events",
  "/login",
  "/register",
  "/admin",
]);

function isRootRoute(pathname: string): boolean {
  if (ROOT_ROUTES.has(pathname)) return true;
  // Admin section home is the dashboard; other /admin/* are nested
  if (pathname === "/admin" || pathname === "/admin/") return true;
  return false;
}

function closeOpenOverlay(): boolean {
  // Radix Dialog / Sheet / AlertDialog open state
  const openDialog = document.querySelector<HTMLElement>(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  );
  if (openDialog) {
    const closer =
      openDialog.querySelector<HTMLElement>("[data-radix-dialog-close]") ||
      document.querySelector<HTMLElement>("[data-radix-dialog-overlay]") ||
      document.querySelector<HTMLElement>('[data-state="open"][aria-hidden="true"]');
    // Prefer Escape-like close via overlay click / close button
    const closeBtn = openDialog.querySelector<HTMLButtonElement>(
      'button[aria-label="Close"], button[aria-label="close"]'
    );
    if (closeBtn) {
      closeBtn.click();
      return true;
    }
    // Dispatch Escape so Radix closes the topmost modal
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    );
    return true;
  }

  // Native select / popover content
  const openPopover = document.querySelector<HTMLElement>(
    '[data-radix-popper-content-wrapper] [data-state="open"], [role="listbox"]'
  );
  if (openPopover) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    );
    return true;
  }

  return false;
}

function parentRoute(pathname: string): string {
  if (pathname.startsWith("/admin/")) return "/admin";
  if (pathname.startsWith("/profile")) return "/";
  if (pathname.startsWith("/sermons/")) return "/sermons";
  if (pathname.startsWith("/events/")) return "/events";
  if (pathname.startsWith("/broadcasts/")) return "/broadcasts";
  return "/";
}

/**
 * Capacitor Android hardware / gesture back:
 * - Does NOT walk WebView browser history (recent pages)
 * - Closes open dialogs first
 * - Nested routes → replace to section root
 * - Root tab screens → double-back to exit app
 */
export function NativeBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const lastBackAt = useRef(0);
  const { goBack } = useNavigationHistory();
  const goBackRef = useRef(goBack);

  useEffect(() => {
    goBackRef.current = goBack;
  }, [goBack]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => Promise<void> } | undefined;

    const setup = async () => {
      handle = await App.addListener("backButton", () => {
        // 1) Close overlays (native feel)
        if (closeOpenOverlay()) return;

        const path = pathnameRef.current || "/";

        // 2) Root shell → double-press to exit (no history.back)
        if (isRootRoute(path)) {
          const now = Date.now();
          if (now - lastBackAt.current < 2000) {
            lastBackAt.current = 0;
            void App.exitApp();
            return;
          }
          lastBackAt.current = now;
          toast.message("Press back again to exit", { duration: 2000 });
          return;
        }

        // 3) Nested screen → use global history stack (fallback to parentRoute)
        lastBackAt.current = 0;
        goBackRef.current(parentRoute(path));
      });
    };

    void setup();

    return () => {
      void handle?.remove();
    };
  }, [router]);

  return null;
}
