/**
 * @vitest-environment jsdom
 */
import { vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

describe("useIsMobile", () => {
  const mockAddEventListener = vi.fn();
  const mockRemoveEventListener = vi.fn();

  function setupMatchMedia(width: number) {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });

    window.matchMedia = vi.fn().mockReturnValue({
      matches: width < 768,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when window width is below 768px", () => {
    setupMatchMedia(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when window width is 768px or above", () => {
    setupMatchMedia(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("registers and cleans up event listener", () => {
    setupMatchMedia(1024);
    const { unmount } = renderHook(() => useIsMobile());
    expect(mockAddEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    unmount();
    expect(mockRemoveEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
