import { pageMetadata } from "@/lib/site"

export const generateMetadata = pageMetadata({ page: "share", path: "/share", noindex: true })

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
