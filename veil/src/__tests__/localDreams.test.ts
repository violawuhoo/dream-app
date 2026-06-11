import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveLocalDream, getLocalDreams } from "../lib/localDreams";

function makeDream(overrides: Record<string, unknown> = {}) {
  return {
    id: "dream-001",
    user_id: "user-123",
    title: "Test Dream",
    narrative: "I was flying over mountains",
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("2.3 Local Dreams", () => {
  test("2.3.1 saveLocalDream then getLocalDreams returns the saved record", async () => {
    const dream = makeDream({ id: "dream-1", user_id: "user-123" });
    await saveLocalDream(dream);
    const dreams = await getLocalDreams("user-123");
    expect(dreams).toHaveLength(1);
    expect(dreams[0].id).toBe("dream-1");
  });

  test("2.3.2 Saving two dreams with the same userId returns both", async () => {
    await saveLocalDream(makeDream({ id: "dream-1", user_id: "user-123" }));
    await saveLocalDream(makeDream({ id: "dream-2", user_id: "user-123" }));
    const dreams = await getLocalDreams("user-123");
    expect(dreams).toHaveLength(2);
    const ids = dreams.map((d) => d.id).sort();
    expect(ids).toEqual(["dream-1", "dream-2"]);
  });

  test("2.3.3 getLocalDreams returns empty array when storage is empty", async () => {
    const dreams = await getLocalDreams("user-123");
    expect(dreams).toEqual([]);
  });
});
