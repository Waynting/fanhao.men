import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-700 mb-2">
          找不到頁面
        </h2>
        <p className="text-slate-600 mb-8">
          你要找的頁面不存在或已被移動。
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard">前往我的清單</Link>
        </Button>
      </div>
    </div>
  )
}
