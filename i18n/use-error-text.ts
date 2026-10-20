"use client"

import { useTranslations } from "next-intl"
import { AppError, type ErrorKey } from "@/lib/errors"

/** Turns a caught error into display text: AppErrors are translated, anything else gets `fallback`. */
export function useErrorText() {
  const t = useTranslations("Errors")
  return (error: unknown, fallback: ErrorKey = "generic") =>
    error instanceof AppError ? t(error.key, error.values) : t(fallback)
}
