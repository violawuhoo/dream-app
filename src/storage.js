const DREAM_STORAGE_KEY = "dream-app-mvp-records";
const USER_STORAGE_KEY = "dream-app-mvp-user";

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

export function loadUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function clearUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}
