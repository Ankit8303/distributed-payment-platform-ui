/**
 * Phase F8-A — Open Redirect Sanitizer
 *
 * Validates that a redirect target string is strictly an internal, same-origin path.
 * Rejects external origins, protocol-relative URLs, backslashes, dangerous URI schemes,
 * control characters, and percent-encoded evasion vectors.
 *
 * @param target - The untrusted redirect target from query parameters or user input
 * @returns A safe, internal redirect path (defaults to "/" if invalid or external)
 */
export function getSafeRedirectUrl(target: string | null | undefined): string {
  if (!target || typeof target !== "string") {
    return "/";
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return "/";
  }

  // 1. Must start with exactly one "/"
  // Reject non-leading slash, protocol-relative ("//"), and backslash variants ("/\\")
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/";
  }

  // 2. Reject any backslashes in raw form (avoids browser parsing inconsistencies)
  if (trimmed.includes("\\")) {
    return "/";
  }

  // 3. Reject any control characters or CR/LF to prevent header splitting
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return "/";
  }

  // 4. Test percent-decoded forms to prevent encoded bypasses (e.g. %2F%2F, %5C)
  try {
    let decoded = trimmed;
    // Decode up to twice to catch double-encoding (e.g. %252F -> %2F -> /)
    for (let i = 0; i < 2; i++) {
      if (decoded.includes("%")) {
        decoded = decodeURIComponent(decoded);
      }
    }

    // After decoding, must still be a single-slash internal path without backslashes
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.startsWith("/\\") ||
      decoded.includes("\\")
    ) {
      return "/";
    }
  } catch {
    // Malformed percent-encoding
    return "/";
  }

  // 5. Parse with dummy origin using standard URL constructor to verify no scheme or host is introduced
  try {
    const dummyOrigin = "http://localhost";
    const parsed = new URL(trimmed, dummyOrigin);

    // Origin must match dummy origin strictly
    if (parsed.origin !== dummyOrigin) {
      return "/";
    }

    // Pathname must start with single '/' and not '//'
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return "/";
    }

    // Reject userinfo (@)
    if (parsed.username || parsed.password) {
      return "/";
    }

    // Reject if protocol is anything other than http:
    if (parsed.protocol !== "http:") {
      return "/";
    }
  } catch {
    return "/";
  }

  return trimmed;
}
