import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AccountLifecycleModal } from "@/features/admin/components/account-lifecycle-modal";
import * as authContext from "@/features/auth/auth-context";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>
  );
}

describe("Admin Account Lifecycle Accessibility (Phase F7-G-E)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-admin-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  it("provides valid dialog landmarks and ARIA attributes", () => {
    renderWithProviders(
      <AccountLifecycleModal
        isOpen={true}
        action="FREEZE"
        accountId="acc-123"
        accountNumber="ACC-US-001"
        currentStatus="ACTIVE"
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "lifecycle-modal-title");
    expect(dialog).toHaveAttribute("aria-describedby", "lifecycle-modal-description");

    const title = screen.getByTestId("lifecycle-modal-title");
    expect(title).toHaveAttribute("id", "lifecycle-modal-title");
    expect(title).toHaveTextContent("Freeze Account");
  });

  it("associates label with reason textarea and announces required attribute", () => {
    renderWithProviders(
      <AccountLifecycleModal
        isOpen={true}
        action="FREEZE"
        accountId="acc-123"
        accountNumber="ACC-US-001"
        currentStatus="ACTIVE"
        onClose={vi.fn()}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /operational justification/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("id", "lifecycle-reason");
    expect(textarea).toHaveAttribute("aria-required", "true");
  });

  it("announces validation error via role='alert' and sets aria-invalid", async () => {
    renderWithProviders(
      <AccountLifecycleModal
        isOpen={true}
        action="FREEZE"
        accountId="acc-123"
        accountNumber="ACC-US-001"
        currentStatus="ACTIVE"
        onClose={vi.fn()}
      />
    );

    const confirmBtn = screen.getByTestId("confirm-lifecycle-button");
    fireEvent.click(confirmBtn);

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent("A non-blank operational justification is required.");

    const textarea = screen.getByRole("textbox", { name: /operational justification/i });
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", "lifecycle-reason-error");
  });

  it("closes modal on Escape key press", () => {
    const closeMock = vi.fn();
    renderWithProviders(
      <AccountLifecycleModal
        isOpen={true}
        action="FREEZE"
        accountId="acc-123"
        accountNumber="ACC-US-001"
        currentStatus="ACTIVE"
        onClose={closeMock}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
