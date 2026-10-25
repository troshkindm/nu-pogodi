import style from './RotateHint.module.less';

export const RotateHint = () => (
  <div className={style.hint} role="alert">
    <p className={style.caption}>Поверни телефон</p>
    <p className={style.note}>«Электроника» держат горизонтально</p>
  </div>
);
