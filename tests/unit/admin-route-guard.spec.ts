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
  usePathname: () => "/admin/dashboard",
}));

describe("Admin Route Guard (F7-A Security Boundary)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Accepts ROLE_ADMIN for administrative views", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-admin-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      React.createElement(
        ProtectedRoute,
        { allowedRoles: ["ADMIN", "SYSTEM"] },
        React.createElement("div", { "data-testid": "admin-content" }, "Admin Dashboard Shell")
      )
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.queryByTestId("access-restricted-alert")).not.toBeInTheDocument();
  });

  it("2. Accepts ROLE_SYSTEM for administrative views", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "system-1", email: "worker@platform.local", role: "SYSTEM" },
      status: "authenticated",
      accessToken: "mock-system-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      React.createElement(
        ProtectedRoute,
        { allowedRoles: ["ADMIN", "SYSTEM"] },
        React.createElement("div", { "data-testid": "admin-content" }, "Admin Operations Engine")
      )
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.queryByTestId("access-restricted-alert")).not.toBeInTheDocument();
  });

  it("3. Rejects ROLE_CUSTOMER from administrative views with Access Restricted alert", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "cust-1", email: "cust@platform.local", role: "CUSTOMER" },
      status: "authenticated",
      accessToken: "mock-customer-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      React.createElement(
        ProtectedRoute,
        { allowedRoles: ["ADMIN", "SYSTEM"] },
        React.createElement("div", { "data-testid": "admin-content" }, "Admin Sensitive View")
      )
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.getByText("CUSTOMER")).toBeInTheDocument();
  });

  it("4. Rejects ROLE_MERCHANT from administrative views with Access Restricted alert", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "merch-1", email: "merch@platform.local", role: "MERCHANT" },
      status: "authenticated",
      accessToken: "mock-merchant-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      React.createElement(
        ProtectedRoute,
        { allowedRoles: ["ADMIN", "SYSTEM"] },
        React.createElement("div", { "data-testid": "admin-content" }, "Admin Sensitive View")
      )
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.getByText("MERCHANT")).toBeInTheDocument();
  });

  it("5. Redirects unauthenticated users to /login with redirect URL", () => {
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
      React.createElement(
        ProtectedRoute,
        { allowedRoles: ["ADMIN", "SYSTEM"] },
        React.createElement("div", { "data-testid": "admin-content" }, "Admin Content")
      )
    );

    expect(mockPush).toHaveBeenCalledWith("/login?redirect=%2Fadmin%2Fdashboard");
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("6. Preserves backward compatibility for existing requiredRole prop", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "cust-1", email: "cust@platform.local", role: "CUSTOMER" },
      status: "authenticated",
      accessToken: "mock-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    // Customer viewing customer route
    render(
      React.createElement(
        ProtectedRoute,
        { requiredRole: "CUSTOMER" },
        React.createElement("div", { "data-testid": "customer-content" }, "Customer Portal")
      )
    );

    expect(screen.getByTestId("customer-content")).toBeInTheDocument();
  });

  it("7. Supports multi-role configurations via allowedRoles array", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "user-1", email: "user@platform.local", role: "MERCHANT" },
      status: "authenticated",
      accessToken: "mock-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      React.createElement(
        ProtectedRoute,
        { allowedRoles: ["MERCHANT", "ADMIN"] },
        React.createElement("div", { "data-testid": "multi-role-content" }, "Shared Merchant & Admin Content")
      )
    );

    expect(screen.getByTestId("multi-role-content")).toBeInTheDocument();
  });

  it("8. Does not break existing customer routes when no role restriction is passed", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "cust-1", email: "cust@platform.local", role: "CUSTOMER" },
      status: "authenticated",
      accessToken: "mock-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      React.createElement(
        ProtectedRoute,
        {},
        React.createElement("div", { "data-testid": "generic-content" }, "Any Authenticated User")
      )
    );

    expect(screen.getByTestId("generic-content")).toBeInTheDocument();
  });

  it("9. Admin API Request Isolation: Ensures unauthorized CUSTOMER/MERCHANT never triggers admin data requests", () => {
    const adminDataApiMock = vi.fn();

    // Component that simulates an admin page attempting data fetch upon mounting
    const MockAdminPage = () => {
      React.useEffect(() => {
        adminDataApiMock("/api/v1/admin/dashboard/summary");
      }, []);
      return React.createElement("div", null, "Admin Page Executed");
    };

    // User is CUSTOMER
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "cust-1", email: "cust@platform.local", role: "CUSTOMER" },
      status: "authenticated",
      accessToken: "mock-customer-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      React.createElement(
        ProtectedRoute,
        { allowedRoles: ["ADMIN", "SYSTEM"] },
        React.createElement(MockAdminPage)
      )
    );

    // ProtectedRoute halts rendering before MockAdminPage mounts
    expect(adminDataApiMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Admin Page Executed")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
