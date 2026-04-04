import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  escapeHtmlAttr,
  sanitizeHtml,
  sanitizeUrl,
  stripAllHtml,
  isUrlSafe,
} from "@/lib/sanitize";

describe("sanitize.ts", () => {
  describe("escapeHtml", () => {
    it("should escape HTML special characters", () => {
      const result = escapeHtml("<script>alert('xss')</script>");
      expect(result).toContain("&lt;script&gt;");
      expect(result).toContain("alert");
    });

    it("should escape ampersands", () => {
      expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it("should escape double quotes", () => {
      expect(escapeHtml('Say "hello"')).toBe("Say &quot;hello&quot;");
    });

    it("should return empty string for null/undefined", () => {
      expect(escapeHtml("")).toBe("");
      expect(escapeHtml(null as unknown as string)).toBe("");
    });
  });

  describe("escapeHtmlAttr", () => {
    it("should escape double quotes for HTML attributes", () => {
      const result = escapeHtmlAttr('class="test"');
      expect(result).toContain("&quot;");
      expect(result).toContain("class");
    });
  });

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      const result = sanitizeHtml("<script>alert('xss')</script>");
      expect(result.toLowerCase()).not.toContain("script");
    });

    it("should remove javascript: protocol", () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
      expect(result.toLowerCase()).not.toContain("javascript:");
    });

    it("should neutralize event handlers", () => {
      const result = sanitizeHtml('<div onclick="alert(1)">Test</div>');
      expect(result.toLowerCase()).not.toContain("onclick=");
    });

    it("should remove dangerous tags", () => {
      const result = sanitizeHtml("<iframe src='evil.com'></iframe>");
      expect(result.toLowerCase()).not.toContain("<iframe");
    });

    it("should preserve safe content", () => {
      expect(sanitizeHtml("<p>Hello, World!</p>")).toBe("<p>Hello, World!</p>");
    });
  });

  describe("sanitizeUrl", () => {
    it("should allow http URLs", () => {
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
    });

    it("should allow https URLs", () => {
      expect(sanitizeUrl("https://example.com/path")).toBe(
        "https://example.com/path"
      );
    });

    it("should allow mailto URLs", () => {
      expect(sanitizeUrl("mailto:test@example.com")).toBe(
        "mailto:test@example.com"
      );
    });

    it("should reject javascript URLs", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe(null);
    });

    it("should reject data URLs", () => {
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe(null);
    });

    it("should return null for null/undefined", () => {
      expect(sanitizeUrl(null)).toBe(null);
      expect(sanitizeUrl(undefined)).toBe(null);
    });
  });

  describe("stripAllHtml", () => {
    it("should remove all HTML tags", () => {
      expect(stripAllHtml("<p>Hello <strong>World</strong></p>")).toBe(
        "Hello World"
      );
    });

    it("should handle nested tags", () => {
      expect(stripAllHtml("<div><span><p>Nested</p></span></div>")).toBe(
        "Nested"
      );
    });
  });

  describe("isUrlSafe", () => {
    it("should return true for http/https URLs", () => {
      expect(isUrlSafe("https://example.com")).toBe(true);
      expect(isUrlSafe("http://example.com")).toBe(true);
    });

    it("should return false for javascript URLs", () => {
      expect(isUrlSafe("javascript:alert(1)")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(isUrlSafe("")).toBe(false);
    });
  });
});
