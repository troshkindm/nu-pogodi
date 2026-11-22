import { createContext, useContext } from 'react';

import type { Language } from './language';
import { UI_TEXT } from './uiText';

export const LanguageContext = createContext<Language>('ru');

export const useLanguage = () => useContext(LanguageContext);

export const useUiText = () => UI_TEXT[useLanguage()];
