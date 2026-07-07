"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  /**
   * Called with the live input value when the user presses Enter, after
   * flushing the pending debounce (so `onChange` and `onSubmit` never
   * disagree). When set, Enter is consumed here and does not also submit
   * a surrounding form.
   */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /**
   * Forwarded to the underlying input, so a surrounding <form> can read
   * the live (not-yet-debounced) value via FormData on submit.
   */
  name?: string;
}

export function SearchBar({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = "Cerca diapositive...",
  autoFocus = false,
  className,
  name,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");
  const [prevControlledValue, setPrevControlledValue] =
    useState(controlledValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the displayed value in sync when the parent changes it from the
  // outside (suggestion chips, programmatic clear, ...). While the user is
  // typing, `internalValue` leads and the debounced onChange catches up.
  // ("Adjust state when props change" render pattern, per React docs.)
  if (controlledValue !== prevControlledValue) {
    setPrevControlledValue(controlledValue);
    if (controlledValue !== undefined) setInternalValue(controlledValue);
  }

  // An external value update supersedes any pending debounce from earlier
  // typing, which would otherwise fire later with a stale value and desync
  // the input from the results. When the change is the echo of our own
  // debounced onChange the ref is already null, so this is a no-op.
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [controlledValue]);

  const handleChange = useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onChange?.(newValue);
      }, 300);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /** Fire the pending debounced onChange immediately, if any. */
  function flushPending() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      onChange?.(internalValue);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    flushPending();
    if (onSubmit) {
      e.preventDefault();
      onSubmit(internalValue);
    }
  }

  function handleClear() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setInternalValue("");
    onChange?.("");
    inputRef.current?.focus();
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        name={name}
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="pl-8 pr-8"
      />
      {internalValue && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Cancella ricerca"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={handleClear}
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  );
}
