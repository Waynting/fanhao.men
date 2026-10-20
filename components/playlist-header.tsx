"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Trash2, Share2, Download, Copy, ExternalLink, Globe, Lock } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { DATE } from "@/lib/date-formats"
import { Link, useRouter } from "@/i18n/navigation"
import { useErrorText } from "@/i18n/use-error-text"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { deletePlaylist, restorePlaylist, setPlaylistPublic, updatePlaylist, type Playlist } from "@/lib/local-store"
import { encodeShareHash } from "@/lib/share-codec"
import { publicPlaylistPath } from "@/lib/public-playlist"
import { authEnabled, signInWithGoogle, useSession } from "@/lib/supabase"
import { syncNow } from "@/lib/sync"
import { trackCopyCodes, trackSharePlaylist } from "@/lib/analytics"

export function PlaylistHeader({ playlist }: { playlist: Playlist }) {
  const router = useRouter()
  const t = useTranslations("Playlist.header")
  const tCommon = useTranslations("Common")
  const tToolbar = useTranslations("Playlist.toolbar")
  const format = useFormatter()
  const errorText = useErrorText()
  const { session } = useSession()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description ?? "")
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const isPublic = playlist.isPublic === true
  const publicUrl = session ? `${window.location.origin}${publicPlaylistPath(session.user.id, playlist.id)}` : null

  const openEdit = () => {
    setName(playlist.name)
    setDescription(playlist.description ?? "")
    setEditOpen(true)
  }

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      updatePlaylist(playlist.id, { name, description })
      toast.success(t("updated"))
      setEditOpen(false)
    } catch (error) {
      toast.error(errorText(error, "saveFailed"))
    }
  }

  const handleDelete = () => {
    const snapshot = playlist
    deletePlaylist(playlist.id)
    setDeleteOpen(false)
    router.push("/dashboard")
    toast.success(t("deleted", { name: snapshot.name }), {
      action: { label: tCommon("undo"), onClick: () => restorePlaylist(snapshot) },
    })
  }

  const handleShare = async () => {
    setShareOpen(true)
    if (playlist.items.length === 0) {
      setShareUrl(null)
      return
    }
    const hash = await encodeShareHash({
      name: playlist.name,
      description: playlist.description,
      items: playlist.items.map((i) => ({ code: i.normalizedCode, note: i.note })),
    })
    setShareUrl(`${window.location.origin}/share#${hash}`)
    trackSharePlaylist({ playlist_id: playlist.id, method: "copy_link" })
  }

  const copyUrl = async (url: string | null, inputId: string) => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t("linkCopied"))
    } catch {
      // Clipboard API is unavailable on plain http (e.g. LAN demo); let the user copy manually
      document.querySelector<HTMLInputElement>(`#${inputId}`)?.select()
      toast.error(t("copyLinkManually"))
    }
  }

  const togglePublic = (next: boolean) => {
    if (!session) {
      toast(t("publicNeedsSignIn"), { action: { label: t("signIn"), onClick: handleSignIn } })
      return
    }
    try {
      setPlaylistPublic(playlist.id, next)
      toast.success(next ? t("madePublic") : t("madePrivate"))
      // Push right away so the public link works (or stops working) without waiting for the debounce
      void syncNow()
    } catch (error) {
      toast.error(errorText(error, "saveFailed"))
    }
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch {
      toast.error(t("signInFailed"))
    }
  }

  const nativeShare = async () => {
    if (!shareUrl) return
    try {
      await navigator.share({ title: playlist.name, url: shareUrl })
    } catch {
      // user cancelled
    }
  }

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(playlist.items.map((i) => i.normalizedCode).join("\n"))
      trackCopyCodes({ item_count: playlist.items.length, has_selection: false })
      toast.success(tToolbar("copiedCodes", { count: playlist.items.length }))
    } catch {
      toast.error(tCommon("clipboardUnavailable"))
    }
  }

  const handleExport = () => {
    const text = playlist.items.map((i) => i.normalizedCode).join("\n")
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${playlist.name}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="text-zinc-600 hover:text-zinc-900 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("backToDashboard")}
          </Link>
        </Button>
      </div>

      {/* Header Card */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight break-words mb-3">
              {playlist.name}
            </h1>

            {playlist.description && (
              <p className="text-zinc-600 text-sm sm:text-base lg:text-lg mb-4 max-w-2xl whitespace-pre-wrap">
                {playlist.description}
              </p>
            )}

            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-500">
              <span>
                {t.rich("codeCount", {
                  count: playlist.items.length,
                  b: (chunks) => <span className="font-semibold text-zinc-900">{chunks}</span>,
                })}
              </span>
              {(isPublic || authEnabled) && (
                <button
                  type="button"
                  onClick={handleShare}
                  className={
                    isPublic
                      ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      : "inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
                  }
                >
                  {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {isPublic ? t("publicBadge") : t("privateBadge")}
                </button>
              )}
              <span>
                {t("updatedAt", {
                  date: format.dateTime(new Date(playlist.updatedAt), DATE),
                })}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto lg:ml-6">
            <Button size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t("share")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyCodes} disabled={playlist.items.length === 0}>
              <Copy className="h-4 w-4 mr-2" />
              {tToolbar("copyCodes")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={playlist.items.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              {t("export")}
            </Button>
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {t("edit")}
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 -ml-2"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("deletePlaylist")}
          </Button>
          {authEnabled && (
            <div className="flex items-center gap-2">
              <Switch
                id="public-switch"
                checked={isPublic}
                onCheckedChange={togglePublic}
                aria-label={t("publicLabel")}
              />
              <Label htmlFor="public-switch" className="flex items-center gap-1.5 text-sm font-normal text-zinc-600 cursor-pointer">
                <Globe className="h-4 w-4 text-zinc-500" />
                {t("publicLabel")}
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
              <DialogDescription>{t("editDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("nameLabel")}</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t("descriptionLabel")}</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={!name.trim()}>{tCommon("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shareTitle")}</DialogTitle>
          </DialogHeader>

          {authEnabled &&
            (isPublic && session ? (
              <div className="rounded-lg border border-zinc-200 p-4 space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900">
                  <Globe className="h-4 w-4 text-zinc-500" />
                  {t("publicLinkLabel")}
                </p>
                <p className="text-xs text-zinc-500">{t("publicOnHint")}</p>
                <div className="flex gap-2">
                  <Input
                    id="public-url"
                    readOnly
                    value={publicUrl ?? ""}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyUrl(publicUrl, "public-url")} aria-label={t("copyLink")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild aria-label={t("preview")}>
                    <a href={publicUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">{t("publicOffHint")}</p>
            ))}

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-900">{t("snapshotLabel")}</p>
            <p className="text-xs text-zinc-500">{t("shareDescription")}</p>
            {shareUrl ? (
              <Input
                id="share-url"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
            ) : (
              <p className="text-xs text-amber-700">{t("emptyShare")}</p>
            )}
          </div>
          {shareUrl && (
            <DialogFooter className="gap-2 sm:gap-0">
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button variant="outline" onClick={nativeShare}>
                  {t("send")}
                </Button>
              )}
              <Button variant="outline" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("preview")}
                </a>
              </Button>
              <Button onClick={() => copyUrl(shareUrl, "share-url")}>
                <Copy className="h-4 w-4 mr-2" />
                {t("copyLink")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDescription", { name: playlist.name, count: playlist.items.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("deletePlaylist")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
