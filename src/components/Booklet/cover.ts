import { CHUTE } from '../../game/config';
import { SEGMENT_PATHS } from '../../lcd/art';
import { WOLF_ARMS, WOLF_BODY } from '../../lcd/segments';
import type { PageLayers } from '../../render/paper/inks';
import { PAGE, fontOf } from '../../render/paper/typesetter';

const ART = { width: 686, height: 948 };
const WOLF_BOX = { x: 345, y: 360, width: 490, height: 526 };
const WOLF_TARGET = { x: 190, y: 410, width: 340, height: 350 };
const INK = { red: '#fc3030', black: '#1d1a18', teal: '#169aa4', face: '#e9f2dc', ring: '#d8483f' };

type Ctx = CanvasRenderingContext2D;

const clear = (ctx: Ctx, draw: () => void) => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  draw();
  ctx.restore();
};

const centered = (ctx: Ctx, text: string, y: number, size: number, weight: number, spacing = 0) => {
  ctx.font = fontOf({ size, weight });
  ctx.fillStyle = INK.black;
  ctx.textAlign = 'center';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, 364, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
};

const band = (ctx: Ctx, y: number, height: number) => {
  clear(ctx, () => ctx.fillRect(36, y, 650, height));
  ctx.fillStyle = INK.black;
  ctx.fillRect(36, y - 9, 650, 9);
  ctx.fillRect(36, y + height, 650, 5);
};

const outlined = (ctx: Ctx, path: Path2D, lineWidth: number) => {
  clear(ctx, () => ctx.fill(path));
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = INK.black;
  ctx.stroke(path);
};

const circle = (x: number, y: number, r: number) => {
  const path = new Path2D();
  path.arc(x, y, r, 0, Math.PI * 2);
  return path;
};

const alarmClock = (ctx: Ctx) => {
  ctx.lineJoin = 'round';
  outlined(ctx, new Path2D('M286 334 Q286 250 364 250 Q442 250 442 334 Z'), 7);
  outlined(ctx, new Path2D('M348 334 h32 v26 h-32 Z'), 6);
  outlined(ctx, new Path2D('M214 742 L176 838 L276 838 L286 790 Z M514 742 L552 838 L452 838 L442 790 Z'), 7);
  outlined(ctx, circle(364, 583, 226), 8);
  ctx.fillStyle = INK.face;
  ctx.fill(circle(364, 583, 190));
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK.ring;
  ctx.stroke(circle(364, 583, 190));
  ctx.save();
  ctx.translate(WOLF_TARGET.x, WOLF_TARGET.y);
  const scale = Math.min(WOLF_TARGET.width / WOLF_BOX.width, WOLF_TARGET.height / WOLF_BOX.height);
  ctx.translate((WOLF_TARGET.width - WOLF_BOX.width * scale) / 2, (WOLF_TARGET.height - WOLF_BOX.height * scale) / 2);
  ctx.scale(scale, scale);
  ctx.translate(-WOLF_BOX.x, -WOLF_BOX.y);
  ctx.fillStyle = INK.teal;
  [WOLF_BODY[0], WOLF_ARMS[CHUTE.topLeft]].forEach((id) => ctx.fill(new Path2D(SEGMENT_PATHS.get(id) ?? '')));
  ctx.restore();
};

const logo = (ctx: Ctx) => {
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK.black;
  ctx.stroke(circle(96, 284, 27));
  ctx.fillStyle = INK.black;
  ctx.fill(circle(60, 284, 5));
  ctx.font = fontOf({ size: 32, weight: 700 });
  ctx.textAlign = 'center';
  ctx.fillText('ИМ', 96, 296);
  ctx.textAlign = 'left';
};

export function drawCover({ print }: PageLayers) {
  print.save();
  print.fillStyle = INK.red;
  print.fillRect(0, 0, PAGE.width, PAGE.height);
  print.scale(PAGE.width / ART.width, PAGE.width / ART.width);
  centered(print, 'игра', 70, 60, 600);
  band(print, 96, 78);
  centered(print, 'ЭЛЕКТРОНИКА', 157, 64, 700, 2);
  centered(print, 'с часами-будильником', 238, 50, 600);
  logo(print);
  alarmClock(print);
  band(print, 866, 58);
  centered(print, 'РУКОВОДСТВО ПО ЭКСПЛУАТАЦИИ', 906, 27, 700, 2);
  print.restore();
}
