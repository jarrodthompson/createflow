import "server-only";
import { env } from "@/lib/env";
import { runProductGeneration } from "@/server/services/generation";
import { runProductAnalysis } from "@/server/services/analysis";
import { runProductPackaging } from "@/server/services/packaging";

/**
 * Background generation queue abstraction.
 *
 * - dev (QUEUE_DRIVER=inline): runs generation in-process, fire-and-forget, so
 *   the browser does NOT need to stay open — progress is persisted to the DB and
 *   the queue UI polls it. Resumable by re-enqueuing (queued images are picked up).
 * - prod (QUEUE_DRIVER=bullmq): enqueues to Redis; a separate worker process
 *   (`npm run worker`, src/worker/index.ts) runs the same generation service.
 */
export interface GenerationQueue {
  readonly name: string;
  enqueue(productId: string, jobId: string): Promise<void>;
  enqueueAnalysis(productId: string, jobId: string): Promise<void>;
  enqueuePackaging(productId: string, jobId: string): Promise<void>;
}

class InlineQueue implements GenerationQueue {
  readonly name = "inline";
  async enqueue(productId: string, jobId: string): Promise<void> {
    // Do not await — let the request return immediately.
    void runProductGeneration(productId, jobId).catch((err) => {
      console.error("Inline generation failed:", err);
    });
  }
  async enqueueAnalysis(productId: string, jobId: string): Promise<void> {
    void runProductAnalysis(productId, jobId).catch((err) => {
      console.error("Inline analysis failed:", err);
    });
  }
  async enqueuePackaging(productId: string, jobId: string): Promise<void> {
    void runProductPackaging(productId, jobId).catch((err) => {
      console.error("Inline packaging failed:", err);
    });
  }
}

class BullQueue implements GenerationQueue {
  readonly name = "bullmq";
  // Lazy so bullmq/ioredis only load when actually used.
  private queuePromise: Promise<import("bullmq").Queue> | null = null;

  private async getQueue() {
    if (!this.queuePromise) {
      this.queuePromise = (async () => {
        const { Queue } = await import("bullmq");
        const IORedis = (await import("ioredis")).default;
        const connection = new IORedis(env.REDIS_URL!, { maxRetriesPerRequest: null });
        return new Queue("generation", { connection });
      })();
    }
    return this.queuePromise;
  }

  async enqueue(productId: string, jobId: string): Promise<void> {
    const queue = await this.getQueue();
    await queue.add(
      "product-generation",
      { productId, jobId, kind: "generation" },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100 },
    );
  }
  async enqueueAnalysis(productId: string, jobId: string): Promise<void> {
    const queue = await this.getQueue();
    await queue.add(
      "product-analysis",
      { productId, jobId, kind: "analysis" },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100 },
    );
  }
  async enqueuePackaging(productId: string, jobId: string): Promise<void> {
    const queue = await this.getQueue();
    await queue.add(
      "product-packaging",
      { productId, jobId, kind: "packaging" },
      { attempts: 2, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100 },
    );
  }
}

let cached: GenerationQueue | null = null;
export function getQueue(): GenerationQueue {
  if (cached) return cached;
  cached = env.QUEUE_DRIVER === "bullmq" && env.REDIS_URL ? new BullQueue() : new InlineQueue();
  return cached;
}
