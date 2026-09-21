/**
 * CreateFlow background worker (production).
 * Run alongside the web app: `npm run worker`.
 * Requires REDIS_URL and QUEUE_DRIVER=bullmq. Consumes the 'generation' queue
 * and runs the same generation service the app uses.
 */
import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { runProductGeneration } from "@/server/services/generation";
import { runProductAnalysis } from "@/server/services/analysis";
import { runProductPackaging } from "@/server/services/packaging";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("REDIS_URL is required to run the worker.");
  process.exit(1);
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker(
  "generation",
  async (job) => {
    const { productId, jobId, kind } = job.data as {
      productId: string;
      jobId: string;
      kind?: string;
    };
    console.log(`[worker] ${kind ?? "generation"} for product ${productId} (job ${jobId})`);
    if (kind === "analysis") return runProductAnalysis(productId, jobId);
    if (kind === "packaging") return runProductPackaging(productId, jobId);
    return runProductGeneration(productId, jobId);
  },
  { connection, concurrency: 2 },
);

worker.on("completed", (job) => console.log(`[worker] completed ${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] failed ${job?.id}:`, err.message));

console.log("CreateFlow worker started, listening on 'generation' queue.");
