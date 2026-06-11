"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpPopover } from "@/components/help-popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftIcon,
  FolderInputIcon,
  ImageIcon,
  LibraryIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type { Slide } from "@/types/slide";

interface Album {
  id: number;
  name: string;
  description: string | null;
  coverSlideId: number | null;
  slides?: Slide[];
  // "owner" = the user owns / can manage this album; "shared" = it was shared
  // with them (read-only). Set by GET /api/v1/collections/[id].
  access?: "owner" | "shared";
}

interface ShareEntry {
  userId: number;
  email: string;
  name: string | null;
}

export default function AlbumDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const albumId = Number(params?.id);

  const [album, setAlbum] = useState<Album | null>(null);
  const [allAlbums, setAllAlbums] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [candidates, setCandidates] = useState<Slide[]>([]);
  const [addSelected, setAddSelected] = useState<Set<number>>(new Set());
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [adding, setAdding] = useState(false);

  // Sharing
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);

  const canManage = album?.access !== "shared";

  const load = useCallback(async () => {
    try {
      const [cRes, listRes] = await Promise.all([
        fetch(`/api/v1/collections/${albumId}`, { credentials: "include" }),
        fetch(`/api/v1/collections?limit=100`, { credentials: "include" }),
      ]);
      if (!cRes.ok) {
        setMissing(true);
        return;
      }
      const cData = await cRes.json();
      const coll = cData.collection as Album;
      // Default the cover to the first photo if none is set yet, so the album
      // card shows a thumbnail.
      const firstSlide = coll.slides?.[0];
      if (!coll.coverSlideId && firstSlide) {
        coll.coverSlideId = firstSlide.id;
        fetch(`/api/v1/collections/${albumId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverSlideId: firstSlide.id }),
          credentials: "include",
        }).catch(() => {});
      }
      setAlbum(coll);
      if (listRes.ok) {
        const lData = await listRes.json();
        setAllAlbums(
          (lData.collections ?? []).map((c: { id: number; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (albumId) load();
  }, [albumId, load]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function rename() {
    const name = prompt("Nuovo nome dell'album:", album?.name ?? "");
    if (!name || !name.trim()) return;
    const res = await fetch(`/api/v1/collections/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
      credentials: "include",
    });
    if (res.ok) {
      setAlbum((a) => (a ? { ...a, name: name.trim() } : a));
      toast.success(t("success.collectionUpdated"));
    } else {
      toast.error(t("errors.generic"));
    }
  }

  async function deleteAlbum() {
    if (
      !window.confirm(
        `Eliminare l'album "${album?.name}"? Le foto NON verranno eliminate.`
      )
    )
      return;
    const res = await fetch(`/api/v1/collections/${albumId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success(t("success.collectionDeleted"));
      router.push("/galleria?view=albums");
    } else {
      toast.error(t("errors.generic"));
    }
  }

  async function setCover(slideId: number) {
    const res = await fetch(`/api/v1/collections/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverSlideId: slideId }),
      credentials: "include",
    });
    if (res.ok) {
      setAlbum((a) => (a ? { ...a, coverSlideId: slideId } : a));
      setSelected(new Set());
      toast.success("Copertina aggiornata");
    } else {
      toast.error(t("errors.generic"));
    }
  }

  async function removeSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    for (const id of [...selected]) {
      await fetch(`/api/v1/collections/${albumId}/slides?slideId=${id}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
    setSelected(new Set());
    setBusy(false);
    toast.success("Foto rimosse dall'album");
    load();
  }

  async function moveSelected(targetId: number) {
    if (selected.size === 0) return;
    setBusy(true);
    const ids = [...selected];
    // Add to the target album, then remove from this one.
    await fetch(`/api/v1/collections/${targetId}/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideIds: ids }),
      credentials: "include",
    }).catch(() => {});
    for (const id of ids) {
      await fetch(`/api/v1/collections/${albumId}/slides?slideId=${id}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
    setSelected(new Set());
    setBusy(false);
    toast.success("Foto spostate");
    load();
  }

  async function openShare() {
    setShareOpen(true);
    setShareEmail("");
    try {
      const res = await fetch(`/api/v1/collections/${albumId}/shares`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares ?? []);
      }
    } catch {
      setShares([]);
    }
  }

  async function addShare(e: React.FormEvent) {
    e.preventDefault();
    const email = shareEmail.trim().toLowerCase();
    if (!email) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/v1/collections/${albumId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Avoid a duplicate row if the album was already shared with them.
        setShares((prev) =>
          prev.some((s) => s.userId === data.share.userId)
            ? prev
            : [...prev, data.share]
        );
        setShareEmail("");
        toast.success(`Album condiviso con ${data.share.email}`);
      } else {
        toast.error(data.message ?? t("errors.generic"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setSharing(false);
    }
  }

  async function removeShare(userId: number) {
    const res = await fetch(
      `/api/v1/collections/${albumId}/shares?userId=${userId}`,
      { method: "DELETE", credentials: "include" }
    );
    if (res.ok) {
      setShares((prev) => prev.filter((s) => s.userId !== userId));
    } else {
      toast.error(t("errors.generic"));
    }
  }

  async function openAdd() {
    setAddOpen(true);
    setAddSelected(new Set());
    setLoadingCandidates(true);
    try {
      const res = await fetch(
        `/api/v1/slides?status=active&limit=100&sortBy=createdAt&sortOrder=desc`,
        { credentials: "include" }
      );
      const data = await res.json();
      const inAlbum = new Set((album?.slides ?? []).map((s) => s.id));
      setCandidates(
        (data.slides ?? []).filter((s: Slide) => !inAlbum.has(s.id))
      );
    } catch {
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function confirmAdd() {
    if (addSelected.size === 0) {
      setAddOpen(false);
      return;
    }
    setAdding(true);
    const res = await fetch(`/api/v1/collections/${albumId}/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideIds: [...addSelected] }),
      credentials: "include",
    });
    setAdding(false);
    if (res.ok) {
      toast.success("Foto aggiunte");
      setAddOpen(false);
      load();
    } else {
      toast.error(t("errors.generic"));
    }
  }

  const otherAlbums = allAlbums.filter((a) => a.id !== albumId);
  const slides = album?.slides ?? [];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (missing || !album) {
    return (
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          nativeButton={false}
          render={<Link href="/galleria?view=albums" />}
        >
          <ArrowLeftIcon />
          {t("gallery.albums")}
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LibraryIcon className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">{t("errors.collectionNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            nativeButton={false}
            render={<Link href="/galleria?view=albums" />}
          >
            <ArrowLeftIcon />
            {t("gallery.albums")}
          </Button>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{album.name}</h1>
            {canManage && (
              <HelpPopover
                items={[
                  "Clicca una foto per aprirla.",
                  "Spunta le foto, poi «Sposta in» per spostarle in un altro album o «Rimuovi».",
                  "Con una sola foto selezionata, «Imposta copertina» sceglie la miniatura.",
                  "«Aggiungi foto» inserisce altre diapositive nell'album.",
                  "«Condividi» dà accesso in sola lettura a un altro utente registrato.",
                ]}
              />
            )}
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {slides.length === 1 ? "1 foto" : `${slides.length} foto`}
            {!canManage && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                <UsersIcon className="size-3" />
                Condiviso con te
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={openAdd}>
              <PlusIcon />
              Aggiungi foto
            </Button>
            <Button variant="outline" size="sm" onClick={openShare}>
              <Share2Icon />
              Condividi
            </Button>
            <Button variant="outline" size="sm" onClick={rename}>
              <PencilIcon />
              Rinomina
            </Button>
            <Button variant="destructive" size="sm" onClick={deleteAlbum}>
              <Trash2Icon />
              {t("actions.delete")}
            </Button>
          </div>
        )}
      </div>

      {/* Selection toolbar (owner only) */}
      {canManage && slides.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelected((prev) =>
                prev.size === slides.length
                  ? new Set()
                  : new Set(slides.map((s) => s.id))
              )
            }
          >
            {selected.size === slides.length
              ? "Deseleziona tutte"
              : "Seleziona tutte"}
          </Button>
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">
                {selected.size} selezionate
              </span>
              {selected.size === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setCover([...selected][0]!)}
                >
                  <ImageIcon />
                  Imposta copertina
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" disabled={busy}>
                      <FolderInputIcon />
                      Sposta in
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  {otherAlbums.length === 0 ? (
                    <DropdownMenuItem disabled>
                      Nessun altro album
                    </DropdownMenuItem>
                  ) : (
                    otherAlbums.map((a) => (
                      <DropdownMenuItem
                        key={a.id}
                        onClick={() => moveSelected(a.id)}
                      >
                        {a.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={removeSelected}
              >
                <Trash2Icon />
                Rimuovi
              </Button>
              {busy && <Loader2Icon className="size-4 animate-spin" />}
            </>
          )}
        </div>
      )}

      {/* Photo grid */}
      {slides.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">Album vuoto</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Usa &laquo;Aggiungi foto&raquo; per popolarlo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={cn(
                "group/thumb relative aspect-square overflow-hidden rounded-md border bg-muted transition-all",
                selected.has(slide.id) && "ring-2 ring-primary"
              )}
            >
              {canManage && (
                <div
                  className={cn(
                    "absolute top-1.5 left-1.5 z-10 transition-opacity",
                    selected.has(slide.id)
                      ? "opacity-100"
                      : "opacity-0 group-hover/thumb:opacity-100"
                  )}
                >
                  <div className="rounded bg-background/80 p-0.5 backdrop-blur-sm">
                    <Checkbox
                      checked={selected.has(slide.id)}
                      onCheckedChange={() => toggle(slide.id)}
                    />
                  </div>
                </div>
              )}
              {album.coverSlideId === slide.id && (
                <span className="absolute top-1.5 right-1.5 z-10 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Copertina
                </span>
              )}
              <Link href={`/galleria/${slide.id}`} className="block size-full">
                <Image
                  src={`/api/v1/slides/${slide.id}/thumbnail`}
                  alt={slide.title ?? slide.originalFilename ?? "Diapositiva"}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover"
                  loading="lazy"
                />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add photos dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[min(96vw,900px)] sm:max-w-[min(96vw,900px)]">
          <DialogHeader>
            <DialogTitle>Aggiungi foto all&apos;album</DialogTitle>
            <DialogDescription>
              Seleziona le foto da aggiungere a &laquo;{album.name}&raquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {loadingCandidates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nessuna foto disponibile da aggiungere.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {candidates.map((slide) => {
                  const isSel = addSelected.has(slide.id);
                  return (
                    <button
                      type="button"
                      key={slide.id}
                      onClick={() =>
                        setAddSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(slide.id)) next.delete(slide.id);
                          else next.add(slide.id);
                          return next;
                        })
                      }
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-md border bg-muted",
                        isSel && "ring-2 ring-primary"
                      )}
                    >
                      <Image
                        src={`/api/v1/slides/${slide.id}/thumbnail`}
                        alt={slide.title ?? slide.originalFilename ?? "Diapositiva"}
                        fill
                        sizes="16vw"
                        className="object-cover"
                        loading="lazy"
                      />
                      {isSel && (
                        <div className="absolute inset-0 bg-primary/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={confirmAdd} disabled={adding || addSelected.size === 0}>
              {adding ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              Aggiungi {addSelected.size > 0 ? `(${addSelected.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Condividi &laquo;{album.name}&raquo;</DialogTitle>
            <DialogDescription>
              Inserisci l&apos;email di un utente registrato per dargli accesso
              in sola lettura a questo album e alle sue foto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={addShare} className="flex gap-2">
            <Input
              type="email"
              placeholder="nome@esempio.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={sharing || !shareEmail.trim()}>
              {sharing ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
              Condividi
            </Button>
          </form>

          <div className="mt-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Condiviso con
            </p>
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Non ancora condiviso con nessuno.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {shares.map((s) => (
                  <li
                    key={s.userId}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {s.name ? `${s.name} · ` : ""}
                      {s.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => removeShare(s.userId)}
                      aria-label={`Rimuovi ${s.email}`}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
