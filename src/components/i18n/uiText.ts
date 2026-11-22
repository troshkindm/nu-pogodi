import type { RenderFeature, RenderGroup, RenderPreset } from '../../render/settings';
import type { LightMode } from '../App/preferences';

import type { Language } from './language';

export interface UiText {
  pageTitle: string;
  author: string;
  loading: string;
  rotate: { caption: string; note: string };
  console: { round: readonly string[]; pill: readonly string[]; hole: readonly string[] };
  toolbar: {
    soundOff: string;
    soundOn: string;
    tiltLight: string;
    pointerLight: string;
    manual: string;
    settings: string;
    fullscreen: string;
    exitFullscreen: string;
    otherLanguage: string;
  };
  settings: {
    title: string;
    sound: string;
    light: string;
    lightModes: Record<LightMode, string>;
    size: string;
    auto: string;
    picture: string;
    customPicture: string;
    presets: Record<RenderPreset, string>;
    stages: string;
    groups: Record<RenderGroup, string>;
    features: Record<RenderFeature, string>;
  };
  booklet: {
    title: string;
    open: string;
    openHint: string;
    previous: string;
    next: string;
    games: readonly [string, string];
  };
}

const RU: UiText = {
  pageTitle: 'Электроника ИМ-02 «Ну, погоди!»',
  author: 'Дмитрий Трошкин',
  loading: 'Загрузка',
  rotate: { caption: 'Поверни телефон', note: '«Электроника» держат горизонтально' },
  console: {
    round: ['Волк влево вверх', 'Волк влево вниз', 'Волк вправо вверх', 'Волк вправо вниз'],
    pill: ['Игра А', 'Игра Б', 'Время'],
    hole: ['Будильник', 'Установка времени'],
  },
  toolbar: {
    soundOff: 'Выключить звук (M)',
    soundOn: 'Включить звук (M)',
    tiltLight: 'Свет от наклона телефона',
    pointerLight: 'Свет за мышью',
    manual: 'Руководство (H)',
    settings: 'Настройки',
    fullscreen: 'Во весь экран',
    exitFullscreen: 'Выйти из полноэкранного режима',
    otherLanguage: 'English',
  },
  settings: {
    title: 'Настройки',
    sound: 'Звук',
    light: 'Свет',
    lightModes: { static: 'Статичный', pointer: 'За мышью', gyro: 'Гироскоп' },
    size: 'Размер',
    auto: 'Автоматически',
    picture: 'Картинка',
    customPicture: 'Картинка: своя',
    presets: { photo: 'Фото', clean: 'Чистая', fast: 'Быстрая' },
    stages: 'Этапы обработки',
    groups: { light: 'Свет', material: 'Материал', screen: 'Экран', camera: 'Камера' },
    features: {
      shadows: 'Тени',
      ambientOcclusion: 'Затенение в углах',
      capReflections: 'Отражения в кнопках',
      glints: 'Искры в пластике',
      plasticGrain: 'Фактура пластика',
      edgeWobble: 'Неровные кромки и печать',
      wear: 'Износ, грязь, царапины',
      lcdShadows: 'Тени сегментов',
      lcdInertia: 'Инерция жидких кристаллов',
      lensDistortion: 'Искажения объектива',
      lensSoftness: 'Мягкость и резкость',
      chromaticAberration: 'Хроматическая аберрация',
      bloom: 'Ореол',
      sensorNoise: 'Шум матрицы',
      jpegBlocks: 'Блоки JPEG',
    },
  },
  booklet: {
    title: 'Руководство по эксплуатации',
    open: 'Открыть руководство',
    openHint: 'Нажми на обложку',
    previous: 'Предыдущая страница',
    next: 'Следующая страница',
    games: ['Игра А', 'Игра Б'],
  },
};

const EN: UiText = {
  pageTitle: 'Elektronika IM-02 «Nu, Pogodi!»',
  author: 'Dmitry Troshkin',
  loading: 'Loading',
  rotate: { caption: 'Turn your phone', note: 'An «Elektronika» is held sideways' },
  console: {
    round: ['Wolf up left', 'Wolf down left', 'Wolf up right', 'Wolf down right'],
    pill: ['Game A', 'Game B', 'Time'],
    hole: ['Alarm', 'Set time'],
  },
  toolbar: {
    soundOff: 'Mute (M)',
    soundOn: 'Unmute (M)',
    tiltLight: 'Light follows phone tilt',
    pointerLight: 'Light follows the mouse',
    manual: 'Manual (H)',
    settings: 'Settings',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    otherLanguage: 'Русский',
  },
  settings: {
    title: 'Settings',
    sound: 'Sound',
    light: 'Light',
    lightModes: { static: 'Fixed', pointer: 'Mouse', gyro: 'Gyroscope' },
    size: 'Size',
    auto: 'Automatic',
    picture: 'Picture',
    customPicture: 'Picture: custom',
    presets: { photo: 'Photo', clean: 'Clean', fast: 'Fast' },
    stages: 'Processing stages',
    groups: { light: 'Light', material: 'Material', screen: 'Screen', camera: 'Camera' },
    features: {
      shadows: 'Shadows',
      ambientOcclusion: 'Ambient occlusion',
      capReflections: 'Button reflections',
      glints: 'Plastic sparkles',
      plasticGrain: 'Plastic grain',
      edgeWobble: 'Uneven edges and print',
      wear: 'Wear, dirt, scratches',
      lcdShadows: 'Segment shadows',
      lcdInertia: 'Liquid crystal lag',
      lensDistortion: 'Lens distortion',
      lensSoftness: 'Softness and sharpening',
      chromaticAberration: 'Chromatic aberration',
      bloom: 'Glow',
      sensorNoise: 'Sensor noise',
      jpegBlocks: 'JPEG blocks',
    },
  },
  booklet: {
    title: 'Operating manual',
    open: 'Open the manual',
    openHint: 'Tap the cover',
    previous: 'Previous page',
    next: 'Next page',
    games: ['Game A', 'Game B'],
  },
};

export const UI_TEXT: Record<Language, UiText> = { ru: RU, en: EN };
