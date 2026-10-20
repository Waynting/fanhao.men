"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, ListVideo, Sparkles } from "lucide-react"
import { useStore, loadDemoData } from "@/lib/local-store"
import { PageLoading } from "@/components/page-loading"

export default function DashboardPage() {
  const store = useStore()
  const router = useRouter()

  if (!store) return <PageLoading />

  const playlists = [...store.playlists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const handleLoadDemo = () => {
    const playlist = loadDemoData()
    router.push(`/playlist/${playlist.id}`)
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">我的清單</h1>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/new">
            <Plus className="h-4 w-4 mr-2" />
            新增清單
          </Link>
        </Button>
      </div>

      {/* Content Section */}
      {playlists.length === 0 ? (
        <div className="bg-white border border-zinc-200/80 rounded-xl">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <ListVideo className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-300 mb-4" strokeWidth={1.5} />
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-800 mb-2">還沒有任何清單</h3>
            <p className="text-zinc-500 text-center mb-6 max-w-md text-sm sm:text-base">
              建立第一份清單開始整理番號，或先載入示範資料看看效果。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/new">
                  <Plus className="h-5 w-5 mr-2" />
                  建立第一份清單
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={handleLoadDemo}>
                <Sparkles className="h-5 w-5 mr-2" />
                載入示範資料
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {playlists.map((playlist) => (
            <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group">
              <div className="bg-white border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all duration-150 h-full overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 line-clamp-1 mb-3">{playlist.name}</h3>
                  {playlist.description && (
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{playlist.description}</p>
                  )}
                  {playlist.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {playlist.items.slice(0, 3).map((item) => (
                        <code key={item.id} className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs font-medium">
                          {item.normalizedCode}
                        </code>
                      ))}
                      {playlist.items.length > 3 && (
                        <span className="text-xs text-zinc-400 px-1 py-0.5">+{playlist.items.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between">
                    <div className="text-sm text-zinc-900">
                      <span className="font-semibold">{playlist.items.length}</span>
                      <span className="text-zinc-400 ml-1">個番號</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      更新於 {new Date(playlist.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
