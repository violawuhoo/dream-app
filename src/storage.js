const DREAM_STORAGE_KEY = "dream-app-mvp-records";

export function loadDreamRecords() {
  try {
    const raw = localStorage.getItem(DREAM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDreamRecord(record) {
  const records = loadDreamRecords();
  records.unshift(record);
  localStorage.setItem(DREAM_STORAGE_KEY, JSON.stringify(records));
  return records;
}
