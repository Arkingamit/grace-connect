"use client";

import React, { useState } from "react";
import { ArrowUpCircle, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppVersionCheck } from "@/hooks/use-app-version-check";
import { openExternalUrl } from "@/lib/store-update";

/**
 * Shown on Capacitor Android/iOS when a store update is available.
 * Force update cannot be dismissed; optional update can.
 */
export function ForceUpdateModal() {
  const { status, updateUrl, message, latestVersion } = useAppVersionCheck();
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);

  if (status === "ok" || status === "checking" || status === "error") return null;
  if (status === "optional_update" && dismissed) return null;

  const handleUpdate = async () => {
    if (!updateUrl || opening) return;
    setOpening(true);
    try {
      await openExternalUrl(updateUrl);
    } finally {
      setOpening(false);
    }
  };

  if (status === "force_update") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF7F2]/95 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-sm rounded-3xl border border-[#E5D5C5] bg-white p-6 shadow-[0_8px_30px_rgba(47,60,94,0.1)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FBE8E8] text-[#810008]">
            <ArrowUpCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[#1A202C]">Update required</h1>
          {latestVersion && (
            <p className="mt-1 text-xs text-[#8A94A3]">Version {latestVersion}</p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-[#5B6470]">{message}</p>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={!updateUrl || opening}
            className="mt-5 h-11 w-full rounded-full bg-gradient-to-r from-[#810008] to-[#A3161E] text-white hover:from-[#721515] hover:to-[#810008]"
          >
            <Download className="h-4 w-4" />
            Update now
          </Button>
          {!updateUrl && (
            <p className="mt-3 text-center text-xs text-[#8A94A3]">
              Store link not configured. Please contact support.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === "optional_update") {
    return (
      <div
        className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/40 px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:items-center sm:pb-6"
        role="dialog"
        aria-label="Update available"
      >
        <div className="w-full max-w-md rounded-3xl border border-[#E5D5C5] bg-white p-4 shadow-[0_8px_30px_rgba(47,60,94,0.12)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBE8E8] text-[#810008]">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-[#1A202C]">Update available</p>
              {latestVersion && (
                <p className="mt-0.5 text-[11px] text-[#8A94A3]">Version {latestVersion}</p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-[#5B6470]">{message}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded-md p-1 text-[#8A94A3] hover:bg-[#FAF7F2] hover:text-[#1A202C]"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 flex-1 rounded-full text-[#5B6470] hover:bg-[#FAF7F2] hover:text-[#1A202C]"
              onClick={() => setDismissed(true)}
            >
              Later
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-10 flex-1 rounded-full bg-gradient-to-r from-[#810008] to-[#A3161E] text-white hover:from-[#721515] hover:to-[#810008]"
              disabled={!updateUrl || opening}
              onClick={handleUpdate}
            >
              <Download className="h-4 w-4" />
              Update
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/** @deprecated Use ForceUpdateModal */
export const ForceUpdate = ForceUpdateModal;
