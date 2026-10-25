export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const browserStorage = (): KeyValueStorage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};
