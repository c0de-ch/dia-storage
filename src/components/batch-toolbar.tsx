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

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onDeselectAll}>
          <XIcon className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {selectedCount}{" "}
          {selectedCount === 1
            ? "diapositiva selezionata"
            : "diapositive selezionate"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon className="mr-1.5 size-3.5" />
          Modifica metadati
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <DownloadIcon className="mr-1.5 size-3.5" />
          Scarica
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                <Trash2Icon className="mr-1.5 size-3.5" />
                Elimina
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler eliminare {selectedCount}{" "}
                {selectedCount === 1 ? "diapositiva" : "diapositive"}? Questa
                azione non puo essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
