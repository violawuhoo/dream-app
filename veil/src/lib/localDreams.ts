import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "veil_local_dreams";

export async function saveLocalDream(record: Record<string, unknown>) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const dreams: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];
    const updated = [record, ...dreams.filter((d) => d.id !== record.id)];
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function getLocalDreams(userId: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const dreams: Record<string, unknown>[] = JSON.parse(raw);
    return dreams.filter((d) => d.user_id === userId);
  } catch {
    return [];
  }
}

export async function getLocalDreamById(id: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const dreams: Record<string, unknown>[] = JSON.parse(raw);
    return dreams.find((d) => d.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function deleteLocalDream(id: string) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const dreams: Record<string, unknown>[] = JSON.parse(raw);
    await AsyncStorage.setItem(KEY, JSON.stringify(dreams.filter((d) => d.id !== id)));
  } catch {}
}
