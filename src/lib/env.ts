import { z } from "zod";

/**
 * Server-only environment validation. Import from server code only.
 * Later phases add REDIS_URL, S3_*, ETSY_*, provider keys — declared optional
 * here so the app boots in dev before those services are provisioned.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  REDIS_URL: z.string().optional(),
  QUEUE_DRIVER: z.enum(["inline", "bullmq"]).default("inline"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_DIR: z.string().default("./storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  TOKEN_ENC_KEY: z.string().optional(),
  ETSY_CLIENT_ID: z.string().optional(),
  ETSY_CLIENT_SECRET: z.string().optional(),
  ETSY_REDIRECT_URI: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  // Cloudflare Workers AI (free-tier friendly) — text, image and vision.
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_TEXT_MODEL: z.string().default("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
  CLOUDFLARE_IMAGE_MODEL: z.string().default("@cf/black-forest-labs/flux-1-schnell"),
  CLOUDFLARE_VISION_MODEL: z.string().default("@cf/meta/llama-3.2-11b-vision-instruct"),
  AI_TEXT_PROVIDER: z.string().default("mock"),
  AI_IMAGE_PROVIDER: z.string().default("mock"),
  AI_VISION_PROVIDER: z.string().default("mock"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
