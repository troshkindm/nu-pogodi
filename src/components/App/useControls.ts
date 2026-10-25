import { useCallback, useState } from 'react';

import type { Beeper } from '../../audio/beeper';
import type { GameMode } from '../../game/config';
import type { Session } from '../../game/session';
import type { KeyKind } from '../../render/renderer';
import type { HeldKey } from '../Console';

import { ROUND_CHUTES } from './keys';

const PILL_MODES: readonly (GameMode | null)[] = ['A', 'B', null];

const sameKey = (kind: KeyKind, index: number) => (key: HeldKey) => key.kind === kind && key.index === index;

export function useControls(session: Session, beeper: Beeper, onPill: () => void) {
  const [held, setHeld] = useState<HeldKey[]>([]);

  const start = useCallback(
    (mode: GameMode | null) => {
      beeper.unlock();
      if (mode) session.start(mode);
      else session.showClock();
      onPill();
    },
    [session, beeper, onPill],
  );
  const press = useCallback(
    (kind: KeyKind, index: number) => {
      beeper.unlock();
      if (kind === 'round') session.move(ROUND_CHUTES[index]);
      else start(PILL_MODES[index]);
      setHeld((keys) => [...keys.filter((key) => !sameKey(kind, index)(key)), { kind, index }]);
    },
    [session, beeper, start],
  );
  const release = useCallback((kind: KeyKind, index: number) => {
    setHeld((keys) => keys.filter((key) => !sameKey(kind, index)(key)));
  }, []);
  const releaseAll = useCallback(() => setHeld([]), []);

  return { held, start, press, release, releaseAll };
}
