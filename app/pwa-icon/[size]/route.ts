import { renderAppIcon } from "@/lib/app-icon"

export const dynamic = "force-static"

const SIZES = [192, 512]

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size)
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 })
  return renderAppIcon(size)
}
