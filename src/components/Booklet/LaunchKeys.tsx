import type { GameMode } from '../../game/config';
import { useUiText } from '../i18n';

import style from './Booklet.module.less';

const MODES: readonly GameMode[] = ['A', 'B'];

interface LaunchKeysProps {
  preferred: GameMode;
  onStart(mode: GameMode): void;
}

export const LaunchKeys = ({ preferred, onStart }: LaunchKeysProps) => {
  const { games } = useUiText().booklet;
  return (
    <div className={style.keys}>
      {MODES.map((mode, index) => (
        <button
          key={mode}
          type="button"
          className={style.key}
          data-autofocus={mode === preferred || undefined}
          onClick={() => onStart(mode)}
        >
          {games[index]}
        </button>
      ))}
    </div>
  );
};
