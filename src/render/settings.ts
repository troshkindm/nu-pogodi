export type RenderStage = 'surface' | 'camera' | 'maps' | 'lcd';
export type RenderGroup = 'light' | 'material' | 'screen' | 'camera';

interface FeatureInfo {
  stage: RenderStage;
  group: RenderGroup;
  define?: string;
}

export const RENDER_FEATURES = {
  shadows: { stage: 'surface', group: 'light', define: 'SHADOWS' },
  ambientOcclusion: { stage: 'surface', group: 'light', define: 'AMBIENT_OCCLUSION' },
  capReflections: { stage: 'surface', group: 'light', define: 'CAP_REFLECTIONS' },
  glints: { stage: 'surface', group: 'light', define: 'GLINTS' },
  plasticGrain: { stage: 'surface', group: 'material', define: 'PLASTIC_GRAIN' },
  edgeWobble: { stage: 'surface', group: 'material', define: 'EDGE_WOBBLE' },
  wear: { stage: 'surface', group: 'material', define: 'WEAR' },
  lcdShadows: { stage: 'surface', group: 'screen', define: 'LCD_SHADOWS' },
  lcdInertia: { stage: 'lcd', group: 'screen' },
  lensDistortion: { stage: 'camera', group: 'camera', define: 'LENS_DISTORTION' },
  lensSoftness: { stage: 'camera', group: 'camera', define: 'LENS_SOFTNESS' },
  chromaticAberration: { stage: 'camera', group: 'camera', define: 'CHROMATIC_ABERRATION' },
  bloom: { stage: 'camera', group: 'camera', define: 'BLOOM' },
  sensorNoise: { stage: 'camera', group: 'camera', define: 'SENSOR_NOISE' },
  jpegBlocks: { stage: 'camera', group: 'camera', define: 'JPEG_BLOCKS' },
} as const satisfies Record<string, FeatureInfo>;

export type RenderFeature = keyof typeof RENDER_FEATURES;
export type RenderSettings = Record<RenderFeature, boolean>;

export const FEATURES = Object.keys(RENDER_FEATURES) as RenderFeature[];
const allFeatures = (enabled: (feature: RenderFeature) => boolean): RenderSettings =>
  Object.fromEntries(FEATURES.map((feature) => [feature, enabled(feature)])) as RenderSettings;

export const RENDER_PRESETS = {
  photo: allFeatures(() => true),
  clean: allFeatures((feature) => RENDER_FEATURES[feature].stage !== 'camera'),
  fast: allFeatures((feature) => !['shadows', 'ambientOcclusion', 'wear', 'lensSoftness', 'bloom'].includes(feature)),
} satisfies Record<string, RenderSettings>;

export type RenderPreset = keyof typeof RENDER_PRESETS;

export const RENDER_GROUPS: readonly RenderGroup[] = ['light', 'material', 'screen', 'camera'];

export const presetOf = (settings: RenderSettings): RenderPreset | null =>
  (Object.keys(RENDER_PRESETS) as RenderPreset[]).find((preset) =>
    FEATURES.every((feature) => RENDER_PRESETS[preset][feature] === settings[feature]),
  ) ?? null;

export function definesFor(settings: RenderSettings, stage: RenderStage): string[] {
  return FEATURES.filter((feature) => settings[feature] && RENDER_FEATURES[feature].stage === stage).flatMap(
    (feature) => {
      const info: FeatureInfo = RENDER_FEATURES[feature];
      return info.define ? [info.define] : [];
    },
  );
}
