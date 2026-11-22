import type { GameMode } from '../../game/config';
import type { Run } from '../../render/paper/typesetter';
import type { Language } from '../i18n';

type Legend = [string, Run[]][];

export interface BookletText {
  modes: Record<GameMode, string>;
  labels: {
    cover: string;
    welcome: string;
    controls: string;
    certificate: string;
    records: string;
    warranty: string;
    coupon: string;
  };
  keyboardHint(mode: string): Run[];
  welcome: { greeting: string; intro: string; rulesHeading: string; rules: string[] };
  controls: { heading: string; keyboard: Legend; touch: Legend; setting: string };
  certificate: {
    heading: string;
    blankNote: string;
    score: string;
    record: string;
    date: string;
    passed(mode: string): string;
    newRecord: string;
    inspector: string;
    seal: string;
    stamp(mode: string): string;
  };
  records: { heading: string; game(mode: string): string; note: string };
  warranty: { heading: string; paragraphs: string[] };
  coupon: {
    heading: string;
    subtitle: string;
    entries: [string, string][];
    approved: string;
    chief: string;
    stamp: string;
    cutLine: string;
  };
}

const RU: BookletText = {
  modes: { A: 'А', B: 'Б' },
  labels: {
    cover: 'Обложка: игра «Электроника» с часами-будильником.',
    welcome: 'Дорогой друг! Правила игры.',
    controls: 'Управление: Q, A, P, L или стрелки, 1 и 2 — игры, T — часы.',
    certificate: 'Свидетельство о приёмке.',
    records: 'Таблица рекордов.',
    warranty: 'Гарантийные обязательства.',
    coupon: 'Гарантийный талон на ремонт.',
  },
  keyboardHint: (mode) => [{ key: 'Enter' }, `— игра ${mode},`, { key: 'Esc' }, '— убрать,', { key: 'H' }, '— вернуть'],
  welcome: {
    greeting: 'Дорогой друг!',
    intro:
      'Перед тобой «Электроника ИМ-02» — та самая игра «Ну, погоди!». Куры несутся всё быстрее, а Волку нужно поймать в корзину каждое яйцо. Соперник у тебя серьёзный — микропроцессор.',
    rulesHeading: '1. Правила игры',
    rules: [
      'Поймал яйцо — очко.',
      'Яйцо разбилось — штраф, а если в окошке был Заяц — полштрафа.',
      'Три штрафа — игра окончена.',
      'На 200 и 500 очках штрафы снимаются.',
      '«Игра А» — три желоба из четырёх, «Игра Б» быстрее и на все четыре.',
    ],
  },
  controls: {
    heading: '2. Управление',
    keyboard: [
      ['1, 2', ['Волк слева —', { key: 'Q' }, { key: 'A' }, { key: '←' }, { key: '↓' }]],
      ['3, 4', ['Волк справа —', { key: 'P' }, { key: 'L' }, { key: '↑' }, { key: '→' }]],
      ['5, 6', ['Игра А и игра Б —', { key: '1' }, { key: '2' }]],
      ['7', ['Часы —', { key: 'T' }]],
      ['8', ['Будильник —', { key: '8' }]],
      ['9', ['Установка времени —', { key: '9' }]],
    ],
    touch: [
      ['1–4', ['Волк: жми большие кнопки по бокам']],
      ['5–7', ['Игра А, игра Б и часы']],
      ['8, 9', ['Будильник и установка времени']],
    ],
    setting: 'При установке левые кнопки листают часы, правые — минуты, «Время» — пуск.',
  },
  certificate: {
    heading: '3. Свидетельство о приёмке',
    blankNote: 'Заполняется представителем ОТК после окончания игры.',
    score: 'Набрано очков',
    record: 'Рекорд',
    date: 'Дата',
    passed: (mode) =>
      `Волк в режиме «Игра\u00a0${mode}» прошёл приёмочные испытания, получил три штрафа и признан годным для повторной эксплуатации.`,
    newRecord: 'новый!',
    inspector: 'Представитель ОТК',
    seal: 'М. П.',
    stamp: (mode) => `ИГРА ${mode}`,
  },
  records: {
    heading: '4. Таблица рекордов',
    game: (mode) => `Игра ${mode}`,
    note: 'Рекорд вписывается владельцем шариковой ручкой. Волк отдышался и снова готов к работе.',
  },
  warranty: {
    heading: '5. Гарантийные обязательства',
    paragraphs: [
      'Предприятие-изготовитель гарантирует соответствие игры техническому описанию при соблюдении владельцем правил пользования, изложенных в настоящем руководстве.',
      'Гарантийный срок эксплуатации игры «Ну, погоди!» — 12 месяцев со дня первого включения.',
      'В течение гарантийного срока владелец имеет право на бесплатный ремонт по предъявлении гарантийного талона. За каждый ремонт вырезается отрывной талон.',
      'Гарантия не распространяется на элементы питания и разбитые яйца. По мере выхода из строя их заменяет потребитель.',
      'Без гарантийного талона и при нарушении сохранности пломбы претензии к качеству работы не принимаются.',
    ],
  },
  coupon: {
    heading: 'Гарантийный талон',
    subtitle: 'на ремонт игры «Ну, погоди!»',
    entries: [
      ['Владелец и его адрес', 'Волк, лес, опушка'],
      ['Выполнены работы по устранению неисправностей', 'заменено яйцо'],
      ['Механик ателье', 'Заяц'],
    ],
    approved: 'Утверждаю',
    chief: 'Зав. ателье',
    stamp: 'БТК 08-4',
    cutLine: 'ЛИНИЯ ОТРЕЗА',
  },
};

