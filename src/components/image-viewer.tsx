"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MaximizeIcon,
  MinimizeIcon,
  RotateCcwIcon,
  DownloadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  src: string;
  alt?: string;
  downloadUrl?: string;
  className?: string;
  /** Where the zoom/fullscreen/download toolbar sits. Defaults to top-right;
   *  use bottom-right inside a modal so it clears the dialog close button. */
  controlsPosition?: "top-right" | "bottom-right";
  /** Optional CSS filter (e.g. "brightness(1.1) contrast(0.9)") for live,
   *  non-destructive color-correction preview. */
  imageFilter?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;
const DOUBLE_CLICK_ZOOM = 2.5;

interface Point {
  x: number;
  y: number;
}

/**
 * Darkroom-style zoom/pan viewer: the photo floats on a near-black
 * surround so letterbox bands read as film rebate, not unfinished UI.
 */
export function ImageViewer({
  src,
  alt = "Immagine",
  downloadUrl,
  className,
  controlsPosition = "top-right",
  imageFilter,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isZoomed = zoom > 1;

  /** Keep the image from being dragged fully out of the viewport. */
  const clampPan = useCallback((p: Point, z: number): Point => {
    const el = containerRef.current;
    if (!el || z <= 1) return { x: 0, y: 0 };
    const maxX = (el.clientWidth * (z - 1)) / 2;
    const maxY = (el.clientHeight * (z - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y)),
    };
  }, []);

  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
      zoomRef.current = clamped;
      setZoom(clamped);
      setPan((prev) => clampPan(prev, clamped));
    },
    [clampPan]
  );

  const resetView = useCallback(() => {
    zoomRef.current = 1;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Scroll to zoom. Attached natively with { passive: false } so
  // preventDefault actually stops the page from scrolling (React's
  // onWheel is registered passively and cannot).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      applyZoom(zoomRef.current + delta);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // Double-click (double-tap on touch) toggles zoom
  const handleDoubleClick = useCallback(() => {
    if (zoomRef.current > 1) {
      resetView();
    } else {
      applyZoom(DOUBLE_CLICK_ZOOM);
    }
  }, [applyZoom, resetView]);

  // Drag to pan — pointer events so mouse and touch both work
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isZoomed) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [isZoomed, pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setPan(
        clampPan(
          { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y },
          zoomRef.current
        )
      );
    },
    [isDragging, dragStart, clampPan]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Download
  function handleDownload() {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/viewer relative overflow-hidden rounded-lg border bg-neutral-950",
        isFullscreen && "rounded-none border-0 bg-black",
        className
      )}
    >
      {/* Controls — revealed on hover, keyboard focus, or touch devices */}
      <div
        className={cn(
          "absolute right-2 z-10 flex gap-1 rounded-lg bg-background/80 p-1 opacity-0 shadow backdrop-blur-sm transition-opacity",
          "group-hover/viewer:opacity-100 group-focus-within/viewer:opacity-100 pointer-coarse:opacity-100",
          controlsPosition === "bottom-right" ? "bottom-2" : "top-2"
        )}
      >
        {isZoomed && (
          <Button variant="ghost" size="icon-xs" onClick={resetView} title="Reimposta zoom">
            <RotateCcwIcon className="size-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
        >
          {isFullscreen ? (
            <MinimizeIcon className="size-3.5" />
          ) : (
            <MaximizeIcon className="size-3.5" />
          )}
        </Button>
        {downloadUrl && (
          <Button variant="ghost" size="icon-xs" onClick={handleDownload} title="Scarica originale">
            <DownloadIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Zoom level indicator */}
      {isZoomed && (
        <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-0.5 font-mono text-xs tabular-nums backdrop-blur-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Image */}
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          isZoomed ? "cursor-grab" : "cursor-default",
          isDragging && "cursor-grabbing"
        )}
        style={{ touchAction: isZoomed ? "none" : undefined }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- zoom/pan viewer needs the raw image element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            filter: imageFilter,
          }}
        />
      </div>
    </div>
  );
}
