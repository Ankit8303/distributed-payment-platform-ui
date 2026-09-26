import { describe, it, expect } from "vitest";
import {
  parseDecimalToMinor,
  minorToDecimalString,
  formatMoney,
} from "@/features/payments/utils/money-parser";

describe("Deterministic Money Input Parsing & Minor Unit Conversion", () => {
  it("converts whole integers to minor cents deterministically", () => {
    const res = parseDecimalToMinor("10");
    expect(res.error).toBeUndefined();
    expect(res.minor).toBe(1000);
    expect(res.minorBigInt).toBe(1000n);
  });

  it("pads single fractional digits to two decimal places", () => {
    const res = parseDecimalToMinor("10.5");
    expect(res.error).toBeUndefined();
    expect(res.minor).toBe(1050);
    expect(res.minorBigInt).toBe(1050n);
  });

  it("parses two decimal places accurately", () => {
    const res = parseDecimalToMinor("10.50");
    expect(res.error).toBeUndefined();
    expect(res.minor).toBe(1050);
    expect(res.minorBigInt).toBe(1050n);

    // Tests known floating point pitfall (19.99 * 100 = 1998.9999999999998 in IEEE-754)
    const floatTrap = parseDecimalToMinor("19.99");
    expect(floatTrap.error).toBeUndefined();
    expect(floatTrap.minor).toBe(1999);
    expect(floatTrap.minorBigInt).toBe(1999n);
  });

  it("rejects zero or strictly non-positive values", () => {
    const zeroRes1 = parseDecimalToMinor("0");
    expect(zeroRes1.error).toContain("strictly positive");

    const zeroRes2 = parseDecimalToMinor("0.00");
    expect(zeroRes2.error).toContain("strictly positive");
  });

  it("rejects negative numbers", () => {
    const negRes = parseDecimalToMinor("-5.00");
    expect(negRes.error).toContain("Invalid amount format");
  });

  it("rejects inputs with more than 2 decimal digits", () => {
    const excessiveRes = parseDecimalToMinor("10.555");
    expect(excessiveRes.error).toContain("Invalid amount format");
  });

  it("rejects non-numeric characters and currency symbols in raw numeric field", () => {
    expect(parseDecimalToMinor("abc").error).toContain("Invalid amount format");
    expect(parseDecimalToMinor("$10.50").error).toContain("Invalid amount format");
    expect(parseDecimalToMinor("10,50").error).toContain("Invalid amount format");
  });

  it("rejects empty or whitespace-only inputs", () => {
    expect(parseDecimalToMinor("").error).toBe("Amount is required");
    expect(parseDecimalToMinor("   ").error).toBe("Amount is required");
  });

  it("rejects values exceeding Number.MAX_SAFE_INTEGER", () => {
    // 9,007,199,254,740,992
    const hugeInput = "90071992547409.92";
    const res = parseDecimalToMinor(hugeInput);
    expect(res.error).toContain("exceeds JavaScript safe integer limit");
  });

  it("formats integer minor units back to decimal string", () => {
    expect(minorToDecimalString(1050)).toBe("10.50");
    expect(minorToDecimalString(1000)).toBe("10.00");
    expect(minorToDecimalString(9)).toBe("0.09");
    expect(minorToDecimalString(0)).toBe("0.00");
  });

  it("formats localized money display safely", () => {
    const formatted = formatMoney(1050, "USD");
    expect(formatted).toContain("10.50");
  });
});
