import type { GameMode } from '../../game/config';
import { seededRandom } from '../../game/random';
import type { Records } from '../../game/records';
import { createLayers, handwriting, stamp, underline } from '../../render/paper/inks';
import type { PageLayers } from '../../render/paper/inks';
import type { Spine } from '../../render/paper/renderer';
import { PAGE, PRINT_INK, Typesetter, fontOf } from '../../render/paper/typesetter';
import type { Frame, Run } from '../../render/paper/typesetter';

import { drawCover } from './cover';
import { CONSOLE_DIAGRAM_ASPECT } from './diagram';

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
}

export interface SheetContent {
  key: string;
  label: string;
  draw(layers: PageLayers): void;
}

export const KEYS_TOP = 1050;
export const CORNER = 74;
const MODE_NAMES: Record<GameMode, string> = { A: 'А', B: 'Б' };
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

const keyboardHint = (page: Typesetter, preferred: GameMode) => {
  const t = new Typesetter(page.ctx, page.frame, seededRandom(7));
  t.y = KEYS_TOP + 110;
  t.paragraph(
    [{ key: 'Enter' }, `— игра ${MODE_NAMES[preferred]},`, { key: 'Esc' }, '— убрать,', { key: 'H' }, '— вернуть'],
    { indent: 0, justify: false },
  );
};

const welcome = (): SheetContent => ({
  key: 'welcome',
  label: 'Дорогой друг! Правила игры.',
  draw(layers) {
    compose(layers, 1, TEXT_LIMIT, (t) => {
      t.heading('Дорогой друг!');
      t.paragraph(
        'Перед тобой «Электроника ИМ-02» — та самая игра «Ну, погоди!». Куры несутся всё быстрее, а Волку нужно поймать в корзину каждое яйцо. Соперник у тебя серьёзный — микропроцессор.',
      );
      t.skip(14);
      t.heading('1. Правила игры');
      t.list([
        ['Поймал яйцо — очко.'],
        ['Яйцо разбилось — штраф, а если в окошке был Заяц — полштрафа.'],
        ['Три штрафа — игра окончена.'],
        ['На 200 и 500 очках штрафы снимаются.'],
        ['«Игра А» — три желоба из четырёх, «Игра Б» быстрее и на все четыре.'],
      ]);
    });
  },
});

const KEYBOARD_LEGEND: [string, Run[]][] = [
  ['1, 2', ['Волк слева —', { key: 'Q' }, { key: 'A' }, { key: '←' }, { key: '↓' }]],
  ['3, 4', ['Волк справа —', { key: 'P' }, { key: 'L' }, { key: '↑' }, { key: '→' }]],
  ['5, 6', ['Игра А и игра Б —', { key: '1' }, { key: '2' }]],
  ['7', ['Часы —', { key: 'T' }]],
];
const TOUCH_LEGEND: [string, Run[]][] = [
  ['1–4', ['Волк: жми большие кнопки по бокам']],
  ['5–7', ['Игра А, игра Б и часы']],
];

