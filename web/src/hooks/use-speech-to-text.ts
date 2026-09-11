import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface UseSpeechToTextOptions {
  lang?: string;
  onTranscriptChange?: (text: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
  const { lang, onTranscriptChange, onError } = options;
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const accumulatedFinalRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as WindowWithSpeechRecognition;
      const RecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      setIsSupported(Boolean(RecognitionClass));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.debug("Recognition stop error:", err);
      }
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as WindowWithSpeechRecognition;
    const RecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!RecognitionClass) {
      const msg = "Voice-to-text is not supported in this browser. Please try Chrome, Edge, or Safari.";
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    setErrorMessage(null);
    accumulatedFinalRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");

    try {
      const recognition = new RecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang || (typeof navigator !== "undefined" ? navigator.language : "en-US");
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPiece = result[0]?.transcript || "";

          if (result.isFinal) {
            newFinal += transcriptPiece;
          } else {
            currentInterim += transcriptPiece;
          }
        }

        if (newFinal) {
          accumulatedFinalRef.current += (accumulatedFinalRef.current ? " " : "") + newFinal.trim();
          setFinalTranscript(accumulatedFinalRef.current);
          onTranscriptChange?.(accumulatedFinalRef.current, true);
        }

        setInterimTranscript(currentInterim);
        if (currentInterim) {
          const combined = accumulatedFinalRef.current
            ? `${accumulatedFinalRef.current} ${currentInterim}`
            : currentInterim;
          onTranscriptChange?.(combined, false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("Speech recognition error:", event.error);
        let userFriendlyMsg = "Voice recognition error occurred.";

        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            userFriendlyMsg = "Microphone access was denied. Please allow microphone permissions to use voice-to-text.";
            break;
          case "no-speech":
            // Quietly ignore no-speech or handle gently
            return;
          case "audio-capture":
            userFriendlyMsg = "No microphone was found. Ensure that a microphone is installed and audio settings are configured.";
            break;
          case "network":
            userFriendlyMsg = "Network error during speech recognition.";
            break;
          case "aborted":
            return;
          default:
            userFriendlyMsg = `Speech recognition error: ${event.error}`;
        }

        setErrorMessage(userFriendlyMsg);
        onError?.(userFriendlyMsg);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      const msg = err instanceof Error ? err.message : "Failed to initialize voice recognition";
      setErrorMessage(msg);
      onError?.(msg);
      setIsListening(false);
    }
  }, [lang, onError, onTranscriptChange]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    clearError: () => setErrorMessage(null),
  };
};
