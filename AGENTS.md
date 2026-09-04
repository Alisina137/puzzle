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

## Domain-Based Vocabulary System

- **Architecture**: Theme → Domains → Domain JSON files (one per domain) → Difficulty arrays (simple/intermediate/hard) → Book difficulty filter → Word selection → Puzzle generation
- **Domain files**: `src/modules/theme/word-lists/[theme]/[domain].json` — each file has `{ theme, subtheme, statistics, words: { simple, intermediate, hard } }` plus domain metadata
- **Legacy word lists**: Static TS files (`animals.ts`, `football.ts`, etc.) still work for themes without domain directories. The generation service auto-detects which system to use.
- **Difficulty mapping** (`src/modules/theme/vocabulary/difficulty-pools.ts`): Easy→simple, Medium→simple+intermediate, Hard→hard, Expert→hard. This is a HARD constraint — no fallback to other pools.
- **Word selection modes**: `single-domain` (one domain per puzzle) and `mixed-domain` (multiple domains per puzzle). Stored in `book.generationSettings.wordSelectionMode`.
- **AI vocabulary generation**: Requires `OPENAI_API_KEY` secret. Three-stage pipeline: Prompt 1 (domain discovery) → Prompt 2 (raw vocabulary per domain) → Prompt 3 (cleanup + classification per domain). Domain-level failure isolation.
- **API routes**: `GET /api/themes/[id]/domains` (list domains), `POST /api/themes/[id]/generate-vocabulary` (trigger AI generation)
- **Tests**: `npx vitest run src/modules/theme/` — 48 tests covering difficulty filtering, filename normalization, word list loader, and domain word selection
