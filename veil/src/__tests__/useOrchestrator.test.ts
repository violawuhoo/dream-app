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
  // Real Supabase query builders are chainable thenables with .abortSignal().
  // Return the same shape so .abortSignal(ac.signal) chaining in saveRecord works.
  const makeChainable = (value: any) => {
    const obj: any = {
      abortSignal: () => obj,
      then: (res: any, rej?: any) => Promise.resolve(value).then(res, rej),
      catch: (rej: any) => Promise.resolve(value).catch(rej),
    };
    return obj;
  };
  const upsertMock = jest.fn(() => makeChainable({ error: null }));
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
    __makeChainable: makeChainable,
  };
});

jest.mock("../data/tarot-data", () => ({
  getRandomTarotCard: jest.fn(() => ({ id: 0, name: "The Fool", meaning: "New beginnings." })),
}));

import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { callLLM, callLLMFull } from "../lib/llm-client";
import { useOrchestrator } from "../lib/useOrchestrator";
import { createSession } from "../lib/dream-model";

const mockCallLLM = callLLM as jest.Mock;
const mockCallLLMFull = callLLMFull as jest.Mock;

// Access the inner mocks via requireMock
function getSupabaseMocks() {
  const mod = jest.requireMock("../lib/supabase") as any;
  return {
    fromMock: mod.__fromMock as jest.Mock,
    upsertMock: mod.__upsertMock as jest.Mock,
    makeChainable: mod.__makeChainable as (value: any) => any,
  };
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
  const { makeChainable } = getSupabaseMocks();
  upsertMock.mockImplementation(() => makeChainable({ error: null }));
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

  test("1.4.8 'Done' keyword at turn ≥ 4 skips checkIntent and transitions to STRUCTURED", async () => {
    const { result } = setupHook();
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await result.current.handleUserMessage(`message ${i}`);
      });
    }
    mockCallLLM.mockImplementation(() => fakeLLMStream(["summarized"]));
    await act(async () => {
      await result.current.handleUserMessage("done");
    });
    // Short keyword match bypasses LLM intent check — isDone is set directly.
    expect(mockCallLLMFull).not.toHaveBeenCalled();
    expect(result.current.session.state).toBe("STRUCTURED");
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

  test("1.4.16 saveRecord removes AsyncStorage draft on Supabase success", async () => {
    const { result } = setupHook();
    await act(async () => {
      await result.current.saveRecord();
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("veil_draft_session");
  });

  test("1.4.17 saveRecord returns true even on Supabase error (local save succeeded)", async () => {
    const { upsertMock, makeChainable } = getSupabaseMocks();
    upsertMock.mockImplementationOnce(() => makeChainable({ error: new Error("db error") }));
    const { result } = setupHook();
    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.saveRecord();
    });
    // Supabase error is caught in the inner try-catch; local save already
    // succeeded, so saveRecord returns true and the flow continues normally.
    expect(returnValue).toBe(true);
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

  test("1.4.19 askFollowUp LLM error uses fallback message, error state stays null", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("test");
    });
    // askFollowUp catches LLM errors internally and uses a fallback prompt;
    // the error is never surfaced to the user as an error state.
    expect(result.current.error).toBeNull();
    const messages = result.current.session.messages;
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.content).toBe("What else comes to mind from your dream?");
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

  test("1.4.22 askFollowUp LLM failure shows fallback message, isProcessing returns to false", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("I was flying");
    });
    const messages = result.current.session.messages;
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.content).toBeTruthy();
    expect(result.current.error).toBeNull();
    expect(result.current.isProcessing).toBe(false);
  });

  test("1.4.23 askFollowUp LLM failure does not advance state beyond EXPANDING", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleUserMessage("I was at the beach");
    });
    expect(result.current.session.state).toBe("EXPANDING");
  });

  test("1.4.24 checkIntent LLM failure defaults to CONTINUE — state is not STRUCTURED", async () => {
    mockCallLLMFull.mockRejectedValue(new Error("LLM failure"));
    const { result } = setupHook();
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await result.current.handleUserMessage(`message ${i}`);
      });
    }
    // Long message (≥30 chars) containing "finish" triggers checkIntent via callLLMFull
    await act(async () => {
      await result.current.handleUserMessage("I want to finish describing this dream right now");
    });
    expect(result.current.session.state).not.toBe("STRUCTURED");
    expect(result.current.error).toBeNull();
  });

  test("1.4.25 proceedToStructuring LLM failure falls back to raw entries joined by '. '", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.proceedToStructuring({
        ...result.current.session,
        rawEntries: ["entry 1", "entry 2"],
      });
    });
    expect(result.current.session.summary).toBe("entry 1. entry 2");
    expect(result.current.session.state).toBe("STRUCTURED");
  });

  test("1.4.26 generateInterpretation LLM failure advances state to AWAITING_LIFE_CONNECTION", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.generateInterpretation();
    });
    expect(result.current.session.state).toBe("AWAITING_LIFE_CONNECTION");
    const messages = result.current.session.messages;
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.content).toContain("waking life");
    expect(result.current.error).toBeNull();
  });

  test("1.4.27 handleLifeConnection LLM failure advances state to AWAITING_TAROT_DECISION", async () => {
    mockCallLLM.mockImplementation(async function* () {
      throw new Error("LLM failure");
    });
    const { result } = setupHook();
    await act(async () => {
      await result.current.handleLifeConnection("I just finished a big project");
    });
    expect(result.current.session.state).toBe("AWAITING_TAROT_DECISION");
    expect(result.current.error).toBeNull();
  });

  test("1.4.28 AWAITING_LIFE_CONNECTION messages never trigger done-detection", async () => {
    const initial = {
      ...createSession(),
      state: "AWAITING_LIFE_CONNECTION" as ReturnType<typeof createSession>["state"],
      userTurnCount: 6,
    };
    const { result } = renderHook(() => useOrchestrator(userId, getToken, initial));
    mockCallLLMFull.mockClear();
    mockCallLLM.mockImplementation(() => fakeLLMStream(["life connection response"]));
    await act(async () => {
      await result.current.handleUserMessage("I just finished a project at work");
    });
    expect(mockCallLLMFull).not.toHaveBeenCalled();
    expect(result.current.session.state).toBe("AWAITING_TAROT_DECISION");
  });

  test("1.4.29 Pure keyword done message at turn ≥ 4 skips callLLMFull", async () => {
    const { result } = setupHook();
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await result.current.handleUserMessage(`message ${i}`);
      });
    }
    mockCallLLM.mockImplementation(() => fakeLLMStream(["summarized"]));
    mockCallLLMFull.mockClear();
    await act(async () => {
      await result.current.handleUserMessage("done");
    });
    expect(mockCallLLMFull).not.toHaveBeenCalled();
    expect(result.current.session.state).toBe("STRUCTURED");
  });

  test("1.4.30 saveRecord falls back to guest UUID from AsyncStorage when userId is empty", async () => {
    // First AsyncStorage.getItem call (for veil_guest_id) returns the guest UUID
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("abc-uuid");
    const { result } = renderHook(() => useOrchestrator("", getToken));
    await act(async () => {
      await result.current.saveRecord();
    });
    const { upsertMock } = getSupabaseMocks();
    expect(upsertMock).toHaveBeenCalled();
    const upsertArg = upsertMock.mock.calls[0][0];
    expect(upsertArg.user_id).toBe("abc-uuid");
  });
});
