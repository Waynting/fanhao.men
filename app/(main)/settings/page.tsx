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
import { DEFAULT_TEMPLATES } from "@/lib/default-templates"
import { trackCreateTemplate } from "@/lib/analytics"
import {
  useStore,
  createTemplate,
  deleteTemplate,
  exportData,
  importData,
  clearAllData,
  resetLocalData,
} from "@/lib/local-store"
import { PageLoading } from "@/components/page-loading"
import { AccountSection } from "@/components/account-section"
import { useSession } from "@/lib/supabase"

export default function SettingsPage() {
  const store = useStore()
  const { session } = useSession()
  const [name, setName] = useState("")
  const [template, setTemplate] = useState("")
  const [clearOpen, setClearOpen] = useState(false)
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")
  const fileInput = useRef<HTMLInputElement>(null)

  if (!store) return <PageLoading />

  const itemCount = store.playlists.reduce((sum, p) => sum + p.items.length, 0)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      createTemplate({ name, baseTemplate: template })
      trackCreateTemplate({ template_id: name, is_default: false })
      toast.success(`已新增來源「${name.trim()}」`)
      setName("")
      setTemplate("")
    } catch (error: any) {
      toast.error(error.message || "新增失敗")
    }
  }

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `av-collector-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    try {
      const count = importData(await file.text(), importMode)
      toast.success(importMode === "merge" ? `已匯入 ${count} 份清單` : `已還原 ${count} 份清單`)
    } catch (error: any) {
      toast.error(error.message || "匯入失敗")
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
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">設定</h1>
        <p className="text-zinc-500 mt-1 text-sm sm:text-base">帳號同步、影片來源與資料備份</p>
      </div>

      <AccountSection />

      {/* Source templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LinkIcon className="h-5 w-5" />
            影片來源
          </CardTitle>
          <CardDescription>
            產生連結時可選用的網站。用 <code className="bg-zinc-100 px-1 rounded">{"{code}"}</code> 代表番號的位置。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            {store.templates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900 text-white rounded-md">自訂</span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 truncate">{t.baseTemplate}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    deleteTemplate(t.id)
                    toast.success(`已刪除來源「${t.name}」`)
                  }}
                  aria-label={`刪除 ${t.name}`}
                  className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {DEFAULT_TEMPLATES.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-md">內建</span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 truncate">{t.baseTemplate}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreate} className="space-y-3 border-t border-zinc-100 pt-5">
            <p className="text-sm font-semibold text-zinc-800">新增自訂來源</p>
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="template-name">名稱</Label>
                <Input
                  id="template-name"
                  placeholder="例如：MyAV"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template-url">網址</Label>
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
                預覽：<code>{template.replace("{code}", "SSIS-123")}</code>
              </p>
            )}
            <Button type="submit" size="sm" disabled={!name.trim() || !template.includes("{code}")}>
              <Plus className="h-4 w-4 mr-1.5" />
              新增來源
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5" />
            資料與備份
          </CardTitle>
          <CardDescription>
            {session
              ? `目前 ${store.playlists.length} 份清單、${itemCount} 個番號，已同步到你的帳號。也可以另外匯出一份備份檔。`
              : `所有資料只存在這台裝置的瀏覽器中（目前 ${store.playlists.length} 份清單、${itemCount} 個番號）。清除瀏覽器資料或換裝置前，請先匯出備份或登入同步。`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              匯出備份 (.json)
            </Button>
            <Button variant="outline" onClick={() => pickFile("merge")}>
              <Upload className="h-4 w-4 mr-2" />
              匯入並合併
            </Button>
            <Button variant="outline" onClick={() => pickFile("replace")}>
              <Upload className="h-4 w-4 mr-2" />
              匯入並取代
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
              {session ? "清除所有資料（含雲端）" : "清除這台裝置上的所有資料"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清除所有資料？</DialogTitle>
            <DialogDescription>
              將刪除 {store.playlists.length} 份清單與所有自訂來源，且無法復原。
              {session && "已登入，雲端和其他同步中的裝置也會一併刪除。"}建議先匯出備份。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Signed out, this only wipes the device; the cloud copy comes back on next sign-in
                if (session) clearAllData()
                else resetLocalData()
                setClearOpen(false)
                toast.success("已清除所有資料")
              }}
            >
              全部清除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