const EN: BookletText = {
  modes: { A: 'A', B: 'B' },
  labels: {
    cover: 'Cover: the «Elektronika» game with alarm clock.',
    welcome: 'Dear friend! Rules of the game.',
    controls: 'Controls: Q, A, P, L or the arrows, 1 and 2 start a game, T shows the clock.',
    certificate: 'Certificate of acceptance.',
    records: 'Table of records.',
    warranty: 'Warranty obligations.',
    coupon: 'Warranty repair coupon.',
  },
  keyboardHint: (mode) => [{ key: 'Enter' }, `— game ${mode},`, { key: 'Esc' }, '— close,', { key: 'H' }, '— reopen'],
  welcome: {
    greeting: 'Dear friend!',
    intro:
      'Before you is the «Elektronika IM-02», the very same «Nu, Pogodi!» game. The hens lay their eggs ever faster, and the Wolf must catch every single one in his basket. Your opponent is a serious one: a microprocessor.',
    rulesHeading: '1. Rules of the game',
    rules: [
      'An egg caught earns one point.',
      'An egg broken earns a penalty. If the Hare was in his window, only half a penalty.',
      'Three penalties and the game is over.',
      'At 200 and 500 points all penalties are lifted.',
      '«Game A» uses three chutes of four. «Game B» is faster and uses all four.',
    ],
  },
  controls: {
    heading: '2. Controls',
    keyboard: [
      ['1, 2', ['Wolf on the left —', { key: 'Q' }, { key: 'A' }, { key: '←' }, { key: '↓' }]],
      ['3, 4', ['Wolf on the right —', { key: 'P' }, { key: 'L' }, { key: '↑' }, { key: '→' }]],
      ['5, 6', ['Game A and game B —', { key: '1' }, { key: '2' }]],
      ['7', ['Clock —', { key: 'T' }]],
      ['8', ['Alarm —', { key: '8' }]],
      ['9', ['Setting the time —', { key: '9' }]],
    ],
    touch: [
      ['1–4', ['Wolf: press the big buttons on the sides']],
      ['5–7', ['Game A, game B and the clock']],
      ['8, 9', ['Alarm and setting the time']],
    ],
    setting:
      'When setting the time, the left buttons turn the hours, the right ones the minutes, and «Time» starts the clock.',
  },
  certificate: {
    heading: '3. Certificate of acceptance',
    blankNote: 'To be filled in by the quality control inspector at the end of the game.',
    score: 'Points scored',
    record: 'Record',
    date: 'Date',
    passed: (mode) =>
      `The Wolf, operating in «Game\u00a0${mode}» mode, has passed acceptance testing, received three penalties and is found fit for further service.`,
    newRecord: 'new!',
    inspector: 'QC inspector',
    seal: 'L. S.',
    stamp: (mode) => `GAME ${mode}`,
  },
  records: {
    heading: '4. Table of records',
    game: (mode) => `Game ${mode}`,
    note: 'The record is entered by the owner with a ballpoint pen. The Wolf has caught his breath and is ready for work again.',
  },
  warranty: {
    heading: '5. Warranty obligations',
    paragraphs: [
      'The manufacturer guarantees that the game conforms to its technical description, provided the owner observes the rules of use set out in this manual.',
      'The warranty period of the «Nu, Pogodi!» game is 12 months from the day it is first switched on.',
      'During the warranty period the owner is entitled to free repair upon presenting the warranty coupon. One tear-off coupon is cut out for each repair.',
      'The warranty does not cover batteries or broken eggs. As these wear out, they are replaced by the consumer.',
      'No claims as to the quality of operation are accepted without the warranty coupon or if the seal has been broken.',
    ],
  },
  coupon: {
    heading: 'Warranty coupon',
    subtitle: 'for repair of the «Nu, Pogodi!»',
    entries: [
      ['Owner and address', 'Wolf, the forest, the edge'],
      ['Repairs carried out to remedy faults', 'one egg replaced'],
      ['Workshop mechanic', 'Hare'],
    ],
    approved: 'Approved',
    chief: 'Workshop chief',
    stamp: 'QCD 08-4',
    cutLine: 'TEAR-OFF LINE',
  },
};

export const BOOKLET_TEXT: Record<Language, BookletText> = { ru: RU, en: EN };
