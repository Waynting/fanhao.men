import { ImageResponse } from "next/og"

// Full-bleed dark tile with the navbar's white badge + ListVideo glyph.
// The badge stays inside the central 60%, so the same image works as a maskable icon.
export function renderAppIcon(size: number) {
  const badge = Math.round(size * 0.6)
  const glyph = Math.round(badge * 0.62)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
        }}
      >
        <div
          style={{
            width: badge,
            height: badge,
            borderRadius: Math.round(badge * 0.24),
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={glyph}
            height={glyph}
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
      </div>
    ),
    { width: size, height: size }
  )
}
