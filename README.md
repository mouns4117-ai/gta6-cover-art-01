[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/mouns4117-ai/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/mouns4117-ai/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Lights — GTA 6-style cover art maker

Turn your photos and a caption into a GTA 6-style poster — the multi-panel cover look with bold lettering and a Vice City sunset or neon colour grade — and export it as a PNG to share. It runs entirely offline in a desktop browser from its own static files: your photos never leave your machine.

## What it does

- **Any photo**: add your own photos or use the three built-in samples (fictional people, made with an image model). Click a panel to pick its photo, drag to move it, scroll to zoom it.
- **Five layouts**: Vice Grid (2×2), Hero + Trio, Sunset Strip, Full Bleed, and Nine Panel with the title in the middle.
- **Five grades**: Sunset, Neon Nights, Teal Heat, Vice Gold, and Mono Noir — gradient washes, film grain and a vignette over every panel.
- **Lettering**: a big gradient title in Anton, a neon script subtitle in Pacifico, and a star badge — all editable, top or bottom.
- **Fast export**: one click renders a PNG in 1080×1080, 1080×1350 or 1920×1080. Undo, redo and reset are built in.

## Try it

Serve the `app/` folder with any static server and open `index.html`:

```sh
cd app && python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no network requests, no uploads. Everything the page loads lives under `app/` (scripts, styles, fonts, samples).

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the dark neon editor UI.
- `app/src/cover.js` — the cover engine: layouts, grades, lettering, grain and vignette, all drawn on canvas.
- `app/src/main.js` — photos, panel editing, undo/redo, export.
- `app/src/shots.js` — fixed `?shot=cover` and `?shot=editor` scenes for screenshots.
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License (`OFL.txt` beside them).
- `app/samples/` — three sample photos, made with an image model (fictional people).
- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library (`vendor/makefun-app.ts`, the kit's copy unchanged).
- `screenshots/` — the cover and the editor at work, taken in headless Chromium. The first screenshot is the cover: a 1920×1080 export in the Hero + Trio layout with the Sunset grade. The others show the editor with a photo loaded and covers in the portrait and square sizes.

Fixed scenes for screenshots live in `app/src/shots.js`: open `?shot=cover&photo=woman-car&caption=Sunset%20Run&layout=hero&grade=sunset&size=wide` for the cover alone, or `?shot=editor&photo=friends-neon` for the editor. `window.__shotReady` is set once the scene has painted.

All art, lettering and fonts here are original or SIL OFL licensed. No Rockstar Games logo, artwork or font is used.

## License

MIT — see [LICENSE](LICENSE).
