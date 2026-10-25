import { FILM_PATHS } from '../../lcd/art';
import { LCD_ART_TRANSFORM, LCD_RECT, MAP_SIZE, VIEW, height, width } from '../device/geometry';

export const GHOST_OPACITY = 0.06;

const frame = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_SIZE.width}" height="${
  MAP_SIZE.height
}" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" preserveAspectRatio="none">
  <defs>
    <clipPath id="lcdClip"><rect x="${LCD_RECT.x1}" y="${LCD_RECT.y1}" width="${width(LCD_RECT)}" height="${height(
  LCD_RECT,
)}" rx="1.5"/></clipPath>
    <linearGradient id="lcdBackground" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="#cbd5c9"/><stop offset=".45" stop-color="#b6c0b4"/><stop offset="1" stop-color="#949e8c"/></linearGradient>
  </defs>
  <g clip-path="url(#lcdClip)">${content}</g>
</svg>`;

const film = () =>
  `<g transform="${LCD_ART_TRANSFORM}">${FILM_PATHS.map(({ d, fill }) => `<path d="${d}" fill="${fill}"/>`).join(
    '',
  )}</g>`;

export const backgroundLayer = () =>
  frame(`<rect x="${LCD_RECT.x1}" y="${LCD_RECT.y1}" width="${width(LCD_RECT)}" height="${height(
    LCD_RECT,
  )}" fill="url(#lcdBackground)"/>
  ${film()}
  <path d="M${LCD_RECT.x1 + 1} ${LCD_RECT.y1 + 1} V${LCD_RECT.y2 - 1} M${LCD_RECT.x2 - 1} ${LCD_RECT.y1 + 1} V${
    LCD_RECT.y2 - 1
  }" stroke="#e8ede9" stroke-width="1.6" opacity=".55"/>`);

export const printLayer = () => frame(film());
