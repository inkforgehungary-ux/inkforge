// InkForge – nyelvi konfiguracio
// A szovegek a dictionaries.json-ben vannak, kulcs-alapon.

import dicts from './dictionaries.json';

export const LOCALES = [
  { code: 'hu', name: 'Magyar', flag: '🇭🇺', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿', dir: 'ltr' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰', dir: 'ltr' },
  { code: 'ro', name: 'Română', flag: '🇷🇴', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'zh', name: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'he', name: 'עברית', flag: '🇮🇱', dir: 'rtl' },
];

export const DEFAULT_LOCALE = 'hu';

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function isLocale(code) {
  return LOCALE_CODES.includes(code);
}

/** Az irasirany: arab es heber jobbrol balra. */
export function getDirection(locale) {
  const found = LOCALES.find((l) => l.code === locale);
  return found && found.dir === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * Betukeszlet a nyelv irasrendszerehez.
 * A latin es cirill az alap; a tobbi sajat Noto csaladot igenyel.
 */
export function getFontClass(locale) {
  if (locale === 'ja') return 'font-jp';
  if (locale === 'ko') return 'font-kr';
  if (locale === 'zh') return 'font-sc';
  if (locale === 'th') return 'font-th';
  if (locale === 'ar') return 'font-ar';
  if (locale === 'he') return 'font-he';
  return 'font-base';
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
