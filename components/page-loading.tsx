import { Loader2 } from "lucide-react"

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
    </div>
  )
}
