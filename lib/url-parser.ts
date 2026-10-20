import { normalizeVideoCode, isValidVideoCode } from "./code-normalizer"
import { AppError } from "./errors"

export interface ParseResult {
  success: boolean
  code: string | null
  normalizedCode: string | null
  source: 'url' | 'direct' | 'unknown'
  originalInput: string
  error?: AppError
  isDuplicate?: boolean
}

/**
 * Extracts video code from common AV websites URLs or direct input
 * Supports:
 * - Direct code input: "SSIS-123", "ssis123", "fc2-ppv-1234567", "1234567"
 * - missav.com: https://missav.com/SSIS-123, https://missav.com/cn/ssis-123
 * - javdb.com: https://javdb.com/v/abc123
 * - fc2.com: https://adult.contents.fc2.com/article/1234567/
 * - And other common patterns
 */
export function parseVideoInput(input: string): ParseResult {
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return {
      success: false,
      code: null,
      normalizedCode: null,
      source: 'unknown',
      originalInput: input,
      error: new AppError("emptyInput")
    }
  }

  // Try to detect if it's a URL
  // Scheme-less input only counts as a URL when it looks like "domain.tld/path",
  // so codes containing a dot (e.g. "ABC.123") are still treated as codes.
  const hasScheme = /^https?:\/\//i.test(trimmedInput)
  const looksLikeDomain = /^[\w-]+(\.[\w-]+)+\//.test(trimmedInput)

  if (hasScheme || looksLikeDomain) {
    return parseFromUrl(hasScheme ? trimmedInput : `https://${trimmedInput}`)
  } else {
    return parseDirectCode(trimmedInput)
  }
}

/**
 * Parse direct video code input
 */
function parseDirectCode(input: string): ParseResult {
  const code = input.trim()

  if (!isValidVideoCode(code)) {
    return {
      success: false,
      code: null,
      normalizedCode: null,
      source: 'direct',
      originalInput: input,
      error: new AppError("invalidCode")
    }
  }

  const normalized = normalizeVideoCode(code)

  return {
    success: true,
    code: code,
    normalizedCode: normalized,
    source: 'direct',
    originalInput: input
  }
}

/**
 * Parse video code from URL
 */
function parseFromUrl(urlString: string): ParseResult {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()
    const pathname = url.pathname

    let extractedCode: string | null = null

    // missav.com patterns
    // https://missav.com/SSIS-123
    // https://missav.com/cn/SSIS-123
    // https://missav.com/en/ssis-123
    // https://missav.ws/dm45/ssis-212
    if (hostname.includes('missav')) {
      // Always extract the last path segment (after the last /)
      const pathSegments = pathname.split('/').filter(s => s.length > 0)
      if (pathSegments.length > 0) {
        extractedCode = pathSegments[pathSegments.length - 1]
      }
    }

    // javdb.com patterns
    // https://javdb.com/v/abc123
    else if (hostname.includes('javdb')) {
      const match = pathname.match(/\/v\/([\w-]+)/i)
      if (match && match[1]) {
        extractedCode = match[1]
      }
    }

    // javlibrary patterns
    // https://javlibrary.com/?v=abc123
    else if (hostname.includes('javlibrary')) {
      const vParam = url.searchParams.get('v')
      if (vParam) {
        extractedCode = vParam
      }
    }

    // FC2 patterns
    // https://adult.contents.fc2.com/article/1234567/
    // https://video.fc2.com/content/1234567
    // https://video.fc2.com/a/content/20221234abcdef (sometimes has mixed format)
    else if (hostname.includes('fc2')) {
      // Try to find pure numbers in the path (6-8 digits)
      const numberMatch = pathname.match(/\/(\d{6,8})\/?/)
      if (numberMatch && numberMatch[1]) {
        extractedCode = numberMatch[1]
      } else {
        // Try to find fc2-ppv or fc2ppv pattern
        const fc2Match = pathname.match(/\/(fc2-?ppv-?\d+)/i)
        if (fc2Match && fc2Match[1]) {
          extractedCode = fc2Match[1]
        }
      }
    }

    // Generic pattern: try to find code in the last path segment
    // Works for many sites like: /video/SSIS-123, /watch/IPX-920, etc.
    else {
      const pathSegments = pathname.split('/').filter(s => s.length > 0)
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1]
        // Check if it looks like a video code
        if (isValidVideoCode(lastSegment)) {
          extractedCode = lastSegment
        }
      }
    }

    if (!extractedCode) {
      return {
        success: false,
        code: null,
        normalizedCode: null,
        source: 'url',
        originalInput: urlString,
        error: new AppError("noCodeInUrl")
      }
    }

    // Validate and normalize the extracted code
    if (!isValidVideoCode(extractedCode)) {
      return {
        success: false,
        code: extractedCode,
        normalizedCode: null,
        source: 'url',
        originalInput: urlString,
        error: new AppError("urlCodeInvalid", { code: extractedCode })
      }
    }

    const normalized = normalizeVideoCode(extractedCode)

    return {
      success: true,
      code: extractedCode,
      normalizedCode: normalized,
      source: 'url',
      originalInput: urlString
    }

  } catch (error) {
    return {
      success: false,
      code: null,
      normalizedCode: null,
      source: 'url',
      originalInput: urlString,
      error: new AppError("invalidUrl")
    }
  }
}

/**
 * Parse multiple inputs (one per line)
 * Useful for bulk operations
 */
export function parseMultipleInputs(text: string): ParseResult[] {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  return lines.map(line => parseVideoInput(line))
}

/**
 * Get statistics from parse results
 */
export function getParseStats(results: ParseResult[]) {
  const successful = results.filter(r => r.success && !r.isDuplicate).length
  const failed = results.filter(r => !r.success).length
  const duplicates = results.filter(r => r.success && r.isDuplicate).length
  const fromUrl = results.filter(r => r.success && r.source === 'url').length
  const fromDirect = results.filter(r => r.success && r.source === 'direct').length

  return {
    total: results.length,
    successful,
    failed,
    duplicates,
    fromUrl,
    fromDirect
  }
}
