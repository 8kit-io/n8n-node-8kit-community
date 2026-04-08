# 8kit Demo Workflows

Sample n8n workflows demonstrating the four core 8kit patterns. Import these into any n8n instance with the 8kit community node installed.

## Setup

1. Start the dev stack: `docker compose -f docker-compose.dev.yml up -d`
2. Open n8n at http://localhost:5678
3. Configure 8kit credentials: Host URL = `http://eightkit:3000`, Token = your API key
4. Import any workflow JSON from this directory

## Workflows

| File | Pattern | Description |
|------|---------|-------------|
| `01-deduplication.json` | Uniqs | Email deduplication — skip already-processed contacts |
| `02-data-mapping.json` | Lookups | CRM ID mapping — translate IDs between two systems |
| `03-distributed-locking.json` | Locks | Prevent concurrent execution of critical operations |
| `04-temporal-tracking.json` | Last Updated | Incremental sync — only process records changed since last run |
