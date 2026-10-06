import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 mb-6">
          AV Number Collector
        </h1>
        <p className="text-lg text-zinc-600 mb-3 max-w-2xl mx-auto">
          輕鬆管理你的番號收藏。建立播放清單、分享給朋友，
          並自動生成你偏好的影片網址。
        </p>
        <p className="text-base text-zinc-500 mb-8 max-w-2xl mx-auto">
          Easily manage your AV code collection. Create playlists, share with friends,
          and automatically generate URLs for your preferred video sites.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">開始使用</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-xl border border-zinc-200/80">
            <h3 className="font-semibold text-lg mb-2">📋 番號優先管理</h3>
            <p className="text-zinc-600 text-sm mb-2">
              以番號為核心整理收藏，不依賴特定影片網站，永久保存你的清單。
            </p>
            <p className="text-zinc-400 text-xs">
              Code-first management. Organize your collection by code numbers, independent of any video site.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200/80">
            <h3 className="font-semibold text-lg mb-2">🔗 智慧網址生成</h3>
            <p className="text-zinc-600 text-sm mb-2">
              設定你喜歡的影片網站，一鍵從番號生成完整網址。
            </p>
            <p className="text-zinc-400 text-xs">
              Smart URL generation. Set your preferred video sites and generate URLs from codes with one click.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200/80">
            <h3 className="font-semibold text-lg mb-2">🚀 輕鬆分享</h3>
            <p className="text-zinc-600 text-sm mb-2">
              匯出文字清單或產生分享連結，對方打開即可瀏覽並存到自己的裝置。
            </p>
            <p className="text-zinc-400 text-xs">
              Easy sharing. Export as text or create a share link that others can open and save to their own device.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
