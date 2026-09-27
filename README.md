# CreateFlow

**AI Etsy Digital Product Creation & Listing Management**

Create, manage and list digital products with AI — from idea → planning → prompts →
image generation → review → packaging → Etsy SEO → Etsy draft → your final approval.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:
**typecheck → lint → tests → build**, plus a **Docker image build**. It uses dummy
env values (no real database needed), so it catches type errors, lint issues,
failing tests, and broken builds/Dockerfile before they merge.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4** (warm-neutral design system in `globals.css`)
- **Prisma** ORM — SQLite for local dev, PostgreSQL in production
- **Zod** validation · **jose** signed sessions · **bcryptjs** password hashing

## Getting started

### Option A — one command (Docker: app + worker + Postgres + Redis + MinIO)

```bash
docker compose up --build
docker compose exec app npm run db:seed   # once, to load demo data
```
App → http://localhost:3000 · MinIO console → http://localhost:9001. Put any AI
keys in `.env` (see below) before `up` and set `AI_*_PROVIDER` to `openai`/`gemini`.

### Option B — local Node + Docker infra only

```bash
npm install
docker compose up -d postgres redis minio   # or use hosted equivalents
npm run storage:setup                        # create the MinIO bucket
npm run db:push        # sync schema  (or: npx prisma migrate dev)
npm run db:seed        # demo seller, shops and products
npm run dev            # http://localhost:3000
npm run worker         # background jobs (separate terminal)
```

**Demo login:** `demo@createflow.app` / `demo1234`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync schema → database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Environment

Copy `.env.example` → `.env`. Phase 1 needs only `DATABASE_URL` and `SESSION_SECRET`
(both prefilled for dev). Redis, S3, Etsy and AI-provider keys are wired in later phases
and are optional until then.

### Moving to PostgreSQL (production)

1. In `prisma/schema.prisma` set `datasource db { provider = "postgresql" }`.
2. Point `DATABASE_URL` at your Postgres instance (Neon/Supabase/RDS/etc.).
3. `npx prisma migrate dev`. The schema is written provider-portable (constrained
   string statuses, JSON lists) so no model changes are required.

## Connecting Etsy (Phase 7)

Etsy draft creation uses the official **Etsy Open API v3** with OAuth 2.0 + PKCE.
Without credentials the app uses a clearly-labelled **dev mock** so the flow is testable.

To connect a real shop:

1. Create an app at the [Etsy Developer portal](https://www.etsy.com/developers) and get a keystring (client id) + shared secret.
2. Set in `.env`:
   ```
   ETSY_CLIENT_ID=...
   ETSY_CLIENT_SECRET=...
   ETSY_REDIRECT_URI=http://localhost:3000/api/etsy/oauth/callback   # must match APP_URL
   TOKEN_ENC_KEY=<32+ char secret>   # encrypts stored OAuth tokens
   ```
3. Ensure `APP_URL` matches the host the redirect URI uses.
4. In **Settings → Etsy Shops**, click **Connect to Etsy**.

CreateFlow only ever creates **draft** listings — it never publishes. You review and publish from Etsy.

## Roadmap

- **Phase 1 ✅** App shell, sidebar, dashboard, auth, database, product creation
- **Phase 2** AI Creative Director → collection planning → Prompt Studio
- **Phase 3** Image generation, background queue (Redis + BullMQ), storage
- **Phase 4** Review Studio, quality analysis, duplicate detection
- **Phase 5** Product packaging + ZIP downloads
- **Phase 6** Etsy SEO + listing metadata
- **Phase 7** Etsy OAuth + draft creation (never auto-publishes)
- **Phase 8** Analytics, Unit Economics, Photo Library, Automation Center
