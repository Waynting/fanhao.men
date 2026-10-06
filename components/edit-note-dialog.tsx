"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { updateItemNote } from "@/lib/local-store"
import { trackUpdateNote } from "@/lib/analytics"
import { toast } from "sonner"
import { Pencil } from "lucide-react"

interface EditNoteDialogProps {
  playlistId: string
  itemId: string
  videoCode: string
  currentNote: string | null
}

export function EditNoteDialog({ playlistId, itemId, videoCode, currentNote }: EditNoteDialogProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(currentNote || "")

  // Reset the draft every time the dialog opens so cancelled edits don't linger
  const handleOpenChange = (next: boolean) => {
    if (next) setNote(currentNote || "")
    setOpen(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      updateItemNote(playlistId, itemId, note)
      trackUpdateNote({ playlist_id: playlistId, has_note: !!note.trim() })
      toast.success("註記已儲存")
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message || "儲存失敗")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0" aria-label={`編輯 ${videoCode} 的註記`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>編輯註記</DialogTitle>
            <DialogDescription>
              為 <code className="px-1.5 py-0.5 bg-gray-100 text-black rounded text-sm font-semibold">{videoCode}</code> 加上註記
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor={`note-${itemId}`} className="text-sm font-semibold text-black">
              註記
            </Label>
            <Textarea
              id={`note-${itemId}`}
              placeholder="例如：演員、劇情、評分..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              autoFocus
              className="mt-2 min-h-[100px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit">儲存註記</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
