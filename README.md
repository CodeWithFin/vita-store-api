# vita-store-api

Monolithic inventory management platform — Fastify API, PostgreSQL, and a web UI served from a single application.

## Tech Stack

- **Fastify** – API server + static frontend hosting
- **PostgreSQL** – source of truth with raw SQL (`pg` driver)
- **TypeBox** – request/response schema validation
- **Vanilla JS UI** – inventory dashboard inspired by warm editorial design
- **Swagger UI** – interactive API docs at `/docs`
- **Docker** – containerized app and database

## Quick Start (Docker)

```bash
cd vitastore-api/docker
docker compose up --build
```

- **Landing:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard (requires sign-in)
- **Swagger:** http://localhost:3000/docs
- **Health:** http://localhost:3000/health

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

`npm run dev` starts embedded PostgreSQL (if needed) and the full monolith with hot reload.

**Default credentials:** `admin` / `admin123` (configure via `AUTH_USERNAME` and `AUTH_PASSWORD`).

## Monolithic Architecture

```
vitastore-api/
├── public/              # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── css/main.css
│   └── js/
├── src/                 # Fastify API
│   ├── modules/         # items, movements, dashboard
│   └── server.js        # API + static file serving
├── docker/
└── scripts/dev-with-db.mjs
```

The server serves:
- `/` — Inventory management UI
- `/api/*` — REST API
- `/docs` — Swagger UI

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

## Environment Variables

See `.env.example` for all supported variables.
