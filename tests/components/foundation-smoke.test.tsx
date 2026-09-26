import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { AppProviders } from "@/providers/app-providers";

describe("Foundation Smoke Test", () => {
  it("renders the Phase F0 foundation page without errors", () => {
    render(
      <AppProviders>
        <Home />
      </AppProviders>
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Distributed Payment/i);

    expect(screen.getByText(/Phase F[01] Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend Authority: Frozen Spring Boot Core/i)).toBeInTheDocument();
    expect(screen.getByText(/Authoritative Backend/i)).toBeInTheDocument();
  });
});
