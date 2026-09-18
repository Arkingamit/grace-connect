"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCroppedProfileDataUrl } from "@/lib/profilePhoto";
import { Loader2, ZoomIn } from "lucide-react";
import { toast } from "sonner";

type ProfilePhotoCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  displayName: string;
  initials: string;
  previewHint?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (dataUrl: string) => Promise<void>;
};

export function ProfilePhotoCropDialog({
  open,
  imageSrc,
  displayName,
  initials,
  previewHint = "How your photo will look on Profile",
  onOpenChange,
  onSave,
}: ProfilePhotoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  useEffect(() => {
    if (!open || !imageSrc || !croppedAreaPixels) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPreviewing(true);
      try {
        const url = await getCroppedProfileDataUrl(imageSrc, croppedAreaPixels, {
          outputSize: 256,
          quality: 0.85,
          maxBytes: 400_000,
        });
        if (!cancelled) setPreviewUrl(url);
      } catch {
        // keep previous preview
      } finally {
        if (!cancelled) setIsPreviewing(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, imageSrc, croppedAreaPixels]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setPreviewUrl(null);
    }
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const dataUrl = await getCroppedProfileDataUrl(imageSrc, croppedAreaPixels);
      await onSave(dataUrl);
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save photo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="z-[70]"
        className="z-[70] max-w-lg border-[#E5D5C5] bg-white text-[#1A202C] sm:rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-[#1A202C]">Adjust profile photo</DialogTitle>
          <DialogDescription>
            Drag to reposition, zoom to frame your face, then check the preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="relative h-72 w-full overflow-hidden rounded-xl bg-[#F3EAE1]">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </div>

          <div className="flex items-center gap-3 px-1">
            <ZoomIn className="h-4 w-4 shrink-0 text-[#7A6150]" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
              className="flex-1"
              aria-label="Zoom"
            />
          </div>

          <div className="rounded-xl border border-[#E5D5C5] bg-[#FAF7F2] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#7A6150]">
              Profile preview
            </p>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-white shadow-md">
                  <AvatarImage src={previewUrl || ""} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-[#8B2323]/10 text-3xl font-bold text-[#8B2323]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isPreviewing ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-lg font-bold text-[#1A202C]">{displayName}</p>
                <p className="text-sm text-[#7A6150]">{previewHint}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[#8B2323] text-white hover:bg-[#721515]"
            onClick={handleSave}
            disabled={isSaving || !croppedAreaPixels}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
