# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm start        # run production build
npm run lint     # ESLint (flat config, eslint 9)
```

No test runner is configured yet.

## Architecture

**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (PostCSS engine), Recharts, Lucide icons, TypeScript strict mode. Path alias `@/*` maps to the project root.

### Data layer — `lib/mockData.ts`

All article data is generated deterministically via a seeded PRNG (mulberry32) — no backend or API calls yet. This file is the single source of truth for:

- Core types: `Article` interface, and enums `SECTORS`, `CRISIS_DOMAINS`, `STAGES`, `FRAMES`, `OUTLETS`
- Aggregation helpers: `getSectorCounts()`, `getDomainCounts()`, `getOutletStats()`, `getFrameBySector()`, `getTimeSeriesData()`, etc.

Real data + BERT classification from a Python backend will replace this layer later.

### Routing (App Router)

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Redirects to `/overview` |
| `/overview` | `app/overview/page.tsx` | Main dashboard — sector vs GHG charts, stage/frame breakdowns |
| `/search` | `app/search/page.tsx` | Filterable article list with pagination |
| `/newspapers` | `app/newspapers/page.tsx` | Per-outlet statistics |
| `/article/[id]` | `app/article/[id]/page.tsx` | Article detail |
| `/upload` | `app/upload/page.tsx` | Article analysis upload UI |
| `/about` | `app/about/page.tsx` | Mission/methodology |

Root layout (`app/layout.tsx`) renders the `<Nav>` sidebar and wraps all pages.

### Components (`components/`)

- `Nav.tsx` — fixed left sidebar navigation
- `StatCard.tsx` — stat display card
- `ArticleCard.tsx` — article preview for search results
- `Badge.tsx` — tag/label badge
- `MisinfoBar.tsx` — misinformation score indicator

### Styling

Tailwind v4 via `@tailwindcss/postcss`. CSS custom properties for theming are in `app/globals.css`.
