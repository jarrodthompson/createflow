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
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`✅ Created bucket "${bucket}".`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
