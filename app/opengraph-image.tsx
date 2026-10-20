import { ImageResponse } from "next/og"
import { SITE_NAME } from "@/lib/site"

export const alt = `${SITE_NAME} 番號收藏清單管理`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Latin-only text: the default OG font has no CJK glyphs.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "#18181b",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 38,
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={100}
            height={100}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#18181b"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 12H3" />
            <path d="M16 6H3" />
            <path d="M12 18H3" />
            <path d="m16 12 5 3-5 3v-6Z" />
          </svg>
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 36, color: "#a1a1aa" }}>
          Organize, link and share your video code playlists
        </div>
      </div>
    ),
    size
  )
}
