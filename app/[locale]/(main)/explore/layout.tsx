import { pageMetadata } from "@/lib/site"

export const generateMetadata = pageMetadata({ page: "explore", path: "/explore", noindex: true })

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
