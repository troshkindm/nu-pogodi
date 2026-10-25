export type RenderStage = 'surface' | 'camera' | 'maps' | 'lcd';
export type RenderGroup = 'light' | 'material' | 'screen' | 'camera';

interface FeatureInfo {
  stage: RenderStage;
  group: RenderGroup;
  label: string;
  define?: string;
}

export const RENDER_FEATURES = {
  shadows: { stage: 'surface', group: 'light', label: 'Тени', define: 'SHADOWS' },
  ambientOcclusion: { stage: 'surface', group: 'light', label: 'Затенение в углах', define: 'AMBIENT_OCCLUSION' },
  capReflections: { stage: 'surface', group: 'light', label: 'Отражения в кнопках', define: 'CAP_REFLECTIONS' },
  glints: { stage: 'surface', group: 'light', label: 'Искры в пластике', define: 'GLINTS' },
  plasticGrain: { stage: 'surface', group: 'material', label: 'Фактура пластика', define: 'PLASTIC_GRAIN' },
  edgeWobble: { stage: 'surface', group: 'material', label: 'Неровные кромки и печать', define: 'EDGE_WOBBLE' },
  wear: { stage: 'surface', group: 'material', label: 'Износ, грязь, царапины', define: 'WEAR' },
  lcdShadows: { stage: 'surface', group: 'screen', label: 'Тени сегментов', define: 'LCD_SHADOWS' },
  lcdInertia: { stage: 'lcd', group: 'screen', label: 'Инерция жидких кристаллов' },
  lensDistortion: { stage: 'camera', group: 'camera', label: 'Искажения объектива', define: 'LENS_DISTORTION' },
  lensSoftness: { stage: 'camera', group: 'camera', label: 'Мягкость и резкость', define: 'LENS_SOFTNESS' },
  chromaticAberration: {
    stage: 'camera',
    group: 'camera',
    label: 'Хроматическая аберрация',
    define: 'CHROMATIC_ABERRATION',
  },
  bloom: { stage: 'camera', group: 'camera', label: 'Ореол', define: 'BLOOM' },
  sensorNoise: { stage: 'camera', group: 'camera', label: 'Шум матрицы', define: 'SENSOR_NOISE' },
  jpegBlocks: { stage: 'camera', group: 'camera', label: 'Блоки JPEG', define: 'JPEG_BLOCKS' },
} as const satisfies Record<string, FeatureInfo>;

export type RenderFeature = keyof typeof RENDER_FEATURES;
export type RenderSettings = Record<RenderFeature, boolean>;

const FEATURES = Object.keys(RENDER_FEATURES) as RenderFeature[];
const allFeatures = (enabled: (feature: RenderFeature) => boolean): RenderSettings =>
  Object.fromEntries(FEATURES.map((feature) => [feature, enabled(feature)])) as RenderSettings;

export const RENDER_PRESETS = {
  photo: allFeatures(() => true),
  clean: allFeatures((feature) => RENDER_FEATURES[feature].stage !== 'camera'),
  fast: allFeatures((feature) => !['shadows', 'ambientOcclusion', 'wear', 'lensSoftness', 'bloom'].includes(feature)),
} satisfies Record<string, RenderSettings>;

export type RenderPreset = keyof typeof RENDER_PRESETS;

export function definesFor(settings: RenderSettings, stage: RenderStage): string[] {
  return FEATURES.filter((feature) => settings[feature] && RENDER_FEATURES[feature].stage === stage).flatMap(
    (feature) => {
      const info: FeatureInfo = RENDER_FEATURES[feature];
      return info.define ? [info.define] : [];
    },
  );
}
