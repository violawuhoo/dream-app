/**
 * UUID generation with a safe fallback for Hermes < 0.13 / RN < 0.72 builds
 * where `crypto.randomUUID` may not exist.
 *
 * In practice, Expo SDK 55 ships with Hermes ≥ 0.15, but test / CI builds
 * have occasionally exhibited the undefined error. This wrapper is zero-cost
 * when the native implementation is present.
 */
export function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // RFC-4122 v4 UUID polyfill using Math.random
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
