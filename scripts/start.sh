#!/bin/sh
# Production start: apply migrations, ensure the storage bucket, then serve.
set -e
echo "→ prisma migrate deploy"
npx prisma migrate deploy
echo "→ storage bucket check"
npx tsx scripts/setup-storage.ts || true
echo "→ starting Next.js"
exec npm start
