"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, Share2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";

interface ShareEntry {
  userId: number;
  email: string;
  name: string | null;
}

function initials(nameOrEmail: string): string {
  return nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * "Condividi galleria" — lets the signed-in user share their whole gallery
 * (all their slides) read-only with another registered user, and manage the
 * recipients. Self-contained so it can drop into the gallery masthead.
 */
export function GalleryShareButton() {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function load() {
    setOpen(true);
    setEmail("");
    setShares([]);
    setLoadingShares(true);
    try {
      const res = await fetch("/api/v1/gallery-shares", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares ?? []);
      }
    } catch {
      setShares([]);
    } finally {
      setLoadingShares(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/gallery-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShares((prev) =>
          prev.some((s) => s.userId === data.share.userId)
            ? prev
            : [...prev, data.share]
        );
        setEmail("");
        toast.success(t("sharing.sharedToast", { email: data.share.email }));
      } else {
        toast.error(data.message ?? t("errors.generic"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: number) {
    if (removingId !== null) return;
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/v1/gallery-shares?userId=${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setShares((prev) => prev.filter((s) => s.userId !== userId));
      else toast.error(t("errors.generic"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={load}>
        <Share2Icon className="mr-1.5 size-4" />
        {t("sharing.shareGallery")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sharing.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("sharing.dialogDescription")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={add} className="flex gap-2">
            <Input
              type="email"
              placeholder="nome@esempio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
              {t("actions.share")}
            </Button>
          </form>

          <div className="mt-1 flex flex-col gap-2">
            <div className="film-sprockets opacity-50" aria-hidden />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {t("sharing.sharedWith")}
            </p>
            {loadingShares ? (
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-11 rounded-md" />
                <Skeleton className="h-11 rounded-md" />
              </div>
            ) : shares.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                {t("sharing.notSharedYet")}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {shares.map((s) => (
                  <li
                    key={s.userId}
                    className="flex items-center gap-2.5 rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[10px] font-bold uppercase text-secondary-foreground">
                      {initials(s.name || s.email)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {s.name && <span className="font-medium">{s.name} · </span>}
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.email}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => remove(s.userId)}
                      disabled={removingId !== null}
                      aria-label={t("sharing.removeRecipient", { email: s.email })}
                    >
                      {removingId === s.userId ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <XIcon className="size-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
