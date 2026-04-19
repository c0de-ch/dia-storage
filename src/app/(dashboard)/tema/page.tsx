"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SparklesIcon,
  SunIcon,
  WandSparklesIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  swatches: string[];
  preview: string;
}

const themes: ThemeOption[] = [
  {
    value: "light",
    labelKey: "settings.themeLight",
    description:
      "Palette fotografica calda con primario ambra e accenti teal. Ideale per la luce diurna.",
    icon: SunIcon,
    swatches: [
      "oklch(0.62 0.16 50)",
      "oklch(0.93 0.04 195)",
      "oklch(0.6 0.16 320)",
      "oklch(0.7 0.14 130)",
    ],
    preview: "linear-gradient(135deg, oklch(0.985 0.005 75), oklch(0.94 0.025 70))",
  },
  {
    value: "dark",
    labelKey: "settings.themeDark",
    description:
      "Stessa palette calda in versione scura. Riposa la vista nelle ore serali.",
    icon: MoonIcon,
    swatches: [
      "oklch(0.78 0.15 65)",
      "oklch(0.32 0.045 200)",
      "oklch(0.7 0.17 320)",
      "oklch(0.78 0.15 130)",
    ],
    preview: "linear-gradient(135deg, oklch(0.16 0.018 60), oklch(0.28 0.025 60))",
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
  },
  {
    value: "system",
    labelKey: "settings.themeSystem",
    description:
      "Segue automaticamente le preferenze del tuo sistema operativo (chiaro o scuro).",
    icon: MonitorIcon,
    swatches: [
      "oklch(0.62 0.16 50)",
      "oklch(0.78 0.15 65)",
      "oklch(0.93 0.04 195)",
      "oklch(0.32 0.045 200)",
    ],
    preview:
      "linear-gradient(135deg, oklch(0.985 0.005 75) 0%, oklch(0.985 0.005 75) 50%, oklch(0.16 0.018 60) 50%, oklch(0.16 0.018 60) 100%)",
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <PaletteIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{t("nav.theme")}</h1>
          <p className="text-sm text-muted-foreground">
            Scegli l&apos;aspetto dell&apos;applicazione. Il cambiamento è
            immediato e viene ricordato sul tuo dispositivo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((option) => {
          const isActive = mounted && theme === option.value;
          const Icon = option.icon;
          return (
            <Card
              key={option.value}
              className={cn(
                "overflow-hidden transition-all",
                isActive
                  ? "border-primary ring-2 ring-primary/30"
                  : "hover:border-primary/40"
              )}
            >
              <div
                className="h-24 w-full"
                style={{ background: option.preview }}
                aria-hidden
              />
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4" />
                    {t(option.labelKey)}
                  </CardTitle>
                  {isActive && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckIcon className="size-3" />
                      Attivo
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {option.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" aria-hidden>
                  {option.swatches.map((color, i) => (
                    <span
                      key={i}
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "secondary" : "default"}
                  onClick={() => setTheme(option.value)}
                  disabled={isActive}
                >
                  {isActive ? "Attivo" : "Applica"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
