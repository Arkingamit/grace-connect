/** Local profile photo storage (data URLs from AvatarUploader). */

export function avatarStorageKey(memberId: string) {
  return `grace_avatar_${memberId}`;
}

export function getStoredAvatar(memberId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(avatarStorageKey(memberId));
  } catch {
    return null;
  }
}

export function setStoredAvatar(memberId: string, dataUrl: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(avatarStorageKey(memberId), dataUrl);
}

export function clearStoredAvatar(memberId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(avatarStorageKey(memberId));
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
