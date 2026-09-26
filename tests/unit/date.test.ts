import { describe, it, expect } from "vitest";
import { formatDateTime } from "@/lib/formatting/date";

describe("formatDateTime", () => {
  it("formats ISO date string into readable format", () => {
    const formatted = formatDateTime("2026-03-15T14:30:00Z", {
      dateStyle: "medium",
      timeStyle: "short",
      locale: "en-US",
    });
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("returns fallback for null or undefined input", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined, undefined, "N/A")).toBe("N/A");
  });

  it("returns fallback for invalid date strings", () => {
    expect(formatDateTime("not-a-valid-date")).toBe("—");
  });

  it("handles Date objects and numeric timestamps", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(formatDateTime(d)).toBeDefined();
    expect(formatDateTime(d.getTime())).toBeDefined();
  });
});
