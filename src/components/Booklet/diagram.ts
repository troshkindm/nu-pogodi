import { FILM_PATHS, SEGMENT_PATHS } from '../../lcd/art';
import { HARE, WOLF_ARMS, WOLF_BODY, numberSegments } from '../../lcd/segments';
import {
  CASE,
  LCD_ART_TRANSFORM,
  LCD_RECT,
  PILL_KEYS,
  PLATE,
  ROUND_KEYS,
  TRAY_OUTER,
  WINDOW,
} from '../../render/device/geometry';
import type { Point } from '../../render/device/geometry';
import { HALFTONE_FILTER, frameLines, printLayer, uniformInks } from '../../render/maps/print';
import { ledHoles, pillKeys, rect, roundKeys } from '../../render/maps/svg';

const INK = '#1f1c19';
const FILM_INK = '#22231d';
const VIEW_BOX = { x: -96, y: -16, w: 1220, h: 640 };
const CALLOUT_X = { left: -40, right: 1062 };

export const KEY_CALLOUTS = {
  round: [1, 2, 3, 4],
  pill: [5, 6, 7],
} as const;

const DEMO_SEGMENTS = [WOLF_BODY[0], WOLF_ARMS[0], HARE.body, ...numberSegments('1200')];

const outline = (strokeWidth: number) => `stroke="${INK}" stroke-width="${strokeWidth}"`;

const lcdArt = () => {
  const film = FILM_PATHS.filter(({ fill }) => fill === FILM_INK).map(({ d }) => `<path d="${d}"/>`);
  const segments = DEMO_SEGMENTS.map((id) => `<path d="${SEGMENT_PATHS.get(id) ?? ''}"/>`);
  return `<clipPath id="diagram-lcd">${rect(LCD_RECT, 0, '#000')}</clipPath>
    <g clip-path="url(#diagram-lcd)" fill="${INK}"><g transform="${LCD_ART_TRANSFORM}">${film.join('')}${segments.join(
    '',
  )}</g></g>`;
};

const callout = (from: Point, side: keyof typeof CALLOUT_X, label: number) => {
  const x = CALLOUT_X[side];
  const anchor = side === 'left' ? 'end' : 'start';
  const textX = side === 'left' ? x - 10 : x + 10;
  return `<path d="M${from[0]} ${from[1]} H${x}" stroke="#f4ecd6" stroke-width="9"/>
    <path d="M${from[0]} ${from[1]} H${x}" stroke="${INK}" stroke-width="3"/>
    <text x="${textX}" y="${
    from[1] + 15
  }" text-anchor="${anchor}" font-size="44" font-weight="600" fill="${INK}">${label}</text>`;
};

const callouts = () => [
  ...ROUND_KEYS.map(([x, y], i) =>
    callout([x < 500 ? x - 37 : x + 37, y], x < 500 ? 'left' : 'right', KEY_CALLOUTS.round[i]),
  ),
  ...PILL_KEYS.map(([x, y], i) => callout([x + 30, y], 'right', KEY_CALLOUTS.pill[i])),
];

const diagramMarkup = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX.x} ${VIEW_BOX.y} ${
  VIEW_BOX.w
} ${VIEW_BOX.h}" width="${VIEW_BOX.w}" height="${VIEW_BOX.h}">
  <style>text{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif}.rounded{font-family:'Arial Rounded MT Bold','Segoe UI',sans-serif}</style>
  <defs>${HALFTONE_FILTER}</defs>
  ${rect(CASE, 14, 'none', outline(5))}
  ${rect(PLATE, 10, 'none', outline(2))}
  ${rect(TRAY_OUTER, 26, 'none', outline(3))}
  ${rect(WINDOW, 8, 'none', outline(4))}
  ${rect(LCD_RECT, 2, 'none', outline(2))}
  ${lcdArt()}
  ${roundKeys(37, 'none', outline(2.5))}${roundKeys(28.5, 'none', outline(3))}${roundKeys(23.5, INK, 'opacity=".14"')}
  ${pillKeys(58, 41, 'none', outline(2.5))}${pillKeys(49, 28, 'none', outline(3))}
  ${ledHoles('none', outline(2.5), 11)}
  ${printLayer(uniformInks(INK))}${frameLines(INK)}
  ${callouts().join('')}
</svg>`;

export const CONSOLE_DIAGRAM_URL = `data:image/svg+xml,${encodeURIComponent(diagramMarkup())}`;
export const CONSOLE_DIAGRAM_ASPECT = VIEW_BOX.w / VIEW_BOX.h;
