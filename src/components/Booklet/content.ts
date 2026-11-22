import type { GameMode } from '../../game/config';
import { seededRandom } from '../../game/random';
import type { Records } from '../../game/records';
import { createLayers, handwriting, stamp, underline } from '../../render/paper/inks';
import type { PageLayers } from '../../render/paper/inks';
import type { Spine } from '../../render/paper/renderer';
import { PAGE, PRINT_INK, Typesetter, fontOf } from '../../render/paper/typesetter';
import type { Frame } from '../../render/paper/typesetter';
import type { Language } from '../i18n';

import { drawCover } from './cover';
import { CONSOLE_DIAGRAM_ASPECT } from './diagram';
import { BOOKLET_TEXT } from './text';
import type { BookletText } from './text';

export interface GameResult {
  mode: GameMode;
  score: number;
  isRecord: boolean;
  date: Date;
}

export interface ContentData {
  result: GameResult | null;
  records: Records;
  touch: boolean;
  diagram: CanvasImageSource;
  language: Language;
}

interface Context extends ContentData {
  text: BookletText;
}

export interface SheetContent {
  key: string;
  label: string;
  draw(layers: PageLayers): void;
}

export const KEYS_TOP = 1050;
export const CORNER = 74;
const MARGIN = { outer: 84, spine: 104, top: 88, bottom: 96 };

const frameFor = (spine: Spine): Frame => ({
  left: spine === 'left' ? MARGIN.spine : MARGIN.outer,
  right: PAGE.width - (spine === 'left' ? MARGIN.outer : MARGIN.spine),
  top: MARGIN.top,
  bottom: PAGE.height - MARGIN.bottom,
});

const spineOf = (folio: number): Spine => (folio % 2 === 0 ? 'left' : 'right');

const FIT_SCALES = [1.3, 1.24, 1.18, 1.12, 1.06, 1, 0.94, 0.88, 0.82];
const TEXT_LIMIT = PAGE.height - MARGIN.bottom;
const KEYS_LIMIT = KEYS_TOP - 24;

type Body = (t: Typesetter, layers: PageLayers) => void;

const printFolio = (t: Typesetter, folio: number) => {
  const spine = spineOf(folio);
  const x = spine === 'left' ? PAGE.width - MARGIN.outer : MARGIN.outer;
  t.text(String(folio), x, PAGE.height - 52, { size: 34 / t.scale }, spine === 'left' ? 'right' : 'left');
};

const fittingScale = (folio: number, limit: number, body: Body) => {
  const probe = createLayers(0.02);
  return (
    FIT_SCALES.find((scale) => {
      const t = new Typesetter(probe.print, frameFor(spineOf(folio)), seededRandom(1), scale);
      body(t, probe);
      return t.y <= limit;
    }) ?? FIT_SCALES[FIT_SCALES.length - 1]
  );
};

const compose = (layers: PageLayers, folio: number, limit: number, body: Body) => {
  const scale = fittingScale(folio, limit, body);
  const t = new Typesetter(layers.print, frameFor(spineOf(folio)), seededRandom(folio * 101), scale);
  printFolio(t, folio);
  body(t, layers);
  return t;
};

const twoDigits = (value: number) => String(value).padStart(2, '0');
const stampDate = (date: Date) =>
  `${twoDigits(date.getDate())}.${twoDigits(date.getMonth() + 1)}.${twoDigits(date.getFullYear() % 100)}`;
const tiltFor = (seed: number, range: number) => (seededRandom(seed + 11)() * 2 - 1) * range;

const keyboardHint = (page: Typesetter, text: BookletText, preferred: GameMode) => {
  const t = new Typesetter(page.ctx, page.frame, seededRandom(7));
  t.y = KEYS_TOP + 110;
  t.paragraph(text.keyboardHint(text.modes[preferred]), { indent: 0, justify: false });
};

