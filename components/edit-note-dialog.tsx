"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
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
import { useErrorText } from "@/i18n/use-error-text"

interface EditNoteDialogProps {
  playlistId: string
  itemId: string
  videoCode: string
  currentNote: string | null
}

export function EditNoteDialog({ playlistId, itemId, videoCode, currentNote }: EditNoteDialogProps) {
  const t = useTranslations("Playlist.note")
  const tCommon = useTranslations("Common")
  const errorText = useErrorText()
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
      toast.success(t("saved"))
      setOpen(false)
    } catch (error) {
      toast.error(errorText(error, "saveFailed"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-9 sm:h-9 sm:w-9 p-0" aria-label={t("editAria", { code: videoCode })}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t.rich("description", {
                code: videoCode,
                mono: (chunks) => (
                  <code className="px-1.5 py-0.5 bg-zinc-100 text-black rounded text-sm font-semibold">{chunks}</code>
                ),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor={`note-${itemId}`} className="text-sm font-semibold text-black">
              {t("label")}
            </Label>
            <Textarea
              id={`note-${itemId}`}
              placeholder={t("placeholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              autoFocus
              className="mt-2 min-h-[100px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit">{t("submit")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
