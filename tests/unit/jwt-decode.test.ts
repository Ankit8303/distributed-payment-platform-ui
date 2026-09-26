import { describe, it, expect } from "vitest";
import { decodeJwtPayload } from "@/lib/auth/jwt";

describe("decodeJwtPayload", () => {
  it("decodes valid JWT payload fields properly", () => {
    // Header: {"alg":"HS256","typ":"JWT"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
    // Payload: {"sub":"d290f1ee-6c54-4b01-90e6-d701748f0851","role":"CUSTOMER","iat":1700000000,"exp":1700000900}
    const mockToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiJkMjkwZjFlZS02YzU0LTRiMDEtOTBlNi1kNzAxNzQ4ZjA4NTEiLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDkwMH0." +
      "mockSignature";

    const decoded = decodeJwtPayload(mockToken);

    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("d290f1ee-6c54-4b01-90e6-d701748f0851");
    expect(decoded?.role).toBe("CUSTOMER");
    expect(decoded?.exp).toBe(1700000900);
    expect(decoded?.iat).toBe(1700000000);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJwtPayload("not-a-token")).toBeNull();
    expect(decodeJwtPayload("one.two")).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("returns null when required subject or role claims are missing", () => {
    // Payload missing 'sub'
    const payloadNoSub = btoa(JSON.stringify({ role: "CUSTOMER" }));
    const tokenNoSub = `header.${payloadNoSub}.sig`;
    expect(decodeJwtPayload(tokenNoSub)).toBeNull();

    // Payload missing 'role'
    const payloadNoRole = btoa(JSON.stringify({ sub: "user-123" }));
    const tokenNoRole = `header.${payloadNoRole}.sig`;
    expect(decodeJwtPayload(tokenNoRole)).toBeNull();
  });
});
