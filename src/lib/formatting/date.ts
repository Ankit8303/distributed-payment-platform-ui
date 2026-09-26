/**
 * Lossless, performant date formatting for presentation.
 * Invariant: Dates are timestamps from backend responses.
 * Uses cached Intl.DateTimeFormat instances to eliminate repeated heap allocations
 * during table, list, and audit rendering passes.
 */

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${locale}|${options.dateStyle ?? ""}|${options.timeStyle ?? ""}|${options.year ?? ""}|${options.month ?? ""}|${options.day ?? ""}|${options.hour ?? ""}|${options.minute ?? ""}|${options.second ?? ""}`;
  let formatter = dateTimeFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatCache.set(key, formatter);
  }
  return formatter;
}

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
}

/**
 * Formats an ISO string, timestamp, or Date instance into a localized presentation string.
 * Returns fallback placeholder for null, undefined, or invalid inputs.
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  options: FormatDateOptions = { dateStyle: "medium", timeStyle: "short" },
  fallback: string = "—"
): string {
  if (!dateInput) return fallback;
  const date = typeof dateInput === "object" && dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return fallback;
  }
  const { locale = "en-US", ...formatOptions } = options;
  return getDateTimeFormatter(locale, formatOptions).format(date);
}
