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
 */
export function ImageLightbox({
  open,
  onOpenChange,
  src,
  alt,
  downloadUrl,
}: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,1100px)] p-2 sm:max-w-[min(96vw,1100px)]">
        <DialogTitle className="sr-only">{alt ?? "Anteprima immagine"}</DialogTitle>
        {src && (
          <ImageViewer
            src={src}
            alt={alt ?? "Anteprima immagine"}
            {...(downloadUrl ? { downloadUrl } : {})}
            controlsPosition="bottom-right"
            className="h-[80vh] w-full border-0"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
