"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImageViewer } from "@/components/image-viewer";

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string | undefined;
  downloadUrl?: string | undefined;
}

/**
 * Modal that shows a large, zoomable version of an image. Controlled via
 * `open`/`onOpenChange` so callers open it from a thumbnail/preview click.
 *
 * Styled as a "darkroom": a fixed near-black surround (independent of the
 * active theme, like every photo lightbox) framed by 35mm sprocket strips,
 * so the image reads as a projected slide. The --background/--foreground
 * overrides re-tokenize everything inside the dialog (sprocket dots,
 * viewer controls, zoom badge) for the dark surround in all four themes.
 */
export function ImageLightbox({
  open,
  onOpenChange,
  src,
  alt,
  downloadUrl,
}: ImageLightboxProps) {
  const title = alt ?? "Anteprima immagine";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,1200px)] gap-0 border-0 bg-black/95 p-2 text-white ring-1 ring-white/10 sm:max-w-[min(96vw,1200px)] [--background:oklch(0.16_0_0)] [--foreground:oklch(0.97_0_0)]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {src && (
          <>
            <div className="film-sprockets mb-1.5 shrink-0 opacity-50" aria-hidden />
            <ImageViewer
              src={src}
              alt={title}
              {...(downloadUrl ? { downloadUrl } : {})}
              controlsPosition="bottom-right"
              className="h-[min(80vh,48rem)] w-full border-0 bg-transparent"
            />
            <div className="film-sprockets mt-1.5 shrink-0 opacity-50" aria-hidden />
            {/* Visible caption bar; aria-hidden because the DialogTitle above
                already announces the same text. */}
            <p
              aria-hidden="true"
              className="truncate px-1 pt-1.5 font-mono text-[11px] uppercase tracking-wider text-white/60"
            >
              {title}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
