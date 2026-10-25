import type { GameMode } from '../../game/config';

import style from './Booklet.module.less';

const MODES: readonly GameMode[] = ['A', 'B'];
const LABELS: Record<GameMode, string> = { A: 'Игра А', B: 'Игра Б' };

interface LaunchKeysProps {
  preferred: GameMode;
  onStart(mode: GameMode): void;
}

export const LaunchKeys = ({ preferred, onStart }: LaunchKeysProps) => (
  <div className={style.keys}>
    {MODES.map((mode) => (
      <button
        key={mode}
        type="button"
        className={style.key}
        data-autofocus={mode === preferred || undefined}
        onClick={() => onStart(mode)}
      >
        {LABELS[mode]}
      </button>
    ))}
  </div>
);
