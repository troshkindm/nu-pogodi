import { useEffect, useState } from 'react';

import { isSoftwareRendering } from '../../render/gl/capabilities';
import { browserLanguage } from '../i18n/language';
import { UI_TEXT } from '../i18n/uiText';

import { defaultPreferences, loadPreferences, savePreferences } from './preferences';
import { browserStorage } from './storage';

export function usePreferences() {
  const [preferences, setPreferences] = useState(() =>
    loadPreferences(browserStorage(), defaultPreferences(isSoftwareRendering(), browserLanguage())),
  );
  useEffect(() => {
    savePreferences(browserStorage(), preferences);
  }, [preferences]);
  useEffect(() => {
    document.documentElement.lang = preferences.language;
    document.title = UI_TEXT[preferences.language].pageTitle;
  }, [preferences.language]);
  return [preferences, setPreferences] as const;
}
