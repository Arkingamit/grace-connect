"use client";

import React from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
  onUpload: (file: File) => Promise<{ success: boolean }>;
  aspect?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function AvatarUploader({
  children,
  onUpload,
  aspect = 1,
  maxSizeMB = 20,
  acceptedTypes = ["jpeg", "jpg", "png", "webp"],
}: Props) {
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState<number>(1);
  const [isPending, setIsPending] = React.useState(false);
  const [photo, setPhoto] = React.useState<{ url: string; file: File | null }>({
    url: "",
    file: null,
  });
  const [croppedAreaPixels, setCroppedAreaPixels] =
    React.useState<Area | null>(null);
  const [open, onOpenChange] = React.useState(false);

  const resetPhoto = () => {
    if (photo.url) URL.revokeObjectURL(photo.url);
    setPhoto({ url: "", file: null });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetPhoto();
    onOpenChange(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imgExt = file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase();
    if (!acceptedTypes.includes(imgExt)) {
      toast.error("Selected file is not a supported image type");
      return;
    }
    if (file.size / (1024 * 1024) >= maxSizeMB) {
      toast.error(`Image must be under ${maxSizeMB}MB`);
      return;
    }

    if (photo.url) URL.revokeObjectURL(photo.url);
    setPhoto({ url: URL.createObjectURL(file), file });
  };

  const handleCropComplete = (_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  };

  const handleUpdate = async () => {
    if (!photo?.file || !croppedAreaPixels) {
      toast.error("No image selected for upload");
      return;
    }

    setIsPending(true);
    try {
      const croppedImg = await getCroppedImg(photo.url, croppedAreaPixels);
      if (!croppedImg?.file) {
        throw new Error("Failed to crop image");
      }

      const file = new File(
        [croppedImg.file],
        photo.file.name ?? "cropped.jpeg",
        { type: photo.file.type || "image/jpeg" },
      );

      const result = await onUpload(file);
      if (result.success) {
        toast.success("Profile photo updated");
        resetPhoto();
        onOpenChange(false);
      } else {
        toast.error("Failed to update image");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update image",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      drawerProps={{
        dismissible: !photo?.file,
      }}
    >
      <ModalTrigger asChild>{children}</ModalTrigger>
      <ModalContent className="h-max md:max-w-md">
        <ModalHeader>
          <ModalTitle>Upload Image</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            disabled={isPending}
            onChange={handleFileChange}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-[#F3EAE1] file:px-3 file:py-1 file:text-sm file:font-medium file:text-[#8B2323]"
          />
          {photo?.file && (
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F3EAE1]">
              <Cropper
                image={photo.url}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                classes={{
                  containerClassName: isPending
                    ? "opacity-80 pointer-events-none"
                    : "",
                }}
              />
            </div>
          )}
          {photo?.file && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#7A6150]">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                disabled={isPending}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#8B2323]"
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter className="grid w-full grid-cols-2 gap-2">
          <Button
            className="w-full rounded-xl"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="w-full rounded-xl bg-[#8B2323] hover:bg-[#721515]"
            type="button"
            onClick={handleUpdate}
            disabled={isPending || !photo.file}
          >
            {isPending ? "Uploading..." : "Update"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

type Flip = {
  horizontal: boolean;
  vertical: boolean;
};

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip: Flip = { horizontal: false, vertical: false },
): Promise<{ url: string; file: Blob | null } | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create 2D context");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  );

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (!file) {
        reject(new Error("Failed to generate cropped image blob"));
        return;
      }
      resolve({
        url: URL.createObjectURL(file),
        file,
      });
    }, "image/jpeg");
  });
}
