"use client";

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

function isGranted(status: string | undefined) {
  return status === "granted" || status === "limited";
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export async function ensureHtml5QrcodeLoaded() {
  if (typeof window === "undefined") return;
  if (window.Html5Qrcode) return;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load QR scanner library"));
    document.head.appendChild(script);
  });
}

export async function pickImageFromGallery(): Promise<File | null> {
  if (Capacitor.isNativePlatform()) {
    const current = await Camera.checkPermissions();
    if (current.photos === "denied") {
      throw new Error("photos-denied");
    }
    if (!isGranted(current.photos)) {
      const next = await Camera.requestPermissions({ permissions: ["photos"] });
      if (!isGranted(next.photos)) {
        throw new Error("photos-denied");
      }
    }

    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.DataUrl,
        quality: 90,
      });
      if (!photo.dataUrl) return null;
      return dataUrlToFile(photo.dataUrl, "qr-code.jpg");
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

export async function decodeQrFromFile(file: File): Promise<string> {
  await ensureHtml5QrcodeLoaded();
  const id = "grace-qr-file-reader";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("aria-hidden", "true");
    el.style.cssText =
      "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;";
    document.body.appendChild(el);
  }

  const scanner = new window.Html5Qrcode(id);
  try {
    const text = await scanner.scanFile(file, false);
    return String(text || "").trim();
  } finally {
    try {
      await scanner.clear();
    } catch {
      // ignore
    }
  }
}

export type GalleryQrFailureReason = "cancelled" | "photos-denied" | "not-found";

export type GalleryQrResult = {
  ok: boolean;
  text?: string;
  reason?: GalleryQrFailureReason;
};

export async function pickAndDecodeQr(): Promise<GalleryQrResult> {
  try {
    const file = await pickImageFromGallery();
    if (!file) return { ok: false, reason: "cancelled" };
    const text = await decodeQrFromFile(file);
    if (!text) return { ok: false, reason: "not-found" };
    return { ok: true, text };
  } catch (err) {
    if (err instanceof Error && err.message === "photos-denied") {
      return { ok: false, reason: "photos-denied" };
    }
    return { ok: false, reason: "not-found" };
  }
}
