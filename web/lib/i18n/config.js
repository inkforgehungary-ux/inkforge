// InkForge – nyelvi konfiguracio
// A szovegek a dictionaries.json-ben vannak, kulcs-alapon.

import dicts from './dictionaries.json';

export const LOCALES = [
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
];

export const DEFAULT_LOCALE = 'hu';

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function isLocale(code) {
  return LOCALE_CODES.includes(code);
}

/**
 * Szotar betoltese. A teljes tartalom hu/en; a tobbi nyelv az angolbol indul,
 * amig anyanyelvi forditas nem erkezik (a szaknyelv gepi forditasa hibas lenne).
 */
export function getDictionary(locale) {
  const base = dicts.en || {};
  if (locale === 'hu') return dicts.hu || base;
  if (dicts[locale]) return { ...base, ...dicts[locale] };
  return base;
}

/** Egyszeru kulcslekerdezes, pl. t('nav.stencil') */
export function makeT(dict) {
  return (key) => (dict && dict[key] != null ? dict[key] : key);
}
