"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechSynthesisOptions {
  lang?: string;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useSpeechSynthesis(options?: UseSpeechSynthesisOptions): UseSpeechSynthesisReturn {
  const lang = options?.lang ?? "it-IT";
  const langPrefix = lang.slice(0, 2);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const speakingRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!isSupported) return;

    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith(langPrefix) &&
          /female|donna|google/i.test(v.name)
      );
      const fallback = voices.find((v) => v.lang.startsWith(langPrefix));
      setVoice(preferred ?? fallback ?? null);
    }

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
    };
  }, [isSupported, langPrefix]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        speakingRef.current = true;
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        speakingRef.current = false;
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        speakingRef.current = false;
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, lang, voice]
  );

  return { speak, cancel, isSpeaking, isSupported };
}
