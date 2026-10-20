"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Upload, Trash2, Plus, Link as LinkIcon, HardDrive } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { DEFAULT_TEMPLATES } from "@/lib/default-templates"
import { trackCreateTemplate } from "@/lib/analytics"
import {
  useStore,
  createTemplate,
  deleteTemplate,
  restoreTemplate,
  exportData,
  importData,
  clearAllData,
  resetLocalData,
} from "@/lib/local-store"
import { PageLoading } from "@/components/page-loading"
import { SITE_NAME } from "@/lib/site"
import { AccountSection } from "@/components/account-section"
import { StatsOptOut } from "@/components/stats-opt-out"
import { useSession } from "@/lib/supabase"
import { useErrorText } from "@/i18n/use-error-text"
import { AppError } from "@/lib/errors"

export default function SettingsPage() {
  const t = useTranslations("Settings")
  const tc = useTranslations("Common")
  const errorText = useErrorText()
  const store = useStore()
  const { session } = useSession()
  const [name, setName] = useState("")
  const [template, setTemplate] = useState("")
  const [clearOpen, setClearOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")
  const fileInput = useRef<HTMLInputElement>(null)

  if (!store) return <PageLoading />

  const itemCount = store.playlists.reduce((sum, p) => sum + p.items.length, 0)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      createTemplate({ name, baseTemplate: template })
      trackCreateTemplate({ template_id: name, is_default: false })
      toast.success(t("templates.added", { name: name.trim() }))
      setName("")
      setTemplate("")
    } catch (error) {
      toast.error(error instanceof AppError ? errorText(error) : t("templates.addFailed"))
    }
  }

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${SITE_NAME}-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    try {
      const count = importData(await file.text(), importMode)
      toast.success(t(importMode === "merge" ? "backup.imported" : "backup.restored", { count }))
    } catch (error) {
      toast.error(error instanceof AppError ? errorText(error) : t("backup.importFailed"))
    } finally {
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  const pickFile = (mode: "merge" | "replace") => {
    setImportMode(mode)
    fileInput.current?.click()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">{t("page.title")}</h1>
        <p className="text-zinc-500 mt-1 text-sm sm:text-base">{t("page.subtitle")}</p>
      </div>

      <AccountSection />
      <StatsOptOut />

      {/* Source templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LinkIcon className="h-5 w-5" />
            {t("templates.title")}
          </CardTitle>
          <CardDescription>
            {t.rich("templates.description", {
              code: (chunks) => <code className="bg-zinc-100 px-1 rounded">{chunks}</code>,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            {store.templates.map((tpl) => (
              <div key={tpl.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tpl.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900 text-white rounded-md">{t("templates.custom")}</span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 truncate">{tpl.baseTemplate}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    deleteTemplate(tpl.id)
                    toast.success(t("templates.deleted", { name: tpl.name }), {
                      action: { label: tc("undo"), onClick: () => restoreTemplate(tpl) },
                    })
                  }}
                  aria-label={t("templates.deleteLabel", { name: tpl.name })}
                  className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {DEFAULT_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="flex items-center gap-3 p-2.5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tpl.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-md">{t("templates.builtIn")}</span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 truncate">{tpl.baseTemplate}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreate} className="space-y-3 border-t border-zinc-100 pt-5">
            <p className="text-sm font-semibold text-zinc-800">{t("templates.addTitle")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="template-name">{t("templates.nameLabel")}</Label>
                <Input
                  id="template-name"
                  placeholder={t("templates.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template-url">{t("templates.urlLabel")}</Label>
                <Input
                  id="template-url"
                  placeholder="https://example.com/{code}"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  required
                />
              </div>
            </div>
            {template && (
              <p className="text-xs text-zinc-500 break-all">
                {t("templates.preview")}<code>{template.replace("{code}", "SSIS-123")}</code>
              </p>
            )}
            <Button type="submit" size="sm" disabled={!name.trim() || !template.includes("{code}")}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("templates.add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5" />
            {t("backup.title")}
          </CardTitle>
          <CardDescription>
            {t("backup.description", { playlists: store.playlists.length, items: itemCount })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {t("backup.export")}
            </Button>
            <Button variant="outline" onClick={() => pickFile("merge")}>
              <Upload className="h-4 w-4 mr-2" />
              {t("backup.importMerge")}
            </Button>
            {/* Replace wipes everything, so confirm before opening the file picker */}
            <Button variant="outline" onClick={() => setReplaceOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t("backup.importReplace")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
              }}
            />
          </div>
          <div className="border-t border-zinc-100 pt-4">
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 -ml-2"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {session ? t("backup.clearAll") : t("backup.clearDevice")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("replace.title")}</DialogTitle>
            <DialogDescription>
              {t("replace.description", { playlists: store.playlists.length, items: itemCount })}
              {session && t("replace.cloudNote")}
              {t("replace.backupHint")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setReplaceOpen(false)
                pickFile("replace")
              }}
            >
              {t("replace.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clear.title")}</DialogTitle>
            <DialogDescription>
              {t("clear.description", { count: store.playlists.length })}
              {session && t("clear.cloudNote")}
              {t("clear.backupHint")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Signed out, this only wipes the device; the cloud copy comes back on next sign-in
                if (session) clearAllData()
                else resetLocalData()
                setClearOpen(false)
                toast.success(t("clear.done"))
              }}
            >
              {t("clear.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
