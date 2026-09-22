"use client";

import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
import { Button } from "@/components/ui/button";
import { pickAndDecodeQr } from "@/lib/qr-from-gallery";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type QrGalleryButtonProps = {
  onDecoded: (text: string) => void;
  disabled?: boolean;
  beforePick?: () => Promise<void> | void;
  variant?: "dark" | "light";
  className?: string;
};

async function applyGalleryResult(
  result: { ok: true; text: string } | { ok: false; reason: string },
  onDecoded: (text: string) => void,
) {
  if (result.ok) {
    onDecoded(result.text);
    return;
  }
  if (result.reason === "cancelled") return;
  if (result.reason === "photos-denied") {
    toast.error("Allow photo access in Settings to upload a QR code.");
    if (Capacitor.isNativePlatform()) {
      try {
        if (Capacitor.getPlatform() === "ios") {
          await NativeSettings.openIOS({ option: IOSSettings.App });
        } else {
          await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
        }
      } catch {
        // ignore
      }
    }
    return;
  }
  toast.error("No QR code found in that photo. Try a clearer image.");
}

export function QrGalleryButton({
  onDecoded,
  disabled,
  beforePick,
  variant = "dark",
  className,
}: QrGalleryButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await beforePick?.();
      const result = await pickAndDecodeQr();
      await applyGalleryResult(result, onDecoded);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || busy}
      onClick={() => void handleClick()}
      className={cn(
        variant === "dark"
          ? "border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          : "border-[#E5D5C5] bg-white text-[#8B2323] hover:bg-[#F3EAE1]",
        className,
      )}
    >
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
      {busy ? "Reading photo…" : "Upload from gallery"}
    </Button>
  );
}
