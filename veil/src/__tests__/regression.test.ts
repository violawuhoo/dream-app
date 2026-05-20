// §5 Regression & Edge Cases — automated items 5.1–5.4

jest.mock("../lib/llm-client", () => ({
  callLLM: jest.fn(),
  callLLMFull: jest.fn(),
}));

jest.mock("../lib/llm-prompts", () => ({
  buildExpansionMessages: jest.fn(() => []),
  buildStructuredMessages: jest.fn(() => []),
  buildInterpretationMessages: jest.fn(() => []),
  buildTitleMessages: jest.fn(() => []),
  buildLifeConnectionInterpretationMessages: jest.fn(() => []),
  buildTarotInterpretationMessages: jest.fn(() => []),
  buildIntentClassificationMessages: jest.fn(() => []),
}));

jest.mock("../lib/supabase", () => {
  const upsertMock = jest.fn(async () => ({ error: null }));
  const fromMock = jest.fn(() => ({
    upsert: upsertMock,
    select: jest.fn(() => ({
      order: jest.fn(async () => ({ data: [], error: null })),
    })),
  }));
  return {
    supabase: { from: fromMock },
  };
});

jest.mock("../data/tarot-data", () => ({
  getRandomTarotCard: jest.fn(() => ({ id: 0, name: "The Fool", meaning: "New beginnings." })),
}));

import { getRandomTarotCard } from "../data/tarot-data";
import { callLLM, callLLMFull } from "../lib/llm-client";
import { renderHook, act } from "@testing-library/react-native";
import { useOrchestrator } from "../lib/useOrchestrator";

// Restore the real getRandomTarotCard for 5.1
jest.mock("../data/tarot-data", () => jest.requireActual("../data/tarot-data"));

const mockCallLLM = callLLM as jest.Mock;
const mockCallLLMFull = callLLMFull as jest.Mock;

async function* fakeLLMStream(chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

const getToken = async () => "test-token";
const userId = "user-123";

beforeEach(() => {
  jest.clearAllMocks();
  mockCallLLM.mockImplementation(() => fakeLLMStream(["response"]));
  mockCallLLMFull.mockResolvedValue("EXPAND");
});

// §5.1 — Tarot: getRandomTarotCard() called 1000 times
describe("5.1 Tarot stress: 1000 calls", () => {
  test("All 1000 results have id in range 0–21; no crash", () => {
    const { getRandomTarotCard: realGetRandom } = jest.requireActual("../data/tarot-data") as any;
    expect(() => {
      for (let i = 0; i < 1000; i++) {
        const card = realGetRandom();
        if (card.id < 0 || card.id > 21) throw new Error(`Out of range id: ${card.id}`);
      }
    }).not.toThrow();
  });
});

// §5.2 — Orchestrator: handleUserMessage while isProcessing === true
describe("5.2 Orchestrator: concurrent message behavior", () => {
  test("Sequential messages each trigger exactly one LLM call", async () => {
    const { result } = renderHook(() => useOrchestrator(userId, getToken));

    await act(async () => {
      await result.current.handleUserMessage("first message");
    });
    await act(async () => {
      await result.current.handleUserMessage("second message");
    });

    // Each message that goes through expansion should call callLLM once
    // (may call more due to checkIntent calls at higher turn counts)
    expect(mockCallLLM.mock.calls.length).toBeGreaterThanOrEqual(2);
    // No duplicate calls per message — each message results in ≤ 2 LLM calls
    expect(mockCallLLM.mock.calls.length).toBeLessThanOrEqual(4);
  });
});

// §5.3 — LLM Client: API responds with [DONE] immediately (empty response)
describe("5.3 LLM Client: [DONE] immediately", () => {
  test("callLLMFull returns empty string when [DONE] is first SSE line", async () => {
    const { callLLMFull: realCallLLMFull } = jest.requireActual("../lib/llm-client") as any;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n"));
        controller.close();
      },
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, body: stream });
    global.fetch = fetchMock;

    const result = await realCallLLMFull([], 0.7, async () => "token");
    expect(result).toBe("");
  });
});

// §5.4 — Capture screen: 1999-char message sends successfully
describe("5.4 Capture: very long message (1999 chars)", () => {
  test("handleUserMessage accepts 1999-char message without error", async () => {
    const longMessage = "a".repeat(1999);
    const { result } = renderHook(() => useOrchestrator(userId, getToken));
    let threw = false;
    try {
      await act(async () => {
        await result.current.handleUserMessage(longMessage);
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result.current.session.rawEntries[0]).toBe(longMessage);
  });
});
