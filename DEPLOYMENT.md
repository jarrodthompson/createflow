# Deploying CreateFlow (free, single service)

The free path runs the whole app on **one Render web service** using the inline
queue (image generation runs in the web process — no separate worker or Redis),
with **Supabase** for Postgres + S3-compatible storage and **Cloudflare Workers
AI** for generation. `render.yaml` in the repo root wires it up.

> **Free-tier caveats:** Render's free web service sleeps after ~15 min idle
> (first load after a nap is slow, and a large 100-image run could be cut off if
> it sleeps mid-job — keep batches small). Supabase's free database pauses after
> ~1 week of inactivity. For always-on + big batches, use a paid Render instance
> (which also unlocks a real background worker: set `QUEUE_DRIVER=bullmq` + a
> Redis URL and run `npm run worker` as a second service).

## 1. Supabase (database + storage)

1. [supabase.com](https://supabase.com) → **New project** (free). Save the DB password.
2. **DATABASE_URL** — Project → **Connect → Session pooler** → copy the URI
   (`postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres`).
   Use the **Session pooler** (IPv4, works with Prisma migrations), not Direct.
3. **Storage** → create a bucket named **`createflow`** (Private is fine — files
   are served through the app's `/api/files` route, not public URLs).
4. **S3 access** — Storage settings → enable the S3 protocol and create **S3
   access keys**. Note:
   - `S3_ENDPOINT` = `https://<project-ref>.supabase.co/storage/v1/s3`
   - `S3_REGION` = your project region (shown there, e.g. `us-east-1`)
   - `S3_ACCESS_KEY` / `S3_SECRET_KEY` = the keys you just created

## 2. Cloudflare Workers AI (generation)

Already set up locally. You need:
- `CLOUDFLARE_ACCOUNT_ID` — dash.cloudflare.com → AI → Workers AI
- `CLOUDFLARE_API_TOKEN` — a token with the **Workers AI** permission

## 3. Render

1. Push this repo to GitHub (done).
2. [render.com](https://render.com) → **New → Blueprint** → connect GitHub →
   pick the **createflow** repo. Render reads `render.yaml`.
3. Render auto-generates `SESSION_SECRET` and `TOKEN_ENC_KEY`. Fill the
   dashboard-only (`sync: false`) vars:
   `DATABASE_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
   `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.
4. Deploy. The start command runs `prisma migrate deploy` (creates your tables
   in Supabase) → confirms the bucket → starts the app.
5. Copy your URL (`https://createflow.onrender.com`), set **`APP_URL`** to it,
   and redeploy. (`APP_URL` is used for sign-in and Etsy OAuth redirects.)
6. *(Optional)* Seed demo data: Render → your service → **Shell** →
   `npm run db:seed`. Otherwise just sign up fresh in the app.

## Switching AI providers

Flip `AI_TEXT_PROVIDER` / `AI_IMAGE_PROVIDER` / `AI_VISION_PROVIDER` between
`cloudflare` (free), `openai`, `gemini`, or `mock`, and add the matching key
(`OPENAI_API_KEY` / `GEMINI_API_KEY`). No code change.

## Etsy (optional)

To connect real Etsy shops in production, set `ETSY_CLIENT_ID`,
`ETSY_CLIENT_SECRET`, and `ETSY_REDIRECT_URI=<APP_URL>/api/etsy/oauth/callback`,
and register that exact callback URL in your Etsy app.