const controls = ({ touch, diagram }: ContentData): SheetContent => ({
  key: `controls-${touch}`,
  label: 'Управление: Q, A, P, L или стрелки, 1 и 2 — игры, T — часы.',
  draw(layers) {
    const t = compose(layers, 2, KEYS_LIMIT, (page) => {
      page.heading('2. Управление');
      page.image(diagram, CONSOLE_DIAGRAM_ASPECT, 0.95);
      page.legend(touch ? TOUCH_LEGEND : KEYBOARD_LEGEND);
    });
    if (!touch) keyboardHint(t, 'A');
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
  ({ result, records }: ContentData) =>
  (t: Typesetter, layers: PageLayers) => {
    t.heading('3. Свидетельство о приёмке');
    if (!result) {
      t.paragraph('Заполняется представителем ОТК после окончания игры.');
      t.skip(20);
      ['Набрано очков', 'Рекорд', 'Дата'].forEach((label) => field(t, label, blank(t)));
    } else {
      const seed = result.score + result.date.getDate();
      t.paragraph(
        `Волк в режиме «Игра ${
          MODE_NAMES[result.mode]
        }» прошёл приёмочные испытания, получил три штрафа и признан годным для повторной эксплуатации.`,
      );
      t.skip(20);
      field(t, 'Набрано очков', (x, y) =>
        stamp(layers.stamp, {
          text: String(result.score).padStart(3, '0'),
          x: x + 110,
          y: y - 16,
          height: 92,
          tilt: tiltFor(seed, 4),
          seed,
        }),
      );
      field(t, 'Рекорд', (x, y) => {
        const width = handwriting(layers.pen, { text: String(records[result.mode]), x, y: y + 4, size: 78, seed });
        if (result.isRecord) {
          handwriting(layers.pen, { text: 'новый!', x: x + width + 30, y: y - 4, size: 54, tilt: -7, seed: seed + 1 });
          underline(layers.pen, x + width + 30, x + width + 160, y + 10, seed);
        }
      });
      field(t, 'Дата', (x, y) =>
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
    t.text('Представитель ОТК', t.frame.left, signatureY, {});
    t.rule(t.frame.left + 360, t.frame.right, signatureY + 6);
    t.text('М. П.', t.frame.left + 40, signatureY + 120, {});
    if (result)
      stamp(layers.stamp, {
        text: `ИГРА ${MODE_NAMES[result.mode]}`,
        x: t.frame.left + 420,
        y: signatureY + 104,
        height: 96,
        tilt: tiltFor(result.score + 3, 5),
        framed: true,
        seed: result.score,
      });
  };

const recordTable =
  ({ records }: ContentData) =>
  (t: Typesetter, layers: PageLayers) => {
    t.heading('4. Таблица рекордов');
    t.skip(10);
    (['A', 'B'] as const).forEach((mode, index) => {
      const baseline = t.baseline() + 10;
      const labelWidth = t.text(`Игра ${MODE_NAMES[mode]}`, t.frame.left + 20, baseline, {});
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
    t.paragraph('Рекорд вписывается владельцем шариковой ручкой. Волк отдышался и снова готов к работе.');
  };

const warranty = (): SheetContent => ({
  key: 'warranty',
  label: 'Гарантийные обязательства.',
  draw(layers) {
    compose(layers, 5, TEXT_LIMIT, (t) => {
      t.heading('5. Гарантийные обязательства');
      [
        'Предприятие-изготовитель гарантирует соответствие игры техническому описанию при соблюдении владельцем правил пользования, изложенных в настоящем руководстве.',
        'Гарантийный срок эксплуатации игры «Ну, погоди!» — 12 месяцев со дня первого включения.',
        'В течение гарантийного срока владелец имеет право на бесплатный ремонт по предъявлении гарантийного талона. За каждый ремонт вырезается отрывной талон.',
        'Гарантия не распространяется на элементы питания и разбитые яйца. По мере выхода из строя их заменяет потребитель.',
        'Без гарантийного талона и при нарушении сохранности пломбы претензии к качеству работы не принимаются.',
      ].forEach((text) => t.paragraph(text));
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

const cutLine = (layers: PageLayers) => {
  const ctx = layers.print;
  ctx.save();
  ctx.fillStyle = PRINT_INK.black;
  for (let y = 90; y < PAGE.height - 90; y += 22) ctx.fillRect(62, y, 2.6, 11);
  ctx.translate(44, PAGE.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = fontOf({ size: 28 });
  ctx.textAlign = 'center';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '26px';
  ctx.fillText('ЛИНИЯ ОТРЕЗА', 0, 0);
  ctx.restore();
};

const couponForm = (t: Typesetter, layers: PageLayers) => {
  t.heading('Гарантийный талон');
  t.text('на ремонт игры «Ну, погоди!»', (t.frame.left + t.frame.right) / 2, t.baseline(), {}, 'center');
  t.skip(70);
  couponEntry(t, layers, 'Владелец и его адрес', 'Волк, лес, опушка', 1);
  couponEntry(t, layers, 'Выполнены работы по устранению неисправностей', 'заменено яйцо', 2);
  couponEntry(t, layers, 'Механик ателье', 'Заяц', 3);
  stamp(layers.stamp, { text: '12.04.84', x: t.frame.right - 160, y: t.y - 120, height: 58, tilt: -4, seed: 5 });
  const approveY = t.baseline() + 16;
  t.text('Утверждаю', t.frame.left, approveY, {});
  t.text('Зав. ателье', t.frame.left, approveY + 64, {});
  t.rule(t.frame.left + 230, t.frame.right, approveY + 70);
  stamp(layers.stamp, {
    text: 'БТК 08-4',
    x: t.frame.left + 470,
    y: approveY + 40,
    height: 92,
    tilt: 3,
    framed: true,
    seed: 6,
  });
};

const coupon = (): SheetContent => ({
  key: 'coupon',
  label: 'Гарантийный талон на ремонт.',
  draw(layers) {
    compose(layers, 6, TEXT_LIMIT, (t) => {
      couponForm(t, layers);
    });
    cutLine(layers);
  },
});

export function sheetContents(data: ContentData): SheetContent[] {
  const resultKey = data.result ? `${data.result.mode}-${data.result.score}-${data.result.date.getTime()}` : 'none';
  return [
    { key: 'cover', label: 'Обложка: игра «Электроника» с часами-будильником.', draw: drawCover },
    welcome(),
    controls(data),
    {
      key: `certificate-${resultKey}-${data.records.A}-${data.records.B}`,
      label: 'Свидетельство о приёмке.',
      draw: (layers) => compose(layers, 3, TEXT_LIMIT, certificate(data)),
    },
    {
      key: `records-${data.records.A}-${data.records.B}-${data.touch}-${data.result?.mode ?? 'A'}`,
      label: 'Таблица рекордов.',
      draw: (layers) => {
        const t = compose(layers, 4, KEYS_LIMIT, recordTable(data));
        if (!data.touch) keyboardHint(t, data.result?.mode ?? 'A');
      },
    },
    warranty(),
    coupon(),
  ];
}
