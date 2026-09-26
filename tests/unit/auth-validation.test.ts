import { describe, it, expect } from "vitest";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(12, "Password must be at least 12 characters long"),
  role: z.enum(["CUSTOMER", "MERCHANT"], {
    errorMap: () => ({ message: "Role must be either CUSTOMER or MERCHANT" }),
  }),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

describe("Authentication Form Validation", () => {
  describe("Registration Validation", () => {
    it("accepts valid customer registration payload", () => {
      const result = registerSchema.safeParse({
        email: "customer@example.com",
        password: "SuperSecretPassword123!",
        role: "CUSTOMER",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid merchant registration payload", () => {
      const result = registerSchema.safeParse({
        email: "merchant@example.com",
        password: "MerchantSecretKey456#",
        role: "MERCHANT",
      });
      expect(result.success).toBe(true);
    });

    it("rejects password shorter than 12 characters per backend contract", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "shortpass1", // 10 chars
        role: "CUSTOMER",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/12 characters/);
      }
    });

    it("rejects invalid email formats", () => {
      const result = registerSchema.safeParse({
        email: "not-an-email",
        password: "ValidPassword123456!",
        role: "CUSTOMER",
      });
      expect(result.success).toBe(false);
    });

    it("rejects forbidden roles such as ADMIN or SYSTEM", () => {
      const resultAdmin = registerSchema.safeParse({
        email: "admin@example.com",
        password: "ValidPassword123456!",
        role: "ADMIN",
      });
      expect(resultAdmin.success).toBe(false);

      const resultSystem = registerSchema.safeParse({
        email: "system@example.com",
        password: "ValidPassword123456!",
        role: "SYSTEM",
      });
      expect(resultSystem.success).toBe(false);
    });
  });

  describe("Login Validation", () => {
    it("accepts valid email and non-empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "anyPassword",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
