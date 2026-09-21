# Hacker Keys — Type Like a Movie Hacker

Mash any key and realistic 2026-style code streams across your screen. A framework-free
fake hacking simulator in the spirit of the original HackerTyper (2011): themes,
ACCESS GRANTED / DENIED overlays, fullscreen, shareable theme URLs. No real hacking —
just vibes.

**Live**: https://hacker-keys.sunnydachs.workers.dev (after deploy) · or run `npm run serve` locally.

## Features (lightweight v0.1)

- **Any key = type**: every keystroke emits 3 characters of authentic-looking code
  (edge workers, Rust async, Go/K8s, Python AI inference, SQL migrations, shell).
- **3 themes**: Matrix Green (default), Cyber Blue, Amber Retro — switch via the
  bottom-right dock or `?t=cyber`.
- **Hotkeys**: `G` = ACCESS GRANTED overlay, `D` = ACCESS DENIED overlay,
  `F` = fullscreen, `ESC` = clear overlays.
- **Share chip**: copies the URL with the current theme persisted in the query string.
- **Zero backend, zero build step**: static HTML + CSS + vanilla ES module.

## Structure

```
public/index.html   — page markup (terminal, HUD, theme dock, overlay)
public/styles.css   — terminal aesthetics (CRT glow, caret blink, theme vars)
public/typer.js     — core logic: THEMES, CODE_CORPUS, nextCursor, visibleText, OVERLAY_TEXT
app.js              — DOM wiring (keydown → core, theme dock, overlays)
tests/typer.test.ts — vitest unit tests (8): theme resolution, streaming math, overlay copy
```

## Verification

- `npm test` — 8/8 pass.
- CI: Node 18/20/22 matrix + serve smoke test (all 3 assets 200 + typer.js integrity).
- Browser E2E: keystroke streaming (+3 chars/key), theme switch (matrix/cyber/amber),
  both overlays, URL `?t=` persistence.

## Lessons learned during build

- **ES module MIME**: `python3 -m http.server` serves unknown extensions (`.ts`) as
  `text/html` (404 fallback) → the module import fails silently and the page renders
  nothing. Serve the core as plain `.js` (plain JS, no TS-only syntax) — the browser
  MIME check rejects `application/octet-stream` too.
- **Synthetic KeyboardEvent dispatched on `document` does not reach `window`
  listeners** in some browsers — dispatch on `window` (real user keystrokes arrive
  there natively).
