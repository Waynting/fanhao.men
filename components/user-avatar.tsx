"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  src: string | null
  name: string
  className?: string
}

/** Google avatar with an initial-letter fallback (the image can 403 or be missing). */
export function UserAvatar({ src, name, className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = [...name.trim()][0]?.toUpperCase() ?? "?"

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Google avatar, not worth next/image config
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("rounded-full object-cover bg-zinc-200", className)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-full bg-zinc-700 text-white font-semibold flex items-center justify-center select-none",
        className
      )}
    >
      {initial}
    </span>
  )
}
