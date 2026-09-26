import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { AuthProvider } from "@/features/auth/auth-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

describe("Authentication Accessibility Verification", () => {
  it("LoginForm contains proper form labels and accessible landmarks", () => {
    const { container } = render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    // Every input must have an associated label
    const inputs = container.querySelectorAll("input");
    inputs.forEach((input) => {
      const id = input.getAttribute("id");
      expect(id).not.toBeNull();
      const label = container.querySelector(`label[for="${id}"]`);
      expect(label).not.toBeNull();
    });

    // Form button has accessible name
    const button = container.querySelector("button[type='submit']");
    expect(button).toHaveTextContent(/sign in/i);
  });

  it("RegisterForm contains proper form labels and accessible landmarks", () => {
    const { container } = render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    );

    const inputs = container.querySelectorAll("input, select");
    inputs.forEach((input) => {
      const id = input.getAttribute("id");
      expect(id).not.toBeNull();
      const label = container.querySelector(`label[for="${id}"]`);
      expect(label).not.toBeNull();
    });

    const button = container.querySelector("button[type='submit']");
    expect(button).toHaveTextContent(/create account/i);
  });
});
