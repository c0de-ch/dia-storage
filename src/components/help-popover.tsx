"use client";

import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HelpPopoverProps {
  title?: string;
  items: string[];
}

/**
 * An "ⓘ" button that opens a popover explaining the actions available on the
 * current page.
 */
export function HelpPopover({ title = "Cosa puoi fare", items }: HelpPopoverProps) {
  return (
    <Popover>
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
        <p className="mb-2 font-medium">{title}</p>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
