/** Build a Google Maps URL from an explicit link, coordinates, or place name. */
export function getMapsUrl(options: {
  mapUrl?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string | null {
  if (options.mapUrl?.trim()) return options.mapUrl.trim();

  if (
    typeof options.latitude === 'number' &&
    typeof options.longitude === 'number' &&
    Number.isFinite(options.latitude) &&
    Number.isFinite(options.longitude)
  ) {
    return `https://www.google.com/maps?q=${options.latitude},${options.longitude}`;
  }

  if (options.location?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(options.location.trim())}`;
  }

  return null;
}
