import { STORAGE } from "../constants/options";

export function readStorage(
  key,
  fallback
) {
  try {
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage(
  key,
  value
) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

export function getSessionId() {
  const existing = readStorage(
    STORAGE.sessionId,
    null
  );

  if (existing) {
    return existing;
  }

  const created =
    globalThis.crypto?.randomUUID?.() ||
    `session-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

  saveStorage(
    STORAGE.sessionId,
    created
  );

  return created;
}