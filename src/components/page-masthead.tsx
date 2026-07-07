import { cn } from "@/lib/utils";

interface PageMastheadProps {
  /** Mono uppercase kicker above the title, e.g. "Archivio · In arrivo" */
  eyebrow: string;
  title: string;
  /**
   * Optional counter shown to the right of the title in the masthead style
   * (mono, zero-padded, primary). Pass null while it is still loading to
   * render the "····" placeholder; undefined hides the counter.
   */
  count?: number | null | undefined;
  /** Unit label next to the counter, e.g. "diapositive" */
  countLabel?: string | undefined;
  /** "lg" for archive pages, "md" for utility/admin pages */
  size?: "lg" | "md" | undefined;
  /** Left side of the row under the sprocket divider */
  subtitle?: React.ReactNode | undefined;
  /** Right side of the row under the sprocket divider (buttons etc.) */
  action?: React.ReactNode | undefined;
  /** Extra content below the subtitle row (e.g. context banners) */
  children?: React.ReactNode | undefined;
  className?: string | undefined;
}

/**
 * The editorial "tavolo luminoso" masthead established by the galleria:
 * mono kicker, black uppercase Biryani title, optional frame counter,
 * 35mm sprocket divider. One component so every page reads as one product.
 */
export function PageMasthead({
  eyebrow,
  title,
  count,
  countLabel,
  size = "lg",
  subtitle,
  action,
  children,
  className,
}: PageMastheadProps) {
  const showCounter = count !== undefined;

  return (
    <header className={cn("slide-reveal", className)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
        {eyebrow}
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1
          className={cn(
            "font-black uppercase leading-none tracking-tight",
            size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"
          )}
        >
          {title}
        </h1>
        {showCounter && (
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold leading-none tabular-nums text-primary sm:text-3xl">
              {count == null ? "····" : String(count).padStart(4, "0")}
            </span>
            {countLabel && (
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {countLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="film-sprockets mt-3" aria-hidden />
      {(subtitle || action) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {subtitle ? (
            <p className="text-sm font-light text-muted-foreground">{subtitle}</p>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </header>
  );
}
