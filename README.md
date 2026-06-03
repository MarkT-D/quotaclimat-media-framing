# Quota Climat: Climate journalism analysis dashboard

This tracks how news coverage reflects environmental crises across sectors, frames, and angles.

## Prerequisites

- Node.js 18+
- Docker Desktop (for the database)
- Python 3.11+ (for the classifier backend)

## Analysis
All the data analysis and dataset (pre)processing is under /backend/analysis. This includes a README.md with more details as well.

## Quick start

```bash
# 1. Install frontend dependencies
npm install

# 2. Copy env file and set your password
cp .env.example .env

# 3. Start the database
docker compose up -d

# 4. Start dev servers (Next.js + Python backend)
npm run dev:full
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

> `npm run dev` starts only the Next.js frontend. Use `npm run dev:full` to also start the FastAPI classifier backend on port 8000.

## Database

PostgreSQL 16 runs in Docker. Data is persisted in the `pgdata` Docker volume.

```bash
docker compose up -d    # start
docker compose down     # stop (data kept)
docker compose down -v  # stop and delete all data
```

Connection string (set in `.env`):
```
postgresql://quota:<password>@localhost:5432/quota_climate
```

Schema is defined in `backend/db/schema.sql` and applied automatically on first start.

**Restore from a dump:**

```bash
# 1. Start Postgres
docker compose up -d

# 2. Restore (Mac/Linux)
docker compose exec -T db psql -U quota quota_climate < quota_climate_dump.sql

# 2. Restore (Windows PowerShell)
Get-Content quota_climate_dump.sql | docker compose exec -T db psql -U quota quota_climate
```

## Python backend

FastAPI server for frame classification and article upload.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload   # port 8000
```
The frame/angle classifier models need to be stored outside of this repository, because else npm cashes the model and causes every request to be very slow.


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
npm run dev        # Next.js dev server at http://localhost:3000
npm run dev:full   # Next.js + Python backend together (model has to be outside of repo!!)
npm run build      # production build
npm start          # run production build
npm run lint       # ESLint
```
