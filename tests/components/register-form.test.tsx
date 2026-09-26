import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "@/features/auth/components/register-form";
import { AuthProvider } from "@/features/auth/auth-context";
import * as authApi from "@/lib/auth/auth-api";
import { ApiError } from "@/lib/api/client";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("RegisterForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email, password (with min 12 hint), role selector, and submit button", () => {
    render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account role/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("enforces 12-character minimum password constraint", async () => {
    render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "shortpass1" }, // 10 chars
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    });
  });

  it("displays EMAIL_ALREADY_EXISTS error from backend properly", async () => {
    vi.spyOn(authApi, "registerApi").mockRejectedValue(
      new ApiError({
        type: "https://api.paymentledger.com/errors/EMAIL_ALREADY_EXISTS",
        title: "Conflict",
        status: 409,
        detail: "An account with this email already exists",
        errorCode: "EMAIL_ALREADY_EXISTS",
        timestamp: new Date().toISOString(),
      })
    );

    render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "ValidPassword123456!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });
});
