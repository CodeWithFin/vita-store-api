# Vitastore Web (Next.js)

Next.js App Router frontend for the Vitastore API.

## Run locally

1. Start API (port 3000):

```bash
cd ..
npm run dev
```

2. Install and start Next.js (port 3001):

```bash
npm install
npm run dev
```

3. Open:

- Web UI: http://localhost:3001
- API: http://localhost:3000

`/api/*` and `/assets/*` are proxied from Next.js to the Fastify API for cookie auth and shared assets.

## Routes

- `/` landing
- `/login` auth
- `/dashboard` overview (server-rendered)
- `/dashboard/products`
- `/dashboard/movements`
- `/dashboard/expiry`
- `/dashboard/brands`
