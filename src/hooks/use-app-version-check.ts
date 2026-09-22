"use client";

import { useState, useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { resolveStoreUpdateUrl } from "@/lib/store-update";
import { APP_VERSION } from "@/lib/version";

export type UpdateStatus = "checking" | "ok" | "force_update" | "optional_update" | "error";

interface VersionCheckResult {
  status: UpdateStatus;
  updateUrl: string;
  message: string;
  latestVersion: string;
}

function compareSemver(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Unset / legacy website 0.1.0 means this platform has no store release to prompt.
 */
function isStoreVersionConfigured(version?: string): boolean {
  const v = String(version || "").trim();
  return v.length > 0 && v !== "0.0.0" && v !== "0.1.0";
}

function getPlatform(): "android" | "ios" | "web" {
  if (typeof window !== "undefined" && Capacitor.getPlatform) {
    const platform = Capacitor.getPlatform();
    if (platform === "android") return "android";
    if (platform === "ios") return "ios";
  }
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  }
  return "web";
}

/**
 * Native store version (Play versionName / iOS Marketing Version).
 * Website package.json is ignored — the live site is the same for every shell.
 */
async function getCurrentAppVersion(): Promise<string> {
  try {
    const info = await App.getInfo();
    if (info?.version) return String(info.version);
  } catch {
    // Fall through
  }
  return process.env.NEXT_PUBLIC_APP_VERSION || APP_VERSION || "0.1.0";
}

/**
 * Checks whether the native app needs a store update.
 * Only runs on Capacitor Android/iOS — never shown on the website.
 */
export function useAppVersionCheck(): VersionCheckResult {
  const [result, setResult] = useState<VersionCheckResult>({
    status: "checking",
    updateUrl: "",
    message: "",
    latestVersion: "",
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setResult({ status: "ok", updateUrl: "", message: "", latestVersion: "" });
      return;
    }

    const checkVersion = async () => {
      try {
        const platform = getPlatform();
        if (platform === "web") {
          setResult({ status: "ok", updateUrl: "", message: "", latestVersion: "" });
          return;
        }

        const currentVersion = await getCurrentAppVersion();

        const res = await fetch("/api/app-version");
        if (!res.ok) {
          setResult({ status: "ok", updateUrl: "", message: "", latestVersion: "" });
          return;
        }

        const data = await res.json();
        const platformCfg = platform === "ios" ? data.ios : data.android;
        const minimumVersion = platformCfg?.minimum_version || "0.0.0";
        const latestVersion = platformCfg?.latest_version || "";
        const updateUrl = resolveStoreUpdateUrl(platform, platformCfg?.update_url);

        if (isStoreVersionConfigured(minimumVersion) && compareSemver(currentVersion, minimumVersion) < 0) {
          setResult({
            status: "force_update",
            updateUrl,
            message: data.force_update_message || "Please update the app to continue.",
            latestVersion,
          });
          return;
        }

        if (isStoreVersionConfigured(latestVersion) && compareSemver(currentVersion, latestVersion) < 0) {
          setResult({
            status: "optional_update",
            updateUrl,
            message: `A new version (v${latestVersion}) is available with improvements and bug fixes.`,
            latestVersion,
          });
          return;
        }

        setResult({ status: "ok", updateUrl: "", message: "", latestVersion });
      } catch (error) {
        console.error("App version check failed:", error);
        setResult({ status: "ok", updateUrl: "", message: "", latestVersion: "" });
      }
    };

    void checkVersion();
  }, []);

  return result;
}
