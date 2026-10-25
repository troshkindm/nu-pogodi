import {
  CASE,
  LCD_RECT,
  LEDGE,
  LIP,
  PILL_KEYS,
  PLATE,
  ROUND_KEYS,
  TRAY_FLOOR,
  TRAY_OUTER,
  WINDOW,
  contains,
  height,
  width,
} from '../device/geometry';

import { HALFTONE_FILTER, PAINTED_INKS, frameLines, printLayer } from './print';
import { FULL_VIEW, ledHoles, pillKeys, polygon, rect, roundKeys, svgDocument, walls } from './svg';
import { nicks, scratches, speckles } from './wear';

const FILTERS = `
  <clipPath id="caseClip">${rect(CASE, 6, '#000')}</clipPath>
  <clipPath id="plateClip">${rect(PLATE, 12, '#000')}</clipPath>
  <filter id="blur3" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="blur1"><feGaussianBlur stdDeviation="1"/></filter>
  <filter id="blur08"><feGaussianBlur stdDeviation=".8"/></filter>
  <filter id="blur16"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="ragged" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency=".4" numOctaves="2" seed="12" result="d"/>
    <feDisplacementMap in="SourceGraphic" in2="d" scale="3" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="patchy" filterUnits="userSpaceOnUse" ${FULL_VIEW} color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b"/>
    <feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="17" result="n"/>
    <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 5 -2" result="m"/>
    <feComposite in="b" in2="m" operator="in"/>
  </filter>
  <filter id="inkwear" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="5" result="n"/>
    <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 3.0" result="holes"/>
    <feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="21" result="dens"/>
    <feColorMatrix in="dens" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 .68" result="densA"/>
    <feComposite in="SourceGraphic" in2="holes" operator="in" result="holed"/>
    <feComposite in="holed" in2="densA" operator="in" result="eroded"/>
    <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="9" result="d"/>
    <feDisplacementMap in="eroded" in2="d" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation=".7"/>
  </filter>
  <filter id="inksoft"><feGaussianBlur stdDeviation=".6"/></filter>
  ${HALFTONE_FILTER}`;

const GRADIENTS = `
  <linearGradient id="topWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a29196"/><stop offset=".38" stop-color="#665246"/><stop offset="1" stop-color="#62504a"/></linearGradient>
  <linearGradient id="ledgeTop" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="138"><stop offset="0" stop-color="#d8ccd0"/><stop offset=".12" stop-color="#d8ccd0"/><stop offset=".2" stop-color="#7a6e72"/><stop offset=".68" stop-color="#7a6e72"/><stop offset=".75" stop-color="#b5a9ad"/><stop offset="1" stop-color="#b5a9ad"/></linearGradient>
  <linearGradient id="ledgeLeft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bcb0ae"/><stop offset="1" stop-color="#776a6f"/></linearGradient>
  <linearGradient id="bottomWall" gradientUnits="userSpaceOnUse" x1="0" y1="502" x2="0" y2="537"><stop offset="0" stop-color="#524246"/><stop offset=".62" stop-color="#574649"/><stop offset=".8" stop-color="#8a7a7e"/><stop offset=".93" stop-color="#cbbdc4"/><stop offset="1" stop-color="#dcd0d8"/></linearGradient>
  <linearGradient id="floorTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c34" stop-opacity=".1"/><stop offset="1" stop-color="#3a2c34" stop-opacity="0"/></linearGradient>
  <linearGradient id="floorRight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2c34" stop-opacity="0"/><stop offset="1" stop-color="#3a2c34" stop-opacity=".14"/></linearGradient>
  <linearGradient id="bottomWindow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f5d74"/><stop offset=".45" stop-color="#52627a"/><stop offset=".7" stop-color="#333849"/><stop offset="1" stop-color="#333849"/></linearGradient>
  <linearGradient id="bottomLip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5969b"/><stop offset=".85" stop-color="#998a8f"/><stop offset="1" stop-color="#a99a9f"/></linearGradient>
  <linearGradient id="rightFlank" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f7a6e"/><stop offset=".85" stop-color="#806e64"/><stop offset=".95" stop-color="#806e64"/><stop offset="1" stop-color="#a3958c"/></linearGradient>
  <linearGradient id="leftFlank" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e5d55"/><stop offset=".25" stop-color="#83716a"/><stop offset="1" stop-color="#877570"/></linearGradient>
  <linearGradient id="topRim" gradientUnits="userSpaceOnUse" x1="0" y1="0.6" x2="0" y2="32"><stop offset="0" stop-color="#817372"/><stop offset=".3" stop-color="#8f7f7e"/><stop offset=".55" stop-color="#8a7a78"/><stop offset=".8" stop-color="#8d7d7b"/><stop offset="1" stop-color="#907f7d"/></linearGradient>
  <linearGradient id="seamBand" gradientUnits="userSpaceOnUse" x1="0" y1="563" x2="0" y2="571"><stop offset="0" stop-color="#6f5d55"/><stop offset=".35" stop-color="#86716a"/><stop offset="1" stop-color="#958477"/></linearGradient>
  <linearGradient id="plateVertical" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="556"><stop offset="0" stop-color="#2a1e26" stop-opacity=".05"/><stop offset=".45" stop-color="#2a1e26" stop-opacity="0"/><stop offset="1" stop-color="#fff8fc" stop-opacity=".16"/></linearGradient>
  <linearGradient id="plateTopShade" gradientUnits="userSpaceOnUse" x1="0" y1="32" x2="0" y2="92"><stop offset="0" stop-color="#3a2a30" stop-opacity=".05"/><stop offset="1" stop-color="#3a2a30" stop-opacity="0"/></linearGradient>
  <linearGradient id="plateBottomLift" gradientUnits="userSpaceOnUse" x1="0" y1="532" x2="0" y2="563"><stop offset="0" stop-color="#fffafd" stop-opacity="0"/><stop offset=".3" stop-color="#fffafd" stop-opacity=".34"/><stop offset="1" stop-color="#fffafd" stop-opacity=".22"/></linearGradient>
  <linearGradient id="bottomRoll" gradientUnits="userSpaceOnUse" x1="0" y1="594" x2="0" y2="605"><stop offset="0" stop-color="#7c6b6a" stop-opacity="0"/><stop offset=".45" stop-color="#7c6b6a"/><stop offset=".8" stop-color="#483a36"/><stop offset="1" stop-color="#110a07"/></linearGradient>`;

