"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Trash2, Share2, Download, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"
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
import { Textarea } from "@/components/ui/textarea"
import { deletePlaylist, restorePlaylist, updatePlaylist, type Playlist } from "@/lib/local-store"
import { encodeShareHash } from "@/lib/share-codec"
import { trackSharePlaylist } from "@/lib/analytics"

export function PlaylistHeader({ playlist }: { playlist: Playlist }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description ?? "")
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const openEdit = () => {
    setName(playlist.name)
    setDescription(playlist.description ?? "")
    setEditOpen(true)
  }

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      updatePlaylist(playlist.id, { name, description })
      toast.success("清單已更新")
      setEditOpen(false)
    } catch (error: any) {
      toast.error(error.message || "更新失敗")
    }
  }

  const handleDelete = () => {
    const snapshot = playlist
    deletePlaylist(playlist.id)
    setDeleteOpen(false)
    router.push("/dashboard")
    toast.success(`已刪除「${snapshot.name}」`, {
      action: { label: "復原", onClick: () => restorePlaylist(snapshot) },
    })
  }

  const handleShare = async () => {
    if (playlist.items.length === 0) {
      toast.error("清單是空的，先加入一些番號再分享")
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

  const copyShareUrl = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("分享連結已複製")
    } catch {
      // Clipboard API is unavailable on plain http (e.g. LAN demo); let the user copy manually
      document.querySelector<HTMLInputElement>("#share-url")?.select()
      toast.error("無法自動複製，請手動選取連結複製")
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
        <Button variant="ghost" asChild className="text-slate-600 hover:text-slate-900 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回我的清單
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
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg mb-4 max-w-2xl whitespace-pre-wrap">
                {playlist.description}
              </p>
            )}

            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-500">
              <span>
                <span className="font-semibold text-zinc-900">{playlist.items.length}</span> 個番號
              </span>
              <span>更新於 {new Date(playlist.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 sm:flex gap-2 w-full sm:w-auto lg:ml-6">
            <Button size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              分享連結
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={playlist.items.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              匯出 .txt
            </Button>
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Edit className="h-4 w-4 mr-2" />
              編輯
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 -ml-2"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            刪除清單
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>編輯清單</DialogTitle>
              <DialogDescription>修改清單名稱與描述</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">名稱</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
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
                取消
              </Button>
              <Button type="submit" disabled={!name.trim()}>儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareUrl !== null} onOpenChange={(open) => !open && setShareUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享清單</DialogTitle>
            <DialogDescription>
              清單內容直接包含在連結中，不經過伺服器。對方打開即可瀏覽，並可存到自己的裝置。
              之後修改清單需要重新分享。
            </DialogDescription>
          </DialogHeader>
          <Input
            id="share-url"
            readOnly
            value={shareUrl ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button variant="outline" onClick={nativeShare}>
                傳送…
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={shareUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                預覽
              </a>
            </Button>
            <Button onClick={copyShareUrl}>
              <Copy className="h-4 w-4 mr-2" />
              複製連結
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除清單？</DialogTitle>
            <DialogDescription>
              將刪除「{playlist.name}」與其中 {playlist.items.length} 個番號。刪除後可在提示訊息中按「復原」。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              刪除清單
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
