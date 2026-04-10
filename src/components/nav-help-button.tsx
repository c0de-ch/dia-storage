"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { InfoIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavHelpButtonProps {
  text: string;
}

export function NavHelpButton({ text }: NavHelpButtonProps) {
  const speakingRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [italianVoice, setItalianVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Voices load asynchronously — listen for the event
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    function pickItalianVoice() {
      const voices = window.speechSynthesis.getVoices();
      // Prefer a female Italian voice for clarity, fall back to any Italian
      const preferred = voices.find(
        (v) => v.lang.startsWith("it") && /female|donna|google.*italian/i.test(v.name)
      );
      const fallback = voices.find((v) => v.lang.startsWith("it"));
      setItalianVoice(preferred ?? fallback ?? null);
    }

    pickItalianVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickItalianVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickItalianVoice);
    };
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingRef.current) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    if (italianVoice) {
      utterance.voice = italianVoice;
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
  }, [text, italianVoice]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              speak();
            }}
            className="absolute right-1 top-1/2 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/menu-item:opacity-100"
            aria-label="Aiuto vocale"
          />
        }
      >
        {isSpeaking ? (
          <VolumeXIcon className="size-3.5" />
        ) : (
          <InfoIcon className="size-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-64">
        <div className="flex items-start gap-1.5">
          <Volume2Icon className="mt-0.5 size-3 shrink-0" />
          <span>{text}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
