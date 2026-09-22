import { Capacitor } from '@capacitor/core';

export type MapsOptions = {
  mapUrl?: string | null;
  location?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function toCoord(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseCoordsFromMapUrl(url: string): { lat: number; lng: number } | null {
  try {
    const decoded = decodeURIComponent(url);
    const at = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (at) return { lat: Number(at[1]), lng: Number(at[2]) };

    const parsed = new URL(url);
    for (const key of ['q', 'query', 'll', 'center', 'daddr', 'destination']) {
      const raw = parsed.searchParams.get(key);
      if (!raw) continue;
      const match = raw.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    }
  } catch {
    // ignore malformed URLs
  }
  return null;
}

function resolvePoint(options: MapsOptions): { lat: number; lng: number } | null {
  const lat = toCoord(options.latitude);
  const lng = toCoord(options.longitude);
  if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }
  if (options.mapUrl?.trim()) return parseCoordsFromMapUrl(options.mapUrl.trim());
  return null;
}

/** Platform-native Maps URL: Apple Maps on iOS, geo: on Android, Google Maps on web. */
export function getMapsUrl(options: MapsOptions): string | null {
  const label = options.location?.trim() || '';
  const point = resolvePoint(options);
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') {
    if (point) {
      const q = encodeURIComponent(label || `${point.lat},${point.lng}`);
      return `maps://?ll=${point.lat},${point.lng}&q=${q}`;
    }
    if (label) return `maps://?q=${encodeURIComponent(label)}`;
    if (options.mapUrl?.trim()) return options.mapUrl.trim();
    return null;
  }

  if (platform === 'android') {
    if (point) {
      const q = encodeURIComponent(label || `${point.lat},${point.lng}`);
      return `geo:${point.lat},${point.lng}?q=${point.lat},${point.lng}(${q})`;
    }
    if (label) return `geo:0,0?q=${encodeURIComponent(label)}`;
    if (options.mapUrl?.trim()) return options.mapUrl.trim();
    return null;
  }

  if (options.mapUrl?.trim()) return options.mapUrl.trim();
  if (point) return `https://www.google.com/maps?q=${point.lat},${point.lng}`;
  if (label) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
  return null;
}

export async function openMaps(options: MapsOptions): Promise<void> {
  const url = getMapsUrl(options);
  if (!url) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const popup = window.open(url, '_blank');
      if (!popup) window.location.href = url;
    } catch {
      window.location.href = url;
    }
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export function onOpenMaps(options: MapsOptions) {
  return (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    void openMaps(options);
  };
}
