import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import * as authContext from "@/features/auth/auth-context";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/protected-target",
}));

describe("ProtectedRoute Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading indicator when auth status is loading", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: null,
      status: "loading",
      accessToken: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/verifying session authority/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to login when user is unauthenticated", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: null,
      status: "unauthenticated",
      accessToken: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith("/login?redirect=%2Fprotected-target");
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when user is authenticated", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "123", email: "user@example.com", role: "CUSTOMER" },
      status: "authenticated",
      accessToken: "mock-jwt",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("displays access restricted alert when role does not match required role", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "123", email: "user@example.com", role: "CUSTOMER" },
      status: "authenticated",
      accessToken: "mock-jwt",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <ProtectedRoute requiredRole="MERCHANT">
        <div>Merchant Only Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText("Merchant Only Content")).not.toBeInTheDocument();
  });
});
