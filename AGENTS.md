<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Base44 Dev Environment

- **Stack**: Next.js 14 + Prisma (PostgreSQL) + Redis (BullMQ) + NextAuth (credentials)
- **Run**: `docker compose -f docker-compose.base44.yml up -d` — starts postgres, redis, setup (migrations+seed), app (next dev on :3000), and worker
- **Dockerfile.base44**: extends `node:22-slim` with `openssl` (Prisma schema engine needs it on slim images)
- **node_modules**: shared named volume across setup/app/worker; setup installs deps first, app and worker reuse them
- **Prisma**: `db push --accept-data-loss` + seed run in the one-shot `setup` service
- **Redis**: local redis service; `REDIS_URL` used by ioredis/BullMQ. Dummy `UPSTASH_REDIS_REST_URL`/`TOKEN` set so `UpstashRedis.fromEnv()` in `src/lib/redis.ts` doesn't crash at module load
- **allowedDevOrigins**: `next.config.js` derives it from `BASE44_PUBLIC_HOST_SUFFIX` so the preview origin can load `/_next/*` assets
- **Auth**: credentials-based (email/password), redirects unauthenticated users to `/login`
- **Verify**: `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/login` should return 200
