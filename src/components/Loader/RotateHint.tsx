import { useUiText } from '../i18n';

import style from './RotateHint.module.less';

export const RotateHint = () => {
  const { rotate } = useUiText();
  return (
    <div className={style.hint} role="alert">
      <p className={style.caption}>{rotate.caption}</p>
      <p className={style.note}>{rotate.note}</p>
    </div>
  );
};
