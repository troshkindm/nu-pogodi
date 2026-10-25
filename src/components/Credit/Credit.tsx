import style from './Credit.module.less';

export const AUTHOR = { name: 'Дмитрий Трошкин', github: 'https://github.com/troshkindm', handle: 'troshkindm' };

export const CreditLine = ({ className }: { className?: string }) => (
  <p className={[style.line, className].filter(Boolean).join(' ')}>
    <span>{AUTHOR.name}</span>
    <span aria-hidden="true">·</span>
    <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer">
      github.com/{AUTHOR.handle}
    </a>
    <span aria-hidden="true">·</span>
    <span>MIT</span>
  </p>
);

export const Credit = () => (
  <footer className={style.footer}>
    <CreditLine />
  </footer>
);
