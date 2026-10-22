"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

/**
 * ScreenPrivacyGuard
 * Multi-layer client shield to block and deter screenshots, screen recordings,
 * media cloning, and print captures across Web, PWA, and Capacitor WebViews.
 */
export function ScreenPrivacyGuard() {
  useEffect(() => {
    // 0. Ensure native privacy shield is active on Capacitor (iOS & Android)
    if (Capacitor.isNativePlatform()) {
      import("@capgo/capacitor-privacy-screen")
        .then(({ PrivacyScreen }) => {
          PrivacyScreen.enable({
            android: { dimBackground: true },
            ios: { blurEffect: "dark" },
          }).catch(() => {});
        })
        .catch(() => {});
    }
    // 1. Intercept PrintScreen key & clear clipboard
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen") {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("");
          }
        } catch {
          // ignore clipboard permission error
        }
        toast.error("Screenshots are disabled for privacy and security.", {
          id: "screen-privacy-alert",
          duration: 3500,
        });
      }

      // Block Ctrl+P / Cmd+P (Print to PDF / printer)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        toast.error("Printing and PDF export are disabled for security.", {
          id: "print-privacy-alert",
          duration: 3500,
        });
      }

      // Block Ctrl+S / Cmd+S (Save webpage)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
    };

    // 2. Prevent right-click context menu on images and videos
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "IMG" ||
          target.tagName === "VIDEO" ||
          target.closest("img") ||
          target.closest("video") ||
          target.closest(".protected-media"))
      ) {
        e.preventDefault();
      }
    };

    // 3. Obscure DOM on visibility change (multitasking / window switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.classList.add("screen-capture-obscured");
      } else {
        document.body.classList.remove("screen-capture-obscured");
      }
    };

    // 4. Listen for iOS native screenshot notification event
    const handleNativeScreenshot = () => {
      toast.error("Taking screenshots is restricted by church security policy.", {
        id: "native-screenshot-alert",
        duration: 4000,
      });
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText("");
        }
      } catch {
        // ignore
      }
    };

    // 5. Intercept browser getDisplayMedia to block web screen recording
    let originalGetDisplayMedia: any = null;
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getDisplayMedia
    ) {
      originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(
        navigator.mediaDevices
      );
      try {
        navigator.mediaDevices.getDisplayMedia = async () => {
          toast.error("Screen recording is disabled for privacy and security.", {
            id: "screen-record-alert",
            duration: 4000,
          });
          throw new DOMException(
            "Screen recording is restricted by security policy.",
            "NotAllowedError"
          );
        };
      } catch {
        // In case getDisplayMedia is read-only
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("app:screenshot-attempt", handleNativeScreenshot);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("app:screenshot-attempt", handleNativeScreenshot);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.body.classList.remove("screen-capture-obscured");

      if (
        originalGetDisplayMedia &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getDisplayMedia
      ) {
        try {
          navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return null;
}
