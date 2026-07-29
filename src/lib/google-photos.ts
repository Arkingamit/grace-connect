/**
 * Fetch public photo URLs from a Google Photos shared album link.
 * Used for gallery previews and for persisting album cover images.
 */

const GOOGLE_PHOTOS_HOSTS = ['photos.app.goo.gl', 'photos.google.com'];

export function normalizeGooglePhotosUrl(albumUrl: string): string | null {
  if (!albumUrl || albumUrl.trim() === '') return null;

  const isValid = GOOGLE_PHOTOS_HOSTS.some((host) => albumUrl.includes(host));
  if (!isValid) return null;

  // Detect double-URL concatenation (e.g. "...keyValuehttps://photos...")
  const secondHttpsIndex = albumUrl.indexOf('https://', 10);
  if (secondHttpsIndex !== -1) {
    return albumUrl.substring(0, secondHttpsIndex);
  }

  return albumUrl;
}

export async function fetchGooglePhotosAlbum(
  albumUrl: string,
  options?: { limit?: number; timeoutMs?: number }
): Promise<{ photos: { id: number; src: string; title: string; category: string }[]; coverImage: string | null }> {
  const normalized = normalizeGooglePhotosUrl(albumUrl);
  if (!normalized) {
    throw new Error('URL must be a Google Photos album link');
  }

  const limit = options?.limit ?? 20;
  const timeoutMs = options?.timeoutMs ?? 10000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(normalized, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch album from Google Photos: ${response.statusText}`);
    }

    const html = await response.text();
    const imgRegex = /"(https:\/\/lh3\.googleusercontent\.com\/pw\/[^"]+)"/g;
    const matches = Array.from(html.matchAll(imgRegex));
    const uniqueUrls = Array.from(new Set(matches.map((m) => m[1])));
    const photoUrls = uniqueUrls.filter((url) => url.length > 50 && !url.includes('proxy'));

    if (photoUrls.length === 0) {
      return { photos: [], coverImage: null };
    }

    const limited = photoUrls.slice(0, limit);
    const photos = limited.map((url, index) => ({
      id: index + 100,
      src: url,
      title: `Gallery Image ${index + 1}`,
      category: 'All',
    }));

    return { photos, coverImage: photos[0]?.src ?? null };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Fetch only the first photo URL to use as a persisted cover image. */
export async function fetchGooglePhotosCover(albumUrl: string): Promise<string | null> {
  const { coverImage } = await fetchGooglePhotosAlbum(albumUrl, { limit: 1 });
  return coverImage;
}