const caseShell = () => `
  <g clip-path="url(#caseClip)">
    ${rect(CASE, 6, '#8f7d7c')}
    <ellipse cx="620" cy="20" rx="160" ry="9" fill="#b39a5a" opacity=".25" filter="url(#blur6)"/>
    <rect x="${CASE.x1}" y="${CASE.y1}" width="${width(CASE)}" height="${32 - CASE.y1}" fill="url(#topRim)"/>
    <path d="M${CASE.x1} 14.6 H${CASE.x2}" stroke="#a88e6e" stroke-width="1.1" opacity=".3"/>
    <path d="M${CASE.x1} 17.9 H${CASE.x2}" stroke="#fff" stroke-width="1.3" opacity=".22"/>
    <path d="M${CASE.x1} 25.6 H${CASE.x2}" stroke="#2a1e1e" stroke-width="1.6" opacity=".22"/>
    <path d="M999 34 V556" stroke="#4d3f3a" stroke-width="2" opacity=".55"/>
    <path d="M1001.5 34 V556" stroke="#c0b0a6" stroke-width="1.3" opacity=".5"/>
    <path d="M1011 8 V598" stroke="#b3a397" stroke-width="1.6" opacity=".95"/>
    <rect x="${CASE.x1}" y="563" width="${width(CASE)}" height="8" fill="url(#seamBand)"/>
    <path d="M${CASE.x1 + 6} ${CASE.y1 + 1.1} H${CASE.x2 - 6}" stroke="#e8dcd8" stroke-width="1.2" opacity=".8"/>
    <path d="M${CASE.x1 + 1.1} ${CASE.y1 + 6} V${CASE.y2 - 10}" stroke="#e2d6d2" stroke-width="1.1" opacity=".7"/>
    <rect x="${CASE.x1}" y="571" width="${width(CASE)}" height="${CASE.y2 - 571}" fill="url(#bottomLip)"/>
    <rect x="${CASE.x1}" y="592" width="${width(CASE)}" height="${CASE.y2 - 592}" fill="url(#bottomRoll)"/>
    <rect x="${CASE.x1}" y="32" width="${18 - CASE.x1}" height="531" fill="url(#leftFlank)"/>
    <rect x="988" y="32" width="${CASE.x2 - 988}" height="531" fill="url(#rightFlank)"/>
  </g>`;

