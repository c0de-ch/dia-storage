"use client";

import { useState, useCallback, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { it } from "date-fns/locale";
import { format, parse, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerItProps {
  /** Free-text date value (e.g. "1985", "07/1985", "Estate 1985") */
  value?: string;
  /** Precise date parsed from value, if possible */
  preciseValue?: string | null;
  /** Called with (freeText, preciseDateOrNull) */
  onChange?: (freeText: string, preciseDate: string | null) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Tries to parse an Italian date string into an ISO date.
 * Supports: dd/mm/yyyy, mm/yyyy, yyyy, and named months.
 */
function parseItalianDate(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Try dd/mm/yyyy
  const fullMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullMatch) {
    const d = parse(trimmed, "dd/MM/yyyy", new Date());
    return isValid(d) ? d : null;
  }

  // Try mm/yyyy
  const monthYearMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYearMatch) {
    const d = parse(`01/${trimmed}`, "dd/MM/yyyy", new Date());
    return isValid(d) ? d : null;
  }

  // Try yyyy only
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch?.[1]) {
    const d = new Date(parseInt(yearMatch[1]), 0, 1);
    return isValid(d) ? d : null;
  }

  return null;
}

function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function DatePickerIt({
  value = "",
  preciseValue,
  onChange,
  placeholder = "es. 15/07/1985, 1985, Estate 1985",
  className,
}: DatePickerItProps) {
  const [textValue, setTextValue] = useState(value);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(() => {
    if (preciseValue) {
      const d = new Date(preciseValue);
      return isValid(d) ? d : undefined;
    }
    return undefined;
  });
  const [isOpen, setIsOpen] = useState(false);

  // Sync with external value changes
  useEffect(() => {
    setTextValue(value);
  }, [value]);

  useEffect(() => {
    if (preciseValue) {
      const d = new Date(preciseValue);
      if (isValid(d)) setCalendarDate(d);
    }
  }, [preciseValue]);

  const handleTextChange = useCallback(
    (newText: string) => {
      setTextValue(newText);
      const parsed = parseItalianDate(newText);
      if (parsed) {
        setCalendarDate(parsed);
        onChange?.(newText, toISODate(parsed));
      } else {
        onChange?.(newText, null);
      }
    },
    [onChange]
  );

  const handleCalendarSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      setCalendarDate(date);
      const formatted = format(date, "dd/MM/yyyy");
      setTextValue(formatted);
      onChange?.(formatted, toISODate(date));
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div className={cn("flex gap-1.5", className)}>
      <Input
        type="text"
        value={textValue}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="icon">
              <CalendarIcon className="size-4" />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            onSelect={handleCalendarSelect}
            locale={it}
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            {...(calendarDate && { selected: calendarDate, defaultMonth: calendarDate })}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
