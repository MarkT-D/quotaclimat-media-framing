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
# Install frontend dependencies
npm install

# Copy env file
cp .env.example .env #copy on Windows

# Start the database
docker compose up -d

#Load the synthetic sample data so the app has something to show
#Mac/Linux:
docker compose exec -T db psql -U quota quota_climate < backend/db/seed_demo.sql
#Windows PowerShell:
#Get-Content backend/db/seed_demo.sql | docker compose exec -T db psql -U quota quota_climate

# Start dev servers (Next.js + Python backend)
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
Most recent dump is in backend/analysis/datasets/quota_climate_dump.sql, which is created by running backend/import_csv.py on analysis/datasets/database_input.csv, which is created in the Data Analysis.ipynb.

```bash
# 1. Start Postgres
docker compose up -d

# 2. Restore (Mac/Linux)
docker compose exec -T db psql -U quota quota_climate < quota_climate_dump.sql

# 2. Restore (Windows PowerShell)
Get-Content quota_climate_dump.sql | docker compose exec -T db psql -U quota quota_climate
```

In case of Windows error about backslash/encoding, run this in PowerShell:
```bash
$in = "$PWD\backend\analysis\datasets\quota_climate_dump.sql"
$out = "$PWD\backend\analysis\datasets\quota_climate_utf8.sql"
[System.IO.File]::WriteAllLines($out, [System.IO.File]::ReadLines($in), [System.Text.Encoding]::UTF8)
docker compose cp "$out" db:/tmp/dump_utf8.sql
docker compose exec db sh -c "tr -d '\r' < /tmp/dump_utf8.sql > /tmp/dump_final.sql && psql -v ON_ERROR_STOP=1 -U quota -d quota_climate -f /tmp/dump_final.sql"
Remove-Item -Path "$out" -ErrorAction SilentlyContinue
docker compose exec db sh -c "rm -f /tmp/dump_utf8.sql /tmp/dump_final.sql"
```

## Python backend

FastAPI server for frame classification and article upload.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload   # port 8000
```
The frame/angle classifier models need to be stored outside of this repository, because else npm cashes the model and causes every request to be very slow.

Set the paths for the model in .env


## Data

### How the corpus was collected

The underlying corpus was assembled from a major licensed news database
accessed through a university subscription. A custom
[Playwright](https://playwright.dev/) crawler drove authenticated search and
article retrieval, working through Boolean queries designed per climate sector
(transport, energy, agriculture, buildings, industry, water, ecosystem,
resource economy) in English, French, and Dutch. Retrieved articles were
written to JSONL, de-duplicated, ingested into PostgreSQL (`backend/db/`), and
then run through the frame/angle classifiers under `backend/analysis/`.

The collection tooling is **not** included in this repository, and the article
text is **not** redistributed: the corpus is third-party copyrighted content,
and the crawler was tied to institutional database access whose terms do not
permit sharing an automated retrieval tool. This repo is the analysis and
presentation layer plus a synthetic sample so it runs standalone.

### Running with sample data

To try the app locally, load the small synthetic sample seed (fabricated
articles, no third-party content):

```bash
docker compose up -d
docker compose exec -T db psql -U quota quota_climate < backend/db/seed_demo.sql
# Windows PowerShell:
# Get-Content backend/db/seed_demo.sql | docker compose exec -T db psql -U quota quota_climate
```

## Frontend commands

```bash
npm run dev        # Next.js dev server at http://localhost:3000
npm run dev:full   # Next.js + Python backend together (model has to be outside of repo!!)
npm run build      # production build
npm run prod:full  # production Next.js + Python backend (no dev widget, run after build)
npm start          # run production build (Next.js only)
npm run lint       # ESLint
```
