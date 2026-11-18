# Status Strip

A bb plugin that adds a terminal-style status readout to the bottom bar of
each thread's composer, before the voice and send buttons:

```
7d 12% (1d15h) │ cache 59m
```

- **7d** — the thread provider's weekly usage limit and time until it resets
  (from `bb settings usage`).
- **cache** — time until the prompt cache expires (last token-usage event +
  the provider's cache TTL; Claude Code and Pi report it).

Hover the strip for exact reset and expiry times.

It also adds a **Prompt cache** item (timer icon) to the sidebar footer, next
to bb's Provider usage. It lists recent threads whose cache is still warm, with
the time left (green, yellow under 10m), running threads first; caches that went
cold in the last 30 minutes are shown dimmed. Click a row to open the thread.

Requires bb 0.49 or later. The weekly readout needs a provider that reports
usage limits to bb (such as Claude Code); the cache countdown needs one that
reports its prompt-cache lifetime (Claude Code or Pi).

## Install

From bb's plugin marketplace, or from source:

```
bb plugin install https://github.com/cyrax111/bb-plugin-status-strip.git
```

## Develop

```
npm install --include=dev
npm run typecheck
bb plugin build
bb plugin install .
```

## License

MIT