const welcome = ({ text, language }: Context): SheetContent => ({
  key: `welcome-${language}`,
  label: text.labels.welcome,
  draw(layers) {
    compose(layers, 1, TEXT_LIMIT, (t) => {
      t.heading(text.welcome.greeting);
      t.paragraph(text.welcome.intro);
      t.skip(14);
      t.heading(text.welcome.rulesHeading);
      t.list(text.welcome.rules.map((rule) => [rule]));
    });
  },
});

const controls = ({ touch, diagram, text, language }: Context): SheetContent => ({
  key: `controls-${touch}-${language}`,
  label: text.labels.controls,
  draw(layers) {
    const t = compose(layers, 2, KEYS_LIMIT, (page) => {
      page.heading(text.controls.heading);
      page.image(diagram, CONSOLE_DIAGRAM_ASPECT, 0.95);
      page.legend(touch ? text.controls.touch : text.controls.keyboard);
      page.skip(10);
      page.paragraph(text.controls.setting, { indent: 0, justify: false });
    });
    if (!touch) keyboardHint(t, text, 'A');
  },
});

const field = (t: Typesetter, label: string, mark: (x: number, y: number) => void) => {
  const baseline = t.baseline() + 18;
  t.text(label, t.frame.left, baseline, {});
  mark(t.frame.left + 300 * t.scale, baseline);
  t.skip(96);
};

const blank = (t: Typesetter) => (x: number, y: number) => t.rule(x, t.frame.right, y + 6);

const certificate =
  ({ result, records, text: { certificate: words, modes } }: Context) =>
  (t: Typesetter, layers: PageLayers) => {
    t.heading(words.heading);
    if (!result) {
      t.paragraph(words.blankNote);
      t.skip(20);
      [words.score, words.record, words.date].forEach((label) => field(t, label, blank(t)));
    } else {
      const seed = result.score + result.date.getDate();
      t.paragraph(words.passed(modes[result.mode]));
      t.skip(20);
      field(t, words.score, (x, y) =>
        stamp(layers.stamp, {
          text: String(result.score).padStart(3, '0'),
          x: x + 110,
          y: y - 16,
          height: 92,
          tilt: tiltFor(seed, 4),
          seed,
        }),
      );
      field(t, words.record, (x, y) => {
        const width = handwriting(layers.pen, { text: String(records[result.mode]), x, y: y + 4, size: 78, seed });
        if (result.isRecord) {
          handwriting(layers.pen, {
            text: words.newRecord,
            x: x + width + 30,
            y: y - 4,
            size: 54,
            tilt: -7,
            seed: seed + 1,
          });
          underline(layers.pen, x + width + 30, x + width + 160, y + 10, seed);
        }
      });
      field(t, words.date, (x, y) =>
        stamp(layers.stamp, {
          text: stampDate(result.date),
          x: x + 120,
          y: y - 14,
          height: 60,
          tilt: tiltFor(seed, 3),
        }),
      );
    }
    const signatureY = t.baseline() + 30;
    const inspectorWidth = t.text(words.inspector, t.frame.left, signatureY, {});
    t.rule(t.frame.left + Math.max(360, inspectorWidth + 24), t.frame.right, signatureY + 6);
    t.text(words.seal, t.frame.left + 40, signatureY + 120, {});
    if (result)
      stamp(layers.stamp, {
        text: words.stamp(modes[result.mode]),
        x: t.frame.left + 420,
        y: signatureY + 104,
        height: 96,
        tilt: tiltFor(result.score + 3, 5),
        framed: true,
        seed: result.score,
      });
  };

const recordTable =
  ({ records, text: { records: words, modes } }: Context) =>
  (t: Typesetter, layers: PageLayers) => {
    t.heading(words.heading);
    t.skip(10);
    (['A', 'B'] as const).forEach((mode, index) => {
      const baseline = t.baseline() + 10;
      const labelWidth = t.text(words.game(modes[mode]), t.frame.left + 20, baseline, {});
      layers.print.font = fontOf({});
      layers.print.fillStyle = PRINT_INK.black;
      for (let x = t.frame.left + 40 + labelWidth; x < t.frame.right - 170; x += 18)
        layers.print.fillRect(x, baseline - 2, 5, 5);
      handwriting(layers.pen, {
        text: records[mode] ? String(records[mode]) : '—',
        x: t.frame.right - 70,
        y: baseline + 6,
        size: 76,
        seed: index + 3,
        align: 'center',
      });
      t.skip(96);
    });
    t.skip(16);
    t.paragraph(words.note);
  };

