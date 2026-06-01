# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # Next.js dev server at http://localhost:3000
npm run dev:full   # Next.js + Python backend together (recommended)
npm run build      # production build
npm start          # run production build
npm run lint       # ESLint (flat config, eslint 9)
```

No test runner is configured yet.

## Database (Docker)

**Start / stop**
```bash
docker compose up -d       # start Postgres on localhost:5432
docker compose down        # stop (data persists in pgdata volume)
```

**First-time setup — restore dump**
```bash
# Mac / Linux
docker compose exec -T db psql -U quota quota_climate < quota_climate_dump.sql

# Windows PowerShell (if redirect fails)
Get-Content quota_climate_dump.sql | docker compose exec -T db psql -U quota quota_climate
```

**Wipe all data (keep schema)**
```bash
docker compose exec -T db psql -U quota quota_climate -c "TRUNCATE articles RESTART IDENTITY CASCADE;"
```

**Full reset — destroy volume and re-seed from dump**
```bash
docker compose down -v
docker compose up -d
docker compose exec -T db psql -U quota quota_climate < quota_climate_dump.sql
```

**Create a new dump from current DB state**
```bash
docker compose exec -T db pg_dump -U quota --no-owner --no-acl quota_climate > quota_climate_dump.sql
```

`.env` values (matches `.env.example`):
```
POSTGRES_PASSWORD=changeme
DATABASE_URL=postgresql://quota:changeme@localhost:5432/quota_climate
```

## Python backend

FastAPI server that handles frame classification and article upload.

```bash
cd backend && pip install -r requirements.txt
uvicorn main:app --reload   # port 8000
```

Endpoints: `POST /classify`, `POST /upload`, `GET /health`.
The frame classifier loads from `backend/analysis/checkpoint-*/` (model weights not included in repo).

## Architecture

**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (PostCSS engine), Recharts, Lucide icons, TypeScript strict mode. Path alias `@/*` maps to the project root.

### Data layer

Article data is stored in PostgreSQL 16 (Docker) and served via Next.js API routes.

- `lib/db.ts` — PostgreSQL connection (via `postgres` driver)
- `lib/articleTypes.ts` — Core types: `Article` interface; enums `SECTORS`, `CRISIS_DOMAINS`, `STAGES`, `FRAMES`, `ANGLES`, `OUTLETS`. Also exports `getOutletStats()` and related helpers.
- `lib/articleMapper.ts` — Maps DB rows to the client `Article` type
- `lib/useArticles.ts` — React hook that fetches `/api/articles` with client-side caching

### Routing (App Router)

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Home page |
| `/overview` | `app/overview/page.tsx` | Main dashboard — sector vs GHG charts, frame/angle breakdowns |
| `/search` | `app/search/page.tsx` | Filterable article list with pagination |
| `/newspapers` | `app/newspapers/page.tsx` | Per-outlet statistics (Discrepancy Desk) |
| `/article/[id]` | `app/article/[id]/page.tsx` | Article detail |
| `/about` | `app/about/page.tsx` | Mission/methodology |

Root layout (`app/layout.tsx`) renders `<NewspaperHeader>` and wraps all pages.

### Components (`components/`)

- `NewspaperHeader.tsx` — fixed top header + navigation
- `UploadPanel.tsx` — article upload and classification UI
- `ExplainPanel.tsx` — word-level frame/angle explanation highlights
- `ArticleCard.tsx` — article preview card for search results
- `StatCard.tsx` — KPI stat card
- `Badge.tsx` — tag/label badge
- `Logo.tsx` — SVG brand mark
- `TypingGreeting.tsx` — animated home page greeting
- `ScrollReveal.tsx` — scroll animation helper

### Styling

Tailwind v4 via `@tailwindcss/postcss`. CSS custom properties for theming are in `app/globals.css`. Design system documented in `DESIGN.md`.
