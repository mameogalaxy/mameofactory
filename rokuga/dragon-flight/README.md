# 竜の古城 — Dragon Flight 3D

A browser dragon-flight game (Three.js, no build step) recreating the supplied screenshot:
soar over floating islands, snow mountains and ruins toward the central castle, breathe fire
on enemies, and use the 1-4 ability hotbar. HP/MP crest, compass, minimap, and quest tracker.

## Run

```bash
npx serve -l 8123 .
# open http://localhost:8123
```

Just a static site — any HTTP server works. Three.js loads from a CDN via importmap.

## Architecture

Scaffold-first, module-per-feature. `js/main.js` boots Three.js, builds the shared `ctx`
(`js/ctx.js`), and runs every module's `init`/`update`. Each feature lives in its own file
under `js/modules/` and talks ONLY through `ctx` (state, player, input, world, combat, fx,
audio, events buses) — modules never import each other. See `js/ctx.js` for the contract.

## Controls

- Mouse — steer (click canvas to lock pointer)
- W/S or ↑/↓ — pitch, A/D or ←/→ — yaw/roll
- **Shift** — 加速 (accelerate), **Ctrl** — 下降 (descend)
- **F** — ファイアブレス (fire breath), **1-4** — skills

## Tests

Playwright headless smoke test (boots clean, `__gameReady`, no console errors):

```bash
npm install
npx playwright install chromium
npm run smoke   # serve on :8123 first, or set BASE_URL
```
