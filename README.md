# fanhao.men

[fanhao.men](https://fanhao.men) is a web app for managing video code collections. It is local-first: everything lives in your browser and works without an account. Signing in with Google is optional and syncs your playlists across devices.

## Features

- **ID-first management**: organize by video codes (e.g. `SSIS-123`), not URLs
- **Code normalization**: `ssis123` → `SSIS-123`, `fc2ppv1234567` / `1234567` → `FC2-PPV-1234567`
- **Bulk add**: paste codes or video URLs (missav, javdb, javlibrary, FC2, ...) one per line; duplicates and invalid lines are flagged
- **Link generation**: turn one or many codes into URLs for built-in or custom sources
- **Recent tab**: quick-open a code or URL in any source; codes you open from the site are remembered on the device so you can pick which ones to add to a playlist afterwards
- **Multiple playlists per code**: save a code to several playlists, copy or move selections between them, with undo
- **Share links**: the playlist is encoded into the URL hash (no server); recipients can save it with one click
- **Public playlists** (signed in): a live link at `/p/<owner>/<id>` that always shows the latest synced version
- **Login & sync** (optional): Google sign-in, per-playlist last-write-wins sync between devices, nickname and profile tags
- **Explore**: trending codes across signed-in users (7 / 30 days), with an opt-out in Settings
- **7 languages**: 繁體中文 (default), 简体中文, English, 日本語, 한국어, Español, Português
- **PWA**: installable, works offline for pages already visited
- **Backup**: export/import all data as JSON; export a playlist as `.txt`
- **Changelog**: user-facing updates at `/changelog`

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- shadcn/ui (Radix UI + Tailwind CSS)
- next-intl for i18n
- `localStorage` as the source of truth; Supabase (Auth + Postgres with RLS) for optional sync, called directly from the browser
- Deployed on Vercel

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # every variable is optional
npm run dev                        # http://localhost:3000
```

With no environment variables the app runs fully local, with the account UI hidden.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Enable login, sync, public playlists and Explore. Apply `supabase/migrations/*.sql` first |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, robots and sitemap |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 |
| `DATABASE_URL` | Server-only, used by `npm run stats`. Never prefix it with `NEXT_PUBLIC_` |

## Scripts

```bash
npm run dev     # Dev server (Turbopack)
npm run build   # Production build (also type-checks)
npm run start   # Start production server (use this to test the PWA / offline)
npm run stats   # Rebuild the Explore ranking (needs DATABASE_URL); -- --dry-run only prints
npm run lint    # next lint (ESLint is not configured yet)
```

## Documentation

Detailed docs (in Traditional Chinese) live in [`docs/`](./docs/README.md): architecture, database, deployment, development guide and user journey.

## Notes

- Without signing in, data lives only in the browser it was created in. Clearing site data deletes it; export a backup or sign in first.
- Share links are snapshots: editing a playlist afterwards requires sharing a new link. Public playlists stay up to date.
- The recently opened list is device-only: never synced, backed up or counted in stats, and cleared after 7 days.

## License

MIT
