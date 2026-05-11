# Quota Climate

A Next.js web application for climate quota research and analysis.

## Prerequisites

- Node.js 18+
- Docker Desktop (for the database)
- Python 3.11+ (for the scraper and classifier)

## Quick start

```bash
# 1. Install frontend dependencies
npm install

# 2. Copy env file and set your password
cp .env.example .env

# 3. Start the database
docker compose up -d

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database

PostgreSQL 16 runs in Docker. Data is persisted in the `pgdata` Docker volume.

```bash
docker compose up -d    # start
docker compose stop     # stop (data kept)
docker compose down -v  # stop and delete all data
```

Connection string (set in `.env`):
```
postgresql://quota:<password>@localhost:5432/quota_climate
```

Schema is defined in `backend/db/schema.sql` and applied automatically on first start.

## Scraper

See [`backend/scraper/README.md`](backend/scraper/README.md) for full instructions.

```bash
cd backend

# Authenticate (once per account)
python -m scraper.scraper --login

# Scrape articles
python -m scraper.scraper --query-file scraper/queries/transport_query.txt --language English --max 500
```

## Frontend commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm start        # run production build
npm run lint     # ESLint
```
