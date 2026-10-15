/** YYYY-MM-DD for `<input type="date" max="...">` — local today. */
export function getMaxBirthdayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True if date string is after today (local calendar day). */
export function isFutureBirthday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [y, m, d] = parts;
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  birth.setHours(0, 0, 0, 0);
  return birth.getTime() > today.getTime();
}

/**
 * Format any valid date representation (ISO string, Date object, timestamp, or YYYY-MM-DD)
 * into standard DD/MM/YYYY format.
 */
export function formatDDMMYYYY(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        return `${d}/${m}/${y}`;
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput || '');
  }
}

/**
 * Format any valid date representation into "Date Month, Time" (e.g. "30 Jun, 2:30 PM").
 * Supports optional explicit time string (e.g. "16:32" or "04:32 PM").
 */
export function formatDateMonthTime(
  dateInput?: string | number | Date | null,
  timeInput?: string | null
): string {
  if (!dateInput) return '';
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // If dateInput is YYYY-MM-DD
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const parts = dateInput.split('-').map(Number);
      const day = parts[2];
      const month = months[parts[1] - 1];

      if (timeInput) {
        const timeMatch = String(timeInput).match(/^(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2];
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
        }
        return `${day} ${month}, ${timeInput}`;
      }
      return `${day} ${month}`;
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = d.getDate();
    const month = months[d.getMonth()];

    let hours: number;
    let minutes: string;

    if (timeInput) {
      const timeMatch = String(timeInput).match(/^(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = timeMatch[2];
      } else {
        hours = d.getHours();
        minutes = String(d.getMinutes()).padStart(2, '0');
      }
    } else {
      hours = d.getHours();
      minutes = String(d.getMinutes()).padStart(2, '0');
    }

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return String(dateInput || '');
  }
}


