# fanhao.men

A web app for managing video code collections. No login, no backend: all data is stored in your browser, per device.

## Features

- **ID-first management**: organize by video codes (e.g. `SSIS-123`), not URLs
- **Code normalization**: `ssis123` → `SSIS-123`, `fc2ppv1234567` / `1234567` → `FC2-PPV-1234567`
- **Bulk add**: paste codes or video URLs one per line; duplicates and invalid lines are flagged
- **Link generation**: turn one or many codes into URLs for built-in or custom sources
- **Share links**: the playlist is encoded into the URL hash; recipients can save it to their own device
- **Recently opened**: codes you open from the site are remembered on the device; pick which ones to add to a playlist afterwards
- **Backup**: export/import all data as JSON to move between devices
- **Export**: download a playlist as `.txt`

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- shadcn/ui (Radix UI + Tailwind CSS)
- `localStorage` for persistence

## Getting Started

```bash
npm install
npm run dev     # http://localhost:3000
```

No environment variables are required. Optionally set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env.local` to enable Google Analytics 4.

## Scripts

```bash
npm run dev     # Dev server (Turbopack)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint
```

## Notes

- Data lives only in the browser it was created in. Clearing site data deletes it; use **設定 → 匯出備份** first.
- Share links are snapshots: editing a playlist afterwards requires sharing a new link.

## License

MIT
