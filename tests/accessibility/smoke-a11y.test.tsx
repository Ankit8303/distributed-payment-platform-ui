import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Home from "@/app/page";
import { AppProviders } from "@/providers/app-providers";

describe("Foundation Accessibility Smoke", () => {
  it("has valid landmark hierarchy and semantic HTML", () => {
    const { container } = render(
      <AppProviders>
        <Home />
      </AppProviders>
    );

    // Assert main landmark exists
    const main = container.querySelector("main");
    expect(main).not.toBeNull();

    // Assert exactly one h1 exists
    const h1Elements = container.querySelectorAll("h1");
    expect(h1Elements.length).toBe(1);

    // Assert header and footer landmarks exist
    const header = container.querySelector("header");
    const footer = container.querySelector("footer");
    expect(header).not.toBeNull();
    expect(footer).not.toBeNull();
  });
});
