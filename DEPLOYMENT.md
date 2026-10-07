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

## Etsy — creating real draft listings

By default (no Etsy env vars) the app uses a **dev mock** Etsy client: the
"Create Etsy Draft" button returns a `mock-…` id and nothing is sent to Etsy.
The app only ever creates **drafts** — you publish from Etsy yourself; it never
auto-publishes.

To switch to the **real** Etsy API (`openapi.etsy.com`), two things must be true:
the env vars below are set **and** the shop is connected via real OAuth.

1. **Etsy app** ([etsy.com/developers](https://www.etsy.com/developers/your-apps)) —
   your app must be **Approved** for write scopes. Note the **Keystring**
   (→ `ETSY_CLIENT_ID`) and **Shared Secret** (→ `ETSY_CLIENT_SECRET`).
2. **Render env vars** (dashboard → service → Environment → Save):
   - `ETSY_CLIENT_ID` = keystring (sent as the `x-api-key` header)
   - `ETSY_CLIENT_SECRET` = shared secret (used for the OAuth token exchange)
   - `ETSY_REDIRECT_URI` = `https://<your-app>.onrender.com/api/etsy/oauth/callback`
3. **Register the callback** — add that exact `ETSY_REDIRECT_URI` as a Callback
   URL in the Etsy app settings. OAuth scopes requested: `listings_r listings_w
   shops_r shops_w`.
4. **Connect a real shop** — in CreateFlow, connect Etsy via OAuth. This stores a
   real token **and your real numeric shop_id** (the draft call hits
   `/shops/{shopId}/listings`). The seeded demo shop has a fake id, so connect a
   real shop (or create the product under the connected shop).
5. **Create the draft, then publish** — click **Create Etsy Draft**. With real
   creds + a connected shop it POSTs a draft, uploads the listing images and the
   digital ZIP, and returns a real numeric listing id. Open the draft in your
   Etsy Shop Manager, review, and **Publish**.
