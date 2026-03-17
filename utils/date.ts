/**
 * Auto-format a raw digit string into DD/MM/YYYY as the user types.
 * Only digits are kept; slashes are inserted automatically.
 */
export function formatDobInput(raw: string, previous: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);

  let formatted = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) formatted += "/";
    formatted += digits[i];
  }

  return formatted;
}

/**
 * Parse a DD/MM/YYYY string into a Date, or return null if invalid.
 * Validates that the date actually exists (no 31 Feb, etc.).
 */
export function parseDob(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Format a Date object to ISO date string "YYYY-MM-DD" */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert an ISO date string "YYYY-MM-DD" to "DD/MM/YYYY" display format.
 */
export function isoToDobDisplay(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}
