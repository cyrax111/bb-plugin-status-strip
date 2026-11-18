// Sidebar footer "Prompt cache" panel: which recent threads still have a warm
// prompt cache, and how long each has left. Sits beside bb's Provider usage.
import { useMemo } from "react";
import { experimental_useSidebarThreads, useSdk } from "@get-bb/plugin-sdk/app";
import type { ExperimentalSidebarFooterDisclosureProps } from "@get-bb/plugin-sdk/app";
import { cacheColor } from "./lib/cache";
import { formatDuration, loadCache, useNow, usePolled } from "./lib/thread-cache";
import type { CacheState } from "./lib/thread-cache";

const POLL_MS = 15_000;
const TICK_MS = 30_000;
/** Threads untouched for longer than this cannot have a warm cache (TTLs are at most 1h). */
const RECENT_MS = 2 * 60 * 60_000;
/** At most this many threads are checked per poll. */
const MAX_CANDIDATES = 25;
/** Caches that went cold this recently are still listed, dimmed. */
const SHOW_EXPIRED_MS = 30 * 60_000;

interface Candidate {
  id: string;
  title: string;
  href: string;
  status: string;
}

interface Row extends Candidate {
  cache: CacheState;
}

export function CachePanel(_props: ExperimentalSidebarFooterDisclosureProps) {
  const sdk = useSdk();
  const now = useNow(TICK_MS);
  const { threads, status } = experimental_useSidebarThreads();

  // Recompute the candidate set only when the thread list changes, not every tick.
  const candidates = useMemo<Candidate[]>(() => {
    const cutoff = Date.now() - RECENT_MS;
    return threads
      .filter((t) => !t.isHidden && !t.isArchived && (t.updatedAt >= cutoff || t.status === "active"))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CANDIDATES)
      .map((t) => ({ id: t.id, title: t.displayTitle, href: t.href, status: t.status }));
  }, [threads]);
  const key = candidates.map((c) => `${c.id}:${c.status}`).join(",");

  const rows = usePolled<Row[]>(
    async (signal) => {
      const loaded = await Promise.all(
        candidates.map(async (c) => {
          const cache = await loadCache(sdk, c.id, signal, c.status).catch(() => null);
          return cache ? { ...c, cache } : null;
        }),
      );
      return loaded.filter((r): r is Row => r !== null);
    },
    POLL_MS,
    [sdk, key],
  );

  const visible = (rows ?? [])
    .filter((r) => r.cache.live || (r.cache.expiresAt != null && r.cache.expiresAt > now - SHOW_EXPIRED_MS))
    .sort((a, b) => sortKey(b, now) - sortKey(a, now));

  return (
    <div className="flex max-h-80 flex-col">
      <div className="flex h-9 shrink-0 items-center border-b border-sidebar-border px-3 text-2xs font-medium text-sidebar-foreground">
        Prompt cache
      </div>
      <div className="flex flex-col overflow-y-auto py-1">
        {rows === null || status === "loading" ? (
          <div className="px-3 py-1.5 text-xs text-muted-foreground">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="px-3 py-1.5 text-xs text-muted-foreground">No warm caches in recent threads.</div>
        ) : (
          visible.map((r) => <CacheRow key={r.id} row={r} now={now} />)
        )}
      </div>
    </div>
  );
}

/** Running turns first, then the most time left, expired last. */
function sortKey(row: Row, now: number): number {
  if (row.cache.live) return Number.MAX_SAFE_INTEGER;
  return (row.cache.expiresAt ?? 0) - now;
}

function CacheRow({ row, now }: { row: Row; now: number }) {
  const { cache } = row;
  let label: string;
  let color: string;
  let title: string;
  if (cache.live) {
    label = cache.ttlMs != null ? formatDuration(cache.ttlMs) : "live";
    color = cacheColor(Infinity);
    title = "Refreshing: a turn is running";
  } else {
    const msLeft = (cache.expiresAt ?? now) - now;
    label = msLeft > 0 ? formatDuration(msLeft) : "expired";
    color = cacheColor(msLeft);
    title = `${msLeft > 0 ? "Expires" : "Expired"} ${new Date(cache.expiresAt ?? now).toLocaleTimeString()}`;
  }
  const expired = !cache.live && label === "expired";
  return (
    <a
      href={row.href}
      title={title}
      className={`mx-1 flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-surface-selected ${expired ? "opacity-60" : ""}`}
    >
      <span className="min-w-0 flex-1 truncate text-sidebar-foreground">{row.title}</span>
      <span className={`shrink-0 font-mono tabular-nums ${color}`}>{label}</span>
    </a>
  );
}
