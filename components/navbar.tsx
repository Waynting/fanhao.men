"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { List, ListVideo, Settings, Info } from "lucide-react"

const navItems = [
  { href: "/dashboard", match: ["/dashboard", "/playlist"], label: "我的清單", icon: List },
  { href: "/settings", match: ["/settings"], label: "設定", icon: Settings },
  { href: "/about", match: ["/about"], label: "關於", icon: Info },
]

export function Navbar() {
  const pathname = usePathname()
  const isActive = (match: string[]) => match.some((m) => pathname.startsWith(m))

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="border-b border-zinc-200/80 bg-zinc-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1400px]">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6 sm:gap-8">
              <Link
                href="/dashboard"
                className="text-base sm:text-lg font-semibold text-white hover:text-zinc-300 transition-colors flex items-center gap-2"
              >
                <div className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center">
                  <ListVideo className="h-4 w-4 text-zinc-900" />
                </div>
                <span>AV Number Collector</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive(item.match)
                          ? "bg-white/95 text-zinc-900"
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center">
              <span className="text-[11px] text-zinc-500 hidden sm:inline">資料僅儲存在此裝置</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800/50 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.match)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 flex-1 transition-all duration-150 ${
                  active ? "text-white" : "text-zinc-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
