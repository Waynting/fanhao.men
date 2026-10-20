"use client"

import { useTranslations } from "next-intl"
import { History, Search } from "lucide-react"
import { PageLoading } from "@/components/page-loading"
import { DismissRecentOpensOnView, QuickOpen, RecentOpensPicker } from "@/components/recent-opens"
import { useStore } from "@/lib/local-store"

export default function RecentPage() {
  const t = useTranslations("RecentOpens")
  const store = useStore()

  if (!store) return <PageLoading />

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <DismissRecentOpensOnView />
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">{t("title")}</h1>
        <p className="text-zinc-500 mt-1 text-sm sm:text-base">{t("subtitle")}</p>
      </div>

      <section className="bg-white border border-zinc-200/80 rounded-xl p-4 sm:p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <Search className="h-4 w-4" />
          {t("quickOpenTitle")}
        </h2>
        <QuickOpen />
      </section>

      <section className="bg-white border border-zinc-200/80 rounded-xl p-4 sm:p-6 space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <History className="h-4 w-4" />
            {t("listTitle")}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">{t("description")}</p>
        </div>
        <RecentOpensPicker />
        <p className="text-xs text-zinc-400">{t("privacy")}</p>
      </section>
    </div>
  )
}
