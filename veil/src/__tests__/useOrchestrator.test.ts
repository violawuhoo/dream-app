// All jest.mock calls are hoisted before variable declarations.
// Factories must be self-contained or use jest.fn() inline.

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
    __fromMock: fromMock,
    __upsertMock: upsertMock,
  };
});

jest.mock("../data/tarot-data", () => ({
  getRandomTarotCard: jest.fn(() => ({ id: 0, name: "The Fool", meaning: "New beginnings." })),
}));

import { renderHook, act } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { callLLM, callLLMFull } from "../lib/llm-client";
import { useOrchestrator } from "../lib/useOrchestrator";
import { createSession } from "../lib/dream-model";

const mockCallLLM = callLLM as jest.Mock;
const mockCallLLMFull = callLLMFull as jest.Mock;

// Access the inner mocks via requireMock
function getSupabaseMocks() {
  const mod = jest.requireMock("../lib/supabase") as any;
  return { fromMock: mod.__fromMock as jest.Mock, upsertMock: mod.__upsertMock as jest.Mock };
}

async function* fakeLLMStream(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

const getToken = async () => "test-token";
const userId = "user-123";

function setupHook(initial?: ReturnType<typeof createSession>) {
  return renderHook(() => useOrchestrator(userId, getToken, initial));
}

beforeEach(() => {
  jest.clearAllMocks();
  (SecureStore as any)._reset?.();
  mockCallLLM.mockImplementation(() => fakeLLMStream(["response"]));
  mockCallLLMFull.mockResolvedValue("EXPAND");

  // Reset supabase mocks
  const { fromMock, upsertMock } = getSupabaseMocks();
  fromMock.mockClear();
  fromMock.mockImplementation(() => ({
    upsert: upsertMock,
    select: jest.fn(() => ({
      order: jest.fn(async () => ({ data: [], error: null })),
    })),
  }));
  upsertMock.mockClear();
  upsertMock.mockResolvedValue({ error: null });
});

describe("1.4 Orchestrator State Machine", () => {
  test("1.4.1 Initial state is RAW, userTurnCount is 0", () => {
    const { result } = setupHook();
    expect(result.current.session.state).toBe("RAW");
    expect(result.current.session.userTurnCount).toBe(0);
  });

  test("1.4.2 handleUserMessage increments userTurnCount", async () => {
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("I was flying");
    });
    expect(result.current.session.userTurnCount).toBe(1);
  });

  test("1.4.3 Empty string message is ignored", async () => {
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("");
    });
    expect(result.current.session.messages).toHaveLength(0);
  });

  test("1.4.4 isProcessing is false after message completes", async () => {
    // Tests that isProcessing returns to false after handleUserMessage finishes
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("test");
    });
    expect(result.current.isProcessing).toBe(false);
  });

  // 1.4.5: Tests whether state transitions to EXPANDING after first message.
  // Per test plan spec, expected is EXPANDING, but implementation never sets this state
  // explicitly — askFollowUp() only updates messages, not state.
  // This test is written per spec; failure documents a production bug.
  test("1.4.5 State transitions RAW → EXPANDING on first follow-up", async () => {
    const { result } = setupHook();
    mockCallLLM.mockImplementation(() => fakeLLMStream(["assistant response"]));
    await act(async () => {
      await result.current.handleUserMessage("I was flying");
    });
    expect(result.current.session.state).toBe("EXPANDING");
  });

  test("1.4.6 nextCheckTurn gate: no AWAITING_CONTINUE_DECISION before turn 5", async () => {
    const { result } = setupHook();
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.handleUserMessage(`message ${i}`);
      });
    }
    expect(result.current.session.state).not.toBe("AWAITING_CONTINUE_DECISION");
  });

  test("1.4.7 State transitions to AWAITING_CONTINUE_DECISION at turn 5", async () => {
    const { result } = setupHook();
    mockCallLLMFull.mockResolvedValue("NOT_DONE");
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await result.current.handleUserMessage(`message ${i}`);
      });
    }
    await act(async () => {
      await result.current.handleUserMessage("something short");
    });
    expect(result.current.session.state).toBe("AWAITING_CONTINUE_DECISION");
  });

  test("1.4.8 'Done' keyword at turn ≥ 4 calls checkIntent via callLLMFull", async () => {
    const { result } = setupHook();
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await result.current.handleUserMessage(`message ${i}`);
      });
    }
    mockCallLLMFull.mockResolvedValue("DONE");
    mockCallLLM.mockImplementation(() => fakeLLMStream(["summarized"]));
    await act(async () => {
      await result.current.handleUserMessage("done");
    });
    expect(mockCallLLMFull).toHaveBeenCalled();
  });

  test("1.4.9 proceedToStructuring sets state to STRUCTURED", async () => {
    const { result } = setupHook();
    mockCallLLM.mockImplementation(() => fakeLLMStream(["structured summary"]));
    await act(async () => {
      await result.current.proceedToStructuring(result.current.session);
    });
    expect(result.current.session.state).toBe("STRUCTURED");
  });

  test("1.4.10 generateInterpretation sets state to AWAITING_LIFE_CONNECTION", async () => {
    const { result } = setupHook();
    mockCallLLM.mockImplementation(() => fakeLLMStream(["interpretation text"]));
    await act(async () => {
      await result.current.generateInterpretation();
    });
    expect(result.current.session.state).toBe("AWAITING_LIFE_CONNECTION");
  });

  test("1.4.11 handleLifeConnection sets state to AWAITING_TAROT_DECISION", async () => {
    const { result } = setupHook();
    mockCallLLM.mockImplementation(() => fakeLLMStream(["life connection response"]));
    await act(async () => {
      await result.current.handleLifeConnection("I felt scared at work");
    });
    expect(result.current.session.state).toBe("AWAITING_TAROT_DECISION");
  });

  test("1.4.12 drawTarot sets state to DONE and tarotCard non-null", async () => {
    const { result } = setupHook();
    mockCallLLM.mockImplementation(() => fakeLLMStream(["tarot interpretation"]));
    await act(async () => {
      await result.current.drawTarot();
    });
    expect(result.current.session.state).toBe("DONE");
    expect(result.current.session.tarotCard).not.toBeNull();
  });

  test("1.4.13 skipTarot sets state to DONE immediately", () => {
    const { result } = setupHook();
    act(() => {
      result.current.skipTarot();
    });
    expect(result.current.session.state).toBe("DONE");
  });

  test("1.4.14 skipInterpretation sets state to DONE immediately", () => {
    const { result } = setupHook();
    act(() => {
      result.current.skipInterpretation();
    });
    expect(result.current.session.state).toBe("DONE");
  });

  test("1.4.15 saveRecord calls Supabase upsert with user_id", async () => {
    mockCallLLMFull.mockResolvedValue("A Dream Title");
    const { result } = setupHook();
    await act(async () => {
      await result.current.saveRecord();
    });
    const { fromMock, upsertMock } = getSupabaseMocks();
    expect(fromMock).toHaveBeenCalledWith("dream_records");
    expect(upsertMock).toHaveBeenCalled();
    const upsertArg = upsertMock.mock.calls[0][0];
    expect(upsertArg.user_id).toBe(userId);
  });

  test("1.4.16 saveRecord deletes SecureStore draft on success", async () => {
    mockCallLLMFull.mockResolvedValue("A Title");
    const { result } = setupHook();
    await act(async () => {
      await result.current.saveRecord();
    });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("veil_draft_session");
  });

  test("1.4.17 saveRecord returns false on Supabase error", async () => {
    mockCallLLMFull.mockResolvedValue("A Title");
    const { upsertMock } = getSupabaseMocks();
    upsertMock.mockResolvedValueOnce({ error: new Error("db error") });
    const { result } = setupHook();
    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.saveRecord();
    });
    expect(returnValue).toBe(false);
  });

  test("1.4.18 resetSession returns state to RAW with fresh ID", async () => {
    const { result } = setupHook();
    const originalId = result.current.session.sessionID;
    await act(async () => {
      await result.current.handleUserMessage("test message");
    });
    act(() => {
      result.current.resetSession();
    });
    expect(result.current.session.state).toBe("RAW");
    expect(result.current.session.sessionID).not.toBe(originalId);
  });

  test("1.4.19 LLM error sets error state string", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("test");
    });
    expect(result.current.error).not.toBeNull();
  });

  test("1.4.20 clearError sets error to null", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("test");
    });
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  test("1.4.21 initialSession param is used as initial state", () => {
    const preBuilt = createSession();
    const { result } = setupHook(preBuilt);
    expect(result.current.session.sessionID).toBe(preBuilt.sessionID);
  });
});
