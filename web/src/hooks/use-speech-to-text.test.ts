import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSpeechToText } from "./use-speech-to-text";

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "en-US";
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;

  start = vi.fn(() => {
    if (this.onstart) {
      this.onstart();
    }
  });

  stop = vi.fn(() => {
    if (this.onend) {
      this.onend();
    }
  });

  abort = vi.fn(() => {
    if (this.onend) {
      this.onend();
    }
  });
}

describe("useSpeechToText", () => {
  const originalSpeechRecognition = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  const originalWebkitSpeechRecognition = (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  it("should report isSupported true when SpeechRecognition is present", () => {
    const { result } = renderHook(() => useSpeechToText());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isListening).toBe(false);
  });

  it("should start and stop listening", () => {
    const onTranscriptChange = vi.fn();
    const { result } = renderHook(() =>
      useSpeechToText({ onTranscriptChange })
    );

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
  });

  it("should toggle listening state", () => {
    const { result } = renderHook(() => useSpeechToText());

    act(() => {
      result.current.toggleListening();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.toggleListening();
    });
    expect(result.current.isListening).toBe(false);
  });
});
