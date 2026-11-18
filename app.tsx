// Status Strip — adds "7d 12% (1d15h) │ cache 59m" to the bottom bar of a
// thread's composer, before the voice and send buttons, and a "Prompt cache"
// panel to the sidebar footer (cache-panel.tsx).
import type { ReactNode } from "react";
import { definePluginApp, useComposer, useSdk } from "@get-bb/plugin-sdk/app";
import { PERCENT_PER_HOUR, WEEK_HOURS, paceColor } from "./lib/pace";
import { cacheColor } from "./lib/cache";
import { formatDuration, loadCache, useNow, usePolled } from "./lib/thread-cache";
import type { Sdk } from "./lib/thread-cache";
import { CachePanel } from "./cache-panel";

const USAGE_POLL_MS = 60_000;
const CONTEXT_POLL_MS = 15_000;
const TICK_MS = 30_000;

interface WeeklyWindow {
  usedPercent: number;
  resetsAt: string | null;
}

async function loadProviderId(sdk: Sdk, threadId: string, signal: AbortSignal): Promise<string | null> {
  const result: unknown = await sdk.threads.get({ threadId, signal });
  const record = result as { providerId?: unknown; thread?: { providerId?: unknown } };
  const id = record.providerId ?? record.thread?.providerId;
  return typeof id === "string" ? id : null;
}

/** The provider's overall weekly window (not a per-model one such as "Fable"). */
async function loadWeekly(sdk: Sdk, providerId: string, signal: AbortSignal): Promise<WeeklyWindow | null> {
  const usage = await sdk.system.usageLimits({ signal });
  const entry = usage[providerId];
  if (!entry || entry.status !== "ok") return null;
  const windows = entry.windows as Array<WeeklyWindow & { kind?: unknown; model?: unknown }>;
  const weekly =
    windows.find((w) => w.kind === "weekly" && w.model == null) ??
    windows.find((w) => w.kind === "weekly") ??
    null;
  return weekly ? { usedPercent: weekly.usedPercent, resetsAt: weekly.resetsAt } : null;
}

function weeklyTitle(weekly: WeeklyWindow, nowMs: number): string {
  let text = `Weekly limit: ${weekly.usedPercent}% used`;
  const reset = weekly.resetsAt ? Date.parse(weekly.resetsAt) : NaN;
  if (!Number.isNaN(reset)) {
    const hoursPassed = Math.min(WEEK_HOURS, Math.max(0, (nowMs - (reset - WEEK_HOURS * 3_600_000)) / 3_600_000));
    text += `, even pace ${(hoursPassed * PERCENT_PER_HOUR).toFixed(1)}%, resets ${new Date(reset).toLocaleString()}`;
  }
  return text;
}

function StatusStrip({ threadId }: { threadId: string }) {
  const sdk = useSdk();
  const now = useNow(TICK_MS);
  const providerId = usePolled((signal) => loadProviderId(sdk, threadId, signal), 5 * 60_000, [sdk, threadId]);
  const weekly = usePolled(
    (signal) => (providerId ? loadWeekly(sdk, providerId, signal) : Promise.resolve(null)),
    USAGE_POLL_MS,
    [sdk, providerId],
  );
  const cache = usePolled((signal) => loadCache(sdk, threadId, signal), CONTEXT_POLL_MS, [sdk, threadId]);

  const parts: ReactNode[] = [];
  if (weekly) {
    const reset = weekly.resetsAt ? Date.parse(weekly.resetsAt) : NaN;
    const resetText = Number.isNaN(reset) ? "" : ` (${formatDuration(reset - now)})`;
    const color = paceColor(weekly.usedPercent, reset, now);
    parts.push(
      <span key="weekly">
        7d <span className={color}>{`${Math.round(weekly.usedPercent)}%`}</span>
        {resetText}
      </span>,
    );
  }
  let cacheTitle: string | null = null;
  if (cache?.live) {
    // A running turn keeps the cache warm, so it shows the full lifetime in green.
    parts.push(
      <span key="cache">
        cache <span className={cacheColor(Infinity)}>{cache.ttlMs != null ? formatDuration(cache.ttlMs) : "live"}</span>
      </span>,
    );
    cacheTitle = "Prompt cache refreshing: a turn is running";
  } else if (cache?.expiresAt != null) {
    const msLeft = cache.expiresAt - now;
    parts.push(
      <span key="cache">
        cache <span className={cacheColor(msLeft)}>{msLeft > 0 ? formatDuration(msLeft) : "expired"}</span>
      </span>,
    );
    cacheTitle = `Prompt cache ${cache.expiresAt > now ? "expires" : "expired"} ${new Date(cache.expiresAt).toLocaleTimeString()}`;
  }
  if (parts.length === 0) return null;

  const title = [
    weekly ? weeklyTitle(weekly, now) : null,
    cacheTitle,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <span className="mr-1 self-center whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums" title={title}>
      {parts.flatMap((part, i) =>
        i === 0
          ? [part]
          : [
              <span key={`sep-${i}`} className="opacity-30">
                {" │ "}
              </span>,
              part,
            ],
      )}
    </span>
  );
}

/** Composer actions get no props; the bound composer says which thread it sends to. */
function ComposerStatusStrip() {
  const { scope } = useComposer();
  if (scope.kind !== "thread") return null;
  return <StatusStrip threadId={scope.threadId} />;
}

export default definePluginApp((app) => {
  app.composer.customize({
    id: "status-strip",
    scopes: ["thread"],
    actions: [{ id: "status-strip", component: ComposerStatusStrip }],
  });
  app.experimental_sidebarFooter.register({
    kind: "disclosure",
    id: "prompt-cache",
    label: "Prompt cache",
    icon: "Timer",
    component: CachePanel,
  });
});
