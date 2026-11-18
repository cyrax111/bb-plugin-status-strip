## What you get

A one-line readout in every thread's composer bar, beside the voice and send buttons:

```
7d 12% (1d15h) │ cache 59m
```

**7d** is the share of your provider's weekly limit already used, and the time until it resets. The percentage is coloured by pace against an even spread over the 7-day window:

- blue: at or under half the even pace
- green: at or under the even pace
- yellow: up to 10% over it
- red: more than 10% over it

**cache** is how long this thread's prompt cache stays warm. While the cache is warm, your next message re-reads the conversation at the cached rate; once it expires, the whole history is sent again at full price. The countdown is green, turns yellow under 10 minutes, and shows a red `expired` once it is cold. While a turn is running it shows the full cache lifetime, because every request refreshes it.

Hover the readout for the exact reset and expiry times.

## Prompt cache panel

A timer button in the sidebar footer, next to Provider usage, opens a list of recent threads whose prompt cache is still warm, each with its countdown. Running threads come first, then the most time left. Caches that went cold in the last 30 minutes stay in the list, dimmed. Click a row to open that thread.

## Requirements

- The weekly readout needs a provider that reports usage limits to bb, such as Claude Code.
- The cache countdown needs a provider that reports its prompt-cache lifetime: Claude Code or Pi.
- Either part is hidden when its data is missing.

## Privacy

The plugin reads only bb's own usage and thread data through the plugin SDK. It has no settings, makes no network requests, and sends nothing off your machine.
