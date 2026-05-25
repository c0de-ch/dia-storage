"use client";

import { useState } from "react";
import { InfoIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";

interface HelpPopoverProps {
  title?: string;
  items: string[];
}

/**
 * An "ⓘ" button that opens a popover explaining the actions available on the
 * current page, with an option to read the help aloud.
 */
export function HelpPopover({ title = "Cosa puoi fare", items }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const { speak, cancel, isSpeaking, isSupported } = useSpeechSynthesis();
  const spoken = `${title}. ${items.join(". ")}`;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) cancel();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={title}
            title={title}
          />
        }
      >
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-medium">{title}</p>
          {isSupported && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => (isSpeaking ? cancel() : speak(spoken))}
              aria-label={isSpeaking ? "Ferma lettura" : "Leggi ad alta voce"}
              title={isSpeaking ? "Ferma lettura" : "Leggi ad alta voce"}
            >
              {isSpeaking ? (
                <VolumeXIcon className="size-3.5" />
              ) : (
                <Volume2Icon className="size-3.5" />
              )}
            </Button>
          )}
        </div>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
