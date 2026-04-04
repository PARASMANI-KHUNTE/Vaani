import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAppError,
  handleError,
  getErrorMessage,
  isNetworkError,
  isAuthError,
  withErrorHandler,
} from "@/lib/error-handler";

describe("error-handler.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAppError", () => {
    it("should create an AppError with defaults", () => {
      const error = createAppError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.severity).toBe("medium");
      expect(error.timestamp).toBeDefined();
    });

    it("should create an AppError with custom options", () => {
      const error = createAppError("Test error", {
        code: "TEST_CODE",
        severity: "high",
        context: "TestContext",
      });
      expect(error.code).toBe("TEST_CODE");
      expect(error.severity).toBe("high");
      expect(error.context).toBe("TestContext");
    });
  });

  describe("handleError", () => {
    it("should handle Error objects", () => {
      const originalError = new Error("Original error");
      const result = handleError(originalError, { context: "test" });
      expect(result.message).toBe("Original error");
      expect(result.context).toBe("test");
    });

    it("should handle string errors", () => {
      const result = handleError("String error", { silent: true });
      expect(result.message).toBe("String error");
    });

    it("should handle unknown errors", () => {
      const result = handleError(null, { silent: true });
      expect(result.message).toBe("An unexpected error occurred");
    });

    it("should capture original error", () => {
      const originalError = new Error("Original");
      const result = handleError(originalError, { silent: true });
      expect(result.originalError).toBe(originalError);
    });
  });

  describe("getErrorMessage", () => {
    it("should extract message from Error", () => {
      const error = new Error("Error message");
      expect(getErrorMessage(error)).toBe("Error message");
    });

    it("should return string as-is", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    it("should extract from object with message property", () => {
      expect(getErrorMessage({ message: "Object error" })).toBe("Object error");
    });

    it("should return fallback for unknown errors", () => {
      expect(getErrorMessage(12345)).toBe("Something went wrong");
    });
  });

  describe("isNetworkError", () => {
    it("should detect fetch errors", () => {
      const error = new TypeError("Failed to fetch");
      expect(isNetworkError(error)).toBe(true);
    });

    it("should detect network error codes", () => {
      expect(isNetworkError({ code: "ECONNABORTED" })).toBe(true);
      expect(isNetworkError({ code: "ERR_NETWORK" })).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isNetworkError(new Error("Other error"))).toBe(false);
    });
  });

  describe("isAuthError", () => {
    it("should detect 401 status", () => {
      expect(isAuthError({ status: 401 })).toBe(true);
    });

    it("should detect 403 status", () => {
      expect(isAuthError({ status: 403 })).toBe(true);
    });

    it("should detect auth-related messages", () => {
      expect(isAuthError({ message: "Unauthorized" })).toBe(true);
      expect(isAuthError({ message: "401" })).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isAuthError(new Error("Not found"))).toBe(false);
    });
  });

  describe("withErrorHandler", () => {
    it("should return result on success", async () => {
      const result = await withErrorHandler(Promise.resolve("success"));
      expect(result).toBe("success");
    });

    it("should catch and handle errors", async () => {
      const error = new Error("Test error");
      let caughtError: unknown;

      await withErrorHandler(Promise.reject(error), {
        context: "test",
        onError: (e) => {
          caughtError = e;
        },
      }).catch(() => {});

      expect(caughtError).toBeDefined();
    });
  });
});
