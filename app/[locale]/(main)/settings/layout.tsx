import { pageMetadata } from "@/lib/site"

export const generateMetadata = pageMetadata({ page: "settings", path: "/settings", noindex: true })

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
