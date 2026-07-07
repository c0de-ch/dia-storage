"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePickerIt } from "@/components/date-picker-it";
import { LocationPicker } from "@/components/location-picker";
import { t } from "@/lib/i18n";

export interface MetadataFormValues {
  title: string;
  dateTaken: string;
  dateTakenPrecise: string | null;
  location: string;
  notes: string;
}

interface MetadataFormProps {
  slideId: number;
  initialValues: MetadataFormValues;
  onSave?: (values: MetadataFormValues) => Promise<void>;
  /** Called after a successful save so the parent can sync its slide state. */
  onSaved?: (values: MetadataFormValues) => void;
  onExifWrite?: () => void;
  /** Disables the "Scrivi EXIF" button while the write is in flight. */
  exifWriting?: boolean;
  /** Read-only variant: inputs disabled, save/EXIF buttons hidden. */
  readOnly?: boolean;
  className?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function MetadataForm({
  slideId,
  initialValues,
  onSave,
  onSaved,
  onExifWrite,
  exifWriting = false,
  readOnly = false,
  className,
}: MetadataFormProps) {
  const [values, setValues] = useState<MetadataFormValues>(initialValues);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const prevValuesRef = useRef(initialValues);

  // Keep the latest initialValues in a ref so the reset effect below can
  // stay keyed on slideId only — resetting on every new initialValues
  // object identity would wipe unsaved edits on any parent re-render.
  const latestInitialValues = useRef(initialValues);
  latestInitialValues.current = initialValues;

  // Reset ONLY when the slide actually changes
  useEffect(() => {
    setValues(latestInitialValues.current);
    prevValuesRef.current = latestInitialValues.current;
    setSaveStatus("idle");
  }, [slideId]);

  const doSave = useCallback(
    async (vals: MetadataFormValues) => {
      try {
        setSaveStatus("saving");
        if (onSave) {
          await onSave(vals);
        } else {
          const res = await fetch(`/api/v1/slides/${slideId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: vals.title || null,
              dateTaken: vals.dateTaken || null,
              dateTakenPrecise: vals.dateTakenPrecise || null,
              location: vals.location || null,
              notes: vals.notes || null,
            }),
          });
          if (!res.ok) throw new Error("Errore nel salvataggio");
        }
        prevValuesRef.current = vals;
        onSaved?.(vals);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
    [slideId, onSave, onSaved]
  );

  const handleChange = useCallback(
    (field: keyof MetadataFormValues, fieldValue: string | null) => {
      setValues((prev) => {
        const next = { ...prev, [field]: fieldValue ?? "" };
        // Auto-save with debounce
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSave(next), 2000);
        return next;
      });
    },
    [doSave]
  );

  const handleDateChange = useCallback(
    (freeText: string, preciseDate: string | null) => {
      setValues((prev) => {
        const next = {
          ...prev,
          dateTaken: freeText,
          dateTakenPrecise: preciseDate,
        };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSave(next), 2000);
        return next;
      });
    },
    [doSave]
  );

  function handleManualSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(values);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="meta-title">{t("labels.title")}</Label>
        <Input
          id="meta-title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder={t("metadata.slideTitlePlaceholder")}
          disabled={readOnly}
        />
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label htmlFor="meta-date">Data</Label>
        {readOnly ? (
          <Input id="meta-date" value={values.dateTaken} disabled />
        ) : (
          <DatePickerIt
            value={values.dateTaken}
            preciseValue={values.dateTakenPrecise}
            onChange={handleDateChange}
          />
        )}
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="meta-location">Luogo</Label>
        {readOnly ? (
          <Input id="meta-location" value={values.location} disabled />
        ) : (
          <LocationPicker
            id="meta-location"
            value={values.location}
            onChange={(v) => handleChange("location", v)}
            placeholder="Cerca un luogo..."
          />
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="meta-notes">Note</Label>
        <Textarea
          id="meta-notes"
          value={values.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Note aggiuntive..."
          rows={3}
          disabled={readOnly}
        />
      </div>

      {/* Action buttons & status */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button onClick={handleManualSave} size="sm" disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? (
              <>
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                {t("labels.saving")}
              </>
            ) : (
              <>
                <SaveIcon className="mr-1.5 size-3.5" />
                {t("metadata.saveChanges")}
              </>
            )}
          </Button>

          {onExifWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExifWrite}
              disabled={exifWriting}
            >
              {exifWriting && (
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
              )}
              Scrivi EXIF
            </Button>
          )}

          <span role="status" aria-live="polite" className="text-xs">
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-success">
                <CheckIcon className="size-3" />
                Salvato
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-destructive">Errore nel salvataggio</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
