import type { Messages } from "next-intl"

export type ErrorKey = keyof Messages["Errors"]

/**
 * An error whose user-facing text lives in the Errors messages, so lib code (which has no locale)
 * can throw it and the UI translates it with useErrorText().
 */
export class AppError extends Error {
  constructor(
    readonly key: ErrorKey,
    readonly values?: Record<string, string | number>
  ) {
    super(key)
  }
}
