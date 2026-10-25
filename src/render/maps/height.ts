import { CASE, LCD_RECT, LEDGE, LIP, PLATE, TRAY_FLOOR, TRAY_OUTER, WINDOW, width } from '../device/geometry';

import { FULL_VIEW, ledHoles, pillKeys, rect, roundKeys, steppedSlope, svgDocument } from './svg';

const FILTERS = `
  <filter id="edge2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6"/><feComponentTransfer><feFuncA type="linear" slope="2.2" intercept="-.6"/></feComponentTransfer></filter>
  <filter id="edge1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".8"/></filter>
  <filter id="edge15" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.5"/></filter>
  <filter id="soft15" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.5"/></filter>
  <filter id="soft35" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.5"/></filter>`;

const caseStep = (inset: number, fill: string) =>
  rect(
    { x1: CASE.x1 + inset, y1: CASE.y1 + inset * 1.2, x2: CASE.x2 - inset, y2: CASE.y2 - inset * 0.6 },
    Math.max(4, 15 - inset),
    fill,
  );

export function heightMap(): string {
  return svgDocument(
    `
    <rect ${FULL_VIEW} fill="#000"/>
    <g filter="url(#edge15)">
      ${caseStep(0, '#8c8c8c')}${caseStep(3, '#989898')}${caseStep(7, '#a2a2a2')}${caseStep(11, '#aaaaaa')}
      <rect x="${CASE.x1 + 6}" y="566" width="${width(CASE) - 12}" height="24" fill="#a6a6a6"/>
    </g>
    ${rect(PLATE, 12, '#b4b4b4', 'filter="url(#edge15)"')}
    <g filter="url(#soft35)">${steppedSlope(TRAY_OUTER, TRAY_FLOOR, { from: 0xb4, to: 0x7c, steps: 12, radius: 8 })}</g>
    ${rect(LIP, 10, '#9a9a9a', 'filter="url(#edge15)"')}
    <g filter="url(#soft15)">${steppedSlope(WINDOW, LEDGE, {
      from: 0x9a,
      to: 0x86,
      steps: 3,
      radius: 3,
    })}${steppedSlope(LEDGE, LCD_RECT, { from: 0x80, to: 0x3a, steps: 5, radius: 2 })}</g>
    ${rect(LCD_RECT, 1.5, '#383838', 'filter="url(#edge1)"')}
    ${roundKeys(37, '#b8b8b8', 'filter="url(#edge1)"')}
    ${roundKeys(28.5, '#909090', 'filter="url(#edge1)"')}
    ${pillKeys(58, 41, '#bababa', 'filter="url(#edge2)"')}
    ${pillKeys(49, 28, '#a6a6a6', 'filter="url(#edge1)"')}
    ${ledHoles('#5a5a5a', 'filter="url(#edge1)"', 11)}`,
    FILTERS,
  );
}
