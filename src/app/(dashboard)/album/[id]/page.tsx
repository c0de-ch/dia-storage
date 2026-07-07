"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpPopover } from "@/components/help-popover";
import { PageMasthead } from "@/components/page-masthead";
import { EmptyMount, ErrorState } from "@/components/state-views";
import { SlideCard, SlideCardSkeleton } from "@/components/slide-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  CheckIcon,
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
  const [errored, setErrored] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [candidates, setCandidates] = useState<Slide[]>([]);
  const [addSelected, setAddSelected] = useState<Set<number>>(new Set());
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [adding, setAdding] = useState(false);

  // Rename / delete (themed dialogs instead of native prompt()/confirm())
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sharing
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);

  const canManage = album?.access !== "shared";

  const load = useCallback(async () => {
    setMissing(false);
    setErrored(false);
    try {
      const [cRes, listRes] = await Promise.all([
        fetch(`/api/v1/collections/${albumId}`, { credentials: "include" }),
        fetch(`/api/v1/collections?limit=100`, { credentials: "include" }),
      ]);
      if (cRes.status === 404 || cRes.status === 403) {
        // The album really does not exist (or is no longer shared with us).
        setMissing(true);
        return;
      }
      if (!cRes.ok) {
        // Server / transient failure: show a retryable error, not "not found".
        setErrored(true);
        return;
      }
      const cData = await cRes.json();
      const coll = cData.collection as Album;
      // Default the cover to the first photo if none is set yet, so the album
      // card shows a thumbnail. Owners only: shared viewers cannot PATCH.
      const firstSlide = coll.slides?.[0];
      if (!coll.coverSlideId && firstSlide) {
        coll.coverSlideId = firstSlide.id;
        if (coll.access !== "shared") {
          fetch(`/api/v1/collections/${albumId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coverSlideId: firstSlide.id }),
            credentials: "include",
          }).catch(() => {});
        }
      }
      setAlbum(coll);
      if (listRes.ok) {
        const lData = await listRes.json();
        // Only albums the user owns: albums shared with them are read-only,
        // so they can never be a move target.
        setAllAlbums(
          (lData.collections ?? [])
            .filter(
              (c: { id: number; name: string; shared?: boolean }) => !c.shared
            )
            .map((c: { id: number; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
        );
      }
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (albumId) load();
  }, [albumId, load]);

  const handleSelect = useCallback((id: number, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  function openRename() {
    setRenameName(album?.name ?? "");
    setRenameOpen(true);
  }

  async function submitRename(e: React.FormEvent) {
    e.preventDefault();
    const name = renameName.trim();
    if (!name || renaming) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/v1/collections/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (res.ok) {
        setAlbum((a) => (a ? { ...a, name } : a));
        toast.success(t("success.collectionUpdated"));
        setRenameOpen(false);
      } else {
        toast.error(t("errors.generic"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setRenaming(false);
    }
  }

  async function deleteAlbum() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/collections/${albumId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success(t("success.collectionDeleted"));
        router.push("/galleria?view=albums");
        return;
      }
      toast.error(t("errors.generic"));
      setDeleteOpen(false);
    } catch {
      toast.error(t("errors.generic"));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
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
    const ids = [...selected];
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch(
          `/api/v1/collections/${albumId}/slides?slideId=${id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
    }
    setSelected(new Set());
    setBusy(false);
    if (failed === 0) {
      toast.success(
        ids.length === 1 ? "Foto rimossa dall'album" : "Foto rimosse dall'album"
      );
    } else if (failed === ids.length) {
      toast.error("Nessuna foto rimossa. Riprova.");
    } else {
      toast.warning(
        `Rimosse ${ids.length - failed} foto su ${ids.length}. Riprova per le restanti.`
      );
    }
    load();
  }

  async function moveSelected(targetId: number) {
    if (selected.size === 0) return;
    setBusy(true);
    const ids = [...selected];
    // Add to the target album first; abort if that fails so the photos are
    // never removed from this album without landing in the other one.
    let added = false;
    try {
      const res = await fetch(`/api/v1/collections/${targetId}/slides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIds: ids }),
        credentials: "include",
      });
      added = res.ok;
    } catch {
      added = false;
    }
    if (!added) {
      setBusy(false);
      toast.error("Spostamento non riuscito. Riprova.");
      return;
    }
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch(
          `/api/v1/collections/${albumId}/slides?slideId=${id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
    }
    setSelected(new Set());
    setBusy(false);
    if (failed === 0) {
      toast.success(ids.length === 1 ? "Foto spostata" : "Foto spostate");
    } else {
      toast.warning(
        `Foto aggiunte all'altro album, ma ${failed} su ${ids.length} non sono state rimosse da questo.`
      );
    }
    load();
  }

  async function openShare() {
    setShareOpen(true);
    setShareEmail("");
    // Reset the previous list so it never flashes stale entries, and show a
    // spinner until the fetch resolves.
    setShares([]);
    setLoadingShares(true);
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
    } finally {
      setLoadingShares(false);
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
    try {
      const res = await fetch(`/api/v1/collections/${albumId}/slides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIds: [...addSelected] }),
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Foto aggiunte");
        setAddOpen(false);
        load();
      } else {
        toast.error(t("errors.generic"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setAdding(false);
    }
  }

  const otherAlbums = allAlbums.filter((a) => a.id !== albumId);
  const slides = album?.slides ?? [];

  const backButton = (
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
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <Skeleton className="h-3 w-44" />
          <Skeleton className="mt-2 h-10 w-72" />
          <div className="film-sprockets mt-3" aria-hidden />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SlideCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (errored) {
    return (
      <div className="flex flex-col gap-4">
        {backButton}
        <ErrorState
          message="Errore di caricamento dell'album"
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      </div>
    );
  }

  if (missing || !album) {
    return (
      <div className="flex flex-col gap-4">
        {backButton}
        <EmptyMount
          icon={LibraryIcon}
          title={t("errors.collectionNotFound")}
          hint="L'album potrebbe essere stato eliminato o non essere più condiviso con te."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {backButton}

      <PageMasthead
        eyebrow="Album · Archivio 35 mm"
        title={album.name}
        count={slides.length}
        countLabel="foto"
        subtitle={
          !canManage || album.description ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {!canManage && (
                <span className="inline-flex items-center gap-1 rounded-sm border border-primary/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                  <UsersIcon className="size-3" />
                  Condiviso con te
                </span>
              )}
              {album.description}
            </span>
          ) : undefined
        }
        action={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <HelpPopover
                items={[
                  "Clicca una foto per aprirla.",
                  "Spunta le foto, poi «Sposta in» per spostarle in un altro album o «Rimuovi».",
                  "Con una sola foto selezionata, «Imposta copertina» sceglie la miniatura.",
                  "«Aggiungi foto» inserisce altre diapositive nell'album.",
                  "«Condividi» dà accesso in sola lettura a un altro utente registrato.",
                ]}
              />
              <Button variant="outline" size="sm" onClick={openAdd}>
                <PlusIcon />
                Aggiungi foto
              </Button>
              <Button variant="outline" size="sm" onClick={openShare}>
                <Share2Icon />
                {t("actions.share")}
              </Button>
              <Button variant="outline" size="sm" onClick={openRename}>
                <PencilIcon />
                {t("actions.rename")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon />
                {t("actions.delete")}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Selection toolbar (owner only) — sticky so bulk actions survive scroll */}
      {canManage && slides.length > 0 && (
        <>
          <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-md bg-background/90 px-1 py-1.5 backdrop-blur-sm">
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
                <span className="font-mono text-[11px] uppercase tracking-wider tabular-nums text-muted-foreground">
                  {String(selected.size).padStart(3, "0")} selezionate
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
          <div className="film-sprockets" aria-hidden />
        </>
      )}

      {/* Photo grid */}
      {slides.length === 0 ? (
        <EmptyMount
          icon={ImageIcon}
          title="Album vuoto"
          hint={
            canManage
              ? "Usa «Aggiungi foto» per popolarlo."
              : "Questo album non contiene ancora foto."
          }
          action={
            canManage ? (
              <Button variant="outline" size="sm" onClick={openAdd}>
                <PlusIcon />
                Aggiungi foto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="slide-reveal relative"
              style={{ animationDelay: `${Math.min(i, 20) * 35}ms` }}
            >
              {album.coverSlideId === slide.id && (
                <span className="pointer-events-none absolute top-3.5 right-3.5 z-10 rounded-sm bg-primary/90 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
                  Copertina
                </span>
              )}
              <SlideCard
                slide={slide}
                selected={selected.has(slide.id)}
                onSelect={handleSelect}
                showCheckbox={canManage && selected.size > 0}
                selectable={canManage}
              />
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
                      aria-pressed={isSel}
                      onClick={() =>
                        setAddSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(slide.id)) next.delete(slide.id);
                          else next.add(slide.id);
                          return next;
                        })
                      }
                      className={cn(
                        "relative rounded-sm border bg-card p-1 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSel && "ring-2 ring-primary"
                      )}
                    >
                      <div className="relative aspect-[3/2] overflow-hidden rounded-[3px] bg-muted">
                        <Image
                          src={`/api/v1/slides/${slide.id}/thumbnail`}
                          alt={slide.title ?? slide.originalFilename ?? "Diapositiva"}
                          fill
                          sizes="16vw"
                          className="object-cover"
                          loading="lazy"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_6px_rgba(0,0,0,0.35)]"
                          aria-hidden
                        />
                      </div>
                      {isSel && (
                        <span className="absolute top-1.5 right-1.5 z-10 rounded-full bg-primary p-0.5 text-primary-foreground">
                          <CheckIcon className="size-3" />
                        </span>
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

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rinomina album</DialogTitle>
            <DialogDescription>
              Scegli un nuovo nome per &laquo;{album.name}&raquo;.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRename} className="flex flex-col gap-4">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder={t("collections.collectionNamePlaceholder")}
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={renaming || !renameName.trim()}>
                {renaming && <Loader2Icon className="animate-spin" />}
                {t("actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l&apos;album?</AlertDialogTitle>
            <AlertDialogDescription>
              &laquo;{album.name}&raquo; verrà eliminato. Le foto non verranno
              eliminate dall&apos;archivio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAlbum}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2Icon className="animate-spin" />}
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {t("actions.share")}
            </Button>
          </form>

          <div className="mt-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("sharing.sharedWith")}
            </p>
            {loadingShares ? (
              <div className="flex justify-center py-3">
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
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
                      aria-label={t("sharing.removeRecipient", { email: s.email })}
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
