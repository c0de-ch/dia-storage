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
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;

export function ImageViewer({
  src,
  alt = "Immagine",
  downloadUrl,
  className,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isZoomed = zoom > 1;

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Scroll to zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    },
    []
  );

  // Drag to pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [isZoomed, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
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
        "group/viewer relative overflow-hidden rounded-lg border bg-muted",
        isFullscreen && "rounded-none border-0",
        className
      )}
    >
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 rounded-lg bg-background/80 p-1 opacity-0 shadow backdrop-blur-sm transition-opacity group-hover/viewer:opacity-100">
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
        <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Image */}
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          isZoomed ? "cursor-grab" : "cursor-zoom-in",
          isDragging && "cursor-grabbing"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- zoom/pan viewer needs the raw image element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
        />
      </div>
    </div>
  );
}
