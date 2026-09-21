/**
 * POST JSON with retry on transient upstream errors (429 rate limit, 5xx).
 * Providers experience brief demand spikes; a few backed-off retries keep the
 * pipeline resilient without masking real failures (4xx other than 429 throw).
 */
export async function postWithRetry(
  url: string,
  init: RequestInit,
  { retries = 3, baseDelayMs = 1200, label = "AI" }: { retries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<Response> {
  let lastErr = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;

    const transient = res.status === 429 || res.status >= 500;
    lastErr = `${label} error ${res.status}: ${await res.text()}`;
    if (!transient || attempt === retries) {
      throw new Error(lastErr);
    }
    // Exponential backoff with jitter.
    const delay = baseDelayMs * 2 ** attempt + Math.random() * 400;
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(lastErr);
}
