import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status chip in the "tavolo luminoso" voice: an outline badge with a small
 * colored dot. Colors come from the chart tokens (tuned per theme in
 * globals.css), so states stay legible across light / dark / vivid / glass —
 * unlike raw Tailwind palette classes, which are banned.
 *
 * Tone map:
 *  - info    -> chart-1 (accessi, eventi informativi)
 *  - success -> chart-4 (attivo, riuscito, creazioni)
 *  - warning -> chart-5 (in corso, modifiche; add `pulse` for running states)
 *  - accent  -> chart-3 (backup / archivio)
 *  - neutral -> muted   (stati sconosciuti)
 *  - destructive -> plain destructive Badge passthrough (fallito, revocata,
 *    disattivato)
 */
export type StatusTone =
  | "info"
  | "success"
  | "warning"
  | "accent"
  | "neutral"
  | "destructive";

const DOT_CLASS: Record<Exclude<StatusTone, "destructive">, string> = {
  info: "bg-chart-1",
  success: "bg-chart-4",
  warning: "bg-chart-5",
  accent: "bg-chart-3",
  neutral: "bg-muted-foreground",
};

interface StatusBadgeProps {
  tone?: StatusTone;
  /** Animate the dot for in-progress states (e.g. backup "In corso"). */
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function StatusBadge({
  tone = "neutral",
  pulse = false,
  className,
  children,
}: StatusBadgeProps) {
  if (tone === "destructive") {
    return (
      <Badge variant="destructive" className={className}>
        {children}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("gap-1.5", className)}>
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          DOT_CLASS[tone],
          pulse && "animate-pulse"
        )}
        aria-hidden
      />
      {children}
    </Badge>
  );
}
