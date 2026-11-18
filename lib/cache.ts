// Prompt-cache countdown color.

/** Under this much time left the countdown turns yellow. */
export const CACHE_WARN_MS = 10 * 60_000;

/** Red once the cache is cold, yellow under 10 minutes left, green otherwise. */
export function cacheColor(msLeft: number): string {
  if (msLeft <= 0) return "text-red-500";
  if (msLeft < CACHE_WARN_MS) return "text-yellow-500";
  return "text-green-500";
}