const plate = () => `
  ${rect(PLATE, 12, '#d2c9dc')}
  ${rect(PLATE, 12, 'url(#plateVertical)')}
  <rect x="${TRAY_OUTER.x1 - 6}" y="${TRAY_OUTER.y1 - 6}" width="${width(TRAY_OUTER) + 12}" height="${
  height(TRAY_OUTER) + 12
}" rx="14" fill="none" stroke="#3a2c34" stroke-width="40" opacity=".045" filter="url(#blur8)"/>
  <rect x="${PLATE.x1}" y="${PLATE.y1}" width="${width(PLATE)}" height="60" fill="url(#plateTopShade)"/>
  <g clip-path="url(#plateClip)">${rect(
    PLATE,
    12,
    'none',
    'stroke="#dcc2ae" stroke-width="56" opacity=".4" filter="url(#blur8)"',
  )}</g>
  <rect x="${PLATE.x1 + 8}" y="532" width="${
  width(PLATE) - 16
}" height="31" fill="url(#plateBottomLift)" filter="url(#blur2)"/>
  <ellipse cx="960" cy="42" rx="40" ry="26" fill="#3a2a30" opacity=".14" filter="url(#blur8)"/>`;

const tray = () => {
  const trayWalls = walls(TRAY_OUTER, TRAY_FLOOR);
  return `
  ${rect(TRAY_FLOOR, 8, '#e8e0f0')}
  <rect x="${TRAY_FLOOR.x1}" y="${TRAY_FLOOR.y1}" width="${width(TRAY_FLOOR)}" height="60" fill="url(#floorTop)"/>
  <rect x="${TRAY_FLOOR.x2 - 100}" y="${TRAY_FLOOR.y1}" width="100" height="${height(
    TRAY_FLOOR,
  )}" fill="url(#floorRight)"/>
  <g filter="url(#blur3)">
    ${polygon(trayWalls.top, 'url(#topWall)')}${polygon(trayWalls.left, '#8a7d84')}${polygon(
    trayWalls.right,
    '#6c5c5a',
  )}${polygon(trayWalls.bottom, 'url(#bottomWall)')}
  </g>
  ${rect(TRAY_OUTER, 10, 'none', 'stroke="#f2eaf0" stroke-width="2.6" opacity=".6" filter="url(#blur16)"')}
  ${rect(TRAY_FLOOR, 8, 'none', 'stroke="#f2eaf4" stroke-width="2" opacity=".6"')}
  <path d="M${TRAY_FLOOR.x1 + 8} ${TRAY_FLOOR.y2 - 1.2} H${TRAY_FLOOR.x2 - 8}" stroke="#ffffff" stroke-width="3.2"/>
  <path d="M${TRAY_OUTER.x1 + 8} ${TRAY_OUTER.y2 + 1.8} H${
    TRAY_OUTER.x2 - 8
  }" stroke="#ffffff" stroke-width="3.6" filter="url(#blur08)"/>`;
};

const lcdWindow = () => {
  const ledge = walls(WINDOW, LEDGE);
  const well = walls(LEDGE, LCD_RECT);
  return `
  ${rect(LIP, 10, '#9d939a')}
  ${rect(LIP, 10, 'none', 'stroke="#4a3e47" stroke-width="1.5"')}
  <path d="M250 465.6 H752" stroke="#fbf9fc" stroke-width="1.5"/>
  ${rect(WINDOW, 4, '#a39498')}
  ${polygon(ledge.top, 'url(#ledgeTop)')}${polygon(ledge.left, 'url(#ledgeLeft)')}${polygon(
    ledge.right,
    '#b9adb0',
  )}${polygon(ledge.bottom, '#b7aeb8')}
  ${polygon(well.left, '#6a6d80')}${polygon(well.top, '#7a7d92')}${polygon(well.right, '#4e5062')}${polygon(
    well.bottom,
    'url(#bottomWindow)',
  )}
  ${speckles(91, 320, LEDGE, {
    colors: ['#5f8a8a', '#8a9ab0', '#a8b4c4', '#e8eef4', '#2a2a36'],
    sizes: [0.3, 1.1],
    opacities: [0.3, 0.7],
    skip: (x, y) => contains(LCD_RECT, x, y),
  })}
  ${speckles(
    92,
    40,
    { x1: LCD_RECT.x1, y1: LCD_RECT.y2, x2: LCD_RECT.x2, y2: LEDGE.y2 },
    { colors: ['#c9d0d8', '#1e1e28'], sizes: [0.4, 1.3], opacities: [0.4, 0.8] },
  )}
  ${rect(LCD_RECT, 1.5, '#c9d1c9')}`;
};

