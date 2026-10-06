"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createPlaylist } from "@/lib/local-store"
import { trackCreatePlaylist } from "@/lib/analytics"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewPlaylistPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const playlist = createPlaylist({ name, description })
      trackCreatePlaylist({ playlist_id: playlist.id, has_description: !!playlist.description })
      toast.success("清單已建立")
      router.push(`/playlist/${playlist.id}`)
    } catch (error: any) {
      toast.error(error.message || "建立失敗")
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回我的清單
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增清單</CardTitle>
          <CardDescription>建立後即可加入番號</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">清單名稱 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：2025 精選、待看清單"
                maxLength={100}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述（選填）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="這份清單的內容是？"
                maxLength={500}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={!name.trim()}>建立清單</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">取消</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
