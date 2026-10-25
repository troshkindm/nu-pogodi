import type { CSSProperties } from 'react';

export const cssVariables = (variables: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(variables).map(([name, value]) => [
      `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      value,
    ]),
  ) as CSSProperties;
