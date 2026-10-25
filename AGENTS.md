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
- `src/render/` — WebGL 2.5D renderer of the device body, LCD optics and camera pass; `src/render/paper/` shades the booklet pages.
- `src/audio/` — square-wave beeper and button clicks (WebAudio).
- `src/components/` — React shell: console, booklet card, toolbar. React never drives the game loop; components subscribe to engine state.
- `design/` — specs and references, not shipped:
  - `design/game-spec.md` — mechanics measured from the original ROM, the source of truth for the engine.
  - `design/lcd-art.md` — LCD art sources, segment inventory, licence.
  - `design/lookdev/` — standalone look-dev prototype of the renderer and its tools.
- `.agents/skills/` — task skills shared by all agents; `.claude/skills/` only points to them.

## Code style

- No comments unless a line would genuinely mislead without one. Names carry the meaning; prefer extracting a well-named function over explaining code.
- Small modules with one job. Plain functions and data over classes and frameworks.
- Strict TypeScript, no `any` in new code. Prettier and ESLint configs come from the boilerplate; keep them passing.
- Engine logic stays deterministic and covered by Vitest tests next to the code (`*.test.ts`).

## Visual work

Follow `.agents/skills/visual-work/SKILL.md` for anything that changes how the project looks: render architecture, adding processing stages, pixel comparison against references, and known traps.

## Assets and licences

- LCD segments come from the MAME `nupogodi.svg` vector and the LCD film is traced from the `fg.png` overlay of nupogodi-sdl; neither states a licence, both are attributed in `README.md`. Keep that attribution when touching `src/lcd/*.svg`.
- Fonts (Jost, Caveat) are SIL OFL 1.1, icons are Fluent UI System Icons (MIT).
- Photos and the manual scan are references only. Do not commit scans or third-party images beyond what `README.md` already attributes.

## Commits

Small, focused commits with imperative subjects. `npm run check` must pass.
