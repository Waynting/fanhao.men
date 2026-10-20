import { notFound } from "next/navigation"

// Unknown paths inside a locale render app/[locale]/not-found.tsx (localized)
export default function CatchAll() {
  notFound()
}
