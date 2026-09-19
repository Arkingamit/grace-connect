"use client";

import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

function isGranted(status: string | undefined) {
  return status === "granted" || status === "limited";
}

/** Ask for camera only if the OS has not already granted it. */
export async function ensureCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const current = await Camera.checkPermissions();
    if (isGranted(current.camera)) return true;
    if (current.camera === "denied") return false;
    const next = await Camera.requestPermissions({ permissions: ["camera"] });
    return isGranted(next.camera);
  } catch (err) {
    console.warn("Camera permission check failed", err);
    return false;
  }
}
