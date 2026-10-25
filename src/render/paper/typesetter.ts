import type { Random } from '../../game/random';

import { breakPoints } from './hyphenate';

export const PAGE = { width: 1000, height: 1380 };
export const PRINT_INK = { black: '#1e1a16', blue: '#33428c' };

export interface Frame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type Run = string | { key: string };

interface Token {
  text: string;
  key: boolean;
  width: number;
}

export interface TextStyle {
  size?: number;
  weight?: number;
  color?: string;
  family?: string;
}

interface FlowOptions {
  indent: number;
  justify: boolean;
}

const BODY = { size: 39, weight: 600, lineHeight: 1.36 };
const HEADING = { size: 41, weight: 700 };
const KEY_PADDING = 9;
const MAX_STRETCH = 2.4;

export const fontOf = ({ size = BODY.size, weight = BODY.weight, family = 'Jost' }: TextStyle) =>
  `${weight} ${size}px ${family}, sans-serif`;

export class Typesetter {
  y: number;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly frame: Frame,
    private readonly random: Random,
    readonly scale = 1,
  ) {
    this.y = frame.top;
  }

  get width() {
    return this.frame.right - this.frame.left;
  }

  get bodySize() {
    return BODY.size * this.scale;
  }

  skip(amount: number) {
    this.y += amount * this.scale;
  }

  heading(text: string) {
    this.y += 6 * this.scale;
    const upper = text.toUpperCase();
    this.ctx.font = this.font({ size: HEADING.size, weight: HEADING.weight });
    const natural = this.ctx.measureText(upper).width * 1.06;
    const fit = Math.min(1, this.width / natural);
    const size = HEADING.size * this.scale * fit;
    this.letterSpaced(upper, (this.frame.left + this.frame.right) / 2, this.y + size * 0.82, {
      size: HEADING.size * fit,
      weight: HEADING.weight,
      color: PRINT_INK.blue,
    });
    this.y += HEADING.size * this.scale * 1.62;
  }

  paragraph(runs: Run | Run[], { indent = 40, justify = true } = {}) {
    this.flow(this.tokens(runs), this.frame.left, this.width, { indent: indent * this.scale, justify });
    this.y += 12 * this.scale;
  }

  list(items: readonly Run[][], bullet = '—') {
    const hang = 46 * this.scale;
    items.forEach((item) => {
      this.text(bullet, this.frame.left, this.baseline(), {});
      this.flow(this.tokens(item), this.frame.left + hang, this.width - hang, { indent: 0, justify: false });
      this.y += 6 * this.scale;
    });
  }

  legend(rows: readonly [string, Run[]][]) {
    this.ctx.font = this.font({ weight: 700 });
    const termWidth = Math.max(...rows.map(([term]) => this.ctx.measureText(term).width)) + 26 * this.scale;
    rows.forEach(([term, runs]) => {
      this.text(term, this.frame.left, this.baseline(), { weight: 700 });
      this.flow(this.tokens(runs), this.frame.left + termWidth, this.width - termWidth, { indent: 0, justify: false });
      this.y += 4 * this.scale;
    });
  }

  image(image: CanvasImageSource, aspect: number, opacity = 1) {
    const height = this.width / aspect;
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.drawImage(image, this.frame.left, this.y, this.width, height);
    this.ctx.restore();
    this.y += height + 14 * this.scale;
  }

  rule(x1: number, x2: number, y: number, width = 2.2) {
    this.ctx.fillStyle = PRINT_INK.black;
    this.ctx.fillRect(x1, y - width / 2, x2 - x1, width);
  }

  text(content: string, x: number, y: number, style: TextStyle, align: CanvasTextAlign = 'left') {
    this.ctx.font = this.font(style);
    this.ctx.fillStyle = style.color ?? PRINT_INK.black;
    this.ctx.textAlign = align;
    this.ctx.fillText(content, x + (this.random() - 0.5) * 0.6, y + (this.random() - 0.5) * 0.8);
    this.ctx.textAlign = 'left';
    return this.ctx.measureText(content).width;
  }

  letterSpaced(content: string, centerX: number, y: number, style: TextStyle, spacing = 0.05) {
    this.ctx.font = this.font(style);
    const size = (style.size ?? BODY.size) * this.scale;
    const widths = [...content].map((char) => this.ctx.measureText(char).width + size * spacing);
    let x = centerX - (widths.reduce((sum, w) => sum + w, 0) - size * spacing) / 2;
    [...content].forEach((char, i) => {
      this.text(char, x, y, style);
      x += widths[i];
    });
  }

  baseline() {
    return this.y + this.bodySize * 0.92;
  }

  private font(style: TextStyle) {
    return fontOf({ ...style, size: (style.size ?? BODY.size) * this.scale });
  }

  private measure(text: string) {
    this.ctx.font = this.font({});
    return this.ctx.measureText(text).width;
  }

  private tokens(runs: Run | Run[]): Token[] {
    const list = Array.isArray(runs) ? runs : [runs];
    return list.flatMap((run): Token[] => {
      if (typeof run !== 'string') {
        this.ctx.font = this.font({ size: BODY.size * 0.8 });
        const width = this.ctx.measureText(run.key).width + KEY_PADDING * 2 * this.scale;
        return [{ text: run.key, key: true, width }];
      }
      return run
        .split(/\s+/)
        .filter(Boolean)
        .map((text) => ({ text, key: false, width: this.measure(text) }));
    });
  }

  private split(token: Token, room: number): [Token, Token] | null {
    if (token.key) return null;
    const point = breakPoints(token.text)
      .reverse()
      .find((at) => this.measure(`${token.text.slice(0, at)}-`) <= room);
    if (point === undefined) return null;
    const head = `${token.text.slice(0, point)}-`;
    const tail = token.text.slice(point);
    return [
      { text: head, key: false, width: this.measure(head) },
      { text: tail, key: false, width: this.measure(tail) },
    ];
  }

  private breakLines(tokens: Token[], width: number, indent: number) {
    const space = this.measure(' ');
    const lines: Token[][] = [[]];
    const queue = [...tokens];
    let used = indent;
    while (queue.length) {
      const token = queue.shift() as Token;
      const line = lines[lines.length - 1];
      const gap = line.length ? space : 0;
      if (!line.length || used + gap + token.width <= width) {
        line.push(token);
        used += gap + token.width;
      } else {
        const parts = this.split(token, width - used - gap);
        if (parts) {
          line.push(parts[0]);
          queue.unshift(parts[1]);
        } else queue.unshift(token);
        lines.push([]);
        used = 0;
      }
    }
    return { lines: lines.filter((line) => line.length), space };
  }

  private flow(tokens: Token[], left: number, width: number, { indent, justify }: FlowOptions) {
    const { lines, space } = this.breakLines(tokens, width, indent);
    lines.forEach((line, index) => {
      const start = left + (index === 0 ? indent : 0);
      const natural = line.reduce((sum, token) => sum + token.width, 0);
      const stretched = line.length > 1 ? (left + width - start - natural) / (line.length - 1) : space;
      const last = index === lines.length - 1;
      const gap = justify && !last && stretched <= space * MAX_STRETCH ? stretched : space;
      let x = start;
      line.forEach((token) => {
        if (token.key) this.key(token, x);
        else this.text(token.text, x, this.baseline(), {});
        x += token.width + gap;
      });
      this.y += this.bodySize * BODY.lineHeight;
    });
  }

  private key(token: Token, x: number) {
    const top = this.y + this.bodySize * 0.12;
    const height = this.bodySize * 1.02;
    this.ctx.strokeStyle = PRINT_INK.black;
    this.ctx.lineWidth = 2.6 * this.scale;
    this.ctx.beginPath();
    this.ctx.roundRect(x, top, token.width, height, 9 * this.scale);
    this.ctx.stroke();
    this.text(token.text, x + token.width / 2, top + height * 0.74, { size: BODY.size * 0.8 }, 'center');
  }
}
