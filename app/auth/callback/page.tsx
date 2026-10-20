"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageLoading } from "@/components/page-loading"
import { AUTH_RETURN_KEY, getSupabase } from "@/lib/supabase"

/** Only same-origin paths, so a tampered value can't redirect off-site. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth/") ? next : "/dashboard"
}

/** Return path saved by signInWithGoogle(); ?next= is still honored for older links. */
function takeReturnPath(params: URLSearchParams) {
  let saved: string | null = null
  try {
    saved = sessionStorage.getItem(AUTH_RETURN_KEY)
    sessionStorage.removeItem(AUTH_RETURN_KEY)
  } catch {
    // Storage blocked
  }
  return safeNext(saved ?? params.get("next"))
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const next = takeReturnPath(params)
    const supabase = getSupabase()

    if (params.get("error")) {
      setError(params.get("error_description") || "登入已取消")
      return
    }
    if (!supabase || !code) {
      router.replace(next)
      return
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError("登入連結已失效，請重新登入")
      else router.replace(next)
    })
  }, [router])

  if (!error) return <PageLoading />

  return (
    <div className="text-center py-24 px-4">
      <h1 className="text-xl font-semibold text-zinc-900 mb-2">登入失敗</h1>
      <p className="text-zinc-500 mb-6 text-sm">{error}</p>
      <Button asChild>
        <Link href="/dashboard">返回我的清單</Link>
      </Button>
    </div>
  )
}
