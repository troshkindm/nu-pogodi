import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { KEY_FEEL_CONFIG } from '../../game/config';
import {
  LCD_RECT,
  LED_HOLES,
  PILL_KEYS,
  ROUND_KEYS,
  VIEW,
  height,
  toViewFraction,
  width,
} from '../../render/device/geometry';
import type { Point } from '../../render/device/geometry';
import { flatPreviewRequested } from '../../render/gl/capabilities';
import { albedoMap } from '../../render/maps/albedo';
import { createDeviceRenderer } from '../../render/renderer';
import type { DeviceRenderer, KeyKind, Vector3 } from '../../render/renderer';
import type { RenderSettings } from '../../render/settings';
import { useUiText } from '../i18n';
import { Lcd } from '../Lcd';

import style from './Console.module.less';

const ROUND_HIT = { width: 62, height: 62 };
const PILL_HIT = { width: 56, height: 34 };
const HOLE_HIT = { width: 44, height: 44 };

const [lcdLeft, lcdTop] = toViewFraction([LCD_RECT.x1, LCD_RECT.y1]);
const LCD_STYLE: CSSProperties = {
  left: `${lcdLeft * 100}%`,
  top: `${lcdTop * 100}%`,
  width: `${(width(LCD_RECT) / VIEW.w) * 100}%`,
  height: `${(height(LCD_RECT) / VIEW.h) * 100}%`,
};

const flatBodyUrl = () => `data:image/svg+xml,${encodeURIComponent(albedoMap(true))}`;

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
  onHole(index: number): void;
  onReady?(): void;
  dimmed?: boolean;
}

export const Console = (props: ConsoleProps) => {
  const labels = useUiText().console;
  const { lit, settings, light, held, onPress, onRelease, onHole, onReady, dimmed = false } = props;
  const surface = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<DeviceRenderer | null>(null);
  const [failed, setFailed] = useState(false);
  const initialSettings = useRef(settings);
  const readyCallback = useRef(onReady);
  const flatBody = useMemo(() => (failed ? flatBodyUrl() : ''), [failed]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    surface.current?.append(canvas);
    let active = true;
    let created: DeviceRenderer | null = null;
    const start = flatPreviewRequested()
      ? Promise.reject(new Error('flat preview'))
      : createDeviceRenderer(canvas, initialSettings.current);
    start
      .then((instance) => {
        created = instance;
        if (active) setRenderer(instance);
        else instance.dispose();
      })
      .catch(() => setFailed(true))
      .finally(() => {
        if (active) readyCallback.current?.();
      });
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
      aria-label={kind === 'round' ? labels.round[index] : labels.pill[index]}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        if (event.pointerType === 'touch') navigator.vibrate?.(KEY_FEEL_CONFIG.vibrationMs);
        onPress(kind, index);
      }}
      onPointerUp={() => onRelease(kind, index)}
      onPointerCancel={() => onRelease(kind, index)}
    />
  );

  return (
    <div className={`${style.device} ${dimmed ? style.dimmed : ''}`}>
      <div ref={surface} className={renderer ? style.surface : style.loading} />
      {failed && (
        <>
          <img className={style.flatBody} src={flatBody} alt="" />
          <div className={style.fallback} style={LCD_STYLE}>
            <Lcd lit={lit} />
          </div>
        </>
      )}
      {ROUND_KEYS.map((point, index) => hitArea('round', index, point))}
      {PILL_KEYS.map((point, index) => hitArea('pill', index, point))}
      {LED_HOLES.map((point, index) => (
        <button
          key={`hole-${index}`}
          type="button"
          className={style.hit}
          style={hitStyle(point, HOLE_HIT)}
          aria-label={labels.hole[index]}
          title={labels.hole[index]}
          onPointerDown={() => onHole(index)}
        />
      ))}
    </div>
  );
};
