/** A profile's tags as small chips. `tone="dark"` is for the zinc-900 navbar. */
export function ProfileTags({
  tags,
  max,
  tone = "light",
  className = "",
}: {
  tags: string[]
  /** Show only the first few, with a "+N" for the rest */
  max?: number
  tone?: "light" | "dark"
  className?: string
}) {
  if (tags.length === 0) return null
  const shown = max ? tags.slice(0, max) : tags
  const rest = tags.length - shown.length
  const chip =
    tone === "dark"
      ? "bg-white/10 text-zinc-300"
      : "bg-zinc-100 text-zinc-600"

  return (
    <span className={`flex flex-wrap items-center gap-1 ${className}`}>
      {shown.map((tag) => (
        <span key={tag} className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${chip}`}>
          <span className="truncate">{tag}</span>
        </span>
      ))}
      {rest > 0 && <span className={`text-[11px] ${tone === "dark" ? "text-zinc-500" : "text-zinc-400"}`}>+{rest}</span>}
    </span>
  )
}
