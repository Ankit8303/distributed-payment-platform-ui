import { describe, it, expect } from "vitest";
import { formatMinorUnits, getCurrencyDecimals } from "@/lib/formatting/money";

describe("formatMinorUnits", () => {
  it("formats USD cents to standard currency string", () => {
    const formatted = formatMinorUnits(5000, "USD", { locale: "en-US" });
    // Normalize non-breaking spaces if any
    expect(formatted.replace(/\u00a0/g, " ")).toBe("$50.00");
  });

  it("formats zero amount properly", () => {
    const formatted = formatMinorUnits(0, "USD", { locale: "en-US" });
    expect(formatted.replace(/\u00a0/g, " ")).toBe("$0.00");
  });

  it("handles negative amounts for reversals or debits", () => {
    const formatted = formatMinorUnits(-2550, "USD", { locale: "en-US" });
    expect(formatted.replace(/\u00a0/g, " ")).toBe("-$25.50");
  });

  it("formats zero-decimal currencies without decimal places", () => {
    expect(getCurrencyDecimals("JPY")).toBe(0);
    const formatted = formatMinorUnits(1500, "JPY", { locale: "en-US" });
    expect(formatted.replace(/\u00a0/g, " ")).toBe("¥1,500");
  });

  it("formats three-decimal currencies properly", () => {
    expect(getCurrencyDecimals("KWD")).toBe(3);
    const formatted = formatMinorUnits(12345, "KWD", { locale: "en-US" });
    expect(formatted.replace(/\u00a0/g, " ")).toBe("KWD 12.345");
  });

  it("respects showCurrency: false for decimal representation", () => {
    const formatted = formatMinorUnits(9999, "USD", { locale: "en-US", showCurrency: false });
    expect(formatted).toBe("99.99");
  });
});
