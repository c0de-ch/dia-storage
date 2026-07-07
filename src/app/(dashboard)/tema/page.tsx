"use client";

import { useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  WandSparklesIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import { PageMasthead } from "@/components/page-masthead";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ThemeOption {
  value: string;
  labelKey:
    | "settings.themeLight"
    | "settings.themeDark"
    | "settings.themeVivid"
    | "settings.themeGlass"
    | "settings.themeSystem";
  description: string;
  icon: LucideIcon;
  // Preview swatches — kept in sync with the OKLCH values in globals.css.
  // These are hardcoded on purpose: each card must show the colors of the
  // theme it previews, not the currently active one, so CSS variables
  // cannot be used here.
  swatches: string[];
  preview: string;
  // Foreground of the previewed theme — drives the sprocket overlay so the
  // perforations stay visible on both light and dark preview strips.
  previewForeground: string;
}

const themes: ThemeOption[] = [
  {
    value: "light",
    labelKey: "settings.themeLight",
    description:
      "Palette acqua luminosa con primario turchese e accenti teal. Ideale per la luce diurna.",
    icon: SunIcon,
    swatches: [
      "oklch(0.6 0.13 215)",
      "oklch(0.93 0.04 195)",
      "oklch(0.6 0.16 320)",
      "oklch(0.7 0.14 130)",
    ],
    preview: "linear-gradient(135deg, oklch(0.985 0.004 220), oklch(0.94 0.02 220))",
    previewForeground: "oklch(0.21 0.015 235)",
  },
  {
    value: "dark",
    labelKey: "settings.themeDark",
    description:
      "Stessa palette acqua in versione scura. Riposa la vista nelle ore serali.",
    icon: MoonIcon,
    swatches: [
      "oklch(0.75 0.12 210)",
      "oklch(0.32 0.045 200)",
      "oklch(0.7 0.17 320)",
      "oklch(0.78 0.15 130)",
    ],
    preview: "linear-gradient(135deg, oklch(0.16 0.02 235), oklch(0.28 0.025 235))",
    previewForeground: "oklch(0.97 0.012 220)",
  },
  {
    value: "vivid",
    labelKey: "settings.themeVivid",
    description:
      "Colori saturi con primario magenta e accento ciano. Per chi ama un look energico.",
    icon: SparklesIcon,
    swatches: [
      "oklch(0.62 0.26 320)",
      "oklch(0.85 0.18 180)",
      "oklch(0.78 0.2 130)",
      "oklch(0.65 0.26 25)",
    ],
    preview:
      "linear-gradient(135deg, oklch(0.985 0.018 320), oklch(0.93 0.06 200))",
    previewForeground: "oklch(0.2 0.05 280)",
  },
  {
    value: "glass",
    labelKey: "settings.themeGlass",
    description:
      "Stile vetro smerigliato su sfondo scuro con sfocatura. Estetica moderna e suggestiva.",
    icon: WandSparklesIcon,
    swatches: [
      "oklch(0.78 0.16 220)",
      "oklch(0.78 0.18 180)",
      "oklch(0.75 0.2 320)",
      "oklch(0.78 0.16 130)",
    ],
    preview:
      "radial-gradient(at 30% 20%, oklch(0.4 0.18 280 / 70%), transparent 60%), radial-gradient(at 80% 80%, oklch(0.45 0.18 200 / 70%), transparent 55%), oklch(0.18 0.04 250)",
    previewForeground: "oklch(0.98 0.01 250)",
  },
  {
    value: "system",
    labelKey: "settings.themeSystem",
    description:
      "Segue automaticamente le preferenze del tuo sistema operativo (chiaro o scuro).",
    icon: MonitorIcon,
    swatches: [
      "oklch(0.6 0.13 215)",
      "oklch(0.75 0.12 210)",
      "oklch(0.93 0.04 195)",
      "oklch(0.32 0.045 200)",
    ],
    preview:
      "linear-gradient(135deg, oklch(0.985 0.004 220) 0%, oklch(0.985 0.004 220) 50%, oklch(0.16 0.02 235) 50%, oklch(0.16 0.02 235) 100%)",
    // The system preview is split light/dark, so use a mid gray that reads
    // acceptably on both halves.
    previewForeground: "oklch(0.6 0.02 235)",
  },
];

const subscribeMount = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export default function TemaPage() {
  const { theme, setTheme } = useTheme();
  // next-themes returns `undefined` on first render (SSR). useSyncExternalStore
  // lets us return false on the server and true after hydration without a
  // setState-in-effect, which the react-hooks rule now flags as an error.
  const mounted = useSyncExternalStore(
    subscribeMount,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIndex = themes.findIndex((option) => option.value === theme);

  // Radiogroup pattern: arrow keys move the selection (and focus) between
  // the theme cards; Enter/Space confirm the focused one.
  const selectAt = (index: number) => {
    const next = (index + themes.length) % themes.length;
    const option = themes[next];
    if (!option) return;
    setTheme(option.value);
    cardRefs.current[next]?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    index: number,
  ) => {
    switch (event.key) {
      case "Enter":
      case " ": {
        event.preventDefault();
        const option = themes[index];
        if (option) setTheme(option.value);
        break;
      }
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        selectAt(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        selectAt(index - 1);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <PageMasthead
        size="md"
        eyebrow={t("nav.settings")}
        title={t("nav.theme")}
        subtitle="Scegli l'aspetto dell'applicazione. Il cambiamento è immediato e viene ricordato sul tuo dispositivo."
      />

      {!mounted ? (
        // Pre-hydration placeholder: next-themes does not know the stored
        // theme until after mount, so render neutral skeletons instead of
        // flashing "no theme selected".
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden
        >
          {themes.map((option) => (
            <Card key={option.value} className="h-full gap-3 pt-0">
              <Skeleton className="h-24 w-full rounded-none" />
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-7" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardHeader>
              <CardContent className="mt-auto flex items-center gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="size-5 rounded-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label={t("nav.theme")}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {themes.map((option, index) => {
            const isActive = theme === option.value;
            const Icon = option.icon;
            return (
              <div
                key={option.value}
                className="slide-reveal"
                style={{ animationDelay: `${Math.min(index * 60, 700)}ms` }}
              >
                <Card
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  role="radio"
                  aria-checked={isActive}
                  aria-label={t(option.labelKey)}
                  tabIndex={
                    (activeIndex === -1 ? index === 0 : isActive) ? 0 : -1
                  }
                  onClick={() => setTheme(option.value)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={cn(
                    "h-full cursor-pointer gap-3 pt-0",
                    "transition-all duration-300 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "-translate-y-1 ring-2 ring-primary shadow-lg"
                      : "hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-ring/40",
                  )}
                >
                  <div
                    className="relative h-24 w-full"
                    style={{ background: option.preview }}
                    aria-hidden
                  >
                    <div
                      className="film-sprockets absolute inset-x-0 bottom-1 opacity-60"
                      style={
                        {
                          "--foreground": option.previewForeground,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                  <CardHeader className="gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="size-4" />
                        {t(option.labelKey)}
                      </CardTitle>
                      <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/70">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <CardDescription className="text-xs">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5" aria-hidden>
                      {option.swatches.map((color, i) => (
                        <span
                          key={i}
                          className="size-5 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {isActive && (
                      <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                        <CheckIcon className="size-3" />
                        {t("labels.active")}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
