import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TranscriptChangeMeta = {
  isFinal: boolean;
  finalTranscript: string;
  interimTranscript: string;
};

interface UseVoiceChatOptions {
  onTranscriptChange: (value: string, meta: TranscriptChangeMeta) => void;
  language?: string;
}

const appendText = (base: string, addition: string) => {
  if (!addition) return base;
  if (!base) return addition;
  const needsSpace = !/\s$/.test(base) && !/^[\s.,!?]/.test(addition);
  return `${base}${needsSpace ? " " : ""}${addition}`;
};

export function useVoiceChat({ onTranscriptChange, language }: UseVoiceChatOptions) {
  const recognitionCtor = useMemo(() => {
    if (typeof window === "undefined") return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }, []);

  const isRecognitionSupported = Boolean(recognitionCtor);
  const isSpeechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const recognitionRef = useRef<any | null>(null);
  const baseValueRef = useRef<string>("");
  const finalTranscriptRef = useRef<string>("");

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Failed to stop recognition", err);
      }
    }
  }, []);

  const startRecording = useCallback(
    (initialValue: string) => {
      if (!recognitionCtor || recognitionRef.current) {
        return;
      }

      try {
        const recognition = new recognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          language || (typeof navigator !== "undefined" ? navigator.language : "en-US");

        baseValueRef.current = initialValue;
        finalTranscriptRef.current = "";

        recognition.onstart = () => {
          setIsRecording(true);
          setError(null);
          setIsPermissionDenied(false);
          onTranscriptChange(initialValue, {
            isFinal: false,
            finalTranscript: "",
            interimTranscript: "",
          });
        };

        recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (!result) continue;
            const transcript = result[0]?.transcript ?? "";
            if (result.isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          finalTranscriptRef.current = final;
          const combinedFinal = appendText(baseValueRef.current, final.trim());
          const combinedLive = appendText(combinedFinal, interim.trim());

          onTranscriptChange(combinedLive, {
            isFinal: false,
            finalTranscript: final.trim(),
            interimTranscript: interim.trim(),
          });
        };

        recognition.onerror = (event: any) => {
          const message = event?.message || event?.error || "Voice capture error";
          setError(message);
          if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
            setIsPermissionDenied(true);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          recognitionRef.current = null;
          if (finalTranscriptRef.current) {
            const combined = appendText(baseValueRef.current, finalTranscriptRef.current.trim());
            onTranscriptChange(combined, {
              isFinal: true,
              finalTranscript: finalTranscriptRef.current.trim(),
              interimTranscript: "",
            });
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    },
    [language, recognitionCtor, onTranscriptChange]
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch (err) {
          console.warn("Failed to clean up recognition", err);
        }
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (isSpeechSynthesisSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeechSynthesisSupported]);

  const speak = useCallback(
    (messageId: string, text: string) => {
      if (!isSpeechSynthesisSupported || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current));
      };
      utterance.onerror = () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current));
      };
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    },
    [isSpeechSynthesisSupported]
  );

  const stopSpeaking = useCallback(() => {
    if (!isSpeechSynthesisSupported) return;
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
  }, [isSpeechSynthesisSupported]);

  return {
    isRecognitionSupported,
    isRecording,
    startRecording,
    stopRecording,
    error,
    isPermissionDenied,
    isSpeechSynthesisSupported,
    speak,
    stopSpeaking,
    speakingMessageId,
  };
}

