import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "探索",
  description: "大家最近收藏和點擊最多的番號排行。",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
