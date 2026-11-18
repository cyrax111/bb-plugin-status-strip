// Shared by the composer strip and the sidebar "Prompt cache" panel.
import { useEffect, useState } from "react";
import type { useSdk } from "@get-bb/plugin-sdk/app";

export type Sdk = ReturnType<typeof useSdk>;

export interface CacheState {
  /** Turn in progress: every request refreshes the cache. */
  live: boolean;
  ttlMs: number | null;
  expiresAt: number | null;
}

/** Re-renders every `ms` so countdowns stay current. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Calls `load` now and every `ms`, aborting in-flight calls on unmount. */
export function usePolled<T>(load: (signal: AbortSignal) => Promise<T>, ms: number, deps: unknown[]): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const run = () => {
      load(controller.signal).then(
        (next) => {
          if (!controller.signal.aborted) setValue(next);
        },
        () => {
          // Keep the last good value; a transient failure should not blank the view.
        },
      );
    };
    run();
    const id = setInterval(run, ms);
    return () => {
      controller.abort();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

/**
 * Same rule bb uses for `compactionOfferAt` (latest token-usage event time +
 * the provider's prompt-cache TTL), but read directly so it also works below
 * bb's 100k-token threshold for that field. Pass `status` when the caller
 * already knows it, to skip the thread lookup.
 */
export async function loadCache(
  sdk: Sdk,
  threadId: string,
  signal: AbortSignal,
  knownStatus?: string,
): Promise<CacheState | null> {
  const [rows, status] = await Promise.all([
    sdk.threads.events.list({
      threadId,
      types: ["thread/tokenUsage/updated"],
      order: "desc",
      limit: "1",
      signal,
    }),
    knownStatus !== undefined
      ? Promise.resolve(knownStatus)
      : (sdk.threads.get({ threadId, signal }) as Promise<unknown>).then((thread) => {
          const record = thread as { status?: unknown; thread?: { status?: unknown } };
          return record.status ?? record.thread?.status;
        }),
  ]);
  const live = status === "active" || status === "starting";

  const row = rows[0];
  const ttlMs = row && row.type === "thread/tokenUsage/updated" ? row.data.tokenUsage.promptCacheTtlMs ?? null : null;
  if (ttlMs == null) return live ? { live, ttlMs: null, expiresAt: null } : null;
  return { live, ttlMs, expiresAt: row.createdAt + ttlMs };
}

/** 1d15h, 5h12m or 42m. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
}
