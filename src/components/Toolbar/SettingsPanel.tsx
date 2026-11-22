import type { ReactNode } from 'react';

import { FEATURES, RENDER_FEATURES, RENDER_GROUPS, RENDER_PRESETS, presetOf } from '../../render/settings';
import type { RenderFeature, RenderPreset } from '../../render/settings';
import { SCENE_SCALE } from '../App/preferences';
import type { LightMode, Preferences } from '../App/preferences';
import { CreditLine } from '../Credit';
import { useUiText } from '../i18n';

import style from './Toolbar.module.less';

const PRESETS = Object.keys(RENDER_PRESETS) as RenderPreset[];

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
  label: string;
  value: number;
  onChange(value: number): void;
}

const ScaleSlider = ({ label, value, onChange }: ScaleSliderProps) => (
  <label className={style.slider}>
    <input
      type="range"
      min={SCENE_SCALE.min}
      max={SCENE_SCALE.max}
      step={SCENE_SCALE.step}
      value={value}
      aria-label={label}
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
  const text = useUiText().settings;
  const preset = presetOf(preferences.render);
  const setFeature = (feature: RenderFeature, enabled: boolean) =>
    onChange({ ...preferences, render: { ...preferences.render, [feature]: enabled } });

  return (
    <div className={style.panel} role="dialog" aria-label={text.title}>
      <Switch
        label={text.sound}
        checked={preferences.sound}
        onChange={(sound) => onChange({ ...preferences, sound })}
      />
      <Section title={text.light}>
        <Segmented
          label={text.light}
          options={lightModes.map((value) => ({ value, label: text.lightModes[value] }))}
          value={preferences.light}
          onChange={onLightMode}
        />
      </Section>
      {scene.scalable && (
        <Section title={text.size}>
          <Switch
            label={text.auto}
            checked={preferences.scale === null}
            onChange={(auto) => onChange({ ...preferences, scale: auto ? null : scene.scale })}
          />
          {preferences.scale !== null && (
            <ScaleSlider
              label={text.size}
              value={preferences.scale}
              onChange={(scale) => onChange({ ...preferences, scale })}
            />
          )}
        </Section>
      )}
      <Section title={preset ? text.picture : text.customPicture}>
        <Segmented
          label={text.picture}
          options={PRESETS.map((value) => ({ value, label: text.presets[value] }))}
          value={preset}
          onChange={(value) => onChange({ ...preferences, render: RENDER_PRESETS[value] })}
        />
      </Section>
      <details className={style.stages}>
        <summary>{text.stages}</summary>
        {RENDER_GROUPS.map((group) => (
          <Section key={group} title={text.groups[group]}>
            {FEATURES.filter((feature) => RENDER_FEATURES[feature].group === group).map((feature) => (
              <Switch
                key={feature}
                label={text.features[feature]}
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
