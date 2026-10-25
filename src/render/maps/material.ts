import { LCD_RECT, LIP, PLATE, TRAY_FLOOR, TRAY_OUTER, WINDOW } from '../device/geometry';

import { HALFTONE_FILTER, frameLines, printLayer, uniformInks } from './print';
import { FULL_VIEW, ledHoles, pillKeys, polygon, rect, roundKeys, svgDocument, walls } from './svg';

const SURFACE = {
  case: 'rgb(50,80,200)',
  plate: 'rgb(56,89,255)',
  lip: 'rgb(70,120,50)',
  window: 'rgb(40,80,90)',
  lcd: 'rgb(0,30,0)',
  wall: 'rgb(50,80,80)',
  leftWall: 'rgb(50,80,90)',
  washer: 'rgb(70,110,70)',
  well: 'rgb(20,40,0)',
  hole: 'rgb(10,40,0)',
  ink: 'rgb(0,30,0)',
};

export function materialMap(): string {
  const trayWalls = walls(TRAY_OUTER, TRAY_FLOOR);
  return svgDocument(
    `
    <rect ${FULL_VIEW} fill="${SURFACE.case}"/>
    ${rect(PLATE, 12, SURFACE.plate)}
    ${rect(LIP, 10, SURFACE.lip)}
    ${rect(WINDOW, 4, SURFACE.window)}
    ${rect(LCD_RECT, 1.5, SURFACE.lcd)}
    ${polygon(trayWalls.top, SURFACE.wall)}${polygon(trayWalls.left, SURFACE.leftWall)}${polygon(
      trayWalls.right,
      SURFACE.wall,
    )}${polygon(trayWalls.bottom, SURFACE.wall)}
    ${roundKeys(37, SURFACE.washer)}${roundKeys(28.5, SURFACE.well)}
    ${pillKeys(58, 41, SURFACE.washer)}${pillKeys(49, 28, SURFACE.well)}
    ${ledHoles(SURFACE.hole)}
    <path d="M${TRAY_FLOOR.x1 + 8} ${TRAY_FLOOR.y2 - 1.2} H${
      TRAY_FLOOR.x2 - 8
    }" stroke="rgb(200,40,0)" stroke-width="3.2"/>
    <path d="M${TRAY_OUTER.x1 + 8} ${TRAY_OUTER.y2 + 1.8} H${
      TRAY_OUTER.x2 - 8
    }" stroke="rgb(255,40,0)" stroke-width="4.2"/>
    <path d="M${TRAY_FLOOR.x1 + 8} ${TRAY_FLOOR.y1 + 1.2} H${
      TRAY_FLOOR.x2 - 8
    }" stroke="rgb(150,40,0)" stroke-width="2"/>
    ${printLayer(uniformInks(SURFACE.ink))}${frameLines(SURFACE.ink)}`,
    HALFTONE_FILTER,
  );
}
