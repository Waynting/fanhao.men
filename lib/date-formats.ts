// Shared options for next-intl's format.dateTime(), so every page shows dates the same way.
// Playlist dates are day-level; system events (sync, ranking refresh) also show the time.
export const DATE = { dateStyle: "medium" } as const
export const DATE_TIME = { dateStyle: "medium", timeStyle: "short" } as const
export const TIME = { timeStyle: "short" } as const
