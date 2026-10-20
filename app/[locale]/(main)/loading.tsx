import { useTranslations } from "next-intl"

export default function Loading() {
  const t = useTranslations("Common")
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-zinc-900 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-zinc-600">{t("loading")}</p>
      </div>
    </div>
  )
}
