---
name: visual-work
description: Use for any change to how kaspe-js looks or renders — the WebGL console (src/render), the paper booklet shader (src/render/paper), LCD art, the table background, loader, toolbar or phone layout. Explains the render architecture, how to add a processing stage, how to verify against reference photos with pixel numbers, and the traps that already cost time in this project.
---

# Visual work in kaspe-js

## What the user expects

- Photorealism judged against real photos and the manual scan. Anything that reads as CG or as a web page next to the photoreal console gets rejected: flat CSS gradients, CSS noise, vector-perfect shapes, generic icons drawn in CSS.
- Before asserting how a physical detail looks (button shape, comma position, stamp colour), check several real photos. The original often has quirks worth keeping (the title really is «НУ ,ПОГОДИ!»).
- Russian progress notes while working, no comments in code.

## Map

| Part | Where | Notes |
| --- | --- | --- |
| Console renderer | `src/render/renderer.ts` | SVG maps (`maps/*.ts`, `lcd/layers.ts`) baked to 2072×1224 textures over `VIEW` → surface pass (`shaders/surface/*.glsl`) → camera pass (`shaders/camera/main.glsl`). Redraws only when lit segments, pressed keys, light or settings change. |
| Geometry | `src/render/device/geometry.ts` | Everything in `VIEW` units; `toMap`, `toViewFraction`. |
| Light | `src/render/lighting.ts` | Shared by console and paper, so the booklet sits in the same light. |
| Stages and presets | `src/render/settings.ts` | `RENDER_FEATURES` → GLSL `#define` per stage. The settings panel lists features automatically. |
| Booklet pages | `src/render/paper/*`, `src/components/Booklet/content.ts`, `cover.ts` | Pages are drawn on canvas ink layers (print, stamp, pen), then shaded by `shaders/paper/*.glsl` into one canvas per page. CSS 3D only flips the leaves. |
| Scene | `src/render/table.ts`, `src/index.css`, `src/components/Init.tsx` | Procedural table tile in `--table`, `--scene-background`, `--app-height` from JS. |

## Add a processing stage

1. Add an entry to `RENDER_FEATURES` with `stage`, `group`, a Russian `label` and a `define`.
2. Wrap the shader code in `#ifdef <DEFINE>` in that stage's `main.glsl`.
3. Decide whether presets include it (`fast` drops the expensive ones).

`renderer.setSettings` rebuilds a program only when its defines change.

## Verify with numbers, then with eyes

1. Start the capture server: `python design/lookdev/tools/capture_server.py 5502`. Files land in `design/lookdev/tools/captures/`.
2. In the browser pane, post a canvas: `fetch('http://127.0.0.1:5502/save', { method: 'POST', body: JSON.stringify({ name, data: canvas.toDataURL('image/png') }) })`. Console canvas: `main canvas`. Booklet pages: `[role=dialog] canvas`, in sheet order.
3. Compare: `python .agents/skills/visual-work/compare.py reference.png render.png --box 0.1,0.8,0.9,0.95 --out side.jpg`. It prints mean colour, low-frequency spread (mottling) and high-frequency spread (grain) per crop and writes a side-by-side image. Pillow only; numpy is not installed.
4. Look at the side-by-side before claiming a match. Critics and eyeballing disagree; numbers settle it.

Reference values measured on the manual scan:

| Sample | Mean RGB | Low-freq σ | High-freq σ |
| --- | --- | --- | --- |
| Page paper (yellow pages) | 250, 232, 188 | 1–4 | ~3 |
| Cover red | 248, 79, 83 | 6–7 | ~8 |
| Print ink core | 25, 25, 13 | | |
| Stamp violet core | 110, 103, 118 | | |

The scan is a bright flatbed scan; renders sit under the room light, so compare ratios and texture, not absolute brightness. Scan source: the Bulgarian museum PDF `https://www.amuseum.bg/data/files/cms/0/Ръководство Ну Погоди.pdf`. Rights are unclear: use it as a reference only, never commit it.

## Traps already hit

- Less evaluates `min()`/`max()` itself and drops the CSS version: write `width: ~'min(...)'`.
- New webpack rules (loaders, `?raw`, fonts) need a dev server restart.
- React StrictMode runs effects twice. Give each WebGL renderer its own canvas and never `loseContext()` a context someone else may share.
- Canvas uploads are not flipped. With top-down pixel coordinates use `uv = p / size`. Upload ink layers with `UNPACK_PREMULTIPLY_ALPHA_WEBGL` on and divide rgb by alpha.
- GLSL ES 1.0: avoid `sample`, `texture`, `length` as identifiers.
- SVG drawn as an image cannot see web fonts. Draw text on canvas after `document.fonts.load(...)`. A duplicated attribute (two `fill`s) silently breaks a data-URI SVG.
- Solid ink fills: even small voids make the G/B channels grainy on red (the cover looked "задушенная"). Keep voids near zero on floods.
- Booklet text: `content.ts` tries several type scales until a page fits and `paper/hyphenate.ts` adds Russian hyphens. Long copy shrinks the page; trim text instead.
- Jost is the chosen print font (the user rejected Montserrat). Its Cyrillic «д» is round; that is accepted.
- Mobile: a transformed element outside the viewport creates scroll overflow and the phone browser zooms out. `.app` is `position: fixed` with `overflow: hidden`. In the pane emulator `vh`/`dvh` follow the pane, so sizes use `--app-height`.
- The toolbar lives in a right gutter (`--side-gutter`); console and booklet widths subtract it so nothing covers the keys.
- Weak GPUs: `isSoftwareRendering()` switches the default preset to `fast`. Moving light must be smoothed (`useLight`): raw pointer mapping felt jumpy.

## Browser pane tips

- A hidden pane throttles timers and `requestAnimationFrame`; screenshots can lag behind real timing.
- Refs found inside the 3D booklet may belong to hidden faces. Use the keyboard or coordinates.
- Touch emulation needs a width under 768: 740×360 for landscape, 360×740 for the rotate hint. Reset to desktop afterwards.

## Finish

`npm run check`, `npx prettier --check "src/**/*.{ts,tsx,less,css}"`, `npm run build`, then a small commit with an imperative subject.
