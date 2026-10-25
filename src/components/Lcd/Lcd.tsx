import { memo } from 'react';

import art from '../../lcd/art.json';

import style from './Lcd.module.less';

const FILM_COLORS: [keyof typeof art.film, string][] = [
  ['green', '#456a22'],
  ['red', '#a8402e'],
  ['black', '#22231d'],
];
const PATHS = Object.entries(art.paths);
const TEXTS = Object.entries(art.texts) as [string, [number, number, number, string, number]][];

interface LcdProps {
  lit: ReadonlySet<string>;
}

export const Lcd = memo(({ lit }: LcdProps) => (
  <svg className={style.lcd} viewBox="0 -10 1570 1000" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="lcd-background" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="#cbd5c9" />
        <stop offset="0.45" stopColor="#b6c0b4" />
        <stop offset="1" stopColor="#949e8c" />
      </linearGradient>
    </defs>
    <rect x="-40" y="-60" width="1650" height="1110" fill="url(#lcd-background)" />
    {FILM_COLORS.map(([key, color]) => (
      <path key={key} d={art.film[key]} fill={color} />
    ))}
    <g className={style.segments}>
      {PATHS.map(([id, d]) => (
        <path key={id} d={d} className={lit.has(id) ? style.on : style.off} />
      ))}
      {TEXTS.map(([id, [x, y, size, text, length]]) => (
        <text
          key={id}
          x={x}
          y={y}
          fontSize={size}
          fontWeight={800}
          textLength={length}
          lengthAdjust="spacingAndGlyphs"
          className={lit.has(id) ? style.on : style.off}
        >
          {text}
        </text>
      ))}
    </g>
  </svg>
));
