/** Helpers for profile photo crop + compress. */

export type CropAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Hard cap for the saved profile photo (binary JPEG size). */
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

/** Allow larger camera/gallery originals; we compress on save. */
const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024;

const JPEG_PREFIX = "data:image/jpeg;base64,";

/** Approximate decoded byte size of a data URL. */
export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Please choose an image file"));
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    return Promise.reject(new Error("Image is too large (max 25MB). Pick a smaller photo."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image"));
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToJpegFile(dataUrl: string, filename = "profile.jpg"): File {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load image")));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

function drawCroppedSquare(
  image: HTMLImageElement,
  crop: CropAreaPixels,
  outputSize: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize,
  );
  return canvas;
}

/**
 * Crop to a square JPEG and compress until under `maxBytes` (default 5MB).
 * Reduces quality first, then output resolution if needed.
 */
export async function getCroppedProfileDataUrl(
  imageSrc: string,
  crop: CropAreaPixels,
  options?: {
    /** Starting edge length (default 1024). Preview can pass a smaller size. */
    outputSize?: number;
    /** Starting JPEG quality 0–1 (default 0.9). */
    quality?: number;
    /** Max binary size after compress (default 5MB). */
    maxBytes?: number;
  },
): Promise<string> {
  const maxBytes = options?.maxBytes ?? MAX_PROFILE_PHOTO_BYTES;
  let size = options?.outputSize ?? 1024;
  let quality = options?.quality ?? 0.9;

  const image = await loadImage(imageSrc);
  let canvas = drawCroppedSquare(image, crop, size);
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (dataUrlByteLength(dataUrl) > maxBytes && quality > 0.45) {
    quality = Math.max(0.45, quality - 0.1);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  while (dataUrlByteLength(dataUrl) > maxBytes && size > 256) {
    size = Math.max(256, Math.floor(size * 0.75));
    quality = Math.min(quality, 0.82);
    canvas = drawCroppedSquare(image, crop, size);
    dataUrl = canvas.toDataURL("image/jpeg", quality);

    while (dataUrlByteLength(dataUrl) > maxBytes && quality > 0.4) {
      quality = Math.max(0.4, quality - 0.08);
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
  }

  if (dataUrlByteLength(dataUrl) > maxBytes) {
    throw new Error("Could not compress photo below 5MB. Try another image.");
  }

  if (!dataUrl.startsWith(JPEG_PREFIX) && dataUrl.startsWith("data:image/")) {
    // already fine
  }

  return dataUrl;
}
