A small ecommerce application developed for the technical evaluation for CDS.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16.4 (App Router), React 19, TypeScript, Tailwind CSS 4, HeroUI 3 |
| API client | `openapi-fetch` with generated OpenAPI types |
| Backend | NestJS 12, TypeScript, Prisma ORM 8 RC |
| Database | PostgreSQL 18 |
| Auth | JWT stored in an HTTP-only cookie |
| Payments | Stripe Checkout in test mode |
| Image storage | SeaweedFS with an S3-compatible API |
| Tooling | pnpm 11, Vitest, ESLint, Prettier, Docker Compose |

## Prerequisites

- Node.js 24.
- pnpm 11.
- Docker and Docker Compose.
- A Stripe test-mode secret key.

## Quick start

From the repository root:

```bash
# 1. Install dependencies
pnpm install

# 2. Create the environment files
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# 3. Edit .env and set at least JWT_SECRET and STRIPE_SECRET_KEY
#    Generate a JWT secret with: openssl rand -hex 32

# 4. Start PostgreSQL and SeaweedFS
pnpm infra:up

# 5. Wait for both containers to report healthy
docker compose ps

# 6. Apply database migrations
pnpm --filter @ecommerce_cds/api db:migrate

# 7. Seed 200 demo products and their images (optional, recommended)
pnpm --filter @ecommerce_cds/api db:seed

# 8. Start the API and web app together
pnpm dev
```

Sign up at <http://localhost:3000/signup>, then browse the catalog and add products to the cart.

## Environment files

The app scripts load the root `.env`. The web app also loads `apps/web/.env`, which is where `NEXT_PUBLIC_API_URL` belongs.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API | PostgreSQL connection string; must match the `POSTGRES_*` values. |
| `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Docker Compose | Local PostgreSQL container configuration. |
| `JWT_SECRET` | API | Secret used to sign auth tokens. Required. |
| `STRIPE_SECRET_KEY` | API | Stripe test-mode secret key (`sk_test_...`). Required at startup. |
| `WEB_ORIGIN` | API | Web origin used for CORS and Stripe success/cancel redirects. |
| `API_PORT` | API | API port. Defaults to `3001`. |
| `API_URL` | Web server code | API URL used by server-side data fetching. |
| `WEB_PORT` | Web | Web dev/start port. Defaults to `3000`. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | API and SeaweedFS | S3 credentials. |
| `S3_ENDPOINT` | API | S3 endpoint used by the API to upload images. |
| `S3_PUBLIC_URL` | API | Public S3 endpoint used in presigned image URLs. Must be reachable from the browser. |
| `S3_REGION`, `S3_BUCKET` | API | S3 region and bucket name. |
| `NEXT_PUBLIC_API_URL` | Web browser code | API URL used by the browser client; set this in `apps/web/.env`. |

## Stripe test checkout

Use a Stripe test card such as:

```text
Card number: 4242 4242 4242 4242
Expiry:      any future date
CVC:         any 3 digits
```

## Admin access

New accounts are customers. There is no seeded admin account. To access the admin product management UI at `/admin`, promote a user in PostgreSQL:

```bash
docker compose exec postgres psql -U user -d ecommerce_cds \
  -c "UPDATE \"User\" SET role = 'admin' WHERE email = 'you@example.com';"
```

Adjust the database name and user if you changed `POSTGRES_DB` or `POSTGRES_USER` in `.env`.

## Run tests

Run these from the repository root unless noted otherwise.

```bash
pnpm test         # Run API and web unit tests
pnpm --filter @ecommerce_cds/api test:e2e   # Run API end-to-end tests
```

For simplicity the API e2e tests use the configured local database and S3 storage, so start the infrastructure first.

## API types

The API exposes an OpenAPI schema at `apps/api/openapi.json`. After changing API routes or DTOs, regenerate the schema and then the frontend types:

```bash
pnpm --filter @ecommerce_cds/api openapi:generate
pnpm --filter @ecommerce_cds/web api:generate
```
