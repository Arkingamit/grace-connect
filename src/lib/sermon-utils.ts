export function splitPastorNames(value: string): string[] {
  return String(value || '')
    .split(/[,;&/]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function sermonHasPastor(pastorField: string | undefined, selected: string): boolean {
  if (!selected || selected === 'All') return true;
  return splitPastorNames(pastorField || '').some(
    (name) => name.toLowerCase() === selected.toLowerCase(),
  );
}

export function uniquePastorNames(pastorFields: Array<string | undefined>): string[] {
  const seen = new Map<string, string>();
  for (const field of pastorFields) {
    for (const name of splitPastorNames(field || '')) {
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export function sermonWatchHref(sermon: { id?: string; seriesId?: string | null }) {
  if (sermon.seriesId) return `/sermons/series/${sermon.seriesId}`;
  return sermon.id ? `/sermons?sermon=${encodeURIComponent(sermon.id)}` : '/sermons';
}
