# AGENTS.md

## Frontend (`apps/web`) — read this first

Before doing any work in `apps/web`, read [`apps/web/AGENTS.md`](apps/web/AGENTS.md) in full.

- This repo uses Next.js 16.4, which has breaking changes. Read the relevant guide in
  `apps/web/node_modules/next/dist/docs/` before writing code; `next` is not visible from the repo root.
- Do not remove or rewrite the `nextjs-agent-rules` block in `apps/web/AGENTS.md`; `next dev` re-adds it.

## Repository

pnpm monorepo:

- `apps/web` — Next.js 16 (App Router), React 19, Tailwind CSS 4, HeroUI v3, typed API client via
  `openapi-fetch`; tests use Vitest + jsdom.
- `apps/api` — NestJS 12, Prisma 8 RC, Vitest; OpenAPI schema at `apps/api/openapi.json`.

## Commands (from repo root)

```bash
pnpm install
pnpm dev          # run all apps in parallel
pnpm build
pnpm lint
pnpm test         # API and web tests
pnpm format
pnpm infra:up     # Docker: Postgres + SeaweedFS
pnpm infra:down
```

- App scripts load the root `.env`; web also uses `apps/web/.env` for `NEXT_PUBLIC_API_URL`.
  Copy `.env.example` and `apps/web/.env.example` if missing.
- Formatting uses the root `.prettierrc`.

## Cross-app notes

- Frontend UI uses HeroUI v3 (`@heroui/react` + `@heroui/styles`); styles are imported in
  `apps/web/src/app/globals.css` and no provider is required.
- API/DB work: read `apps/api/README.md` and `apps/api/prisma-8.md`.
- After changing the API OpenAPI schema, regenerate frontend types:
  `pnpm --filter @ecommerce_cds/web api:generate`
- Never commit `.env` files or secrets.
