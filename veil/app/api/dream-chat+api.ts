import { createClerkClient } from "@clerk/backend";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  // 1. AUTH CHECK
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  try {
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. RATE LIMITING
  const now = Date.now();
  const bucket = rateLimit.get(userId);
  if (bucket && bucket.resetAt > now) {
    if (bucket.count >= MAX_REQUESTS) {
      return Response.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
          },
        },
      );
    }
    bucket.count += 1;
  } else {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
  }

  const updatedBucket = rateLimit.get(userId)!;
  const remaining = Math.max(0, MAX_REQUESTS - updatedBucket.count);

  // 3. INPUT VALIDATION
  let messages: unknown;
  let temperature: unknown;
  try {
    const body = await request.json();
    messages = body.messages;
    temperature = body.temperature ?? 0.7;
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length > 50) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  for (const msg of messages) {
    if (typeof msg?.content !== "string" || msg.content.length > 2000) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
  }
  const clampedTemperature = Math.min(1, Math.max(0, Number(temperature) || 0.7));

  // 4. ERROR SAFETY — Kimi API call
  try {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

    const upstream = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages,
        temperature: clampedTemperature,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      console.error("Upstream LLM error:", upstream.status);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.ceil(updatedBucket.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error("dream-chat API error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
