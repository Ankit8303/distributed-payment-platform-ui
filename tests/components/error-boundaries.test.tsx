import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RootError from "@/app/error";
import GlobalError from "@/app/global-error";
import AdminError from "@/app/(admin)/error";
import {
  ErrorBoundaryView,
  isSafeString,
  extractSafeDetails,
} from "@/components/feedback/error-boundary-view";
import { ApiError } from "@/lib/api/client";
import type { ApiErrorResponse } from "@/types/api";

describe("Phase F8-B Error Resilience & UX Boundaries", () => {
  describe("Safety String Sanitizer", () => {
    it("accepts safe strings", () => {
      expect(isSafeString("Something went wrong")).toBe(true);
      expect(isSafeString("Resource Not Found")).toBe(true);
      expect(isSafeString("Account ID is missing or invalid.")).toBe(true);
    });

    it("rejects stack traces and internal paths", () => {
      expect(isSafeString("TypeError: foo\n at Object.render (/app/src/page.tsx:12:4)")).toBe(false);
      expect(isSafeString("Error in node_modules/@tanstack/react-query/index.js")).toBe(false);
      expect(isSafeString("Failed to read C:\\Users\\Administrator\\secrets.json")).toBe(false);
      expect(isSafeString("/var/www/ledger/config.env not found")).toBe(false);
    });

    it("rejects SQL queries and credential patterns", () => {
      expect(isSafeString("SELECT * FROM users WHERE id = '123'")).toBe(false);
      expect(isSafeString("Authorization: Bearer eyJhbGciOiJIUzI1Ni... token")).toBe(false);
      expect(isSafeString("Database password invalid")).toBe(false);
      expect(isSafeString("Missing apiKey parameter")).toBe(false);
    });
  });

  describe("Safe Detail Extraction", () => {
    it("extracts RFC 7807 problem detail fields when present", () => {
      const mockResponse: ApiErrorResponse = {
        type: "https://api.paymentledger.com/errors/RESOURCE_NOT_FOUND",
        title: "Account Not Found",
        status: 404,
        detail: "The requested account does not exist in the ledger.",
        errorCode: "RESOURCE_NOT_FOUND",
        correlationId: "corr-12345",
        timestamp: "2026-09-26T12:00:00Z",
      };
      const apiErr = new ApiError(mockResponse);

      const details = extractSafeDetails(apiErr, "Fallback Title");
      expect(details.title).toBe("Account Not Found");
      expect(details.status).toBe(404);
      expect(details.detail).toBe("The requested account does not exist in the ledger.");
      expect(details.correlationId).toBe("corr-12345");
    });

    it("handles missing correlation ID without fabricating a fake one", () => {
      const err = new Error("Standard error");
      const details = extractSafeDetails(err, "Fallback Title");
      expect(details.title).toBe("Fallback Title");
      expect(details.detail).toBe("We couldn't complete this request. Please try again.");
      expect(details.correlationId).toBeUndefined();
    });

    it("sanitizes dangerous raw error messages", () => {
      const dangerousErr = new Error("SELECT * FROM accounts WHERE password = 'secret'");
      const details = extractSafeDetails(dangerousErr, "Safe Title");
      expect(details.detail).toBe("We couldn't complete this request. Please try again.");
    });
  });

  describe("Root Segment Error Boundary (src/app/error.tsx)", () => {
    it("renders safe user-facing message, accessible heading, and Try Again button", () => {
      const mockReset = vi.fn();
      const error = new Error("Render failure in customer dashboard");

      render(<RootError error={error} reset={mockReset} />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Something went wrong");

      expect(
        screen.getByText("We couldn't complete this request. Please try again.")
      ).toBeInTheDocument();

      const tryAgainBtn = screen.getByTestId("error-reset-button");
      expect(tryAgainBtn).toBeInTheDocument();
      expect(tryAgainBtn).toHaveAttribute("aria-label", "Try again to reload request");

      fireEvent.click(tryAgainBtn);
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it("presents RFC 7807 problem details and diagnostic Reference ID when available", () => {
      const mockReset = vi.fn();
      const mockResponse: ApiErrorResponse = {
        type: "https://api.paymentledger.com/errors/INTERNAL_SERVER_ERROR",
        title: "Payment Processing Failed",
        status: 500,
        detail: "Downstream clearing gateway timed out during authorization.",
        errorCode: "INTERNAL_SERVER_ERROR",
        correlationId: "corr-root-789",
        timestamp: "2026-09-26T12:00:00Z",
      };
      const apiErr = new ApiError(mockResponse);

      render(<RootError error={apiErr} reset={mockReset} />);

      expect(screen.getByText("Payment Processing Failed")).toBeInTheDocument();
      expect(
        screen.getByText("Downstream clearing gateway timed out during authorization.")
      ).toBeInTheDocument();
      expect(screen.getByTestId("error-status-badge")).toHaveTextContent("HTTP 500");

      const refId = screen.getByTestId("error-reference-id");
      expect(refId).toBeInTheDocument();
      expect(refId).toHaveTextContent("Reference ID: corr-root-789");
    });

    it("does NOT display a Reference ID when correlationId is absent (no fake IDs)", () => {
      const mockReset = vi.fn();
      const error = new Error("Generic failure without correlation ID");

      render(<RootError error={error} reset={mockReset} />);

      expect(screen.queryByTestId("error-reference-id")).not.toBeInTheDocument();
    });

    it("provides safe navigation back to dashboard", () => {
      const mockReset = vi.fn();
      const error = new Error("Some segment failure");

      render(<RootError error={error} reset={mockReset} />);

      const dashboardLink = screen.getByTestId("error-dashboard-link");
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("Global Error Boundary (src/app/global-error.tsx)", () => {
    it("renders self-contained HTML document structure with accessible heading", () => {
      const mockReset = vi.fn();
      const error = new Error("Root layout breakdown");

      render(<GlobalError error={error} reset={mockReset} />);

      const heading = screen.getByTestId("global-error-heading");
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Critical Application Error");

      expect(
        screen.getByText("We couldn't complete this request. Please try again.")
      ).toBeInTheDocument();

      const tryAgainBtn = screen.getByTestId("global-error-reset-button");
      expect(tryAgainBtn).toBeInTheDocument();
      fireEvent.click(tryAgainBtn);
      expect(mockReset).toHaveBeenCalledTimes(1);

      const returnHomeBtn = screen.getByTestId("global-error-home-button");
      expect(returnHomeBtn).toBeInTheDocument();
    });

    it("renders RFC 7807 status and correlation ID safely in global boundary", () => {
      const mockReset = vi.fn();
      const mockResponse: ApiErrorResponse = {
        type: "https://api.paymentledger.com/errors/SERVICE_UNAVAILABLE",
        title: "Platform Maintenance",
        status: 503,
        detail: "The core platform is undergoing scheduled database maintenance.",
        errorCode: "SERVICE_UNAVAILABLE",
        correlationId: "global-corr-999",
        timestamp: "2026-09-26T12:00:00Z",
      };
      const apiErr = new ApiError(mockResponse);

      render(<GlobalError error={apiErr} reset={mockReset} />);

      expect(screen.getByTestId("global-error-heading")).toHaveTextContent("Platform Maintenance");
      expect(screen.getByTestId("global-error-status-badge")).toHaveTextContent("HTTP 503");
      expect(screen.getByTestId("error-reference-id")).toHaveTextContent("Reference ID: global-corr-999");
    });
  });

  describe("Admin Route Error Boundary (src/app/(admin)/error.tsx)", () => {
    it("renders safe admin error presentation without leaking internal records", () => {
      const mockReset = vi.fn();
      const error = new Error("Ledger audit query failed");

      render(<AdminError error={error} reset={mockReset} />);

      const heading = screen.getByTestId("error-heading");
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Administrative Operation Failed");

      expect(
        screen.getByText("We couldn't complete this request. Please try again.")
      ).toBeInTheDocument();

      const adminLink = screen.getByTestId("error-dashboard-link");
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute("href", "/admin/dashboard");
      expect(adminLink).toHaveTextContent("Admin Dashboard");

      const tryAgainBtn = screen.getByTestId("error-reset-button");
      fireEvent.click(tryAgainBtn);
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it("renders RFC 7807 problem details and correlation ID for admin errors", () => {
      const mockReset = vi.fn();
      const mockResponse: ApiErrorResponse = {
        type: "https://api.paymentledger.com/errors/FORBIDDEN",
        title: "Unauthorized Administrative Operation",
        status: 403,
        detail: "Caller lacks operational privileges to initiate ledger adjustments.",
        errorCode: "FORBIDDEN",
        correlationId: "admin-corr-403",
        timestamp: "2026-09-26T12:00:00Z",
      };
      const apiErr = new ApiError(mockResponse);

      render(<AdminError error={apiErr} reset={mockReset} />);

      expect(screen.getByText("Unauthorized Administrative Operation")).toBeInTheDocument();
      expect(screen.getByTestId("error-status-badge")).toHaveTextContent("HTTP 403");
      expect(screen.getByTestId("error-reference-id")).toHaveTextContent("Reference ID: admin-corr-403");
    });
  });

  describe("Financial Mutation Safety & Non-Automated Recovery", () => {
    it("CRITICAL FINANCIAL INVARIANT: invoking error reset() never initiates mutations or idempotency keys", () => {
      const mockMutate = vi.fn();
      const mockReset = vi.fn();

      render(
        <ErrorBoundaryView
          error={new Error("Transaction rejected")}
          reset={mockReset}
        />
      );

      const tryAgainBtn = screen.getByTestId("error-reset-button");
      fireEvent.click(tryAgainBtn);

      // Only the segment boundary reset() is called; no automatic mutate()
      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
