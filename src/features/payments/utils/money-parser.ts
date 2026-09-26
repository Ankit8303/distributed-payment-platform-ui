/**
 * Deterministic Financial Money Parser & Formatter
 *
 * Invariant: Never uses floating-point multiplication (Number * 100), Math.pow(),
 * or parseFloat() for financial conversion. All parsing is deterministic string
 * and BigInt arithmetic.
 */

export interface MoneyParseResult {
  minor: number;
  minorBigInt: bigint;
  error?: string;
}

/**
 * Parses user decimal input string into integer minor units (e.g., "10.50" -> 1050).
 * Precision is strictly fixed to 2 decimal places for Phase F3.
 */
export function parseDecimalToMinor(
  input: string,
  currencyPrecision = 2
): MoneyParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { minor: 0, minorBigInt: 0n, error: "Amount is required" };
  }

  // Strict regex: 1+ digits, optional decimal point with up to currencyPrecision digits
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return {
      minor: 0,
      minorBigInt: 0n,
      error: "Invalid amount format. Use e.g. 10.50",
    };
  }

  const [wholePart, fracPart] = trimmed.split(".");
  const wholeStr = wholePart ?? "0";
  const fracStr = fracPart ?? "";

  // Pad fractional string to exact currency precision (e.g. "5" -> "50", "" -> "00")
  const paddedFrac = fracStr.padEnd(currencyPrecision, "0").slice(0, currencyPrecision);

  const wholeBigInt = BigInt(wholeStr);
  const fracBigInt = BigInt(paddedFrac || "0");
  const multiplier = 10n ** BigInt(currencyPrecision);

  const minorBigInt = wholeBigInt * multiplier + fracBigInt;

  // Validation 1: Strictly positive (backend @Min(1))
  if (minorBigInt < 1n) {
    return {
      minor: 0,
      minorBigInt: 0n,
      error: "Amount must be strictly positive (at least 0.01)",
    };
  }

  // Validation 2: Safe JavaScript representability (Number.MAX_SAFE_INTEGER is 9,007,199,254,740,991)
  if (minorBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    return {
      minor: 0,
      minorBigInt: 0n,
      error: "Amount exceeds JavaScript safe integer limit",
    };
  }

  return {
    minor: Number(minorBigInt),
    minorBigInt,
  };
}

/**
 * Formats integer minor units back to decimal string with 2 decimal places.
 * e.g., 1050 -> "10.50"
 */
export function minorToDecimalString(
  minorUnits: number | bigint,
  currencyPrecision = 2
): string {
  const minorBigInt = BigInt(minorUnits);
  const isNegative = minorBigInt < 0n;
  const absMinor = isNegative ? -minorBigInt : minorBigInt;
  const divisor = 10n ** BigInt(currencyPrecision);

  const whole = absMinor / divisor;
  const frac = absMinor % divisor;
  const paddedFrac = frac.toString().padStart(currencyPrecision, "0");

  const sign = isNegative ? "-" : "";
  return `${sign}${whole.toString()}.${paddedFrac}`;
}

/**
 * Formats minor units with currency code for accessible, user-friendly presentation.
 * e.g., formatMoney(1050, "USD") -> "$10.50 USD"
 */
export function formatMoney(
  minorUnits: number | bigint,
  currency = "USD"
): string {
  const decimalStr = minorToDecimalString(minorUnits);
  const upperCurrency = currency.toUpperCase();

  try {
    const numericVal = Number(decimalStr);
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: upperCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericVal);
    return formatted;
  } catch {
    // Fallback if currency code is unusual
    return `${decimalStr} ${upperCurrency}`;
  }
}
