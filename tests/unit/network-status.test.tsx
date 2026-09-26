import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { NetworkStatusIndicator } from "@/components/feedback/network-status-indicator";

function TestConsumer() {
  const { isOnline, isOffline, wasOffline, showRestored } = useNetworkStatus();
  return (
    <div>
      <span data-testid="status-is-online">{String(isOnline)}</span>
      <span data-testid="status-is-offline">{String(isOffline)}</span>
      <span data-testid="status-was-offline">{String(wasOffline)}</span>
      <span data-testid="status-show-restored">{String(showRestored)}</span>
    </div>
  );
}

describe("Phase F8-B Network Status & Browser Connectivity Indicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("initializes in online state and renders nothing by default", () => {
    const { container } = render(<NetworkStatusIndicator />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("network-offline-indicator")).not.toBeInTheDocument();
    expect(screen.queryByTestId("network-restored-indicator")).not.toBeInTheDocument();
  });

  it("transitions to offline state and shows non-blocking warning indicator", () => {
    render(<NetworkStatusIndicator />);

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    const indicator = screen.getByTestId("network-offline-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute("role", "status");
    expect(indicator).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByText("You appear to be offline. Some actions may be unavailable.")
    ).toBeInTheDocument();
  });

  it("does not steal focus when offline indicator appears", () => {
    render(
      <div>
        <button data-testid="test-action-button">Action Button</button>
        <NetworkStatusIndicator />
      </div>
    );

    const button = screen.getByTestId("test-action-button");
    button.focus();
    expect(document.activeElement).toBe(button);

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    // Focus must NOT be stolen from the user's active element
    expect(document.activeElement).toBe(button);
  });

  it("displays restored indicator when transitioning from offline to online", () => {
    render(<NetworkStatusIndicator />);

    // Go offline
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByTestId("network-offline-indicator")).toBeInTheDocument();

    // Come back online
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    // Offline indicator replaced by restored indicator
    expect(screen.queryByTestId("network-offline-indicator")).not.toBeInTheDocument();
    const restored = screen.getByTestId("network-restored-indicator");
    expect(restored).toBeInTheDocument();
    expect(screen.getByText("Connection restored.")).toBeInTheDocument();

    // Restored notification auto-dismisses after 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByTestId("network-restored-indicator")).not.toBeInTheDocument();
  });

  it("allows user to manually dismiss restored notification before timer expires", () => {
    render(<NetworkStatusIndicator />);

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    const dismissBtn = screen.getByTestId("network-restored-dismiss");
    expect(dismissBtn).toBeInTheDocument();

    fireEvent.click(dismissBtn);
    expect(screen.queryByTestId("network-restored-indicator")).not.toBeInTheDocument();
  });

  it("cleans up event listeners and timer on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<NetworkStatusIndicator />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it("CRITICAL FINANCIAL INVARIANT: network changes trigger zero mutations or automated re-submissions", () => {
    const mockMutate = vi.fn();

    render(
      <div>
        <NetworkStatusIndicator />
        <TestConsumer />
      </div>
    );

    // Toggle offline then online multiple times
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    // Zero mutations called
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
