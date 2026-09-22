"use client";

import React from "react";
import { ForceUpdateModal } from "./force-update";

/**
 * Overlays the Grace Music-style store update prompt on native apps.
 * The website is never blocked — only the Android/iOS shell is checked
 * against the Play / App Store version from /api/app-version.
 */
export function VersionGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ForceUpdateModal />
    </>
  );
}
