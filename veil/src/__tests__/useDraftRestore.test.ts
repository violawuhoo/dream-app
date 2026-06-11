import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDraftRestore } from "../lib/useDraftRestore";
import { createSession } from "../lib/dream-model";
import * as SecureStore from "expo-secure-store";

const makeSession = () => createSession();

function makeOpts(overrides?: Partial<Parameters<typeof useDraftRestore>[0]>) {
  const session = makeSession();
  const updateSession = jest.fn();
  const resetSession = jest.fn();
  return { session, updateSession, resetSession, ...overrides };
}

beforeEach(async () => {
  jest.clearAllMocks();
  (SecureStore as any)._reset?.();
  await AsyncStorage.clear();
});

describe("1.5 Draft Restore", () => {
  test("1.5.1 hasDraft is false when SecureStore is empty", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useDraftRestore(makeOpts()));
    // Wait for initial effect
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    expect(result.current.hasDraft).toBe(false);
  });

  test("1.5.2 hasDraft is true for a draft < 24h old", async () => {
    // Draft storage moved from SecureStore → AsyncStorage
    const session = makeSession();
    const savedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1h ago
    const payload = JSON.stringify({ ...session, _savedAt: savedAt });
    await AsyncStorage.setItem("veil_draft_session", payload);

    const { result } = renderHook(() => useDraftRestore(makeOpts({ session })));
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    expect(result.current.hasDraft).toBe(true);
  });

  test("1.5.3 hasDraft is false for a draft > 24h old", async () => {
    // Draft storage moved from SecureStore → AsyncStorage
    const session = makeSession();
    const savedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
    const payload = JSON.stringify({ ...session, _savedAt: savedAt });
    await AsyncStorage.setItem("veil_draft_session", payload);

    const { result } = renderHook(() => useDraftRestore(makeOpts({ session })));
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    expect(result.current.hasDraft).toBe(false);
  });

  test("1.5.4 discardDraft removes draft from AsyncStorage", async () => {
    // discardDraft now calls AsyncStorage.removeItem — draft storage moved from SecureStore
    const opts = makeOpts();
    const { result } = renderHook(() => useDraftRestore(opts));
    await act(async () => {
      await result.current.discardDraft();
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("veil_draft_session");
  });
});
