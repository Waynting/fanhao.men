/**
 * Encodes a playlist into a URL hash so it can be shared without a server.
 * The hash is never sent to the server; the recipient's browser decodes it.
 *
 * Format: `#z=<base64url(deflate-raw(json))>` or, without CompressionStream, `#j=<base64url(json)>`.
 */

export interface SharedPlaylist {
  name: string
  description: string | null
  items: { code: string; note: string | null }[]
}

type Payload = { n: string; d?: string; i: ([string] | [string, string])[] }

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

export async function encodeShareHash(playlist: SharedPlaylist): Promise<string> {
  const payload: Payload = {
    n: playlist.name,
    ...(playlist.description ? { d: playlist.description } : {}),
    i: playlist.items.map((item) => (item.note ? [item.code, item.note] : [item.code])),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  if (typeof CompressionStream !== "undefined") {
    return `z=${toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")))}`
  }
  return `j=${toBase64Url(bytes)}`
}

export async function decodeShareHash(hash: string): Promise<SharedPlaylist> {
  const raw = hash.replace(/^#/, "")
  const kind = raw.slice(0, 2)
  let bytes = fromBase64Url(raw.slice(2))
  if (kind === "z=") {
    bytes = await pipe(bytes, new DecompressionStream("deflate-raw"))
  } else if (kind !== "j=") {
    throw new Error("Unknown share format")
  }
  const payload = JSON.parse(new TextDecoder().decode(bytes)) as Payload
  if (typeof payload.n !== "string" || !Array.isArray(payload.i)) {
    throw new Error("Invalid share data")
  }
  return {
    name: payload.n,
    description: payload.d ?? null,
    items: payload.i
      .filter((entry) => Array.isArray(entry) && typeof entry[0] === "string")
      .map(([code, note]) => ({ code, note: typeof note === "string" ? note : null })),
  }
}
