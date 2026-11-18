---
name: status-strip
description: Explain the Status Strip readout (weekly limit and prompt-cache countdown) in a bb thread's composer bar.
---

# Status Strip

Adds `7d <used>% (<time to reset>) │ cache <time left>` to the context row
in each thread's composer bar.

- `7d …` comes from `bb settings usage` for the thread's provider: the overall
  weekly window, not per-model windows. Refreshed every minute.
- `cache …` is the latest `thread/tokenUsage/updated` event time plus its
  `promptCacheTtlMs` (the same rule as bb's `compactionOfferAt`, without its
  100k-token threshold). Only providers that report cache lifetimes (Claude
  Code, Pi) show it. A running turn shows the full TTL in green.
- The sidebar footer's **Prompt cache** item (timer icon, beside Provider
  usage) lists up to 25 threads active in the last 2 hours whose cache is warm
  or went cold in the last 30 minutes, polled every 15 s while open.
- No settings, commands, or network access of its own.
