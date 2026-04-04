import { describe, it, expect } from "vitest";
import {
  validateFile,
  validateImage,
  validateVideo,
  validateAudio,
  validateDocument,
  getFileExtension,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isDocumentFile,
} from "@/lib/file-validation";

describe("file-validation.ts", () => {
  describe("validateFile", () => {
    it("should reject null/undefined file", () => {
      const result = validateFile(null as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("No file selected");
    });

    it("should reject empty file", () => {
      const file = new File([], "empty.txt", { type: "text/plain" });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("File is empty");
    });

    it("should reject file exceeding max size", () => {
      const content = new Array(11 * 1024 * 1024).join("x");
      const file = new File([content], "large.txt", { type: "text/plain" });
      const result = validateFile(file, { maxSizeMB: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds 10MB");
    });

    it("should reject disallowed file types", () => {
      const file = new File(["content"], "test.exe", { type: "application/octet-stream" });
      const result = validateFile(file, { allowedTypes: ["image/png"] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should reject dangerous extensions", () => {
      const file = new File(["content"], "malicious.php", {
        type: "text/plain",
      });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed for security");
    });

    it("should accept valid file within limits", () => {
      const file = new File(["hello"], "test.png", { type: "image/png" });
      const result = validateFile(file, { maxSizeMB: 10 });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("validateImage", () => {
    it("should accept valid image", () => {
      const file = new File(["fake-image"], "photo.jpg", { type: "image/jpeg" });
      const result = validateImage(file);
      expect(result.valid).toBe(true);
    });

    it("should reject non-image files", () => {
      const file = new File(["video"], "video.mp4", { type: "video/mp4" });
      const result = validateImage(file);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateVideo", () => {
    it("should accept valid video", () => {
      const file = new File(["video"], "video.mp4", { type: "video/mp4" });
      const result = validateVideo(file);
      expect(result.valid).toBe(true);
    });

    it("should reject non-video files", () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const result = validateVideo(file);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateAudio", () => {
    it("should accept valid audio", () => {
      const file = new File(["audio"], "music.mp3", { type: "audio/mpeg" });
      const result = validateAudio(file);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateDocument", () => {
    it("should accept valid document", () => {
      const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
      const result = validateDocument(file);
      expect(result.valid).toBe(true);
    });
  });

  describe("getFileExtension", () => {
    it("should return file extension with dot", () => {
      expect(getFileExtension("document.pdf")).toBe(".pdf");
      expect(getFileExtension("image.JPEG")).toBe(".jpeg");
    });

    it("should return empty string for files without extension", () => {
      expect(getFileExtension("README")).toBe("");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
      expect(formatFileSize(500)).toBe("500 Bytes");
    });

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
      expect(formatFileSize(5242880)).toBe("5 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });
  });

  describe("file type checks", () => {
    it("should correctly identify image files", () => {
      expect(isImageFile(new File([], "a.jpg", { type: "image/jpeg" }))).toBe(
        true
      );
      expect(
        isImageFile(new File([], "a.mp4", { type: "video/mp4" }))
      ).toBe(false);
    });

    it("should correctly identify video files", () => {
      expect(isVideoFile(new File([], "a.mp4", { type: "video/mp4" }))).toBe(
        true
      );
    });

    it("should correctly identify audio files", () => {
      expect(isAudioFile(new File([], "a.mp3", { type: "audio/mpeg" }))).toBe(
        true
      );
    });

    it("should correctly identify document files", () => {
      expect(
        isDocumentFile(new File([], "a.pdf", { type: "application/pdf" }))
      ).toBe(true);
    });
  });
});
