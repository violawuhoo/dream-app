export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { messages, temperature = 0.7 } = body;

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
        temperature,
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
      },
    });
  } catch (error) {
    console.error("dream-chat API error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