const keys = () => `
  <ellipse cx="934" cy="150" rx="46" ry="70" fill="#e4dff0" opacity=".55" filter="url(#blur8)"/>
  <path d="M944 64 q18 22 26 58" fill="none" stroke="#fbf7fb" stroke-width="1.6" opacity=".7"/>
  <ellipse cx="958" cy="96" rx="9" ry="14" fill="#f4eff6" opacity=".45" filter="url(#blur2)"/>
  <ellipse cx="940" cy="112" rx="26" ry="22" fill="#ece8f4" opacity=".5" filter="url(#blur6)"/>
  ${ROUND_KEYS.filter(([cx]) => cx > 500)
    .map(
      ([cx, cy]) =>
        `<circle cx="${cx - 2.5}" cy="${cy + 3}" r="38.5" fill="#3a2c34" opacity=".3" filter="url(#blur2)"/>`,
    )
    .join('')}
  ${roundKeys(37, '#958c93')}${roundKeys(28.5, '#2c282e')}
  ${pillKeys(59, 42, 'none', 'stroke="#3a3034" stroke-width="1.2" opacity=".35"')}
  ${pillKeys(58, 41, '#957f86')}${pillKeys(49, 28, '#5e5660')}
  ${ledHoles('#3e3236', 'opacity=".35" filter="url(#blur2)"', 14.5)}${ledHoles(
  'none',
  'stroke="#efe8ee" stroke-width=".9" opacity=".5"',
  11.6,
)}${ledHoles('#2a2430', 'filter="url(#ragged)"', 10.8)}
  <g fill="none" stroke="#f3eef4" stroke-linecap="round" opacity=".7" filter="url(#blur08)"><path d="M920 160 l18 -4" stroke-width="3"/><path d="M935 176 l22 -6" stroke-width="2.4"/><path d="M948 165 l14 3" stroke-width="2"/><path d="M926 186 l10 -2" stroke-width="2.6"/></g>
  ${PILL_KEYS.map(
    ([cx, cy]) => `<path d="M${cx - 15} ${cy + 11.2} H${cx + 15}" stroke="#fbf6f8" stroke-width="1" opacity=".75"/>`,
  ).join('')}`;

const plateArea = { x1: 20, y1: 33, x2: 986, y2: 562 };

