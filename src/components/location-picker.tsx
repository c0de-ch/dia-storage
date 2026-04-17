"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinIcon, Loader2Icon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsLoading) {
    return new Promise((resolve) => {
      loadCallbacks.push(resolve);
    });
  }

  googleMapsLoading = true;
  return new Promise((resolve, reject) => {
    loadCallbacks.push(resolve);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=it`;
    script.async = true;
    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      googleMapsLoading = false;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });
}

export function LocationPicker({
  value,
  onChange,
  placeholder = "Cerca un luogo...",
  id,
  className,
}: LocationPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyChecked, setApiKeyChecked] = useState(false);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch Google Maps API key from settings
  useEffect(() => {
    async function fetchApiKey() {
      try {
        // Try env var first (exposed via a simple endpoint), then settings
        const res = await fetch("/api/v1/config/google-maps-key", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.key) {
            setApiKey(data.key);
          }
        }
      } catch {
        // No API key available — fall back to plain text input
      } finally {
        setApiKeyChecked(true);
      }
    }
    fetchApiKey();
  }, []);

  // Load Google Maps script when API key is available
  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMapsScript(apiKey).then(() => {
      autocompleteService.current = new google.maps.places.AutocompleteService();
    }).catch(() => {
      // Failed to load — will fall back to plain input
    });
  }, [apiKey]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(
    (query: string) => {
      if (!autocompleteService.current || query.length < 2) {
        setPredictions([]);
        return;
      }

      setLoading(true);
      autocompleteService.current.getPlacePredictions(
        {
          input: query,
          types: ["(regions)", "locality", "sublocality", "neighborhood", "point_of_interest", "natural_feature"],
          language: "it",
        },
        (results, status) => {
          setLoading(false);
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            setPredictions(
              results.map((r) => ({
                placeId: r.place_id,
                description: r.description,
                mainText: r.structured_formatting.main_text,
                secondaryText: r.structured_formatting.secondary_text || "",
              }))
            );
            setShowDropdown(true);
          } else {
            setPredictions([]);
          }
        }
      );
    },
    []
  );

  function handleInputChange(newValue: string) {
    setInputValue(newValue);
    onChange(newValue);

    if (!autocompleteService.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(newValue), 300);
  }

  function handleSelect(prediction: Prediction) {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setPredictions([]);
    setShowDropdown(false);
  }

  function handleClear() {
    setInputValue("");
    onChange("");
    setPredictions([]);
    setShowDropdown(false);
  }

  // No API key — render plain input
  if (apiKeyChecked && !apiKey) {
    return (
      <div className={cn("relative", className)}>
        <MapPinIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <MapPinIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        className="pl-9 pr-8"
        autoComplete="off"
      />
      {loading && (
        <Loader2Icon className="absolute right-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-60 overflow-auto py-1">
            {predictions.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                  onClick={() => handleSelect(p)}
                >
                  <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{p.mainText}</span>
                    {p.secondaryText && (
                      <span className="ml-1 text-muted-foreground">
                        {p.secondaryText}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny remote attribution logo, not worth next/image loader */}
            <img
              src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3_hdpi.png"
              alt="Powered by Google"
              className="h-4 dark:invert"
            />
          </div>
        </div>
      )}
    </div>
  );
}
