// verifyToken from @clerk/backend always throws for non-JWT tokens.
// The UUID fallback path is the path exercised in all tests below.
jest.mock("@clerk/backend", () => ({
  verifyToken: jest.fn().mockRejectedValue(new Error("Not a valid Clerk JWT")),
}));

import { POST } from "../../../app/api/dream-chat+api";

// Each test uses a distinct UUID so rate-limit buckets never interfere.
const UUID = {
  t3: "bbbb0003-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  t4: "bbbb0004-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  t5: "bbbb0005-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  t6: "bbbb0006-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  t7: "bbbb0007-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  t8: "bbbb0008-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  t9: "bbbb0009-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
};

function makeMoonshotResponse(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

interface MakeRequestOptions {
  uuid?: string;
  messages?: unknown;
  authorization?: string | null;
  noAuth?: boolean;
}

function makeRequest(options: MakeRequestOptions = {}): Request {
  const uuid = options.uuid ?? UUID.t3;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!options.noAuth) {
    headers["Authorization"] = options.authorization ?? `Bearer ${uuid}`;
  }
  return new Request("http://localhost/api/dream-chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: options.messages ?? [{ role: "user", content: "hello" }],
      temperature: 0.7,
    }),
  });
}

let fetchSpy: jest.SpyInstance;

beforeAll(() => {
  process.env.KIMI_API_KEY = "test-key";
});

afterAll(() => {
  delete process.env.KIMI_API_KEY;
});

beforeEach(() => {
  fetchSpy = jest
    .spyOn(global as any, "fetch")
    .mockImplementation(() => Promise.resolve(makeMoonshotResponse()));
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe("3.1 dream-chat+api.ts Route Handler", () => {
  test("3.1.1 Missing Authorization header returns 401", async () => {
    const res = await POST(makeRequest({ noAuth: true }));
    expect(res.status).toBe(401);
  });

  test("3.1.2 Non-UUID non-JWT token returns 401", async () => {
    const res = await POST(makeRequest({ authorization: "Bearer not-a-valid-token" }));
    expect(res.status).toBe(401);
  });

  test("3.1.3 Valid guest UUID is accepted and returns 200", async () => {
    const res = await POST(makeRequest({ uuid: UUID.t3 }));
    expect(res.status).toBe(200);
  });

  test("3.1.4 Missing KIMI_API_KEY returns 500", async () => {
    const savedKey = process.env.KIMI_API_KEY;
    delete process.env.KIMI_API_KEY;
    try {
      const res = await POST(makeRequest({ uuid: UUID.t4 }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Something went wrong");
    } finally {
      process.env.KIMI_API_KEY = savedKey;
    }
  });

  test("3.1.5 More than 30 requests from the same userId returns 429", async () => {
    for (let i = 0; i < 30; i++) {
      const res = await POST(makeRequest({ uuid: UUID.t5 }));
      expect(res.status).toBe(200);
    }
    const res = await POST(makeRequest({ uuid: UUID.t5 }));
    expect(res.status).toBe(429);
  });

  test("3.1.6 Messages that is not an array returns 400", async () => {
    const res = await POST(makeRequest({ uuid: UUID.t6, messages: "not an array" }));
    expect(res.status).toBe(400);
  });

  test("3.1.7 Message with content longer than 2000 chars returns 400", async () => {
    const res = await POST(
      makeRequest({ uuid: UUID.t7, messages: [{ role: "user", content: "a".repeat(2001) }] }),
    );
    expect(res.status).toBe(400);
  });

  test("3.1.8 Moonshot returning non-OK proxies as 500", async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => '{"error":"rate_limit"}',
        body: null,
      }),
    );
    const res = await POST(makeRequest({ uuid: UUID.t8 }));
    expect(res.status).toBe(500);
  });

  test("3.1.9 Moonshot OK streams response with correct SSE headers", async () => {
    const res = await POST(makeRequest({ uuid: UUID.t9 }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("X-RateLimit-Remaining")).not.toBeNull();
  });
});
