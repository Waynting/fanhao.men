import { pageMetadata } from "@/lib/site"

export const generateMetadata = pageMetadata({ page: "publicPlaylist", noindex: true })

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
