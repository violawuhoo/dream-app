import { callLLM, callLLMFull } from "../../lib/llm-client";

// Allow up to 10 s per test to cover the 2 s retry delay without fake timers.
jest.setTimeout(10000);

const getToken = async () => "test-token";

function makeSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const lines = chunks
    .map((chunk) => `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`)
    .join("") + "data: [DONE]\n\n";
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(lines));
      controller.close();
    },
  });
}

function makeMockResponse(stream: ReadableStream<Uint8Array>): Response {
  return { ok: true, status: 200, body: stream } as unknown as Response;
}

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
  fetchSpy = jest
    .spyOn(global as any, "fetch")
    .mockImplementation(() =>
      Promise.resolve(makeMockResponse(makeSSEStream(["default"]))),
    );
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe("3.2 LLM Client (integration)", () => {
  test("3.2.1 Successful stream yields chunks in order", async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve(makeMockResponse(makeSSEStream(["Hello"]))),
    );
    const chunks: string[] = [];
    for await (const chunk of callLLM([], 0.7, getToken)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["Hello"]);
  });

  test("3.2.2 HTTP error response throws with status in message", async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500, body: null } as unknown as Response),
    );
    const gen = callLLM([], 0.7, getToken);
    await expect(gen.next()).rejects.toThrow(/LLM request failed: 500/);
  });

  test("3.2.3 Network failure on attempt 1 retries once and succeeds", async () => {
    fetchSpy
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockImplementationOnce(() =>
        Promise.resolve(makeMockResponse(makeSSEStream(["ok"]))),
      );
    const chunks: string[] = [];
    for await (const chunk of callLLM([], 0.7, getToken)) {
      chunks.push(chunk);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(chunks).toEqual(["ok"]);
  });

  test("3.2.4 Network failure on both attempts throws", async () => {
    fetchSpy.mockRejectedValue(new Error("always fails"));
    const gen = callLLM([], 0.7, getToken);
    await expect(gen.next()).rejects.toThrow("always fails");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("3.2.5 [DONE] sentinel terminates stream — data after it is not yielded", async () => {
    const encoder = new TextEncoder();
    // Manually craft a stream with data after [DONE]
    const raw = [
      'data: {"choices":[{"delta":{"content":"first"}}]}',
      "data: [DONE]",
      'data: {"choices":[{"delta":{"content":"should not appear"}}]}',
    ].join("\n") + "\n";
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(raw));
        controller.close();
      },
    });
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, status: 200, body: stream } as unknown as Response),
    );
    const chunks: string[] = [];
    for await (const chunk of callLLM([], 0.7, getToken)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["first"]);
    expect(chunks).not.toContain("should not appear");
  });

  test("3.2.6 Malformed SSE lines are silently skipped", async () => {
    const encoder = new TextEncoder();
    const raw = [
      'data: {"choices":[{"delta":{"content":"valid"}}]}',
      "data: NOT_JSON_AT_ALL",
      "data: [DONE]",
    ].join("\n") + "\n";
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(raw));
        controller.close();
      },
    });
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, status: 200, body: stream } as unknown as Response),
    );
    const chunks: string[] = [];
    for await (const chunk of callLLM([], 0.7, getToken)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["valid"]);
  });

  test("3.2.7 callLLMFull accumulates all chunks into one string", async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve(makeMockResponse(makeSSEStream(["Hello", " ", "world"]))),
    );
    const result = await callLLMFull([], 0.7, getToken);
    expect(result).toBe("Hello world");
  });
});