const wear = () => `
  <g fill="none" stroke-linecap="round" filter="url(#ragged)" opacity=".38"><path d="M112 262 q6 -2 13 -1" stroke="#fffaf8" stroke-width="2.4"/><path d="M140 284 q5 1 9 -2" stroke="#fffaf8" stroke-width="2"/><path d="M96 300 l7 -3" stroke="#5a4a4c" stroke-width="1.6"/></g>
  <g filter="url(#blur8)" fill="#a8875a"><ellipse cx="14" cy="588" rx="40" ry="22" opacity=".2"/><ellipse cx="1000" cy="590" rx="46" ry="20" opacity=".18"/><ellipse cx="996" cy="22" rx="38" ry="18" opacity=".14"/><ellipse cx="330" cy="598" rx="70" ry="8" opacity=".14"/><ellipse cx="760" cy="596" rx="50" ry="8" opacity=".12"/></g>
  ${speckles(
    93,
    26,
    { x1: 30, y1: 40, x2: 980, y2: 550 },
    {
      colors: ['#a88e5a', '#b09060'],
      sizes: [0.6, 1.4],
      opacities: [0.35, 0.7],
      skip: (x, y) => contains(TRAY_OUTER, x, y),
    },
  )}
  <g fill="none" stroke="#5a4236" opacity=".5" filter="url(#patchy)">
    ${rect(TRAY_OUTER, 6, 'none', 'stroke-width="2"')}
    ${rect(TRAY_FLOOR, 8, 'none', 'stroke-width="1.6"')}
    <path d="M${CASE.x1} 559 H${CASE.x2}" stroke-width="3"/>
    ${roundKeys(37.5, 'none', 'stroke-width="1.6"')}
  </g>
  ${scratches()}
  <g fill="none" stroke-linecap="round">
    ${[
      [832, 236, 968, 262],
      [846, 252, 975, 292],
      [860, 241, 930, 250],
    ]
      .map(
        ([x1, y1, x2, y2]) =>
          `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${
            (y1 + y2) / 2 - 3
          } ${x2} ${y2}" stroke="#f4eef2" stroke-width=".9" opacity=".7"/><path d="M${x1} ${y1 + 0.9} Q${
            (x1 + x2) / 2
          } ${(y1 + y2) / 2 - 2.1} ${x2} ${y2 + 0.9}" stroke="#6a5a5c" stroke-width=".6" opacity=".35"/>`,
      )
      .join('')}
  </g>
  ${speckles(77, 150, plateArea, {
    colors: ['#fff8fc', '#fff8fc', '#5a4a4c'],
    sizes: [0.35, 1.4],
    opacities: [0.2, 0.55],
    skip: (x, y) => contains(LIP, x, y),
  })}
  ${speckles(78, 60, plateArea, {
    colors: ['#4a3d3a'],
    sizes: [0.5, 1.1],
    opacities: [0.45, 0.8],
    skip: (x, y) => contains(LIP, x, y),
  })}
  <g filter="url(#blur8)" opacity=".2">
    <ellipse cx="500" cy="548" rx="260" ry="10" fill="#b8ab9c"/><ellipse cx="500" cy="44" rx="300" ry="8" fill="#b8ab9c"/>
    <ellipse cx="28" cy="120" rx="18" ry="80" fill="#b5a99a"/><ellipse cx="975" cy="420" rx="16" ry="90" fill="#b5a99a"/>
    <ellipse cx="150" cy="300" rx="40" ry="24" fill="#c9a99a"/><ellipse cx="880" cy="330" rx="34" ry="20" fill="#c7a395"/><ellipse cx="420" cy="520" rx="30" ry="12" fill="#c9a99a"/>
  </g>
  <g fill="none" stroke="#efe5ee" stroke-linecap="round" opacity=".09" filter="url(#blur2)">
    <path d="M900 300 q30 40 18 110" stroke-width="7"/><path d="M930 280 q36 60 20 150" stroke-width="5"/><path d="M845 470 q50 30 110 20" stroke-width="6"/>
    <path d="M300 64 q120 -6 240 2" stroke-width="5"/>
  </g>
  <g filter="url(#blur8)" opacity=".22"><ellipse cx="905" cy="300" rx="60" ry="40" fill="#e2b9a4"/><ellipse cx="960" cy="420" rx="30" ry="50" fill="#e2b9a4"/></g>
  <g fill="none" stroke="#fdfafc" stroke-linecap="round" opacity=".75"><path d="M120 160 l38 -9" stroke-width="1"/><path d="M60 470 l30 -11" stroke-width="1"/><path d="M900 470 l42 -8" stroke-width="1"/><path d="M840 300 l26 -10" stroke-width=".9"/><path d="M150 520 l24 -6" stroke-width=".9"/></g>
  ${nicks()}`;

const wearOverPrint = () => `
  <g fill="none" stroke-linecap="round"><path d="M414 481 l9 15" stroke="#f7f1f3" stroke-width="1.7" opacity=".8"/><path d="M415.2 481.6 l9 15" stroke="#5a4a4c" stroke-width=".6" opacity=".45"/><path d="M612 96 l14 -5" stroke="#f7f1f3" stroke-width="1.5" opacity=".75"/><path d="M902 226 l11 9" stroke="#f7f1f3" stroke-width="1.6" opacity=".7"/></g>
  <g fill="none" stroke="#efe9ec" stroke-width=".5" opacity=".55"><path d="M218 496 q6 -5 13 -2 t9 4"/><path d="M782 496 q-5 -3 -11 -1"/><path d="M256 452 q4 -3 9 -1"/><path d="M745 140 q-4 2 -8 1 t-5 3"/></g>`;

export function albedoMap(withWear: boolean): string {
  return svgDocument(
    `${caseShell()}${plate()}${tray()}${lcdWindow()}${keys()}
    ${withWear ? wear() : ''}
    <g filter="url(#inkwear)">${printLayer(PAINTED_INKS)}</g>
    ${withWear ? wearOverPrint() : ''}
    <g filter="url(#inksoft)">${frameLines(PAINTED_INKS.frame)}</g>`,
    FILTERS + GRADIENTS,
  );
}