const warranty = ({ text, language }: Context): SheetContent => ({
  key: `warranty-${language}`,
  label: text.labels.warranty,
  draw(layers) {
    compose(layers, 5, TEXT_LIMIT, (t) => {
      t.heading(text.warranty.heading);
      text.warranty.paragraphs.forEach((paragraph) => t.paragraph(paragraph));
    });
  },
});

const couponEntry = (t: Typesetter, layers: PageLayers, label: string, value: string, seed: number) => {
  t.paragraph(label, { indent: 0, justify: false });
  const lineY = t.y + 52 * t.scale;
  t.rule(t.frame.left, t.frame.right, lineY);
  handwriting(layers.pen, { text: value, x: t.frame.left + 30, y: lineY - 12, size: 58 * t.scale, seed, tilt: -2 });
  t.y = lineY + 40 * t.scale;
};

const cutLine = (layers: PageLayers, label: string) => {
  const ctx = layers.print;
  ctx.save();
  ctx.fillStyle = PRINT_INK.black;
  for (let y = 90; y < PAGE.height - 90; y += 22) ctx.fillRect(62, y, 2.6, 11);
  ctx.translate(44, PAGE.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = fontOf({ size: 28 });
  ctx.textAlign = 'center';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '26px';
  ctx.fillText(label, 0, 0);
  ctx.restore();
};

const couponForm = (t: Typesetter, layers: PageLayers, words: BookletText['coupon']) => {
  t.heading(words.heading);
  t.text(words.subtitle, (t.frame.left + t.frame.right) / 2, t.baseline(), {}, 'center');
  t.skip(70);
  words.entries.forEach(([label, value], index) => couponEntry(t, layers, label, value, index + 1));
  stamp(layers.stamp, { text: '12.04.84', x: t.frame.right - 160, y: t.y - 120, height: 58, tilt: -4, seed: 5 });
  const approveY = t.baseline() + 16;
  t.text(words.approved, t.frame.left, approveY, {});
  const chiefWidth = t.text(words.chief, t.frame.left, approveY + 64, {});
  t.rule(t.frame.left + Math.max(230, chiefWidth + 24), t.frame.right, approveY + 70);
  stamp(layers.stamp, {
    text: words.stamp,
    x: t.frame.left + Math.max(470, chiefWidth + 150),
    y: approveY + 40,
    height: 92,
    tilt: 3,
    framed: true,
    seed: 6,
  });
};

const coupon = ({ text, language }: Context): SheetContent => ({
  key: `coupon-${language}`,
  label: text.labels.coupon,
  draw(layers) {
    compose(layers, 6, TEXT_LIMIT, (t) => {
      couponForm(t, layers, text.coupon);
    });
    cutLine(layers, text.coupon.cutLine);
  },
});

export function sheetContents(data: ContentData): SheetContent[] {
  const context: Context = { ...data, text: BOOKLET_TEXT[data.language] };
  const { text, language } = context;
  const resultKey = data.result ? `${data.result.mode}-${data.result.score}-${data.result.date.getTime()}` : 'none';
  return [
    { key: 'cover', label: text.labels.cover, draw: drawCover },
    welcome(context),
    controls(context),
    {
      key: `certificate-${resultKey}-${data.records.A}-${data.records.B}-${language}`,
      label: text.labels.certificate,
      draw: (layers) => compose(layers, 3, TEXT_LIMIT, certificate(context)),
    },
    {
      key: `records-${data.records.A}-${data.records.B}-${data.touch}-${data.result?.mode ?? 'A'}-${language}`,
      label: text.labels.records,
      draw: (layers) => {
        const t = compose(layers, 4, KEYS_LIMIT, recordTable(context));
        if (!data.touch) keyboardHint(t, text, data.result?.mode ?? 'A');
      },
    },
    warranty(context),
    coupon(context),
  ];
}
