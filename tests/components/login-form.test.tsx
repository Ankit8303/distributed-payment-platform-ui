import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/features/auth/components/login-form";
import { AuthProvider } from "@/features/auth/auth-context";
import * as authApi from "@/lib/auth/auth-api";
import { ApiError } from "@/lib/api/client";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

describe("LoginForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password inputs with submit button", () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("displays client-side validation errors when submitting empty form", async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("toggles password visibility when eye button is clicked", () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const passwordInput = screen.getByLabelText(/^password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });

  it("handles INVALID_CREDENTIALS error from backend properly", async () => {
    vi.spyOn(authApi, "loginApi").mockRejectedValue(
      new ApiError({
        type: "https://api.paymentledger.com/errors/INVALID_CREDENTIALS",
        title: "Unauthorized",
        status: 401,
        detail: "Invalid email or password",
        errorCode: "INVALID_CREDENTIALS",
        timestamp: new Date().toISOString(),
      })
    );

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "WrongPassword123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});
