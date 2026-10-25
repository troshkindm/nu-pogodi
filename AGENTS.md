# AGENTS.md

Web recreation of the Soviet LCD handheld «Электроника ИМ-02 "Ну, погоди!"» for the Kaspersky SafeBoard internship test task. TypeScript, React, Less, Webpack, Vitest.

## Commands

- `npm ci` — install
- `npm run dev` — dev server on http://localhost:8080
- `npm run build` — production bundle in `dist/`
- `npm run check` — typecheck, lint and tests; run before every commit
- `npm run format` — Prettier check (`npx prettier --write <files>` to fix)

## Layout

- `src/game/` — pure game engine: state machine, ROM-accurate timing, scoring, misses. No React, no DOM. Randomness and time are injected so tests are deterministic.
- `src/game/config.ts` — every tunable number (timings, speed curve, egg caps, sounds, keys) in one place.
- `src/lcd/` — LCD segment art and the mapping from game state to lit segments.
- `src/render/` — WebGL 2.5D renderer of the device body, LCD optics and camera pass.
- `src/audio/` — square-wave beeper and button clicks (WebAudio).
- `src/components/` — React shell: console, booklet card, toolbar. React never drives the game loop; components subscribe to engine state.
- `design/` — specs and references, not shipped:
  - `design/game-spec.md` — mechanics measured from the original ROM, the source of truth for the engine.
  - `design/lcd-art.md` — LCD art sources, segment inventory, licence.
  - `design/lookdev/` — standalone look-dev prototype of the renderer and its tools.

## Code style

- No comments unless a line would genuinely mislead without one. Names carry the meaning; prefer extracting a well-named function over explaining code.
- Small modules with one job. Plain functions and data over classes and frameworks.
- Strict TypeScript, no `any` in new code. Prettier and ESLint configs come from the boilerplate; keep them passing.
- Engine logic stays deterministic and covered by Vitest tests next to the code (`*.test.ts`).

## Visual work

- The reference is the photo of the real device (see `design/lookdev/README.md`). Judge renders against it with pixel measurements, not by eye alone: capture the canvas (`design/lookdev/tools/capture_server.py`) and compose the same crops as the reference.
- Before asserting how a physical detail looks (button shape, print weight), check several real photos.

## Assets and licences

- LCD segment art is traced from a CC BY-SA 4.0 photo (perepelin30, Wikimedia Commons); it stays under CC BY-SA 4.0 with attribution.
- Do not copy third-party artwork (MAME SVG paths, other clones); positions and counts are facts and may be used.

## Commits

Small, focused commits with imperative subjects. `npm run check` must pass.
