import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.URL.createObjectURL = vi.fn(() => "blob:test");
window.URL.revokeObjectURL = vi.fn();

Storage.prototype.getItem = vi.fn();
Storage.prototype.setItem = vi.fn();
Storage.prototype.removeItem = vi.fn();
Storage.prototype.clear = vi.fn();

const originalError = console.error;
console.error = vi.fn((message?: unknown, ...optionalParams: unknown[]) => {
  if (
    typeof message === "string" &&
    (message.includes("Warning:") || message.includes("React does not recognize"))
  ) {
    return;
  }
  originalError.call(console, message, ...optionalParams);
});
