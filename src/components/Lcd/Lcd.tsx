import { memo } from 'react';

import { FILM_PATHS, SEGMENT_INK, SEGMENT_PATHS } from '../../lcd/art';

import style from './Lcd.module.less';

const SEGMENTS = [...SEGMENT_PATHS];

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
    {FILM_PATHS.map(({ id, d, fill }) => (
      <path key={id} d={d} fill={fill} />
    ))}
    <g fill={SEGMENT_INK}>
      {SEGMENTS.map(([id, d]) => (
        <path key={id} d={d} className={lit.has(id) ? style.on : style.off} />
      ))}
    </g>
  </svg>
));
