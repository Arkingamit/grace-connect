"use client";

import React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ProfilePhotoCropDialog } from "@/components/ui/profile-photo-crop-dialog";
import { dataUrlToJpegFile, readFileAsDataUrl } from "@/lib/profilePhoto";

interface Props {
  children: React.ReactNode;
  onUpload: (file: File) => Promise<{ success: boolean }>;
  displayName?: string;
  initials?: string;
  previewHint?: string;
}

export function AvatarUploader({
  children,
  onUpload,
  displayName = "Profile",
  initials = "?",
  previewHint,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropImageSrc, setCropImageSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCropImageSrc(dataUrl);
      setCropOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Please try another image.",
      );
    }
  };

  const handleCropSave = async (dataUrl: string) => {
    const file = dataUrlToJpegFile(dataUrl);
    const result = await onUpload(file);
    if (!result.success) {
      throw new Error("Failed to update image");
    }
    toast.success("Profile photo updated");
  };

  const trigger = React.isValidElement<{
    onClick?: React.MouseEventHandler;
  }>(children)
    ? React.cloneElement(children, {
        onClick: (event) => {
          children.props.onClick?.(event);
          if (!event.defaultPrevented) handlePick();
        },
      })
    : (
      <span onClick={handlePick} role="presentation">
        {children}
      </span>
    );

  return (
    <>
      {mounted
        ? createPortal(
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelected}
            />,
            document.body,
          )
        : null}
      {trigger}
      <ProfilePhotoCropDialog
        open={cropOpen}
        imageSrc={cropImageSrc}
        displayName={displayName}
        initials={initials}
        previewHint={previewHint}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) setCropImageSrc(null);
        }}
        onSave={handleCropSave}
      />
    </>
  );
}
