import type { CSSProperties } from 'react';

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export const cssVariables = (variables: Record<string, string>) =>
  Object.fromEntries(Object.entries(variables).map(([name, value]) => [`--${kebab(name)}`, value])) as CSSProperties;
