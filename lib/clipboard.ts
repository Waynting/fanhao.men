"use client"

/**
 * Copies text, falling back to a hidden textarea + execCommand where the Clipboard API is
 * unavailable (plain http on a LAN, some in-app browsers). Returns false if both fail,
 * so the caller can show the text for manual copying.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    try {
      return document.execCommand("copy")
    } catch {
      return false
    } finally {
      textarea.remove()
    }
  }
}
