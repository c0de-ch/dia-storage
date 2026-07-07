"use client";

import { XIcon, PencilIcon, DownloadIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { t } from "@/lib/i18n";

interface BatchToolbarProps {
  selectedCount: number;
  onEdit?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onDeselectAll?: () => void;
}

export function BatchToolbar({
  selectedCount,
  onEdit,
  onDownload,
  onDelete,
  onDeselectAll,
}: BatchToolbarProps) {
  if (selectedCount === 0) return null;

  const selectedUnit =
    selectedCount === 1 ? "diapositiva selezionata" : "diapositive selezionate";

  const deleteMessage =
    selectedCount === 1
      ? t("confirm.deleteSlidesSingular")
      : t("confirm.deleteSlidesPlural", { count: selectedCount });

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="border-t bg-background/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="film-sprockets opacity-40" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pb-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDeselectAll}
              aria-label={t("actions.deselectAll")}
            >
              <XIcon className="size-4" />
            </Button>
            <span className="font-mono text-lg font-bold leading-none tabular-nums text-primary">
              {String(selectedCount).padStart(2, "0")}
            </span>
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {selectedUnit}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <PencilIcon className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("gallery.editMetadata")}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <DownloadIcon className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("actions.download")}</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="sm">
                    <Trash2Icon className="size-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t("actions.delete")}</span>
                  </Button>
                }
              />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirm.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{deleteMessage}</AlertDialogDescription>
            </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("actions.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
