import "dotenv/config";
import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

async function main() {
  if (process.env.STORAGE_DRIVER !== "s3") {
    console.log("STORAGE_DRIVER is not s3 — nothing to set up.");
    return;
  }
  const bucket = process.env.S3_BUCKET!;
  const client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`✅ Bucket "${bucket}" already exists.`);
    return;
  } catch {
    // Not found (or no HeadBucket perms) — try to create it below.
  }
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`✅ Created bucket "${bucket}".`);
  } catch (e) {
    // Some S3-compatible providers (e.g. Supabase Storage) don't allow bucket
    // creation over the S3 API — create it in their dashboard instead. Don't
    // fail the deploy over this.
    console.warn(
      `⚠️  Could not create bucket "${bucket}" via S3 API: ${(e as Error).message}\n` +
        `   If you're on Supabase/Backblaze/etc., create the bucket in their dashboard.`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
