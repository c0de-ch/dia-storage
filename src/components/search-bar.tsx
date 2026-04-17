"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { t } from "@/lib/i18n";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  value: controlledValue,
  onChange,
  placeholder = "Cerca diapositive...",
  autoFocus = false,
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue ?? internalValue;

  const handleChange = useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
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

  function handleClear() {
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
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="pl-8 pr-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={handleClear}
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  );
}

export function SearchBarWithCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSearch() {
    if (query.trim()) {
      router.push(`/ricerca?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="mr-2 size-4" />
        <span>Cerca...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Cerca" description="Cerca diapositive per titolo, luogo o data">
        <Command>
          <CommandInput
            placeholder="Cerca diapositive..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <CommandList>
            <CommandEmpty>Digita per cercare...</CommandEmpty>
            <CommandGroup heading="Azioni rapide">
              <CommandItem
                onSelect={() => {
                  router.push("/ricerca");
                  setOpen(false);
                }}
              >
                <SearchIcon className="mr-2 size-4" />
                {t("search.advancedSearch")}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
