import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { LightMode, Preferences } from '../App/preferences';
import { deviceLightModes, requestTiltPermission, supportedLightMode } from '../App/useLight';
import { cssVariables } from '../style';

import { Icon } from './Icon';
import type { IconName } from './Icon';
import { SettingsPanel } from './SettingsPanel';
import style from './Toolbar.module.less';

const AWAKE_MS = 2600;

interface ToolbarProps {
  preferences: Preferences;
  playing: boolean;
  bookletOpen: boolean;
  onChange(next: Preferences): void;
  onBooklet(): void;
}

interface ToolProps {
  icon: IconName;
  label: string;
  active?: boolean;
  onClick(): void;
}

const Tool = ({ icon, label, active = false, onClick }: ToolProps) => (
  <button
    type="button"
    className={`${style.tool} ${active ? style.active : ''}`}
    aria-label={label}
    aria-pressed={active}
    title={label}
    onClick={onClick}
  >
    <Icon name={icon} />
  </button>
);

const touchDevice = () => window.matchMedia('(pointer: coarse)').matches;

const useAwake = (playing: boolean) => {
  const [awake, setAwake] = useState(true);
  useEffect(() => {
    if (!playing) {
      setAwake(true);
      return undefined;
    }
    let timer = window.setTimeout(() => setAwake(false), AWAKE_MS);
    const wake = () => {
      setAwake(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAwake(false), AWAKE_MS);
    };
    window.addEventListener('pointermove', wake);
    return () => {
      window.removeEventListener('pointermove', wake);
      window.clearTimeout(timer);
    };
  }, [playing]);
  return awake;
};

const useFullscreen = () => {
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const toggle = () => {
    const change = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    change.catch(() => undefined);
  };
  return { available: document.fullscreenEnabled, fullscreen, toggle };
};

const useDismiss = (open: boolean, close: () => void, root: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close, root]);
};

export const Toolbar = ({ preferences, playing, bookletOpen, onChange, onBooklet }: ToolbarProps) => {
  const root = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reveal, setReveal] = useState<CSSProperties>({});
  const [touch] = useState(touchDevice);
  const [lightModes] = useState(deviceLightModes);
  const lightMode = supportedLightMode(preferences.light);
  const awake = useAwake(playing);
  const screen = useFullscreen();
  const closePanel = useRef(() => setPanelOpen(false)).current;
  useDismiss(panelOpen, closePanel, root);

  const setLightMode = async (light: LightMode) => {
    if (light === 'gyro' && !(await requestTiltPermission())) return;
    onChange({ ...preferences, light });
  };
  const dynamicLight = lightModes[1];

  const tools: ReactNode[] = [
    <Tool
      key="sound"
      icon={preferences.sound ? 'speaker' : 'speakerMute'}
      label={preferences.sound ? 'Выключить звук (M)' : 'Включить звук (M)'}
      onClick={() => onChange({ ...preferences, sound: !preferences.sound })}
    />,
    <Tool
      key="light"
      icon="lightbulb"
      label={touch ? 'Свет от наклона телефона' : 'Свет за мышью'}
      active={lightMode !== 'static'}
      onClick={() => setLightMode(lightMode === 'static' ? dynamicLight : 'static')}
    />,
    <Tool key="booklet" icon="bookOpen" label="Руководство (H)" active={bookletOpen} onClick={onBooklet} />,
    <Tool
      key="settings"
      icon={panelOpen ? 'dismiss' : 'options'}
      label="Настройки"
      active={panelOpen}
      onClick={() => setPanelOpen((open) => !open)}
    />,
  ];
  if (screen.available)
    tools.push(
      <Tool
        key="fullscreen"
        icon={screen.fullscreen ? 'minimize' : 'maximize'}
        label={screen.fullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
        onClick={screen.toggle}
      />,
    );

  const faded = playing && !awake && !panelOpen;
  return (
    <div
      ref={root}
      className={`${style.toolbar} ${faded ? style.faded : ''}`}
      style={reveal}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setReveal(cssVariables({ revealX: `${event.clientX - box.left}px`, revealY: `${event.clientY - box.top}px` }));
      }}
    >
      <div className={style.bar}>{tools}</div>
      {panelOpen && (
        <SettingsPanel
          preferences={{ ...preferences, light: lightMode }}
          lightModes={lightModes}
          onChange={onChange}
          onLightMode={setLightMode}
        />
      )}
    </div>
  );
};
