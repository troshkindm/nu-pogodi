import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { PILL_KEYS, ROUND_KEYS, VIEW, toViewFraction } from '../../render/device/geometry';
import type { Point } from '../../render/device/geometry';
import { createDeviceRenderer } from '../../render/renderer';
import type { DeviceRenderer, KeyKind, Vector3 } from '../../render/renderer';
import type { RenderSettings } from '../../render/settings';
import { Lcd } from '../Lcd';

import style from './Console.module.less';

const ROUND_HIT = { width: 62, height: 62 };
const PILL_HIT = { width: 56, height: 34 };
const ROUND_LABELS = ['Волк влево вверх', 'Волк влево вниз', 'Волк вправо вверх', 'Волк вправо вниз'];
const PILL_LABELS = ['Игра А', 'Игра Б', 'Время'];

const hitStyle = (point: Point, size: { width: number; height: number }): CSSProperties => {
  const [x, y] = toViewFraction(point);
  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${(size.width / VIEW.w) * 100}%`,
    height: `${(size.height / VIEW.h) * 100}%`,
  };
};

export interface HeldKey {
  kind: KeyKind;
  index: number;
}

interface ConsoleProps {
  lit: ReadonlySet<string>;
  settings: RenderSettings;
  light?: Vector3;
  held: readonly HeldKey[];
  onPress(kind: KeyKind, index: number): void;
  onRelease(kind: KeyKind, index: number): void;
}

export const Console = ({ lit, settings, light, held, onPress, onRelease }: ConsoleProps) => {
  const surface = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<DeviceRenderer | null>(null);
  const [failed, setFailed] = useState(false);
  const initialSettings = useRef(settings);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    surface.current?.append(canvas);
    let active = true;
    let created: DeviceRenderer | null = null;
    createDeviceRenderer(canvas, initialSettings.current)
      .then((instance) => {
        created = instance;
        if (active) setRenderer(instance);
        else instance.dispose();
      })
      .catch(() => setFailed(true));
    return () => {
      active = false;
      created?.dispose();
      canvas.remove();
    };
  }, []);

  useEffect(() => renderer?.setLit(lit), [renderer, lit]);
  useEffect(() => {
    renderer?.setSettings(settings).catch(() => undefined);
  }, [renderer, settings]);
  useEffect(() => {
    if (light) renderer?.setLight(light);
  }, [renderer, light]);
  useEffect(() => {
    if (!renderer) return;
    const isHeld = (kind: KeyKind, index: number) => held.some((key) => key.kind === kind && key.index === index);
    ROUND_KEYS.forEach((_, index) => renderer.setPressed('round', index, isHeld('round', index)));
    PILL_KEYS.forEach((_, index) => renderer.setPressed('pill', index, isHeld('pill', index)));
  }, [renderer, held]);

  const hitArea = (kind: KeyKind, index: number, point: Point) => (
    <button
      key={`${kind}-${index}`}
      type="button"
      className={style.hit}
      style={hitStyle(point, kind === 'round' ? ROUND_HIT : PILL_HIT)}
      aria-label={kind === 'round' ? ROUND_LABELS[index] : PILL_LABELS[index]}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress(kind, index);
      }}
      onPointerUp={() => onRelease(kind, index)}
      onPointerCancel={() => onRelease(kind, index)}
    />
  );

  return (
    <div className={style.device}>
      <div ref={surface} className={renderer ? style.surface : style.loading} />
      {failed && (
        <div className={style.fallback}>
          <Lcd lit={lit} />
        </div>
      )}
      {ROUND_KEYS.map((point, index) => hitArea('round', index, point))}
      {PILL_KEYS.map((point, index) => hitArea('pill', index, point))}
    </div>
  );
};
