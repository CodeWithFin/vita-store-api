# vita-store-api

RESTful backend for core inventory management: product catalog, real-time stock levels, and an append-only movement ledger.

## Tech Stack

- **Fastify** – high-throughput HTTP server
- **PostgreSQL** – source of truth with raw SQL (`pg` driver)
- **TypeBox** – request/response schema validation
- **Swagger UI** – interactive API docs at `/docs`
- **Docker** – containerized app and database

## Quick Start (Docker)

```bash
cd vitastore-api/docker
docker compose up --build
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- Health: http://localhost:3000/health

## Local Development

1. Start PostgreSQL (or use Docker for DB only):

```bash
cd docker
docker compose up postgres -d
```

2. Copy environment file and install dependencies:

```bash
cp .env.example .env
npm install
```

3. Update `.env` so `DB_HOST=localhost` when running the API outside Docker.

4. Run the API:

```bash
npm run dev
```

## API Endpoints

### Items (`/api/items`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/items` | List items (`?category`, `?search`, `?low_stock=true`) |
| GET | `/api/items/:id` | Get item by UUID or SKU |
| POST | `/api/items` | Create item (stock starts at 0) |
| PUT | `/api/items/:id` | Update catalog fields (not stock) |
| DELETE | `/api/items/:id` | Hard delete (no history) or soft delete (has movements) |

### Movements (`/api/movements`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/movements` | Log movement and update stock (transactional) |
| GET | `/api/movements` | Ledger (`?item_id`, `?page`, `?limit`) |

### Dashboard (`/api/dashboard`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/metrics` | Total value, low stock count, total items |

## Movement Types

- **IN** – positive quantity (stock increase)
- **OUT** – positive quantity in request, stored as negative (stock decrease)
- **ADJUSTMENT** – signed quantity (positive or negative net change)

Stock updates use `SELECT ... FOR UPDATE` inside a transaction to prevent race conditions.

## Project Structure

```
vitastore-api/
├── docker/              # Docker Compose + init.sql
├── src/
│   ├── config/          # Environment config
│   ├── db/              # PostgreSQL pool
│   ├── plugins/         # Fastify plugins
│   ├── modules/         # Domain modules (items, movements, dashboard)
│   ├── utils/           # Shared helpers
│   └── server.js        # App entry point
├── Dockerfile
└── package.json
```

## Environment Variables

See `.env.example` for all supported variables.
