<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Base44 dev environment

This repo runs in the Base44 sandbox via `docker-compose.base44.yml` (NOT the
repo's own `docker-compose.yml`, which only defines the postgres/redis infra).

### Services
- `postgres` (15-alpine) + `redis` (7-alpine) — local infra with healthchecks.
- `setup` — one-shot: `npm install` → `prisma generate` → `prisma db push` →
  `prisma db seed`. `web`/`worker` wait for it via `service_completed_successfully`.
- `web` — `next dev -p 3000 -H 0.0.0.0` from the bind-mounted source (live reload).
- `worker` — `npx tsx src/workers/generation.worker.ts` (BullMQ consumer).

### Non-obvious quirks
- **OpenSSL is required for Prisma's schema engine.** `node:22-slim` ships
  without the `openssl` CLI, so `prisma db push` fails with an empty
  "Schema engine error". `Dockerfile.base44` installs `openssl` on top of
  `node:22-slim` to fix this. The runtime query engine (openssl-3.0.x) works
  without it, but `db push`/`migrate` do not.
- **Upstash Redis REST placeholders.** `src/lib/redis.ts` calls
  `UpstashRedis.fromEnv()` at module load, which throws if
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are unset. The Upstash
  client is only referenced by `src/lib/cache.ts`, which is not imported
  anywhere, so placeholder values in `.env.base44-defaults` prevent the throw
  without needing real Upstash credentials. BullMQ uses `ioredis` against the
  local `REDIS_URL` instead.
- **No external secrets needed.** All credentials are local infra (postgres,
  redis) or a local JWT signing secret, set in `.env.base44-defaults`.
- `node_modules` lives in a named volume (`app_node_modules`) shared across
  services so `setup`'s install is reused by `web`/`worker`.

### Verify it works
- `docker compose -f docker-compose.base44.yml ps` — all services healthy,
  `setup` exited 0.
- `curl -sf -H "Host: x.example.com" http://localhost:3000/login` → 200 with
  the "Puzzle Book Generator" title.
- The `/` route redirects to `/login` (unauthenticated) or `/dashboard`.
