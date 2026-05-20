import { callLLM, callLLMFull } from "../lib/llm-client";

// Use real timers — fake timers interfere with the retry sleep
jest.setTimeout(10000);

function makeSSEStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const body = lines.map(l => l + "\n").join("");
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });
}

function mockResponse(lines: string[]) {
  return {
    ok: true,
    body: makeSSEStream(lines),
  } as unknown as Response;
}

const getToken = async () => "test-token";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("1.3 LLM Client", () => {
  test("1.3.1 callLLM sends Authorization header", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse([
      'data: {"choices":[{"delta":{"content":"hi"}}]}',
      "data: [DONE]",
    ]));
    global.fetch = fetchMock;

    for await (const _ of callLLM([], 0.7, getToken)) { break; }

    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer test-token");
  });

  test("1.3.2 callLLM sends messages and temperature in body", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse(["data: [DONE]"]));
    global.fetch = fetchMock;

    const msgs = [{ role: "user", content: "hello" }];
    for await (const _ of callLLM(msgs, 0.5, getToken)) { break; }

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages).toEqual(msgs);
    expect(body.temperature).toBe(0.5);
  });

  test("1.3.3 callLLM yields text from SSE chunks", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse([
      'data: {"choices":[{"delta":{"content":"chunk1"}}]}',
      'data: {"choices":[{"delta":{"content":"chunk2"}}]}',
      "data: [DONE]",
    ]));
    global.fetch = fetchMock;

    const chunks: string[] = [];
    for await (const chunk of callLLM([], 0.7, getToken)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["chunk1", "chunk2"]);
  });

  test("1.3.4 callLLM skips malformed SSE lines", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse([
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      "data: {bad json}",
      "data: [DONE]",
    ]));
    global.fetch = fetchMock;

    const chunks: string[] = [];
    for await (const chunk of callLLM([], 0.7, getToken)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["ok"]);
  });

  test("1.3.5 callLLM retries once on first failure", async () => {
    const successResponse = mockResponse([
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      "data: [DONE]",
    ]);
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(successResponse);
    global.fetch = fetchMock;

    const chunks: string[] = [];
    for await (const chunk of callLLM([], 0.7, getToken)) {
      chunks.push(chunk);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(chunks).toEqual(["ok"]);
  });

  test("1.3.6 callLLM throws after two failures", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("always fails"));
    global.fetch = fetchMock;

    const gen = callLLM([], 0.7, getToken);
    await expect(gen.next()).rejects.toThrow("always fails");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("1.3.7 callLLMFull accumulates all chunks", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse([
      'data: {"choices":[{"delta":{"content":"a"}}]}',
      'data: {"choices":[{"delta":{"content":"b"}}]}',
      'data: {"choices":[{"delta":{"content":"c"}}]}',
      "data: [DONE]",
    ]));
    global.fetch = fetchMock;

    const result = await callLLMFull([], 0.7, getToken);
    expect(result).toBe("abc");
  });

  test("1.3.8 Temperature is passed through correctly", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse(["data: [DONE]"]));
    global.fetch = fetchMock;

    for await (const _ of callLLM([], 0.3, getToken)) { break; }

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.temperature).toBe(0.3);
  });
});
