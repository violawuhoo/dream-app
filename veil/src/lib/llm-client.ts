// How timeouts work here:
//
// One AbortController covers the ENTIRE lifecycle of each attempt:
// connection → response headers → streaming body.
// STREAM_TIMEOUT_MS is the wall-clock budget for all three combined.
// This prevents reader.read() from hanging indefinitely when the server
// stops sending but never closes the connection (stale streaming response).
//
// If the first attempt fails at the network level (fetch throws — e.g.
// connection refused, DNS failure, abort) we wait RETRY_DELAY_MS and try
// once more.  We do NOT retry on HTTP errors: the upstream (Kimi) already
// billed for the request, and a 4xx/5xx won't succeed on a retry.

const STREAM_TIMEOUT_MS = 60_000; // 60 s: connect + full stream body
const RETRY_DELAY_MS = 2_000;

function makeRequest(
  messages: any[],
  temperature: number,
  token: string,
): { promise: Promise<Response>; abort: () => void; stopTimer: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  // The timer is intentionally NOT cleared here on success.
  // It keeps running through the streaming body read in callLLM so that
  // reader.read() is also covered by the same deadline.
  // Use abort() on errors / early exit; use stopTimer() after normal stream
  // completion (avoids firing the abort event on an already-finished fetch,
  // which would queue a native main-queue callback visible to EarlGrey).
  const promise = fetch("/api/dream-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, temperature }),
    signal: controller.signal,
  });

  return {
    promise,
    abort: () => { clearTimeout(timer); controller.abort(); },
    stopTimer: () => clearTimeout(timer),
  };
}

export async function* callLLM(
  messages: any[],
  temperature = 0.7,
  getToken: () => Promise<string | null>
): AsyncGenerator<string> {
  const token = (await getToken()) ?? "";

  // --- attempt 1 ---------------------------------------------------------
  let req = makeRequest(messages, temperature, token);
  let res: Response;
  try {
    res = await req.promise;
  } catch {
    // Network-level failure (no HTTP response).
    // Don't retry on HTTP errors — Kimi already billed for the request.
    req.abort(); // cancel the (already-failed) request cleanly
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    req = makeRequest(messages, temperature, token);
    res = await req.promise; // if this also throws, propagate to orchestrator
  }

  if (!res.ok || !res.body) {
    req.abort();
    throw new Error(`LLM request failed: ${res.status}`);
  }

  // --- stream body -------------------------------------------------------
  // The AbortController from makeRequest is still live.
  // If STREAM_TIMEOUT_MS elapses from request-start, controller.abort() fires
  // and reader.read() throws AbortError — no infinite hang.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Track whether the stream ended naturally so the finally block can avoid
  // calling controller.abort() on a completed fetch (which would fire the
  // abort event and queue a native main-queue callback visible to EarlGrey).
  let streamCompleted = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { streamCompleted = true; break; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") { streamCompleted = true; return; }

        try {
          const parsed = JSON.parse(payload);
          const chunk: string = parsed?.choices?.[0]?.delta?.content ?? "";
          if (chunk) yield chunk;
        } catch {
          // malformed SSE line — skip
        }
      }
    }
  } finally {
    if (streamCompleted) {
      // Stream ended naturally — clear the timer and cancel the reader to
      // close the underlying NSURLSession task promptly.  Do NOT call
      // controller.abort() on an already-completed fetch: that fires the
      // "abort" event and queues a native main-queue callback visible to
      // EarlGrey's idle tracker in Detox E2E tests.
      req.stopTimer();
      reader.cancel().catch(() => {});
    } else {
      // Early exit (throw / generator.return()) — cancel everything.
      req.abort();
      reader.cancel().catch(() => {});
    }
  }
}

export async function callLLMFull(
  messages: any[],
  temperature = 0.7,
  getToken: () => Promise<string | null>
): Promise<string> {
  let result = "";
  for await (const chunk of callLLM(messages, temperature, getToken)) {
    result += chunk;
  }
  return result;
}
