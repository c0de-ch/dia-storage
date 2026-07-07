import { AlertTriangleIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface EmptyMountProps {
  icon: LucideIcon;
  title: string;
  hint?: React.ReactNode | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

/**
 * The app-wide empty state: a tilted, empty 35mm slide mount on the light
 * table (the idiom the galleria established), with copy underneath.
 */
export function EmptyMount({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: EmptyMountProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-24 text-center",
        className
      )}
    >
      <div
        data-slot="card"
        className="w-44 -rotate-3 rounded-sm border bg-card p-2 shadow-sm"
      >
        <div className="flex aspect-[3/2] items-center justify-center rounded-[3px] border border-dashed bg-muted">
          <Icon className="size-8 text-muted-foreground/40" aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-medium text-muted-foreground">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground/70">{hint}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * Fetch-failure state with a retry affordance. Distinct from EmptyMount so
 * an outage never masquerades as an empty archive.
 */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-24 text-center",
        className
      )}
    >
      <div
        data-slot="card"
        className="w-44 rotate-2 rounded-sm border bg-card p-2 shadow-sm"
      >
        <div className="flex aspect-[3/2] items-center justify-center rounded-[3px] border border-dashed border-destructive/40 bg-destructive/5">
          <AlertTriangleIcon className="size-8 text-destructive/70" aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-medium text-muted-foreground">{message}</h2>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("actions.retry")}
        </Button>
      )}
    </div>
  );
}
