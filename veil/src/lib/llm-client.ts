const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function doFetch(messages: any[], temperature: number, token: string): Promise<Response> {
  const res = await fetchWithTimeout("/api/dream-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, temperature }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`LLM request failed: ${res.status}`);
  }

  return res;
}

export async function* callLLM(
  messages: any[],
  temperature = 0.7,
  getToken: () => Promise<string | null>
): AsyncGenerator<string> {
  const token = (await getToken()) ?? "";

  let res: Response;
  try {
    res = await doFetch(messages, temperature, token);
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    res = await doFetch(messages, temperature, token);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        const chunk: string = parsed?.choices?.[0]?.delta?.content ?? "";
        if (chunk) yield chunk;
      } catch {
        // malformed SSE line — skip
      }
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
