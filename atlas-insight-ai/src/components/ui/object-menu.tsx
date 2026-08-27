"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, FolderInput, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Menu padrão de ações (⋯) para qualquer objeto: abrir, copiar link e
 * excluir. Seguro para uso dentro de cards envolvidos por <Link> — todos
 * os cliques interrompem a propagação.
 */
export function ObjectMenu({
  openHref,
  shareUrl,
  deleteEndpoint,
  deleteConfirm = "Delete this item? This cannot be undone.",
  redirectAfterDelete,
  canDelete = true,
  moveEndpoint,
  moveBody = {},
  currentFolder,
}: {
  /** Optional "Open" item. */
  openHref?: string;
  /** Optional "Copy link" item — defaults to openHref resolved to a full URL. */
  shareUrl?: string;
  /** DELETE endpoint (already including query params). */
  deleteEndpoint?: string;
  deleteConfirm?: string;
  /** Where to go after delete (defaults to refreshing the current page). */
  redirectAfterDelete?: string;
  canDelete?: boolean;
  /** PATCH endpoint for "Move to folder" — body merges moveBody + {folder}. */
  moveEndpoint?: string;
  moveBody?: Record<string, unknown>;
  currentFolder?: string | null;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const resolvedShare =
    shareUrl ??
    (openHref && typeof window !== "undefined" ? new URL(openHref, window.location.origin).href : undefined);

  async function onDelete() {
    if (!deleteEndpoint) return;
    if (!confirm(deleteConfirm)) return;
    setDeleting(true);
    try {
      const res = await fetch(deleteEndpoint, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Delete failed");
      }
      toast.success("Deleted");
      if (redirectAfterDelete) {
        router.push(redirectAfterDelete);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {openHref && (
          <DropdownMenuItem onSelect={() => router.push(openHref)}>
            <ExternalLink />
            Open
          </DropdownMenuItem>
        )}
        {resolvedShare !== undefined && (
          <DropdownMenuItem
            onSelect={async () => {
              try {
                await navigator.clipboard.writeText(
                  shareUrl ?? new URL(openHref ?? "/", window.location.origin).href
                );
                toast.success("Link copied");
              } catch {
                toast.error("Could not copy the link");
              }
            }}
          >
            <Link2 />
            Copy link
          </DropdownMenuItem>
        )}
        {moveEndpoint && (
          <DropdownMenuItem
            onSelect={async () => {
              const folder = prompt(
                'Folder name (empty removes it from any folder):',
                currentFolder ?? ""
              );
              if (folder === null) return;
              try {
                const res = await fetch(moveEndpoint, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...moveBody, folder: folder.trim() || null }),
                });
                if (!res.ok) {
                  const json = await res.json().catch(() => ({}));
                  throw new Error(json.error ?? "Move failed");
                }
                toast.success(folder.trim() ? `Moved to "${folder.trim()}"` : "Removed from folder");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Move failed");
              }
            }}
          >
            <FolderInput />
            Move to folder…
          </DropdownMenuItem>
        )}
        {deleteEndpoint && canDelete && (
          <>
            {(openHref || resolvedShare !== undefined) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={deleting}
              className="text-destructive focus:text-destructive"
              onSelect={() => void onDelete()}
            >
              <Trash2 />
              {deleting ? "Deleting…" : "Delete"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
