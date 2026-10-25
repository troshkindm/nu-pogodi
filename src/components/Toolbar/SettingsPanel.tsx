import type { ReactNode } from 'react';

import { FEATURES, RENDER_FEATURES, RENDER_GROUPS, RENDER_PRESETS, presetOf } from '../../render/settings';
import type { RenderFeature, RenderGroup, RenderPreset } from '../../render/settings';
import { SCENE_SCALE } from '../App/preferences';
import type { LightMode, Preferences } from '../App/preferences';
import { CreditLine } from '../Credit';

import style from './Toolbar.module.less';

const PRESET_LABELS: Record<RenderPreset, string> = { photo: 'Фото', clean: 'Чистая', fast: 'Быстрая' };
const LIGHT_LABELS: Record<LightMode, string> = { static: 'Статичный', pointer: 'За мышью', gyro: 'Гироскоп' };
const GROUPS = Object.keys(RENDER_GROUPS) as RenderGroup[];

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange(value: T): void;
}

const Segmented = <T extends string>({ label, options, value, onChange }: SegmentedProps<T>) => (
  <div className={style.segmented} role="radiogroup" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        className={option.value === value ? style.selected : undefined}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const Switch = ({ label, checked, onChange }: { label: string; checked: boolean; onChange(next: boolean): void }) => (
  <label className={style.switch}>
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className={style.track} aria-hidden="true" />
  </label>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className={style.section}>
    <h3>{title}</h3>
    {children}
  </section>
);

interface ScaleSliderProps {
  value: number;
  onChange(value: number): void;
}

const ScaleSlider = ({ value, onChange }: ScaleSliderProps) => (
  <label className={style.slider}>
    <input
      type="range"
      min={SCENE_SCALE.min}
      max={SCENE_SCALE.max}
      step={SCENE_SCALE.step}
      value={value}
      aria-label="Размер"
      onChange={(event) => onChange(Number(event.target.value))}
    />
    <output>{Math.round(value * 100)}%</output>
  </label>
);

interface SettingsPanelProps {
  preferences: Preferences;
  lightModes: readonly LightMode[];
  scene: { scale: number; scalable: boolean };
  onChange(next: Preferences): void;
  onLightMode(mode: LightMode): void;
}

export const SettingsPanel = ({ preferences, lightModes, scene, onChange, onLightMode }: SettingsPanelProps) => {
  const preset = presetOf(preferences.render);
  const setFeature = (feature: RenderFeature, enabled: boolean) =>
    onChange({ ...preferences, render: { ...preferences.render, [feature]: enabled } });

  return (
    <div className={style.panel} role="dialog" aria-label="Настройки">
      <Switch label="Звук" checked={preferences.sound} onChange={(sound) => onChange({ ...preferences, sound })} />
      <Section title="Свет">
        <Segmented
          label="Свет"
          options={lightModes.map((value) => ({ value, label: LIGHT_LABELS[value] }))}
          value={preferences.light}
          onChange={onLightMode}
        />
      </Section>
      {scene.scalable && (
        <Section title="Размер">
          <Switch
            label="Автоматически"
            checked={preferences.scale === null}
            onChange={(auto) => onChange({ ...preferences, scale: auto ? null : scene.scale })}
          />
          {preferences.scale !== null && (
            <ScaleSlider value={preferences.scale} onChange={(scale) => onChange({ ...preferences, scale })} />
          )}
        </Section>
      )}
      <Section title={preset ? 'Картинка' : 'Картинка: своя'}>
        <Segmented
          label="Картинка"
          options={(Object.keys(PRESET_LABELS) as RenderPreset[]).map((value) => ({
            value,
            label: PRESET_LABELS[value],
          }))}
          value={preset}
          onChange={(value) => onChange({ ...preferences, render: RENDER_PRESETS[value] })}
        />
      </Section>
      <details className={style.stages}>
        <summary>Этапы обработки</summary>
        {GROUPS.map((group) => (
          <Section key={group} title={RENDER_GROUPS[group]}>
            {FEATURES.filter((feature) => RENDER_FEATURES[feature].group === group).map((feature) => (
              <Switch
                key={feature}
                label={RENDER_FEATURES[feature].label}
                checked={preferences.render[feature]}
                onChange={(enabled) => setFeature(feature, enabled)}
              />
            ))}
          </Section>
        ))}
      </details>
      <CreditLine className={style.credit} />
    </div>
  );
};
