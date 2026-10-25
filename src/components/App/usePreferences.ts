import { useEffect, useState } from 'react';

import { isSoftwareRendering } from '../../render/gl/capabilities';

import { defaultPreferences, loadPreferences, savePreferences } from './preferences';
import { browserStorage } from './storage';

export function usePreferences() {
  const [preferences, setPreferences] = useState(() =>
    loadPreferences(browserStorage(), defaultPreferences(isSoftwareRendering())),
  );
  useEffect(() => {
    savePreferences(browserStorage(), preferences);
  }, [preferences]);
  return [preferences, setPreferences] as const;
}
