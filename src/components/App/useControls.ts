import { useCallback, useRef, useState } from 'react';

import type { Beeper } from '../../audio/beeper';
import type { ClockKey } from '../../game/clock';
import type { GameMode } from '../../game/config';
import type { Session } from '../../game/session';
import type { KeyKind } from '../../render/renderer';
import type { HeldKey } from '../Console';

import { ROUND_CHUTES } from './keys';

const PILL_MODES: readonly (GameMode | null)[] = ['A', 'B', null];
const HOLE_KEYS: readonly ClockKey[] = ['alarm', 'time'];

interface ControlTargets {
  gameActive: boolean;
  onPill(): void;
  onClockKey(key: ClockKey): void;
}

const sameKey = (kind: KeyKind, index: number) => (key: HeldKey) => key.kind === kind && key.index === index;
const keyId = (kind: KeyKind, index: number) => `${kind}-${index}`;

export function useControls(session: Session, beeper: Beeper, { gameActive, onPill, onClockKey }: ControlTargets) {
  const [held, setHeld] = useState<HeldKey[]>([]);
  const down = useRef(new Set<string>());

  const start = useCallback(
    (mode: GameMode | null) => {
      beeper.unlock();
      onClockKey('run');
      if (mode) session.start(mode);
      else session.showClock();
      onPill();
    },
    [session, beeper, onPill, onClockKey],
  );
  const steer = useCallback(
    (index: number) => {
      if (gameActive) session.move(ROUND_CHUTES[index]);
      else onClockKey(index < 2 ? 'hour' : 'minute');
    },
    [session, gameActive, onClockKey],
  );
  const pressHole = useCallback(
    (index: number) => {
      beeper.unlock();
      beeper.click('pill', true);
      if (gameActive) start(null);
      onClockKey(HOLE_KEYS[index]);
    },
    [beeper, gameActive, start, onClockKey],
  );
  const press = useCallback(
    (kind: KeyKind, index: number) => {
      beeper.unlock();
      beeper.click(kind, true);
      down.current.add(keyId(kind, index));
      if (kind === 'round') steer(index);
      else start(PILL_MODES[index]);
      setHeld((keys) => [...keys.filter((key) => !sameKey(kind, index)(key)), { kind, index }]);
    },
    [beeper, steer, start],
  );
  const release = useCallback(
    (kind: KeyKind, index: number) => {
      if (down.current.delete(keyId(kind, index))) beeper.click(kind, false);
      setHeld((keys) => keys.filter((key) => !sameKey(kind, index)(key)));
    },
    [beeper],
  );
  const releaseAll = useCallback(() => {
    down.current.clear();
    setHeld([]);
  }, []);

  return { held, start, press, pressHole, release, releaseAll };
}
