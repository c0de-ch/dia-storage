"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InfoIcon, VolumeXIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpPopoverProps {
  title?: string;
  items: string[];
}

/**
 * An "ⓘ" affordance that explains the actions available on the current page.
 * Hovering shows the tips; clicking reads them aloud. The speech behaviour
 * mirrors the nav menu's voice help exactly (same inline implementation).
 */
export function HelpPopover({ title = "Cosa puoi fare", items }: HelpPopoverProps) {
  const speakingRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [italianVoice, setItalianVoice] = useState<SpeechSynthesisVoice | null>(
    null
  );
  const text = `${title}. ${items.join(". ")}`;

  // Voices load asynchronously — listen for the event
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    function pickItalianVoice() {
      const voices = window.speechSynthesis.getVoices();
      // Prefer a female Italian voice for clarity, fall back to any Italian
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("it") &&
          /female|donna|google.*italian/i.test(v.name)
      );
      const fallback = voices.find((v) => v.lang.startsWith("it"));
      setItalianVoice(preferred ?? fallback ?? null);
    }

    pickItalianVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickItalianVoice);
    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        pickItalianVoice
      );
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
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label={isSpeaking ? "Ferma lettura" : "Leggi ad alta voce"}
          />
        }
      >
        {isSpeaking ? (
          <VolumeXIcon className="size-4" />
        ) : (
          <InfoIcon className="size-4" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72">
        <p className="mb-1 font-medium">{title}</p>
        <ul className="list-disc space-y-0.5 pl-4">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
